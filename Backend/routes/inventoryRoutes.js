const express = require("express");
const { 
    addPipe, 
    getAllPipes, 
    deletePipe, 
    updatePipe, 
    updatePipePrice, 
    manualCleanup,
    getInventorySummary,
    getPipesByBatch,
    importPipesFromExcel,
    previewExcelImport,
    commitExcelImport
} = require("../controllers/inventoryController");
const { protect, managerOnly } = require("../middleware/authMiddleware");
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Basic CRUD operations
router.post("/add", protect, addPipe);
router.get("/all", protect, getAllPipes);
router.put("/update/:id", protect, managerOnly, updatePipe);
router.delete("/delete/:id", protect, managerOnly, deletePipe);
router.put("/price/:id", protect, managerOnly, updatePipePrice);

// Enhanced inventory management
router.get("/summary", protect, getInventorySummary);
router.get("/batch/:batchNumber", protect, getPipesByBatch);

// Bulk import from Excel (manager only)
router.post('/import-excel', protect, managerOnly, upload.single('file'), importPipesFromExcel);
router.post('/preview-excel', protect, managerOnly, upload.single('file'), previewExcelImport);
router.post('/commit-excel', protect, managerOnly, commitExcelImport);

// Maintenance operations
router.post("/cleanup", protect, managerOnly, manualCleanup);

module.exports = router;
