const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart.controller");
const { protect } = require("../middleware/auth.middleware");

// All cart routes require authentication
router.use(protect);

// Get cart
router.get("/", cartController.getCart);

// Add item to cart
router.post("/", cartController.addToCart);

// Update cart item quantity
router.patch("/items/:itemId", cartController.updateCartItem);

// Remove item from cart
router.delete("/items/:itemId", cartController.removeFromCart);

// Clear entire cart
router.delete("/", cartController.clearCart);

module.exports = router;
