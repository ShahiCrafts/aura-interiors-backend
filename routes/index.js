const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "Aura Interiors API running..",
  });
});

module.exports = router;
