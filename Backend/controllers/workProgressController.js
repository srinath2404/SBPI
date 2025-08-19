const WorkProgress = require("../models/WorkProgress");

// Add Work Progress (Manager)
exports.addWorkProgress = async (req, res) => {
    const { worker, task } = req.body;
    try {
        const workProgress = new WorkProgress({ worker, task });
        await workProgress.save();
        res.status(201).json({ message: "Work progress added successfully", workProgress });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update Work Progress (Manager)
exports.updateWorkProgress = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const workProgress = await WorkProgress.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );
        res.json({ message: "Work progress updated successfully", workProgress });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get All Work Progress (Manager)
exports.getAllWorkProgress = async (req, res) => {
    try {
        const workProgress = await WorkProgress.find().populate("worker", "name");
        res.json(workProgress);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};