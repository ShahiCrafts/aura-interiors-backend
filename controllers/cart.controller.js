const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// Get user's cart
exports.getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    select: "name slug price originalPrice images category stock",
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  // Calculate totals
  let subtotal = 0;
  const validItems = [];

  for (const item of cart.items) {
    if (item.product) {
      subtotal += item.product.price * item.quantity;
      validItems.push(item);
    }
  }

  // Remove invalid items if any were found
  if (validItems.length !== cart.items.length) {
    cart.items = validItems;
    await cart.save();
  }

  res.status(200).json({
    success: true,
    data: {
      cart: {
        _id: cart._id,
        items: cart.items,
        totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
      },
    },
  });
});

// Add item to cart
exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1, variant = {} } = req.body;

  if (!productId) {
    return next(new AppError("Product ID is required", 400));
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // Check stock
  if (product.stock < quantity) {
    return next(new AppError("Insufficient stock", 400));
  }

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  // Check if item already exists with same variant
  const existingItemIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === productId &&
      JSON.stringify(item.variant) === JSON.stringify(variant)
  );

  if (existingItemIndex > -1) {
    // Update quantity
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    if (newQuantity > product.stock) {
      return next(new AppError("Insufficient stock", 400));
    }
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Add new item
    cart.items.push({
      product: productId,
      quantity,
      variant,
      addedAt: new Date(),
    });
  }

  await cart.save();

  // Populate and return updated cart
  await cart.populate({
    path: "items.product",
    select: "name slug price originalPrice images category stock",
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  let subtotal = 0;
  for (const item of cart.items) {
    if (item.product) {
      subtotal += item.product.price * item.quantity;
    }
  }

  res.status(200).json({
    success: true,
    message: "Item added to cart",
    data: {
      cart: {
        _id: cart._id,
        items: cart.items,
        totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
      },
    },
  });
});

// Update cart item quantity
exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return next(new AppError("Quantity must be at least 1", 400));
  }

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  const item = cart.items.id(itemId);

  if (!item) {
    return next(new AppError("Item not found in cart", 404));
  }

  // Check stock
  const product = await Product.findById(item.product);
  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  if (quantity > product.stock) {
    return next(new AppError("Insufficient stock", 400));
  }

  item.quantity = quantity;
  await cart.save();

  // Populate and return updated cart
  await cart.populate({
    path: "items.product",
    select: "name slug price originalPrice images category stock",
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  let subtotal = 0;
  for (const cartItem of cart.items) {
    if (cartItem.product) {
      subtotal += cartItem.product.price * cartItem.quantity;
    }
  }

  res.status(200).json({
    success: true,
    message: "Cart updated",
    data: {
      cart: {
        _id: cart._id,
        items: cart.items,
        totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
      },
    },
  });
});

// Remove item from cart
exports.removeFromCart = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  const itemIndex = cart.items.findIndex(
    (item) => item._id.toString() === itemId
  );

  if (itemIndex === -1) {
    return next(new AppError("Item not found in cart", 404));
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();

  // Populate and return updated cart
  await cart.populate({
    path: "items.product",
    select: "name slug price originalPrice images category stock",
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  let subtotal = 0;
  for (const item of cart.items) {
    if (item.product) {
      subtotal += item.product.price * item.quantity;
    }
  }

  res.status(200).json({
    success: true,
    message: "Item removed from cart",
    data: {
      cart: {
        _id: cart._id,
        items: cart.items,
        totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
      },
    },
  });
});

// Clear cart
exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: "Cart cleared",
    data: {
      cart: {
        _id: cart._id,
        items: [],
        totalItems: 0,
        subtotal: 0,
      },
    },
  });
});
