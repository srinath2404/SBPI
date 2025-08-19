const RawMaterial = require("../models/RawMaterial");

// Add Raw Material (Manager)
exports.addRawMaterial = async (req, res) => {
    const { name, quantity, unit } = req.body;
    try {
        const rawMaterial = new RawMaterial({ name, quantity, unit });
        await rawMaterial.save();
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
        const rawMaterial = await RawMaterial.findByIdAndUpdate(
            id,
            { quantity },
            { new: true }
        );
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