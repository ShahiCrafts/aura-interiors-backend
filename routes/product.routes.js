const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { uploadProductFiles, processProductFiles } = require("../middleware/upload.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema,
  updateStockSchema,
  setPrimaryImageSchema,
} = require("../validators/product.validator");

// Public routes
router.get("/", validate(getProductsQuerySchema, "query"), productController.getAllProducts);
router.get("/featured", productController.getFeaturedProducts);
router.get("/new-arrivals", productController.getNewArrivals);
router.get("/:id", productController.getProduct);
router.get("/:id/related", productController.getRelatedProducts);

// Admin only routes
router.use(protect, restrictTo("admin"));

router.post(
  "/",
  uploadProductFiles,
  processProductFiles,
  validate(createProductSchema),
  productController.createProduct
);

router.patch(
  "/:id",
  uploadProductFiles,
  processProductFiles,
  validate(updateProductSchema),
  productController.updateProduct
);

router.delete("/:id", productController.deleteProduct);
router.delete("/:id/permanent", productController.hardDeleteProduct);
router.patch("/:id/primary-image", validate(setPrimaryImageSchema), productController.setPrimaryImage);
router.patch("/:id/stock", validate(updateStockSchema), productController.updateStock);

module.exports = router;
