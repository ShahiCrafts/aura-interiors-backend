const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image: {
      type: String,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for subcategories
categorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

// Virtual for product count (will be populated when needed)
categorySchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  count: true,
});

// Index for efficient queries
categorySchema.index({ parent: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ status: 1 });

// Generate slug from name before saving
categorySchema.pre("save", function (next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

// Static method to get category tree
categorySchema.statics.getCategoryTree = async function () {
  const categories = await this.find({ parent: null, status: "active" })
    .populate({
      path: "subcategories",
      match: { status: "active" },
      select: "name slug image status",
    })
    .populate("productCount")
    .sort({ sortOrder: 1, name: 1 });

  return categories;
};

// Static method to find active categories
categorySchema.statics.findActive = function () {
  return this.find({ status: "active" });
};

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
