const express = require("express");
const { addWorkProgress, updateWorkProgress, getAllWorkProgress } = require("../controllers/workProgressController");
const { protect, managerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/add", protect, managerOnly, addWorkProgress);
router.put("/update/:id", protect, managerOnly, updateWorkProgress);
router.get("/all", protect, managerOnly, getAllWorkProgress);

module.exports = router;