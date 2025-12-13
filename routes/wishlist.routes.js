const express = require("express");
const router = express.Router();
const wishlistController = require("../controllers/wishlist.controller");
const { protect } = require("../middleware/auth.middleware");

// All wishlist routes require authentication
router.use(protect);

// Get user's wishlist
router.get("/", wishlistController.getWishlist);

// Add product to wishlist
router.post("/", wishlistController.addToWishlist);

// Check if product is in wishlist
router.get("/check/:productId", wishlistController.checkWishlist);

// Remove product from wishlist
router.delete("/:productId", wishlistController.removeFromWishlist);

// Clear entire wishlist
router.delete("/", wishlistController.clearWishlist);

module.exports = router;
