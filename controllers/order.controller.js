const crypto = require("crypto");
const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const Discount = require("../models/discount.model");
const Address = require("../models/address.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const sendEmail = require("../utils/sendEmail");
const { generateOrderConfirmationEmail } = require("../utils/emailTemplate");

// eSewa ePay v2 Configuration
const ESEWA_CONFIG = {
  merchantId: process.env.ESEWA_MERCHANT_ID || "EPAYTEST",
  secretKey: process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q",
  paymentUrl:
    process.env.NODE_ENV === "production"
      ? "https://epay.esewa.com.np/api/epay/main/v2/form"
      : "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
  statusUrl:
    process.env.NODE_ENV === "production"
      ? "https://esewa.com.np/api/epay/transaction/status/"
      : "https://rc.esewa.com.np/api/epay/transaction/status/",
};

const FRONTEND_URL = process.env.FRONTEND_URL || "https://localhost:5173";

// Generate HMAC-SHA256 signature for eSewa ePay v2
const generateEsewaSignature = (message) => {
  const hmac = crypto.createHmac("sha256", ESEWA_CONFIG.secretKey);
  hmac.update(message);
  return hmac.digest("base64");
};

// Verify eSewa response signature
const verifyEsewaSignature = (responseData) => {
  const fields = responseData.signed_field_names.split(",");
  const message = fields.map((f) => `${f}=${responseData[f]}`).join(",");
  const expectedSignature = generateEsewaSignature(message);
  return expectedSignature === responseData.signature;
};

// Helper function to validate and prepare cart items
const prepareOrderItems = async (items) => {
  const orderItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId || item.product);
    if (!product) {
      throw new AppError(`Product not found: ${item.productId}`, 404);
    }
    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }

    // Get primary image
    const primaryImage =
      product.images?.find((img) => img.isPrimary)?.url ||
      product.images?.[0]?.url ||
      null;

    orderItems.push({
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      variant: item.variant || {},
      image: primaryImage,
    });
  }

  return orderItems;
};

// Helper to calculate order totals
const calculateOrderTotals = async (items, discountCode) => {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }

  let discountAmount = 0;
  let discountInfo = null;

  if (discountCode) {
    const discount = await Discount.findOne({
      code: discountCode.toUpperCase(),
      isActive: true,
      expiryDate: { $gt: new Date() },
    });

    if (discount) {
      const validation = discount.validateForCart(subtotal);
      if (validation.valid) {
        discountAmount = discount.calculateDiscount(subtotal);
        discountInfo = {
          code: discount.code,
          percentage: discount.discountPercentage,
        };
      }
    }
  }

  const shippingCost = 0; // Free shipping
  const tax = 0;
  const total = subtotal - discountAmount + shippingCost + tax;

  return { subtotal, discountAmount, discountInfo, shippingCost, tax, total };
};

// Backend URL for eSewa callbacks
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

// Helper function to send order confirmation email
const sendOrderConfirmationEmail = async (order) => {
  try {
    const emailHtml = generateOrderConfirmationEmail(order);
    await sendEmail(
      order.guestInfo.email,
      `Order Confirmed - #${order.orderId} | Aura Interiors`,
      emailHtml
    );
    return true;
  } catch (error) {
    console.error("Failed to send order confirmation email:", error.message);
    return false;
  }
};

// Generate eSewa ePay v2 payment data with signature
const generateEsewaPaymentData = (order) => {
  const data = {
    amount: order.subtotal - order.discountAmount,
    tax_amount: order.tax,
    product_service_charge: 0,
    product_delivery_charge: order.shippingCost,
    total_amount: order.total,
    transaction_uuid: order.orderId,
    product_code: ESEWA_CONFIG.merchantId,
    // eSewa redirects to BACKEND, which processes payment and redirects to FRONTEND
    success_url: `${BACKEND_URL}/api/v1/orders/esewa/success`,
    failure_url: `${BACKEND_URL}/api/v1/orders/esewa/failure`,
    signed_field_names: "total_amount,transaction_uuid,product_code",
  };

  // Generate signature: total_amount,transaction_uuid,product_code
  const message = `total_amount=${data.total_amount},transaction_uuid=${data.transaction_uuid},product_code=${data.product_code}`;
  data.signature = generateEsewaSignature(message);
  data.payment_url = ESEWA_CONFIG.paymentUrl;

  return data;
};

