const express = require("express");
const { 
    uploadImageAndExtractText, 
    uploadSellRequestImage, 
    saveEditedData, 
    testOcr,
    processBulkPipes
} = require("../controllers/aiOcrController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Test AI OCR functionality (no auth required for testing)
router.get("/test", testOcr);

// Allow workers and managers to upload for AI OCR extraction
router.post("/upload", protect, uploadImageAndExtractText);
router.post("/sell", protect, managerOnly, uploadSellRequestImage);
router.post("/save", protect, managerOnly, saveEditedData);

// Bulk pipe processing with AI OCR (managers only)
router.post("/bulk-pipes", protect, managerOnly, processBulkPipes);

module.exports = router;
