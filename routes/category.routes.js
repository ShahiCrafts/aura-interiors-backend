const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { uploadCategoryImage, resizeCategoryImage } = require("../middleware/upload.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createCategorySchema,
  updateCategorySchema,
  getCategoriesQuerySchema,
} = require("../validators/category.validator");

// Public routes
router.get("/", validate(getCategoriesQuerySchema, "query"), categoryController.getAllCategories);
router.get("/:id", categoryController.getCategory);
router.get("/:id/products", categoryController.getCategoryProducts);

// Admin only routes
router.use(protect, restrictTo("admin"));

router.post(
  "/",
  uploadCategoryImage,
  resizeCategoryImage,
  validate(createCategorySchema),
  categoryController.createCategory
);

router.patch(
  "/:id",
  uploadCategoryImage,
  resizeCategoryImage,
  validate(updateCategorySchema),
  categoryController.updateCategory
);

router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
