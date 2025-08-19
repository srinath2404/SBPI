const mongoose = require("mongoose");

const workProgressSchema = new mongoose.Schema({
    worker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    task: { type: String, required: true },
    status: { type: String, enum: ["pending", "in-progress", "completed"], default: "pending" },
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("WorkProgress", workProgressSchema);