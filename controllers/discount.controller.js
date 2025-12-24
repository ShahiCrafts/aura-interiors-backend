const Discount = require("../models/discount.model");
const Cart = require("../models/cart.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ========== ADMIN OPERATIONS ==========

// Get all discounts (Admin)
exports.getAllDiscounts = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status === "active") {
    filter.isActive = true;
    filter.expiryDate = { $gt: new Date() };
  } else if (status === "expired") {
    filter.expiryDate = { $lte: new Date() };
  } else if (status === "inactive") {
    filter.isActive = false;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [discounts, total] = await Promise.all([
    Discount.find(filter)
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Discount.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: discounts.length,
    data: {
      discounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

// Get single discount (Admin)
exports.getDiscount = catchAsync(async (req, res, next) => {
  const discount = await Discount.findById(req.params.id).populate(
    "createdBy",
    "firstName lastName email"
  );

  if (!discount) {
    return next(new AppError("Discount code not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      discount,
    },
  });
});

// Create discount (Admin)
exports.createDiscount = catchAsync(async (req, res, next) => {
  const {
    code,
    description,
    discountPercentage,
    minimumOrderAmount,
    maxUsageLimit,
    expiryDate,
    isActive,
  } = req.body;

  // Check for duplicate code
  const existingDiscount = await Discount.findOne({ code: code.toUpperCase() });
  if (existingDiscount) {
    return next(new AppError("A discount with this code already exists", 400));
  }

  const discount = await Discount.create({
    code: code.toUpperCase(),
    description,
    discountPercentage,
    minimumOrderAmount: minimumOrderAmount || 0,
    maxUsageLimit: maxUsageLimit || null,
    expiryDate,
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.user._id,
  });

  res.status(201).json({
    status: "success",
    data: {
      discount,
    },
  });
});

// Update discount (Admin)
exports.updateDiscount = catchAsync(async (req, res, next) => {
  const {
    code,
    description,
    discountPercentage,
    minimumOrderAmount,
    maxUsageLimit,
    expiryDate,
    isActive,
  } = req.body;

  const discount = await Discount.findById(req.params.id);

  if (!discount) {
    return next(new AppError("Discount code not found", 404));
  }

  // Check for duplicate code if code is being changed
  if (code && code.toUpperCase() !== discount.code) {
    const existingDiscount = await Discount.findOne({
      code: code.toUpperCase(),
    });
    if (existingDiscount) {
      return next(
        new AppError("A discount with this code already exists", 400)
      );
    }
    discount.code = code.toUpperCase();
  }

  // Update fields
  if (description !== undefined) discount.description = description;
  if (discountPercentage !== undefined)
    discount.discountPercentage = discountPercentage;
  if (minimumOrderAmount !== undefined)
    discount.minimumOrderAmount = minimumOrderAmount;
  if (maxUsageLimit !== undefined)
    discount.maxUsageLimit = maxUsageLimit || null;
  if (expiryDate !== undefined) discount.expiryDate = expiryDate;
  if (isActive !== undefined) discount.isActive = isActive;

  await discount.save();

  res.status(200).json({
    status: "success",
    data: {
      discount,
    },
  });
});

// Delete discount (Admin)
exports.deleteDiscount = catchAsync(async (req, res, next) => {
  const discount = await Discount.findByIdAndDelete(req.params.id);

  if (!discount) {
    return next(new AppError("Discount code not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Discount code deleted successfully",
  });
});

// ========== USER OPERATIONS ==========

// Apply discount to cart (User)
exports.applyDiscount = catchAsync(async (req, res, next) => {
  const { code } = req.body;

  if (!code) {
    return next(new AppError("Please provide a discount code", 400));
  }

  // Find the discount
  const discount = await Discount.findOne({ code: code.toUpperCase() });

  if (!discount) {
    return next(new AppError("Invalid discount code", 400));
  }

  // Get user's cart with populated products
  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    select: "name price",
  });

  if (!cart || cart.items.length === 0) {
    return next(new AppError("Your cart is empty", 400));
  }

  // Calculate cart subtotal
  let subtotal = 0;
  for (const item of cart.items) {
    if (item.product) {
      subtotal += item.product.price * item.quantity;
    }
  }

  // Validate discount for cart
  const validation = discount.validateForCart(subtotal);
  if (!validation.valid) {
    return next(new AppError(validation.message, 400));
  }

  // Calculate discount amount
  const discountAmount = discount.calculateDiscount(subtotal);
  const finalTotal = subtotal - discountAmount;

  res.status(200).json({
    status: "success",
    data: {
      discount: {
        code: discount.code,
        description: discount.description,
        discountPercentage: discount.discountPercentage,
        discountAmount,
      },
      cart: {
        subtotal,
        discountAmount,
        total: finalTotal,
      },
    },
  });
});

// Validate discount code (User) - for real-time validation
exports.validateDiscount = catchAsync(async (req, res, next) => {
  const { code } = req.params;

  const discount = await Discount.findOne({ code: code.toUpperCase() });

  if (!discount) {
    return next(new AppError("Invalid discount code", 400));
  }

  // Get user's cart subtotal
  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    select: "price",
  });

  let subtotal = 0;
  if (cart && cart.items.length > 0) {
    for (const item of cart.items) {
      if (item.product) {
        subtotal += item.product.price * item.quantity;
      }
    }
  }

  const validation = discount.validateForCart(subtotal);

  res.status(200).json({
    status: "success",
    data: {
      valid: validation.valid,
      message: validation.message,
      discount: validation.valid
        ? {
            code: discount.code,
            discountPercentage: discount.discountPercentage,
            minimumOrderAmount: discount.minimumOrderAmount,
            discountAmount: discount.calculateDiscount(subtotal),
          }
        : null,
    },
  });
});
