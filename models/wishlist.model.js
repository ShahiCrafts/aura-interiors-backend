const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for user lookup
wishlistSchema.index({ user: 1 });

// Method to add product to wishlist
wishlistSchema.methods.addProduct = async function (productId) {
  const exists = this.products.some(
    (item) => item.product.toString() === productId.toString()
  );

  if (!exists) {
    this.products.push({ product: productId });
    return this.save();
  }

  return this;
};

// Method to remove product from wishlist
wishlistSchema.methods.removeProduct = async function (productId) {
  this.products = this.products.filter(
    (item) => item.product.toString() !== productId.toString()
  );
  return this.save();
};

// Method to check if product is in wishlist
wishlistSchema.methods.hasProduct = function (productId) {
  return this.products.some(
    (item) => item.product.toString() === productId.toString()
  );
};

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

module.exports = Wishlist;
