const express = require("express");
const { 
    createWorker, 
    deleteWorker, 
    getWorkers,
    requestPasswordReset,
    getPasswordResetRequests,
    resetWorkerPassword
} = require("../controllers/workerController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Worker management routes
router.get("/all", protect, managerOnly, getWorkers);
router.post("/create", protect, managerOnly, createWorker);
router.delete("/delete/:id", protect, managerOnly, deleteWorker);  // Updated delete route path

// Password reset routes
router.post("/request-reset", requestPasswordReset);
router.get("/reset-requests", protect, managerOnly, getPasswordResetRequests);
router.post("/reset-password", protect, managerOnly, resetWorkerPassword);

module.exports = router;