// ========== GUEST CHECKOUT ==========

exports.guestCheckout = catchAsync(async (req, res, next) => {
  const {
    email,
    firstName,
    lastName,
    phone,
    items,
    shippingAddress,
    billingAddress,
    useSameAddress,
    paymentMethod,
    discountCode,
    customerNote,
  } = req.body;

  // Prepare order items and validate stock
  const orderItems = await prepareOrderItems(items);

  // Calculate totals
  const totals = await calculateOrderTotals(orderItems, discountCode);

  // Create order
  const order = await Order.create({
    isGuestOrder: true,
    guestInfo: {
      email: email.toLowerCase(),
      firstName,
      lastName,
      phone,
    },
    items: orderItems,
    shippingAddress,
    billingAddress: useSameAddress ? shippingAddress : billingAddress,
    ...totals,
    discountCode: totals.discountInfo,
    paymentMethod,
    paymentStatus: "pending",
    orderStatus: "pending",
    customerNote,
    statusHistory: [{ status: "pending", note: "Order placed" }],
  });

  // Update product stock
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }

  // Increment discount usage if applied
  if (totals.discountInfo) {
    const discount = await Discount.findOne({ code: totals.discountInfo.code });
    if (discount) {
      await discount.incrementUsage();
    }
  }

  // If eSewa, return payment initiation data
  if (paymentMethod === "esewa") {
    const esewaData = generateEsewaPaymentData(order);
    return res.status(201).json({
      success: true,
      message: "Order created. Proceed to payment.",
      data: {
        order: {
          orderId: order.orderId,
          total: order.total,
        },
        esewa: esewaData,
      },
    });
  }

  // COD: Order is confirmed
  order.orderStatus = "confirmed";
  order.confirmedAt = new Date();
  order.addStatusHistory("confirmed", "Cash on Delivery order confirmed");
  await order.save();

  // Send order confirmation email
  const emailSent = await sendOrderConfirmationEmail(order);

  res.status(201).json({
    success: true,
    message: "Order placed successfully!",
    data: {
      order: {
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        paymentMethod: order.paymentMethod,
        total: order.total,
        email: order.guestInfo.email,
      },
      emailSent,
    },
  });
});

// ========== AUTHENTICATED CHECKOUT ==========

