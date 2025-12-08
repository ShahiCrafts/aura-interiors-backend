const Product = require("../models/product.model");
const Category = require("../models/category.model");
const path = require("path");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { deleteFile, deleteFiles } = require("../middleware/upload.middleware");

const UPLOADS_DIR = path.join(__dirname, "../uploads/products");

const parseJsonField = (field) => {
  if (!field) return undefined;
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      return field;
    }
  }
  return field;
};

const parseBoolean = (value) => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
};

// Get all products with filtering, sorting, and pagination
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    sort = "-createdAt",
    category,
    status,
    style,
    minPrice,
    maxPrice,
    search,
    featured,
    newArrivals,
    inStock,
  } = req.query;

  // Build filter
  const filter = { deletedAt: null };

  if (category) {
    const categories = category.split(",");
    filter.category = { $in: categories };
  }

  if (status) {
    filter.status = status;
  } else {
    filter.status = { $in: ["active", "out_of_stock"] };
  }

  if (style) {
    const styles = style.split(",");
    filter.style = { $in: styles };
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  if (featured === "true") {
    filter.isFeatured = true;
  }

  if (newArrivals === "true") {
    filter.isNewArrival = true;
  }

  if (inStock === "true") {
    filter.stock = { $gt: 0 };
    filter.status = "active";
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter).populate("category", "name slug").sort(sort).skip(skip).limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

// Get single product by ID or slug
exports.getProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const query = isObjectId ? { _id: id, deletedAt: null } : { slug: id, deletedAt: null };

  const product = await Product.findOne(query).populate("category", "name slug");

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

// Create new product (Admin only)
exports.createProduct = catchAsync(async (req, res, next) => {
  const {
    name,
    description,
    shortDescription,
    category,
    price,
    originalPrice,
    stock,
    sku,
    status,
    modelUrl,
    dimensions,
    weight,
    colors,
    materials,
    style,
    isFeatured,
    isNewArrival,
    metaTitle,
    metaDescription,
    tags,
  } = req.body;

  // Verify category exists
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    return next(new AppError("Category not found", 400));
  }

  const productData = {
    name,
    description,
    shortDescription,
    category,
    price: parseFloat(price),
    originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
    stock: parseInt(stock, 10) || 0,
    sku,
    status: status || "active",
    modelUrl,
    style,
    isFeatured: parseBoolean(isFeatured) || false,
    isNewArrival: parseBoolean(isNewArrival) || false,
    metaTitle,
    metaDescription,
    dimensions: parseJsonField(dimensions),
    weight: parseJsonField(weight),
    colors: parseJsonField(colors),
    materials: parseJsonField(materials),
    tags: parseJsonField(tags),
  };

  // Handle images if uploaded
  if (req.files && req.files.length > 0) {
    productData.images = req.files.map((file, index) => ({
      url: file.filename,
      alt: name,
      isPrimary: index === 0,
    }));
  }

  const product = await Product.create(productData);
  await product.populate("category", "name slug");

  res.status(201).json({
    status: "success",
    data: {
      product,
    },
  });
});

