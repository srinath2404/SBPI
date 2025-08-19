const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { 
    createSellRequest,
    getSellRequests,
    approveSellRequest,
    rejectSellRequest
} = require("../controllers/sellController");

const router = express.Router();

// Sell request routes
router.post("/request", protect, createSellRequest);
router.get("/requests", protect, getSellRequests);
router.put("/approve/:id", protect, approveSellRequest);
router.put("/reject/:id", protect, rejectSellRequest);

module.exports = router;