const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    variant: {
      color: String,
      size: String,
      material: String,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  }
);

// Index for user lookup
cartSchema.index({ user: 1 });

// Virtual for total items count
cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Method to add item to cart
cartSchema.methods.addItem = async function (productId, quantity = 1, variant = {}) {
  const existingItem = this.items.find(
    (item) =>
      item.product.toString() === productId.toString() &&
      JSON.stringify(item.variant) === JSON.stringify(variant)
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({ product: productId, quantity, variant });
  }

  return this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = async function (itemId) {
  this.items = this.items.filter((item) => item._id.toString() !== itemId.toString());
  return this.save();
};

// Method to clear cart
cartSchema.methods.clearCart = async function () {
  this.items = [];
  return this.save();
};

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
