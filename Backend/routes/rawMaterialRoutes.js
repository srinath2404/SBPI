const express = require("express");
const { addRawMaterial, updateRawMaterial, getAllRawMaterials, getRawMaterialTransactions } = require("../controllers/rawMaterialController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/add", protect, managerOnly, addRawMaterial);
router.put("/update/:id", protect, managerOnly, updateRawMaterial);
router.get("/all", protect, managerOnly, getAllRawMaterials);
router.get("/transactions", protect, managerOnly, getRawMaterialTransactions);

module.exports = router;