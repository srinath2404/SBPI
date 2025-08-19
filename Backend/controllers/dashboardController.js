const Pipe = require("../models/Pipe");
const SellRequest = require("../models/SellRequest");

// Get Dashboard Data (Manager)
exports.getDashboardData = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();

        const rawMaterialUsage = await Pipe.aggregate([
            {
                $match: {
                    manufacturingDate: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`),
                    },
                },
            },
            {
                $group: {
                    _id: { $month: "$manufacturingDate" },
                    totalWeight: { $sum: "$weight" },
                },
            },
        ]);

        const production = await Pipe.aggregate([
            {
                $match: {
                    manufacturingDate: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`),
                    },
                },
            },
            {
                $group: {
                    _id: { $month: "$manufacturingDate" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const sales = await SellRequest.aggregate([
            {
                $match: {
                    status: "approved",
                    date: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`),
                    },
                },
            },
            {
                $group: {
                    _id: { $month: "$date" },
                    count: { $sum: { $size: "$pipes" } },
                },
            },
        ]);

        const revenue = await SellRequest.aggregate([
            {
                $match: {
                    status: "approved",
                    createdAt: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`),
                    },
                },
            },
            {
                $unwind: "$pipes"
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalRevenue: { $sum: "$pipes.price" },
                },
            },
        ]);

        res.json({
            rawMaterialUsage,
            production,
            sales,
            revenue,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};