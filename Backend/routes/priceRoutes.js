const express = require("express");
const { updatePricingFormula, getPricingFormula, computePrice } = require("../controllers/priceController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/formula", protect, managerOnly, getPricingFormula);
router.put("/update-formula", protect, managerOnly, updatePricingFormula);
router.post("/compute", protect, computePrice);

module.exports = router;