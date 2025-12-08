const express = require("express");
const router = express.Router();
const addressController = require("../controllers/address.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", addressController.getAllAddresses);
router.post("/", addressController.createAddress);
router.get("/:id", addressController.getAddress);
router.patch("/:id", addressController.updateAddress);
router.delete("/:id", addressController.deleteAddress);
router.patch("/:id/set-default", addressController.setDefaultAddress);

module.exports = router;
