const express = require("express");
const { uploadImageAndExtractText, uploadSellRequestImage, saveEditedData, testOcr } = require("../controllers/ocrController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Test OCR functionality (no auth required for testing)
router.get("/test", testOcr);

// Allow workers and managers to upload for OCR extraction
router.post("/upload", protect, uploadImageAndExtractText);
router.post("/sell", protect, managerOnly, uploadSellRequestImage);
router.post("/save", protect, managerOnly, saveEditedData);

module.exports = router;