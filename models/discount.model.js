const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Discount code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, "Discount code cannot exceed 20 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    discountPercentage: {
      type: Number,
      required: [true, "Discount percentage is required"],
      min: [1, "Discount must be at least 1%"],
      max: [100, "Discount cannot exceed 100%"],
    },
    minimumOrderAmount: {
      type: Number,
      required: [true, "Minimum order amount is required"],
      min: [0, "Minimum order amount cannot be negative"],
      default: 0,
    },
    maxUsageLimit: {
      type: Number,
      min: [1, "Usage limit must be at least 1"],
      default: null,
    },
    currentUsageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
discountSchema.index({ code: 1 });
discountSchema.index({ expiryDate: 1 });
discountSchema.index({ isActive: 1 });

// Virtual: Check if expired
discountSchema.virtual("isExpired").get(function () {
  return new Date() > this.expiryDate;
});

// Virtual: Check if usage limit reached
discountSchema.virtual("isUsageLimitReached").get(function () {
  if (!this.maxUsageLimit) return false;
  return this.currentUsageCount >= this.maxUsageLimit;
});

// Virtual: Check if valid (active, not expired, usage limit not reached)
discountSchema.virtual("isValid").get(function () {
  return this.isActive && !this.isExpired && !this.isUsageLimitReached;
});

// Method: Validate discount for a given cart subtotal
discountSchema.methods.validateForCart = function (subtotal) {
  if (!this.isActive) {
    return { valid: false, message: "This discount code is no longer active" };
  }
  if (this.isExpired) {
    return { valid: false, message: "This discount code has expired" };
  }
  if (this.isUsageLimitReached) {
    return {
      valid: false,
      message: "This discount code has reached its usage limit",
    };
  }
  if (subtotal < this.minimumOrderAmount) {
    return {
      valid: false,
      message: `Minimum order amount of Rs. ${this.minimumOrderAmount} required`,
    };
  }
  return { valid: true, message: "Discount code is valid" };
};

// Method: Calculate discount amount
discountSchema.methods.calculateDiscount = function (subtotal) {
  return Math.round((subtotal * this.discountPercentage) / 100);
};

// Method: Increment usage count
discountSchema.methods.incrementUsage = async function () {
  this.currentUsageCount += 1;
  return this.save();
};

// Static: Find valid discount by code
discountSchema.statics.findValidByCode = async function (code) {
  return this.findOne({
    code: code.toUpperCase(),
    isActive: true,
    expiryDate: { $gt: new Date() },
    $or: [
      { maxUsageLimit: null },
      { $expr: { $lt: ["$currentUsageCount", "$maxUsageLimit"] } },
    ],
  });
};

const Discount = mongoose.model("Discount", discountSchema);

module.exports = Discount;
