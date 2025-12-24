const express = require("express");
const router = express.Router();
const discountController = require("../controllers/discount.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createDiscountSchema,
  updateDiscountSchema,
  getDiscountsQuerySchema,
  applyDiscountSchema,
} = require("../validators/discount.validator");

// All routes require authentication
router.use(protect);

// User routes
router.post(
  "/apply",
  validate(applyDiscountSchema),
  discountController.applyDiscount
);

router.get("/validate/:code", discountController.validateDiscount);

// Admin only routes
router.use(restrictTo("admin"));

router.get(
  "/",
  validate(getDiscountsQuerySchema, "query"),
  discountController.getAllDiscounts
);

router.get("/:id", discountController.getDiscount);

router.post(
  "/",
  validate(createDiscountSchema),
  discountController.createDiscount
);

router.patch(
  "/:id",
  validate(updateDiscountSchema),
  discountController.updateDiscount
);

router.delete("/:id", discountController.deleteDiscount);

module.exports = router;
