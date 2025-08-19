const express = require("express");
const { updatePricingFormula } = require("../controllers/priceController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.put("/update-formula", protect, managerOnly, updatePricingFormula);

module.exports = router;