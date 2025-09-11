// routes/dashboardRoutes.js
const express = require("express");
const { getDashboardData, getWorkerDashboard, getProductionStatus } = require("../controllers/dashboardController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Manager dashboard data
router.get("/data", protect, managerOnly, getDashboardData);

// Worker dashboard data (accessible by all authenticated users)
router.get("/worker", protect, getWorkerDashboard);

// Real-time production status (managers only)
router.get("/production-status", protect, managerOnly, getProductionStatus);

module.exports = router;