exports.authenticatedCheckout = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const {
    shippingAddressId,
    shippingAddress,
    billingAddressId,
    billingAddress,
    useSameAddress,
    paymentMethod,
    discountCode,
    customerNote,
  } = req.body;

  // Get user's cart
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart || cart.items.length === 0) {
    return next(new AppError("Your cart is empty", 400));
  }

  // Prepare items from cart
  const items = cart.items.map((item) => ({
    productId: item.product._id,
    quantity: item.quantity,
    variant: item.variant,
  }));

  const orderItems = await prepareOrderItems(items);

  // Get shipping address
  let finalShippingAddress;
  if (shippingAddressId) {
    const savedAddress = await Address.findOne({
      _id: shippingAddressId,
      user: userId,
    });
    if (!savedAddress) {
      return next(new AppError("Shipping address not found", 404));
    }
    finalShippingAddress = {
      fullName: savedAddress.fullName,
      phone: savedAddress.phone,
      addressLine1: savedAddress.addressLine1,
      addressLine2: savedAddress.addressLine2 || "",
      city: savedAddress.city,
      state: savedAddress.state || "",
      postalCode: savedAddress.postalCode,
      country: savedAddress.country,
    };
  } else {
    finalShippingAddress = shippingAddress;
  }

  // Get billing address
  let finalBillingAddress = finalShippingAddress;
  if (!useSameAddress) {
    if (billingAddressId) {
      const savedBilling = await Address.findOne({
        _id: billingAddressId,
        user: userId,
      });
      if (savedBilling) {
        finalBillingAddress = {
          fullName: savedBilling.fullName,
          phone: savedBilling.phone,
          addressLine1: savedBilling.addressLine1,
          addressLine2: savedBilling.addressLine2 || "",
          city: savedBilling.city,
          state: savedBilling.state || "",
          postalCode: savedBilling.postalCode,
          country: savedBilling.country,
        };
      }
    } else if (billingAddress) {
      finalBillingAddress = billingAddress;
    }
  }

  // Calculate totals
  const totals = await calculateOrderTotals(orderItems, discountCode);

  // Create order
  const order = await Order.create({
    user: userId,
    isGuestOrder: false,
    guestInfo: {
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      phone: req.user.phone || "",
    },
    items: orderItems,
    shippingAddress: finalShippingAddress,
    billingAddress: finalBillingAddress,
    ...totals,
    discountCode: totals.discountInfo,
    paymentMethod,
    paymentStatus: "pending",
    orderStatus: "pending",
    customerNote,
    statusHistory: [{ status: "pending", note: "Order placed" }],
  });

  // Update stock
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }

  // Increment discount usage
  if (totals.discountInfo) {
    const discount = await Discount.findOne({ code: totals.discountInfo.code });
    if (discount) await discount.incrementUsage();
  }

  // Clear user's cart
  await cart.clearCart();

  // Handle eSewa payment
  if (paymentMethod === "esewa") {
    const esewaData = generateEsewaPaymentData(order);
    return res.status(201).json({
      success: true,
      message: "Order created. Proceed to payment.",
      data: {
        order: { orderId: order.orderId, total: order.total },
        esewa: esewaData,
      },
    });
  }

  // COD: Confirm order
  order.orderStatus = "confirmed";
  order.confirmedAt = new Date();
  order.addStatusHistory("confirmed", "Cash on Delivery order confirmed");
  await order.save();

  // Send order confirmation email
  const emailSent = await sendOrderConfirmationEmail(order);

  res.status(201).json({
    success: true,
    message: "Order placed successfully!",
    data: {
      order: {
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        paymentMethod: order.paymentMethod,
        total: order.total,
        email: order.guestInfo.email,
      },
      emailSent,
    },
  });
});

// ========== ORDER TRACKING ==========

exports.trackOrder = catchAsync(async (req, res, next) => {
  const { orderId, email } = req.body;

  const order = await Order.findOne({
    orderId: orderId.toUpperCase(),
    "guestInfo.email": email.toLowerCase(),
  }).select("-adminNote");

  if (!order) {
    return next(
      new AppError("Order not found. Please check your order ID and email.", 404)
    );
  }

  res.status(200).json({
    success: true,
    data: { order },
  });
});

// ========== USER ORDER HISTORY ==========

exports.getMyOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;

  const filter = { user: req.user._id };
  if (status) filter.orderStatus = status;

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-adminNote"),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).select("-adminNote");

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  res.status(200).json({
    success: true,
    data: { order },
  });
});

// ========== ADMIN OPERATIONS ==========

exports.getAllOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status, paymentStatus, search } = req.query;

  const filter = {};
  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) {
    filter.$or = [
      { orderId: { $regex: search, $options: "i" } },
      { "guestInfo.email": { $regex: search, $options: "i" } },
      { "guestInfo.firstName": { $regex: search, $options: "i" } },
      { "guestInfo.lastName": { $regex: search, $options: "i" } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

exports.getOrderAdmin = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "firstName lastName email phone"
  );

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  res.status(200).json({
    success: true,
    data: { order },
  });
});

exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status, note } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // Update timestamps based on status
  const statusTimestamps = {
    confirmed: "confirmedAt",
    shipped: "shippedAt",
    delivered: "deliveredAt",
    cancelled: "cancelledAt",
  };

  if (statusTimestamps[status]) {
    order[statusTimestamps[status]] = new Date();
  }

  // If delivered and COD, mark as paid
  if (status === "delivered" && order.paymentMethod === "cod") {
    order.paymentStatus = "paid";
    order.paymentDetails = {
      ...order.paymentDetails,
      paidAt: new Date(),
    };
  }

  // If cancelled, restore stock
  if (status === "cancelled" && order.orderStatus !== "cancelled") {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }
  }

  order.addStatusHistory(status, note || `Status updated to ${status}`);
  await order.save();

  res.status(200).json({
    success: true,
    message: "Order status updated",
    data: { order },
  });
});

// ========== ESEWA CALLBACKS (ePay v2) ==========

exports.esewaSuccess = catchAsync(async (req, res, next) => {
  // eSewa v2 returns Base64 encoded data in query parameter
  const { data } = req.query;

  if (!data) {
    return res.redirect(`${FRONTEND_URL}/checkout/payment-failed?error=missing_data`);
  }

  let responseData;
  try {
    // Decode Base64 response
    const decodedData = Buffer.from(data, "base64").toString("utf-8");
    responseData = JSON.parse(decodedData);
  } catch (error) {
    return res.redirect(`${FRONTEND_URL}/checkout/payment-failed?error=invalid_response`);
  }

  const { transaction_uuid, status, total_amount, transaction_code } = responseData;

  // Verify signature
  if (!verifyEsewaSignature(responseData)) {
    return res.redirect(`${FRONTEND_URL}/checkout/payment-failed?error=signature_mismatch`);
  }

  // Find the order
  const order = await Order.findOne({ orderId: transaction_uuid });
  if (!order) {
    return res.redirect(`${FRONTEND_URL}/checkout/payment-failed?error=order_not_found`);
  }

  // Check payment status
  if (status !== "COMPLETE") {
    order.paymentStatus = "failed";
    order.addStatusHistory("pending", `eSewa payment status: ${status}`);
    await order.save();
    return res.redirect(`${FRONTEND_URL}/checkout/payment-failed?error=payment_incomplete`);
  }

  // Update order with successful payment
  order.paymentStatus = "paid";
  order.paymentDetails = {
    transactionId: transaction_code,
    esewaRefId: transaction_code,
    paidAt: new Date(),
    paymentGatewayResponse: responseData,
  };
  order.orderStatus = "confirmed";
  order.confirmedAt = new Date();
  order.addStatusHistory("confirmed", "Payment confirmed via eSewa");
  await order.save();

  // Send order confirmation email
  await sendOrderConfirmationEmail(order);

  res.redirect(`${FRONTEND_URL}/order-confirmation/${order.orderId}?email=${encodeURIComponent(order.guestInfo.email)}&emailSent=true`);
});

exports.esewaFailure = catchAsync(async (req, res, next) => {
  const { data } = req.query;

  let transaction_uuid = null;

  if (data) {
    try {
      const decodedData = Buffer.from(data, "base64").toString("utf-8");
      const responseData = JSON.parse(decodedData);
      transaction_uuid = responseData.transaction_uuid;
    } catch (error) {
      // If decoding fails, try to get from other query params
    }
  }

  if (transaction_uuid) {
    const order = await Order.findOne({ orderId: transaction_uuid });
    if (order && order.paymentStatus === "pending") {
      order.paymentStatus = "failed";
      order.addStatusHistory("pending", "Payment failed/cancelled via eSewa");
      await order.save();

      // Restore stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }
  }

  res.redirect(`${FRONTEND_URL}/checkout/payment-failed?orderId=${transaction_uuid || ""}`);
});
