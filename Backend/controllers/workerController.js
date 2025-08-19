const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Create Worker (Manager Only)
exports.createWorker = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        // Check if requester is manager
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: "Not authorized. Manager access only." });
        }

        // Check if worker already exists
        const existingWorker = await User.findOne({ email });
        if (existingWorker) {
            return res.status(400).json({ message: "Worker already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create worker with hashed password
        const worker = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "worker"
        });

        // Return worker data without password
        const workerResponse = {
            _id: worker._id,
            name: worker.name,
            email: worker.email,
            role: worker.role
        };

        res.status(201).json({ 
            message: "Worker created successfully", 
            worker: workerResponse 
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete Worker (Manager Only)
exports.deleteWorker = async (req, res) => {
    try {
        // Check if requester is manager
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: "Not authorized. Manager access only." });
        }

        // Check if worker exists
        const worker = await User.findById(req.params.id);
        if (!worker) {
            return res.status(404).json({ message: "Worker not found" });
        }

        // Prevent deleting manager account
        if (worker.role === 'manager') {
            return res.status(403).json({ message: "Cannot delete manager account" });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Worker deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get All Workers (Manager Only)
exports.getWorkers = async (req, res) => {
    try {
        // Check if requester is manager
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: "Not authorized. Manager access only." });
        }

        const workers = await User.find({ role: "worker" })
            .select("-password -__v")
            .sort({ name: 1 });
        res.json(workers);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};// ... existing createWorker, deleteWorker, and getWorkers functions ...

// Request Password Reset (Worker)
exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const worker = await User.findOne({ email, role: 'worker' });
        
        if (!worker) {
            return res.status(404).json({ message: "Worker not found" });
        }

        // Update worker document to mark password reset as requested
        worker.passwordResetRequested = true;
        await worker.save();

        res.json({ message: "Password reset request sent to manager" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Password Reset Requests (Manager Only)
exports.getPasswordResetRequests = async (req, res) => {
    try {
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: "Not authorized. Manager access only." });
        }

        const resetRequests = await User.find({ 
            role: 'worker', 
            passwordResetRequested: true 
        }).select('name email');

        res.json(resetRequests);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Reset Worker Password (Manager Only)
exports.resetWorkerPassword = async (req, res) => {
    try {
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: "Not authorized. Manager access only." });
        }

        const { workerId, newPassword } = req.body;
        const worker = await User.findById(workerId);

        if (!worker || worker.role !== 'worker') {
            return res.status(404).json({ message: "Worker not found" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and reset the request flag
        worker.password = hashedPassword;
        worker.passwordResetRequested = false;
        await worker.save();

        res.json({ message: "Worker password reset successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};