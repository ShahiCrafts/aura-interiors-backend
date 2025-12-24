const Joi = require("joi");

exports.createDiscountSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .min(3)
    .max(20)
    .pattern(/^[A-Z0-9]+$/)
    .required()
    .messages({
      "string.empty": "Discount code is required",
      "string.min": "Discount code must be at least 3 characters",
      "string.max": "Discount code cannot exceed 20 characters",
      "string.pattern.base":
        "Discount code can only contain letters and numbers",
      "any.required": "Discount code is required",
    }),
  description: Joi.string().trim().max(200).allow("").messages({
    "string.max": "Description cannot exceed 200 characters",
  }),
  discountPercentage: Joi.number().min(1).max(100).required().messages({
    "number.min": "Discount must be at least 1%",
    "number.max": "Discount cannot exceed 100%",
    "any.required": "Discount percentage is required",
  }),
  minimumOrderAmount: Joi.number().min(0).default(0).messages({
    "number.min": "Minimum order amount cannot be negative",
  }),
  maxUsageLimit: Joi.number().integer().min(1).allow(null).messages({
    "number.min": "Usage limit must be at least 1",
  }),
  expiryDate: Joi.date().greater("now").required().messages({
    "date.greater": "Expiry date must be in the future",
    "any.required": "Expiry date is required",
  }),
  isActive: Joi.boolean().default(true),
});

exports.updateDiscountSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .min(3)
    .max(20)
    .pattern(/^[A-Z0-9]+$/)
    .messages({
      "string.min": "Discount code must be at least 3 characters",
      "string.max": "Discount code cannot exceed 20 characters",
      "string.pattern.base":
        "Discount code can only contain letters and numbers",
    }),
  description: Joi.string().trim().max(200).allow("").messages({
    "string.max": "Description cannot exceed 200 characters",
  }),
  discountPercentage: Joi.number().min(1).max(100).messages({
    "number.min": "Discount must be at least 1%",
    "number.max": "Discount cannot exceed 100%",
  }),
  minimumOrderAmount: Joi.number().min(0).messages({
    "number.min": "Minimum order amount cannot be negative",
  }),
  maxUsageLimit: Joi.number().integer().min(1).allow(null).messages({
    "number.min": "Usage limit must be at least 1",
  }),
  expiryDate: Joi.date().messages({
    "date.base": "Invalid expiry date",
  }),
  isActive: Joi.boolean(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

exports.getDiscountsQuerySchema = Joi.object({
  status: Joi.string().valid("active", "expired", "inactive"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

exports.applyDiscountSchema = Joi.object({
  code: Joi.string().trim().uppercase().required().messages({
    "string.empty": "Discount code is required",
    "any.required": "Discount code is required",
  }),
});