// Update product (Admin only)
exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({ _id: req.params.id, deletedAt: null });

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  const {
    name,
    description,
    shortDescription,
    category,
    price,
    originalPrice,
    stock,
    sku,
    status,
    modelUrl,
    dimensions,
    weight,
    colors,
    materials,
    style,
    isFeatured,
    isNewArrival,
    metaTitle,
    metaDescription,
    tags,
    removeImages,
  } = req.body;

  // Verify category if being updated
  if (category) {
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return next(new AppError("Category not found", 400));
    }
    product.category = category;
  }

  // Update basic fields
  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (shortDescription !== undefined) product.shortDescription = shortDescription;
  if (price !== undefined) product.price = parseFloat(price);
  if (originalPrice !== undefined) product.originalPrice = parseFloat(originalPrice);
  if (stock !== undefined) product.stock = parseInt(stock, 10);
  if (sku !== undefined) product.sku = sku;
  if (status !== undefined) product.status = status;
  if (modelUrl !== undefined) product.modelUrl = modelUrl;
  if (style !== undefined) product.style = style;

  const featuredValue = parseBoolean(isFeatured);
  const newArrivalValue = parseBoolean(isNewArrival);
  if (featuredValue !== undefined) product.isFeatured = featuredValue;
  if (newArrivalValue !== undefined) product.isNewArrival = newArrivalValue;

  if (metaTitle !== undefined) product.metaTitle = metaTitle;
  if (metaDescription !== undefined) product.metaDescription = metaDescription;

  // Parse and update JSON fields
  if (dimensions !== undefined) product.dimensions = parseJsonField(dimensions);
  if (weight !== undefined) product.weight = parseJsonField(weight);
  if (colors !== undefined) product.colors = parseJsonField(colors);
  if (materials !== undefined) product.materials = parseJsonField(materials);
  if (tags !== undefined) product.tags = parseJsonField(tags);

  // Handle image removal
  if (removeImages) {
    const imagesToRemove = parseJsonField(removeImages) || [];
    const filePaths = imagesToRemove.map((imageUrl) => path.join(UPLOADS_DIR, imageUrl));
    await deleteFiles(filePaths);
    product.images = product.images.filter((img) => !imagesToRemove.includes(img.url));
  }

  // Handle new images
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map((file) => ({
      url: file.filename,
      alt: product.name,
      isPrimary: false,
    }));

    // If no images exist, mark first new image as primary
    if (product.images.length === 0 && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    product.images.push(...newImages);
  }

  await product.save();
  await product.populate("category", "name slug");

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

// Delete product - soft delete (Admin only)
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({ _id: req.params.id, deletedAt: null });

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  await product.softDelete();

  res.status(200).json({
    status: "success",
    message: "Product deleted successfully",
  });
});

// Hard delete product (Admin only)
exports.hardDeleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // Delete product images from filesystem
  if (product.images && product.images.length > 0) {
    const filePaths = product.images.map((image) => path.join(UPLOADS_DIR, image.url));
    await deleteFiles(filePaths);
  }

  await Product.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: "success",
    message: "Product permanently deleted",
  });
});

// Set primary image (Admin only)
exports.setPrimaryImage = catchAsync(async (req, res, next) => {
  const { imageId } = req.body;
  const product = await Product.findOne({ _id: req.params.id, deletedAt: null });

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  const imageExists = product.images.some((img) => img._id.toString() === imageId);
  if (!imageExists) {
    return next(new AppError("Image not found", 404));
  }

  product.images.forEach((img) => {
    img.isPrimary = img._id.toString() === imageId;
  });

  await product.save();

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

// Get related products
exports.getRelatedProducts = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { limit = 4 } = req.query;

  const product = await Product.findOne({ _id: id, deletedAt: null });

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: id },
    deletedAt: null,
    status: "active",
  })
    .limit(parseInt(limit, 10))
    .select("name slug price originalPrice images rating category")
    .populate("category", "name slug");

  res.status(200).json({
    status: "success",
    results: relatedProducts.length,
    data: {
      products: relatedProducts,
    },
  });
});

// Get featured products
exports.getFeaturedProducts = catchAsync(async (req, res, next) => {
  const { limit = 8 } = req.query;

  const products = await Product.find({
    isFeatured: true,
    deletedAt: null,
    status: "active",
  })
    .limit(parseInt(limit, 10))
    .select("name slug price originalPrice images rating category")
    .populate("category", "name slug");

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
    },
  });
});

// Get new arrivals
exports.getNewArrivals = catchAsync(async (req, res, next) => {
  const { limit = 8 } = req.query;

  const products = await Product.find({
    isNewArrival: true,
    deletedAt: null,
    status: "active",
  })
    .limit(parseInt(limit, 10))
    .select("name slug price originalPrice images rating category")
    .populate("category", "name slug");

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
    },
  });
});

// Update product stock (Admin only)
exports.updateStock = catchAsync(async (req, res, next) => {
  const { stock } = req.body;
  const product = await Product.findOne({ _id: req.params.id, deletedAt: null });

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  product.stock = parseInt(stock, 10);

  // Auto-update status based on stock
  if (product.stock === 0 && product.status === "active") {
    product.status = "out_of_stock";
  } else if (product.stock > 0 && product.status === "out_of_stock") {
    product.status = "active";
  }

  await product.save();

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});
