const RawMaterial = require("../models/RawMaterial");
const RawMaterialTransaction = require("../models/RawMaterialTransaction");

// Add Raw Material (Manager)
exports.addRawMaterial = async (req, res) => {
    const { name, quantity, unit } = req.body;
    try {
        const rawMaterial = new RawMaterial({ name, quantity, unit });
        await rawMaterial.save();
        await RawMaterialTransaction.create({
            material: rawMaterial._id,
            type: 'in',
            quantity,
            unit,
            note: 'Initial stock',
            createdBy: req.user?._id
        });
        res.status(201).json({ message: "Raw material added successfully", rawMaterial });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update Raw Material (Manager)
exports.updateRawMaterial = async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    try {
        const rawMaterial = await RawMaterial.findById(id);
        if (!rawMaterial) return res.status(404).json({ message: 'Raw material not found' });
        const diff = Number(quantity) - Number(rawMaterial.quantity);
        rawMaterial.quantity = Number(quantity);
        await rawMaterial.save();
        if (diff !== 0) {
            await RawMaterialTransaction.create({
                material: rawMaterial._id,
                type: diff > 0 ? 'in' : 'out',
                quantity: Math.abs(diff),
                unit: rawMaterial.unit,
                note: 'Manual adjustment',
                createdBy: req.user?._id
            });
        }
        res.json({ message: "Raw material updated successfully", rawMaterial });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get All Raw Materials (Manager)
exports.getAllRawMaterials = async (req, res) => {
    try {
        const rawMaterials = await RawMaterial.find();
        res.json(rawMaterials);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get transactions (Manager)
exports.getRawMaterialTransactions = async (req, res) => {
    try {
        const txns = await RawMaterialTransaction.find()
            .populate('material', 'name unit')
            .populate('relatedPipe', 'serialNumber')
            .sort({ createdAt: -1 });
        res.json(txns);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};