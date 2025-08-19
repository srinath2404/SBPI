const express = require("express");
const { 
    createWorker, 
    deleteWorker, 
    getWorkers,
    requestPasswordReset,
    getPasswordResetRequests,
    resetWorkerPassword
} = require("../controllers/workerController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Worker management routes
router.get("/all", protect, getWorkers);
router.post("/create", protect, createWorker);
router.delete("/delete/:id", protect, deleteWorker);  // Updated delete route path

// Password reset routes
router.post("/request-reset", requestPasswordReset);
router.get("/reset-requests", protect, getPasswordResetRequests);
router.post("/reset-password", protect, resetWorkerPassword);

module.exports = router;