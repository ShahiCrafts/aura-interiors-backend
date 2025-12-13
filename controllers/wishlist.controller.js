const Wishlist = require("../models/wishlist.model");
const Product = require("../models/product.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// Get user's wishlist
exports.getWishlist = catchAsync(async (req, res, next) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
    path: "products.product",
    select: "name slug price originalPrice images category rating stock",
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }

  // Transform products to include addedAt at the item level
  const items = wishlist.products.map((item) => ({
    _id: item._id,
    product: item.product,
    addedAt: item.addedAt,
  }));

  res.status(200).json({
    status: "success",
    data: {
      wishlist: {
        _id: wishlist._id,
        items,
        itemCount: items.length,
      },
    },
  });
});

// Add product to wishlist
exports.addToWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  if (!productId) {
    return next(new AppError("Product ID is required", 400));
  }

  // Verify product exists
  const product = await Product.findOne({ _id: productId, deletedAt: null });
  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // Find or create wishlist
  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }

  // Add product using the model method
  await wishlist.addProduct(productId);

  res.status(200).json({
    status: "success",
    message: "Product added to wishlist",
    data: {
      inWishlist: true,
    },
  });
});

// Remove product from wishlist
exports.removeFromWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    return next(new AppError("Wishlist not found", 404));
  }

  await wishlist.removeProduct(productId);

  res.status(200).json({
    status: "success",
    message: "Product removed from wishlist",
    data: {
      inWishlist: false,
    },
  });
});

// Check if product is in wishlist
exports.checkWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });
  const inWishlist = wishlist ? wishlist.hasProduct(productId) : false;

  res.status(200).json({
    status: "success",
    data: {
      inWishlist,
    },
  });
});

// Clear entire wishlist
exports.clearWishlist = catchAsync(async (req, res, next) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });

  if (wishlist) {
    wishlist.products = [];
    await wishlist.save();
  }

  res.status(200).json({
    status: "success",
    message: "Wishlist cleared",
  });
});
