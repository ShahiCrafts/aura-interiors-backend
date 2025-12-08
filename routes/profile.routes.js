const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profile.controller");
const { protect } = require("../middleware/auth.middleware");
const { uploadAvatar, resizeAvatar } = require("../middleware/upload.middleware");

router.use(protect);

router.get("/", profileController.getProfile);
router.patch("/", profileController.updateProfile);

router.patch(
  "/avatar",
  uploadAvatar,
  resizeAvatar,
  profileController.updateAvatar
);
router.delete("/avatar", profileController.removeAvatar);

router.patch("/preferences", profileController.updatePreferences);

router.delete("/", profileController.deleteAccount);

module.exports = router;
