// routes/dashboardRoutes.js
const express = require("express");
const { getDashboardData } = require("../controllers/dashboardController"); // Ensure this is correctly imported
const { protect, managerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Ensure the controller function is correctly imported
router.get("/data", protect, managerOnly, getDashboardData);

module.exports = router;