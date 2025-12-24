const mongoose = require("mongoose");

// Embedded schema for shipping/billing address (copied at order time)
const orderAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: String,
    postalCode: { type: String, required: true },
    country: { type: String, default: "Nepal" },
  },
  { _id: false }
);

// Embedded schema for order items (snapshot at order time)
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    variant: {
      color: String,
      size: String,
      material: String,
    },
    image: String,
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    // Unique order ID for tracking (human-readable)
    orderId: {
      type: String,
      unique: true,
    },

    // User reference (null for guest checkout)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Guest information (for guest checkout)
    guestInfo: {
      email: { type: String, required: true },
      firstName: String,
      lastName: String,
      phone: String,
    },

    // Flag to identify guest orders
    isGuestOrder: {
      type: Boolean,
      default: false,
    },

    // Order items
    items: [orderItemSchema],

    // Shipping address
    shippingAddress: {
      type: orderAddressSchema,
      required: true,
    },

    // Billing address (optional, defaults to shipping)
    billingAddress: orderAddressSchema,

    // Pricing
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },

    // Applied discount code
    discountCode: {
      code: String,
      percentage: Number,
    },

    // Payment information
    paymentMethod: {
      type: String,
      enum: ["cod", "esewa"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentDetails: {
      transactionId: String,
      esewaRefId: String,
      paidAt: Date,
      paymentGatewayResponse: mongoose.Schema.Types.Mixed,
    },

    // Order status
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },

    // Status history for tracking
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],

    // Timestamps
    orderedAt: { type: Date, default: Date.now },
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    // Notes
    customerNote: String,
    adminNote: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes (orderId index already created by unique: true)
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ "guestInfo.email": 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Generate unique order ID before saving
orderSchema.pre("save", function () {
  if (this.isNew && !this.orderId) {
    const prefix = "AU";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderId = `${prefix}${timestamp}${random}`;
  }
});

// Method to add status history entry
orderSchema.methods.addStatusHistory = function (status, note = "") {
  this.statusHistory.push({ status, note, timestamp: new Date() });
  this.orderStatus = status;
  return this;
};

// Static method to find order for guest tracking
orderSchema.statics.findByOrderIdAndEmail = async function (orderId, email) {
  return this.findOne({
    orderId: orderId.toUpperCase(),
    "guestInfo.email": email.toLowerCase(),
  });
};

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
