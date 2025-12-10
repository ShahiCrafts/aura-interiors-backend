const mongoose = require("mongoose");

const dimensionsSchema = new mongoose.Schema(
  {
    width: {
      type: Number,
      min: 0,
    },
    height: {
      type: Number,
      min: 0,
    },
    depth: {
      type: Number,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["cm", "m", "in"],
      default: "cm",
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      min: [0, "Original price cannot be negative"],
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "out_of_stock", "discontinued"],
      default: "active",
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        alt: {
          type: String,
          trim: true,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // 3D Model support for AR viewing (legacy single URL field)
    modelUrl: {
      type: String,
      trim: true,
    },
    // Multiple 3D models for cross-platform AR support (files or URLs)
    modelFiles: [
      {
        url: {
          type: String,
          required: true,
        },
        format: {
          type: String,
          enum: ['glb', 'gltf', 'usdz'],
          required: true,
        },
        platform: {
          type: String,
          enum: ['android', 'ios', 'universal'],
          default: 'universal',
        },
        fileSize: {
          type: Number,
        },
        isExternal: {
          type: Boolean,
          default: false, // false = uploaded file, true = external URL
        },
      },
    ],
    arAvailable: {
      type: Boolean,
      default: false,
    },
    // Physical specifications
    dimensions: dimensionsSchema,
    weight: {
      value: {
        type: Number,
        min: 0,
      },
      unit: {
        type: String,
        enum: ["kg", "lb", "g"],
        default: "kg",
      },
    },
    // Product variants
    colors: [
      {
        type: String,
        trim: true,
      },
    ],
    materials: [
      {
        type: String,
        trim: true,
      },
    ],
    // Style classification
    style: {
      type: String,
      enum: [
        "modern",
        "contemporary",
        "classic",
        "minimal",
        "cozy",
        "industrial",
        "scandinavian",
        "bohemian",
      ],
      trim: true,
    },
    // Ratings and reviews
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    // For featured/promotional products
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    // SEO fields
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [100, "Meta title cannot exceed 100 characters"],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [300, "Meta description cannot exceed 300 characters"],
    },
    // Tags for search
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    // Soft delete
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient queries (slug index created by unique: true)
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ deletedAt: 1 });

// Virtual for discount percentage
productSchema.virtual("discountPercentage").get(function () {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100
    );
  }
  return 0;
});

// Virtual for in stock status
productSchema.virtual("inStock").get(function () {
  return (
    this.stock > 0 &&
    this.status !== "out_of_stock" &&
    this.status !== "discontinued"
  );
});

// Virtual for primary image
productSchema.virtual("primaryImage").get(function () {
  if (!this.images || this.images.length === 0) return null;
  const primary = this.images.find((img) => img.isPrimary);
  return primary ? primary.url : this.images[0].url;
});

// Generate slug from name before saving
productSchema.pre("save", function (next) {
  if (this.isModified("name") || !this.slug) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    this.slug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  // Auto-set arAvailable based on modelUrl or modelFiles
  if (this.isModified("modelUrl") || this.isModified("modelFiles")) {
    this.arAvailable = !!this.modelUrl || (this.modelFiles && this.modelFiles.length > 0);
  }

  // Auto-update status based on stock
  if (
    this.isModified("stock") &&
    this.stock === 0 &&
    this.status === "active"
  ) {
    this.status = "out_of_stock";
  }
});

// Static method to find active products (not deleted)
productSchema.statics.findActive = function (filter = {}) {
  return this.find({
    ...filter,
    deletedAt: null,
    status: { $ne: "discontinued" },
  });
};

// Static method for soft delete
productSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  this.status = "discontinued";
  return this.save();
};

// Static method to get products by category
productSchema.statics.getByCategory = function (categoryId, options = {}) {
  const { page = 1, limit = 20, sort = "-createdAt" } = options;
  return this.find({
    category: categoryId,
    deletedAt: null,
    status: { $in: ["active", "out_of_stock"] },
  })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("category", "name slug");
};

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
