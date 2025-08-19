const express = require("express");
const { uploadImageAndExtractText, uploadSellRequestImage, saveEditedData } = require("../controllers/ocrController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/upload", protect, managerOnly, uploadImageAndExtractText);
router.post("/sell", protect, managerOnly, uploadSellRequestImage);
router.post("/save", protect, managerOnly, saveEditedData);

module.exports = router;