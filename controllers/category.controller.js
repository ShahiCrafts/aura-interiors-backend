const Category = require("../models/category.model");
const Product = require("../models/product.model");
const path = require("path");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { deleteFile } = require("../middleware/upload.middleware");

const UPLOADS_DIR = path.join(__dirname, "../uploads/categories");

exports.getAllCategories = catchAsync(async (req, res, next) => {
  const { tree, status, parent } = req.query;

  if (tree === "true") {
    const categories = await Category.getCategoryTree();
    return res.status(200).json({
      status: "success",
      results: categories.length,
      data: {
        categories,
      },
    });
  }

  const filter = {};
  if (status) filter.status = status;
  if (parent === "null") {
    filter.parent = null;
  } else if (parent) {
    filter.parent = parent;
  }

  const categories = await Category.find(filter)
    .populate("subcategories", "name slug status")
    .populate("productCount")
    .sort({ sortOrder: 1, name: 1 });

  res.status(200).json({
    status: "success",
    results: categories.length,
    data: {
      categories,
    },
  });
});

exports.getCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const query = isObjectId ? { _id: id } : { slug: id };

  const category = await Category.findOne(query)
    .populate("subcategories", "name slug image status")
    .populate("productCount")
    .populate("parent", "name slug");

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      category,
    },
  });
});

// Create new category (Admin only)
exports.createCategory = catchAsync(async (req, res, next) => {
  const { name, description, parent, status, sortOrder } = req.body;

  // Check if parent category exists
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return next(new AppError("Parent category not found", 400));
    }
  }

  const categoryData = {
    name,
    description,
    parent: parent || null,
    status: status || "active",
    sortOrder: sortOrder || 0,
  };

  // Handle image if uploaded
  if (req.file) {
    categoryData.image = req.file.filename;
  }

  const category = await Category.create(categoryData);

  res.status(201).json({
    status: "success",
    data: {
      category,
    },
  });
});

// Update category (Admin only)
exports.updateCategory = catchAsync(async (req, res, next) => {
  const { name, description, parent, status, sortOrder } = req.body;

  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  // Prevent setting self as parent
  if (parent && parent === req.params.id) {
    return next(new AppError("Category cannot be its own parent", 400));
  }

  // Check if new parent exists
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return next(new AppError("Parent category not found", 400));
    }
  }

  // Update fields
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (parent !== undefined) category.parent = parent || null;
  if (status !== undefined) category.status = status;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;

  // Handle image update
  if (req.file) {
    // Delete old image if exists
    if (category.image) {
      await deleteFile(path.join(UPLOADS_DIR, category.image));
    }
    category.image = req.file.filename;
  }

  await category.save();

  res.status(200).json({
    status: "success",
    data: {
      category,
    },
  });
});

// Delete category (Admin only)
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  // Check if category has subcategories
  const subcategoriesCount = await Category.countDocuments({
    parent: req.params.id,
  });
  if (subcategoriesCount > 0) {
    return next(
      new AppError(
        "Cannot delete category with subcategories. Delete subcategories first.",
        400
      )
    );
  }

  // Check if category has products
  const productsCount = await Product.countDocuments({
    category: req.params.id,
    deletedAt: null,
  });
  if (productsCount > 0) {
    return next(
      new AppError(
        `Cannot delete category with ${productsCount} active products. Move or delete products first.`,
        400
      )
    );
  }

  // Delete image if exists
  if (category.image) {
    await deleteFile(path.join(UPLOADS_DIR, category.image));
  }

  await Category.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: "success",
    message: "Category deleted successfully",
  });
});

// Get category products
exports.getCategoryProducts = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { page = 1, limit = 20, sort = "-createdAt", search } = req.query;

  // Check if it's an ObjectId or slug
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const query = isObjectId ? { _id: id } : { slug: id };

  const category = await Category.findOne(query);

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Build filter for products
  const filter = {
    category: category._id,
    deletedAt: null,
    status: { $in: ["active", "out_of_stock"] },
  };

  // Handle search
  if (search) {
    filter.$text = { $search: search };
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug,
      },
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
