const mongoose = require("mongoose");

const rawMaterialTransactionSchema = new mongoose.Schema({
    material: { type: mongoose.Schema.Types.ObjectId, ref: "RawMaterial", required: true },
    type: { type: String, enum: ["in", "out"], required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    relatedPipe: { type: mongoose.Schema.Types.ObjectId, ref: "Pipe" },
    note: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.model("RawMaterialTransaction", rawMaterialTransactionSchema);

