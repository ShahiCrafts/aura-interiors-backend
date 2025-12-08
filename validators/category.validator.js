const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, "valid ObjectId");

exports.createCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Category name is required",
    "string.max": "Category name cannot exceed 100 characters",
    "any.required": "Category name is required",
  }),
  description: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  parent: objectId.allow(null, "").messages({
    "string.pattern.name": "Invalid parent category ID",
  }),
  status: Joi.string().valid("active", "inactive").default("active").messages({
    "any.only": "Status must be either 'active' or 'inactive'",
  }),
  sortOrder: Joi.number().integer().min(0).default(0).messages({
    "number.min": "Sort order cannot be negative",
  }),
});

exports.updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).messages({
    "string.empty": "Category name cannot be empty",
    "string.max": "Category name cannot exceed 100 characters",
  }),
  description: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  parent: objectId.allow(null, "").messages({
    "string.pattern.name": "Invalid parent category ID",
  }),
  status: Joi.string().valid("active", "inactive").messages({
    "any.only": "Status must be either 'active' or 'inactive'",
  }),
  sortOrder: Joi.number().integer().min(0).messages({
    "number.min": "Sort order cannot be negative",
  }),
}).min(1).messages({
  "object.min": "At least one field must be provided for update",
});

exports.getCategoriesQuerySchema = Joi.object({
  tree: Joi.string().valid("true", "false"),
  status: Joi.string().valid("active", "inactive"),
  parent: Joi.alternatives().try(objectId, Joi.string().valid("null")),
});
