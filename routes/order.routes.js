const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  guestCheckoutSchema,
  authenticatedCheckoutSchema,
  orderTrackingSchema,
  updateOrderStatusSchema,
  getOrdersQuerySchema,
} = require("../validators/order.validator");

// ========== PUBLIC ROUTES ==========

// Guest checkout (no auth required)
router.post(
  "/guest-checkout",
  validate(guestCheckoutSchema),
  orderController.guestCheckout
);

// Track order (public - guest tracking)
router.post(
  "/track",
  validate(orderTrackingSchema),
  orderController.trackOrder
);

// eSewa callbacks (public)
router.get("/esewa/success", orderController.esewaSuccess);
router.get("/esewa/failure", orderController.esewaFailure);

// ========== AUTHENTICATED USER ROUTES ==========

// Authenticated checkout
router.post(
  "/checkout",
  protect,
  validate(authenticatedCheckoutSchema),
  orderController.authenticatedCheckout
);

// Get my orders
router.get("/my-orders", protect, orderController.getMyOrders);

// Get single order (user)
router.get("/:id", protect, orderController.getOrder);

// ========== ADMIN ROUTES ==========

// Get all orders (admin)
router.get(
  "/",
  protect,
  restrictTo("admin"),
  validate(getOrdersQuerySchema, "query"),
  orderController.getAllOrders
);

// Get order details (admin)
router.get(
  "/admin/:id",
  protect,
  restrictTo("admin"),
  orderController.getOrderAdmin
);

// Update order status (admin)
router.patch(
  "/:id/status",
  protect,
  restrictTo("admin"),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

module.exports = router;
