const Joi = require("joi");

// Address schema for validation
const addressSchema = Joi.object({
  fullName: Joi.string().trim().required().max(100),
  phone: Joi.string()
    .trim()
    .required()
    .pattern(/^[0-9+\-\s]{7,15}$/),
  addressLine1: Joi.string().trim().required().max(200),
  addressLine2: Joi.string().trim().max(200).allow(""),
  city: Joi.string().trim().required().max(100),
  state: Joi.string().trim().max(100).allow(""),
  postalCode: Joi.string().trim().required().max(20),
  country: Joi.string().trim().default("Nepal").max(100),
});

// Guest checkout schema
exports.guestCheckoutSchema = Joi.object({
  // Guest info
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  firstName: Joi.string().trim().required().max(50).messages({
    "any.required": "First name is required",
  }),
  lastName: Joi.string().trim().required().max(50).messages({
    "any.required": "Last name is required",
  }),
  phone: Joi.string()
    .trim()
    .required()
    .pattern(/^[0-9+\-\s]{7,15}$/)
    .messages({
      "any.required": "Phone number is required",
      "string.pattern.base": "Please provide a valid phone number",
    }),

  // Cart items
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        variant: Joi.object({
          color: Joi.string().allow(""),
          size: Joi.string().allow(""),
          material: Joi.string().allow(""),
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "Cart cannot be empty",
      "any.required": "Cart items are required",
    }),

  // Addresses
  shippingAddress: addressSchema.required(),
  billingAddress: addressSchema,
  useSameAddress: Joi.boolean().default(true),

  // Payment
  paymentMethod: Joi.string().valid("cod", "esewa").required().messages({
    "any.only": "Payment method must be either cod or esewa",
    "any.required": "Payment method is required",
  }),

  // Discount
  discountCode: Joi.string().trim().uppercase().allow(""),

  // Notes
  customerNote: Joi.string().trim().max(500).allow(""),
});

// Authenticated checkout schema (uses saved cart)
exports.authenticatedCheckoutSchema = Joi.object({
  shippingAddressId: Joi.string(),
  shippingAddress: addressSchema,
  billingAddressId: Joi.string(),
  billingAddress: addressSchema,
  useSameAddress: Joi.boolean().default(true),
  paymentMethod: Joi.string().valid("cod", "esewa").required().messages({
    "any.only": "Payment method must be either cod or esewa",
    "any.required": "Payment method is required",
  }),
  discountCode: Joi.string().trim().uppercase().allow(""),
  customerNote: Joi.string().trim().max(500).allow(""),
}).or("shippingAddressId", "shippingAddress");

// Order tracking lookup schema
exports.orderTrackingSchema = Joi.object({
  orderId: Joi.string().trim().uppercase().required().messages({
    "any.required": "Order ID is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

// Update order status schema (admin)
exports.updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled"
    )
    .required()
    .messages({
      "any.only": "Invalid order status",
      "any.required": "Status is required",
    }),
  note: Joi.string().trim().max(500).allow(""),
});

// Get orders query schema (admin)
exports.getOrdersQuerySchema = Joi.object({
  status: Joi.string().valid(
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled"
  ),
  paymentStatus: Joi.string().valid("pending", "paid", "failed", "refunded"),
  search: Joi.string().trim(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
