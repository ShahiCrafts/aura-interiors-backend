const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, "valid ObjectId");

const dimensionsSchema = Joi.object({
  width: Joi.number().min(0).messages({
    "number.min": "Width cannot be negative",
  }),
  height: Joi.number().min(0).messages({
    "number.min": "Height cannot be negative",
  }),
  depth: Joi.number().min(0).messages({
    "number.min": "Depth cannot be negative",
  }),
  unit: Joi.string().valid("cm", "m", "in").default("cm"),
});

const weightSchema = Joi.object({
  value: Joi.number().min(0).messages({
    "number.min": "Weight cannot be negative",
  }),
  unit: Joi.string().valid("kg", "lb", "g").default("kg"),
});

exports.createProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Product name is required",
    "string.max": "Product name cannot exceed 200 characters",
    "any.required": "Product name is required",
  }),
  description: Joi.string().trim().min(1).max(5000).required().messages({
    "string.empty": "Product description is required",
    "string.max": "Description cannot exceed 5000 characters",
    "any.required": "Product description is required",
  }),
  shortDescription: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Short description cannot exceed 500 characters",
  }),
  category: objectId.required().messages({
    "any.required": "Product category is required",
    "string.pattern.name": "Invalid category ID",
  }),
  price: Joi.number().positive().required().messages({
    "number.positive": "Price must be a positive number",
    "any.required": "Product price is required",
  }),
  originalPrice: Joi.number().positive().allow(null).messages({
    "number.positive": "Original price must be a positive number",
  }),
  stock: Joi.number().integer().min(0).default(0).messages({
    "number.min": "Stock cannot be negative",
  }),
  sku: Joi.string().trim().uppercase().max(50).allow("").messages({
    "string.max": "SKU cannot exceed 50 characters",
  }),
  status: Joi.string()
    .valid("active", "inactive", "out_of_stock", "discontinued")
    .default("active")
    .messages({
      "any.only": "Invalid product status",
    }),
  modelUrl: Joi.string().uri().allow("").messages({
    "string.uri": "Model URL must be a valid URL",
  }),
  dimensions: Joi.alternatives().try(
    dimensionsSchema,
    Joi.string() // Allow JSON string from form-data
  ),
  weight: Joi.alternatives().try(
    weightSchema,
    Joi.string() // Allow JSON string from form-data
  ),
  colors: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string() // Allow JSON string from form-data
  ),
  materials: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string() // Allow JSON string from form-data
  ),
  style: Joi.string()
    .valid("modern", "contemporary", "classic", "minimal", "cozy", "industrial", "scandinavian", "bohemian")
    .allow("")
    .messages({
      "any.only": "Invalid style value",
    }),
  isFeatured: Joi.alternatives().try(Joi.boolean(), Joi.string().valid("true", "false")).default(false),
  isNewArrival: Joi.alternatives().try(Joi.boolean(), Joi.string().valid("true", "false")).default(false),
  metaTitle: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Meta title cannot exceed 100 characters",
  }),
  metaDescription: Joi.string().trim().max(300).allow("").messages({
    "string.max": "Meta description cannot exceed 300 characters",
  }),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().lowercase()),
    Joi.string() // Allow JSON string from form-data
  ),
});

exports.updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).messages({
    "string.empty": "Product name cannot be empty",
    "string.max": "Product name cannot exceed 200 characters",
  }),
  description: Joi.string().trim().min(1).max(5000).messages({
    "string.empty": "Product description cannot be empty",
    "string.max": "Description cannot exceed 5000 characters",
  }),
  shortDescription: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Short description cannot exceed 500 characters",
  }),
  category: objectId.messages({
    "string.pattern.name": "Invalid category ID",
  }),
  price: Joi.number().positive().messages({
    "number.positive": "Price must be a positive number",
  }),
  originalPrice: Joi.number().positive().allow(null).messages({
    "number.positive": "Original price must be a positive number",
  }),
  stock: Joi.number().integer().min(0).messages({
    "number.min": "Stock cannot be negative",
  }),
  sku: Joi.string().trim().uppercase().max(50).allow("").messages({
    "string.max": "SKU cannot exceed 50 characters",
  }),
  status: Joi.string().valid("active", "inactive", "out_of_stock", "discontinued").messages({
    "any.only": "Invalid product status",
  }),
  modelUrl: Joi.string().uri().allow("", null).messages({
    "string.uri": "Model URL must be a valid URL",
  }),
  dimensions: Joi.alternatives().try(dimensionsSchema, Joi.string()),
  weight: Joi.alternatives().try(weightSchema, Joi.string()),
  colors: Joi.alternatives().try(Joi.array().items(Joi.string().trim()), Joi.string()),
  materials: Joi.alternatives().try(Joi.array().items(Joi.string().trim()), Joi.string()),
  style: Joi.string()
    .valid("modern", "contemporary", "classic", "minimal", "cozy", "industrial", "scandinavian", "bohemian")
    .allow("", null)
    .messages({
      "any.only": "Invalid style value",
    }),
  isFeatured: Joi.alternatives().try(Joi.boolean(), Joi.string().valid("true", "false")),
  isNewArrival: Joi.alternatives().try(Joi.boolean(), Joi.string().valid("true", "false")),
  metaTitle: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Meta title cannot exceed 100 characters",
  }),
  metaDescription: Joi.string().trim().max(300).allow("").messages({
    "string.max": "Meta description cannot exceed 300 characters",
  }),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string().trim().lowercase()), Joi.string()),
  removeImages: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
});

exports.getProductsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().default("-createdAt"),
  category: Joi.string(), // comma-separated ObjectIds
  status: Joi.string().valid("active", "inactive", "out_of_stock", "discontinued"),
  style: Joi.string(), // comma-separated styles
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  search: Joi.string().trim().max(200),
  featured: Joi.string().valid("true", "false"),
  newArrivals: Joi.string().valid("true", "false"),
  inStock: Joi.string().valid("true", "false"),
});

exports.updateStockSchema = Joi.object({
  stock: Joi.number().integer().min(0).required().messages({
    "number.min": "Stock cannot be negative",
    "any.required": "Stock quantity is required",
  }),
});

exports.setPrimaryImageSchema = Joi.object({
  imageId: objectId.required().messages({
    "any.required": "Image ID is required",
    "string.pattern.name": "Invalid image ID",
  }),
});
