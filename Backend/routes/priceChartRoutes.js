const express = require("express");
const { 
    getPriceChart, 
    updateBasePrice, 
    updateSizeBasePrice, 
    getPriceForSize,
    addSizeType 
} = require("../controllers/priceChartController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Get price chart (all users can view)
router.get("/", protect, getPriceChart);

// Get price for specific size and weight (all users can view)
router.get("/price", protect, getPriceForSize);

// Update base price (managers only)
router.put("/base-price", protect, managerOnly, updateBasePrice);

// Update individual size base price (managers only)
router.put("/base-price/:sizeType", protect, managerOnly, updateSizeBasePrice);

// Add new size type (managers only)
router.post("/size-type", protect, managerOnly, addSizeType);

module.exports = router;
