const express = require("express");
const { addPipe, getAllPipes ,deletePipe } = require("../controllers/inventoryController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/add", protect, addPipe);
router.get("/all", protect, getAllPipes);
router.delete("/delete/:id", protect, deletePipe);

module.exports = router;
