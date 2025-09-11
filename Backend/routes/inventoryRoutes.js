const express = require("express");
const { 
    addPipe, 
    getAllPipes, 
    deletePipe, 
    updatePipe, 
    updatePipePrice, 
    manualCleanup,
    getInventorySummary,
    getPipesByBatch
} = require("../controllers/inventoryController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Basic CRUD operations
router.post("/add", protect, addPipe);
router.get("/all", protect, getAllPipes);
router.put("/update/:id", protect, managerOnly, updatePipe);
router.delete("/delete/:id", protect, managerOnly, deletePipe);
router.put("/price/:id", protect, managerOnly, updatePipePrice);

// Enhanced inventory management
router.get("/summary", protect, getInventorySummary);
router.get("/batch/:batchNumber", protect, getPipesByBatch);

// Maintenance operations
router.post("/cleanup", protect, managerOnly, manualCleanup);

module.exports = router;
