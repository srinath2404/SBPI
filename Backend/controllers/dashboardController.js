const Pipe = require("../models/Pipe");
const SellRequest = require("../models/SellRequest");
const User = require("../models/User");
const WorkProgress = require("../models/WorkProgress");

// Get Enhanced Dashboard Data (Manager)
exports.getDashboardData = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const currentDate = new Date();

        // Basic monthly aggregations
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
                    count: { $sum: 1 },
                    totalLength: { $sum: "$length" }
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
                    approvedAt: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`),
                    },
                },
            },
            { $unwind: "$pipes" },
            {
                $group: {
                    _id: { $month: "$approvedAt" },
                    count: { $sum: 1 },
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

        // Real-time current month data
        const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
        const currentMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        const currentMonthStats = await Pipe.aggregate([
            {
                $match: {
                    manufacturingDate: {
                        $gte: currentMonthStart,
                        $lte: currentMonthEnd,
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    totalPipes: { $sum: 1 },
                    totalWeight: { $sum: "$weight" },
                    totalLength: { $sum: "$length" },
                    avgWeight: { $avg: "$weight" },
                    avgLength: { $avg: "$length" }
                },
            },
        ]);

        // Worker performance analytics
        const workerPerformance = await Pipe.aggregate([
            {
                $match: {
                    manufacturingDate: {
                        $gte: new Date(currentYear, currentMonth - 3, 1), // Last 3 months
                    },
                },
            },
            {
                $group: {
                    _id: "$worker",
                    totalPipes: { $sum: 1 },
                    totalWeight: { $sum: "$weight" },
                    avgQuality: { $avg: { $cond: [{ $eq: ["$colorGrade", "A"] }, 1, 0.5] } }
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "workerInfo"
                }
            },
            {
                $unwind: "$workerInfo"
            },
            {
                $project: {
                    workerName: "$workerInfo.name",
                    totalPipes: 1,
                    totalWeight: 1,
                    avgQuality: 1,
                    efficiency: { $divide: ["$totalPipes", 30] } // pipes per day
                }
            },
            { $sort: { totalPipes: -1 } },
            { $limit: 10 }
        ]);

        // Inventory status
        const inventoryStatus = await Pipe.aggregate([
            {
                $group: {
                    _id: "$colorGrade",
                    count: { $sum: 1 },
                    totalWeight: { $sum: "$weight" },
                    totalLength: { $sum: "$remainingLength" },
                    avgPrice: { $avg: "$price" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentActivity = await Pipe.aggregate([
            {
                $match: {
                    manufacturingDate: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$manufacturingDate" } },
                    count: { $sum: 1 },
                    weight: { $sum: "$weight" }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 7 }
        ]);

        // Quality metrics
        const qualityMetrics = await Pipe.aggregate([
            {
                $group: {
                    _id: "$colorGrade",
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get total count for percentage calculation
        const totalPipes = await Pipe.countDocuments();
        
        // Add percentage to each quality metric
        const qualityMetricsWithPercentage = qualityMetrics.map(metric => ({
            ...metric,
            percentage: totalPipes > 0 ? (metric.count / totalPipes) * 100 : 0
        }));

        // Batch performance
        const batchPerformance = await Pipe.aggregate([
            {
                $match: {
                    batchNumber: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: "$batchNumber",
                    count: { $sum: 1 },
                    totalWeight: { $sum: "$weight" },
                    avgQuality: { $avg: { $cond: [{ $eq: ["$colorGrade", "A"] }, 1, 0.5] } },
                    manufacturingDate: { $first: "$manufacturingDate" }
                }
            },
            { $sort: { manufacturingDate: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            rawMaterialUsage,
            production,
            sales,
            revenue,
            currentMonthStats: currentMonthStats[0] || {},
            workerPerformance,
            inventoryStatus,
            recentActivity,
            qualityMetrics: qualityMetricsWithPercentage,
            batchPerformance,
            summary: {
                totalWorkers: await User.countDocuments({ role: 'worker' }),
                totalPipes: await Pipe.countDocuments(),
                totalSales: await SellRequest.countDocuments({ status: 'approved' }),
                currentMonthPipes: currentMonthStats[0]?.totalPipes || 0
            }
        });
    } catch (error) {
        console.error('Dashboard data error:', error);
        console.error('Error stack:', error.stack);
        
        // Check for specific database connection issues
        if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
            return res.status(503).json({ 
                message: "Database connection error", 
                error: "Unable to connect to database" 
            });
        }
        
        // Check for validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: "Data validation error", 
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            message: "Server error", 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Get Worker Dashboard Data
exports.getWorkerDashboard = async (req, res) => {
    try {
        const workerId = req.user._id;
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Worker's monthly production
        const monthlyProduction = await Pipe.aggregate([
            {
                $match: {
                    worker: workerId,
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
                    totalWeight: { $sum: "$weight" },
                    totalLength: { $sum: "$length" }
                },
            },
            { $sort: { _id: 1 } }
        ]);

        // Worker's current month stats
        const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
        const currentMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        const currentMonthStats = await Pipe.aggregate([
            {
                $match: {
                    worker: workerId,
                    manufacturingDate: {
                        $gte: currentMonthStart,
                        $lte: currentMonthEnd,
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    totalPipes: { $sum: 1 },
                    totalWeight: { $sum: "$weight" },
                    totalLength: { $sum: "$length" },
                    avgWeight: { $avg: "$weight" },
                    qualityGradeA: { $sum: { $cond: [{ $eq: ["$colorGrade", "A"] }, 1, 0] } },
                    qualityGradeB: { $sum: { $cond: [{ $eq: ["$colorGrade", "B"] }, 1, 0] } },
                    qualityGradeC: { $sum: { $cond: [{ $eq: ["$colorGrade", "C"] }, 1, 0] } }
                },
            },
        ]);

        // Worker's recent work
        const recentWork = await Pipe.find({ worker: workerId })
            .sort({ manufacturingDate: -1 })
            .limit(10)
            .select('serialNumber colorGrade sizeType length weight manufacturingDate');

        // Worker's quality trend
        const qualityTrend = await Pipe.aggregate([
            {
                $match: {
                    worker: workerId,
                    manufacturingDate: {
                        $gte: new Date(currentYear, currentMonth - 3, 1), // Last 3 months
                    },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$manufacturingDate" } },
                    totalPipes: { $sum: 1 },
                    gradeA: { $sum: { $cond: [{ $eq: ["$colorGrade", "A"] }, 1, 0] } },
                    gradeB: { $sum: { $cond: [{ $eq: ["$colorGrade", "B"] }, 1, 0] } },
                    gradeC: { $sum: { $cond: [{ $eq: ["$colorGrade", "C"] }, 1, 0] } }
                },
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            monthlyProduction,
            currentMonthStats: currentMonthStats[0] || {},
            recentWork,
            qualityTrend,
            performance: {
                efficiency: currentMonthStats[0]?.totalPipes / 30 || 0, // pipes per day
                qualityScore: currentMonthStats[0] ? 
                    (currentMonthStats[0].qualityGradeA / currentMonthStats[0].totalPipes * 100) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Real-time Production Status
exports.getProductionStatus = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Today's production
        const todayProduction = await Pipe.aggregate([
            {
                $match: {
                    manufacturingDate: {
                        $gte: today,
                        $lt: tomorrow
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    totalWeight: { $sum: "$weight" },
                    totalLength: { $sum: "$length" }
                }
            }
        ]);

        // Active workers today
        const activeWorkers = await Pipe.aggregate([
            {
                $match: {
                    manufacturingDate: {
                        $gte: today,
                        $lt: tomorrow
                    }
                }
            },
            {
                $group: {
                    _id: "$worker"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "workerInfo"
                }
            },
            {
                $unwind: "$workerInfo"
            },
            {
                $project: {
                    workerName: "$workerInfo.name",
                    workerId: "$_id"
                }
            }
        ]);

        // Production by hour (last 24 hours)
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const hourlyProduction = await Pipe.aggregate([
            {
                $match: {
                    manufacturingDate: { $gte: last24Hours }
                }
            },
            {
                $group: {
                    _id: { $hour: "$manufacturingDate" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            todayProduction: todayProduction[0] || { count: 0, totalWeight: 0, totalLength: 0 },
            activeWorkers: activeWorkers.length,
            activeWorkerDetails: activeWorkers,
            hourlyProduction,
            status: "active"
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};