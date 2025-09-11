const Pipe = require('../models/Pipe');
const RawMaterial = require('../models/RawMaterial');
const RawMaterialTransaction = require('../models/RawMaterialTransaction');
const generateSerialNumber = require('../utils/serialNumberGenerator');
const { calculatePrice } = require('../utils/priceCalculator');
const { executeTransaction } = require('../config/db');

// Clean up completely sold pipes (remainingLength = 0) with ACID compliance
const cleanupSoldPipes = async () => {
    try {
        const result = await executeTransaction(async (session) => {
            const pipesToDelete = await Pipe.find({ remainingLength: 0 }).session(session);
            const deletedCount = pipesToDelete.length;
            
            if (deletedCount > 0) {
                await Pipe.deleteMany({ remainingLength: 0 }).session(session);
                console.log(`Cleaned up ${deletedCount} completely sold pipes with ACID compliance`);
            }
            
            return deletedCount;
        });
        
        return result;
    } catch (error) {
        console.error('Error cleaning up sold pipes:', error);
        return 0;
    }
};

// Get all pipes with enhanced filtering and sorting
const getAllPipes = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            sortBy = 'manufacturingDate', 
            sortOrder = 'desc',
            colorGrade,
            sizeType,
            batchNumber,
            worker,
            search
        } = req.query;

        // Clean up completely sold pipes first
        await cleanupSoldPipes();
        
        // Build filter query
        const filter = {};
        
        if (colorGrade) filter.colorGrade = colorGrade;
        if (sizeType) filter.sizeType = sizeType;
        if (batchNumber) filter.batchNumber = batchNumber;
        if (worker) filter.worker = worker;
        
        // Search functionality
        if (search) {
            filter.$or = [
                { serialNumber: { $regex: search, $options: 'i' } },
                { batchNumber: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Execute query with pagination
        const pipes = await Pipe.find(filter)
            .populate('worker', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
        const totalPipes = await Pipe.countDocuments(filter);
        const totalPages = Math.ceil(totalPipes / parseInt(limit));

        // Add inventory status to each pipe
        const pipesWithStatus = pipes.map(pipe => ({
            ...pipe,
            inventoryStatus: getInventoryStatus(pipe.remainingLength, pipe.length),
            utilizationRate: pipe.length > 0 ? ((pipe.length - pipe.remainingLength) / pipe.length * 100).toFixed(2) : 0
        }));

        res.json({
            pipes: pipesWithStatus,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalPipes,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            },
            filters: {
                colorGrade: colorGrade || 'all',
                sizeType: sizeType || 'all',
                batchNumber: batchNumber || 'all',
                worker: worker || 'all'
            }
        });
    } catch (error) {
        console.error('Error fetching pipes:', error);
        res.status(500).json({ message: 'Error fetching pipes', error: error.message });
    }
};

// Get inventory summary with real-time data
const getInventorySummary = async (req, res) => {
    try {
        const summary = await executeTransaction(async (session) => {
            // Total inventory counts
            const totalPipes = await Pipe.countDocuments().session(session);
            const availablePipes = await Pipe.countDocuments({ remainingLength: { $gt: 0 } }).session(session);
            const soldPipes = await Pipe.countDocuments({ remainingLength: 0 }).session(session);
            
            // Inventory by grade
            const gradeSummary = await Pipe.aggregate([
                { $match: { remainingLength: { $gt: 0 } } },
                { $group: { _id: '$colorGrade', count: { $sum: 1 }, totalLength: { $sum: '$remainingLength' }, totalWeight: { $sum: '$weight' } } },
                { $sort: { _id: 1 } }
            ]).session(session);
            
            // Inventory by size
            const sizeSummary = await Pipe.aggregate([
                { $match: { remainingLength: { $gt: 0 } } },
                { $group: { _id: '$sizeType', count: { $sum: 1 }, totalLength: { $sum: '$remainingLength' }, totalWeight: { $sum: '$weight' } } },
                { $sort: { _id: 1 } }
            ]).session(session);
            
            // Recent additions (last 7 days)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentAdditions = await Pipe.countDocuments({
                manufacturingDate: { $gte: sevenDaysAgo }
            }).session(session);
            
            // Low stock alerts (pipes with less than 20% remaining)
            const lowStockPipes = await Pipe.countDocuments({
                remainingLength: { $gt: 0, $lt: { $multiply: ['$length', 0.2] } }
            }).session(session);
            
            return {
                totalPipes,
                availablePipes,
                soldPipes,
                gradeSummary,
                sizeSummary,
                recentAdditions,
                lowStockPipes,
                lastUpdated: new Date().toISOString()
            };
        });
        
        res.json(summary);
    } catch (error) {
        console.error('Error fetching inventory summary:', error);
        res.status(500).json({ message: 'Error fetching inventory summary', error: error.message });
    }
};

// Add new pipe with ACID compliance
const addPipe = async (req, res) => {
    try {
        console.log('🚀 Starting addPipe function...');
        console.log('📝 Request body:', req.body);
        
        const {
            serialNumber: providedSerial,
            colorGrade,
            sizeType,
            section = 'A',
            length = 0,
            weight = 0,
            manufacturingDate,
            batchNumber
        } = req.body;

        console.log('🔍 Extracted values:', { colorGrade, sizeType, length, weight, section });

        // Enhanced validation
        if (!colorGrade || !sizeType) {
            console.log('❌ Validation failed: Missing required fields');
            return res.status(400).json({ 
                message: 'Required fields missing',
                required: ['colorGrade', 'sizeType'],
                received: { colorGrade, sizeType }
            });
        }

        // Validate color grade
        if (!['A', 'B', 'C', 'D'].includes(colorGrade.toUpperCase())) {
            console.log('❌ Validation failed: Invalid color grade');
            return res.status(400).json({ 
                message: 'Invalid color grade. Must be A, B, C, or D',
                received: colorGrade
            });
        }

        // Validate length and weight
        const numericLength = Number(length || 0);
        const numericWeight = Number(weight || 0);
        
        console.log('📏 Numeric values:', { numericLength, numericWeight });
        
        if (numericLength < 0 || numericWeight < 0) {
            console.log('❌ Validation failed: Negative values');
            return res.status(400).json({ 
                message: 'Length and weight must be positive numbers',
                received: { length: numericLength, weight: numericWeight }
            });
        }

        // Auto-generate serial number if not provided
        let serialNumber;
        try {
            console.log('🔢 Generating serial number...');
            serialNumber = providedSerial && providedSerial.trim().length > 0
                ? providedSerial.trim()
                : await generateSerialNumber();
            console.log('✅ Serial number generated:', serialNumber);
        } catch (error) {
            console.error('❌ Error generating serial number:', error);
            return res.status(500).json({ 
                message: 'Failed to generate serial number',
                error: error.message 
            });
        }

        // Ensure uniqueness with ACID compliance
        let result;
        try {
            console.log('💾 Starting database transaction...');
            result = await executeTransaction(async (session) => {
                console.log('🔍 Checking for existing pipe with serial number:', serialNumber);
                const existingPipe = await Pipe.findOne({ serialNumber }).session(session);
                if (existingPipe) {
                    throw new Error('Serial number already exists');
                }
                console.log('✅ Serial number is unique');

                // Calculate price using formula
                let computedPrice = 0;
                try {
                    console.log('💰 Calculating price...');
                    computedPrice = await calculatePrice(colorGrade, sizeType, numericLength, numericWeight);
                    console.log('✅ Price calculated:', computedPrice);
                } catch (e) {
                    console.error('⚠️ Price calculation error, using fallback:', e);
                    // Use fallback price calculation
                    const baseRate = 64; // Default rate per kg
                    computedPrice = numericWeight * baseRate;
                    console.log('💰 Fallback price calculated:', computedPrice);
                }

                console.log('🏗️ Creating new pipe object...');
                const newPipe = new Pipe({
                    serialNumber,
                    colorGrade: colorGrade.toUpperCase(),
                    sizeType,
                    section,
                    length: numericLength,
                    remainingLength: numericLength,
                    weight: numericWeight,
                    price: computedPrice,
                    manufacturingDate: manufacturingDate || new Date(),
                    batchNumber: batchNumber || null,
                    worker: req.user ? req.user._id : undefined
                });

                console.log('💾 Saving pipe to database...');
                await newPipe.save({ session });
                console.log('✅ Pipe saved successfully');

                // Optional raw material consumption
                if (Array.isArray(req.body.consumption)) {
                    console.log('📦 Processing raw material consumption...');
                    for (const item of req.body.consumption) {
                        try {
                            const material = await RawMaterial.findById(item.materialId).session(session);
                            if (!material) continue;
                            
                            const qty = Number(item.quantity || 0);
                            if (qty > 0) {
                                material.quantity = Math.max(0, Number(material.quantity) - qty);
                                await material.save({ session });
                                
                                await RawMaterialTransaction.create([{
                                    material: material._id,
                                    type: 'out',
                                    quantity: qty,
                                    unit: material.unit,
                                    relatedPipe: newPipe._id,
                                    note: 'Consumption for pipe production',
                                    createdBy: req.user ? req.user._id : undefined
                                }], { session });
                            }
                        } catch (consumptionError) {
                            console.error('Error processing consumption:', consumptionError);
                            // Continue with other consumption items
                        }
                    }
                }

                return newPipe;
            });
            console.log('✅ Transaction completed successfully');
        } catch (transactionError) {
            console.error('❌ Transaction error:', transactionError);
            return res.status(500).json({ 
                message: 'Database transaction failed',
                error: transactionError.message 
            });
        }

        console.log('🎉 Pipe added successfully:', result._id);
        res.status(201).json({ 
            message: 'Pipe added successfully with ACID compliance', 
            pipe: result,
            transactionId: `PIPE_${Date.now()}`
        });
    } catch (error) {
        console.error('❌ Error adding pipe:', error);
        res.status(500).json({ 
            message: 'Error adding pipe', 
            error: error.message,
            details: 'Please check the server logs for more information'
        });
    }
};

// Delete pipe with ACID compliance
const deletePipe = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Pipe ID is required' });
        }

        const result = await executeTransaction(async (session) => {
            const pipe = await Pipe.findById(id).session(session);
            if (!pipe) {
                throw new Error('Pipe not found');
            }

            // Check if pipe can be deleted (not sold)
            if (pipe.remainingLength < pipe.length) {
                throw new Error('Cannot delete pipe that has been partially sold');
            }

            await Pipe.findByIdAndDelete(id).session(session);
            return pipe;
        });

        res.json({ 
            message: 'Pipe deleted successfully with ACID compliance',
            deletedPipe: result,
            transactionId: `DELETE_${Date.now()}`
        });
    } catch (error) {
        console.error('Error deleting pipe:', error);
        res.status(500).json({ message: 'Error deleting pipe', error: error.message });
    }
};

// Update pipe with ACID compliance
const updatePipe = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Pipe ID is required' });
        }

        const result = await executeTransaction(async (session) => {
            const pipe = await Pipe.findById(id).session(session);
            if (!pipe) {
                throw new Error('Pipe not found');
            }

            // Validate updates
            if (updateData.length !== undefined && updateData.length < pipe.remainingLength) {
                throw new Error('New length cannot be less than remaining length');
            }

            // Update pipe
            const updatedPipe = await Pipe.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).session(session);

            return updatedPipe;
        });

        res.json({ 
            message: 'Pipe updated successfully with ACID compliance',
            pipe: result,
            transactionId: `UPDATE_${Date.now()}`
        });
    } catch (error) {
        console.error('Error updating pipe:', error);
        res.status(500).json({ message: 'Error updating pipe', error: error.message });
    }
};

// Update price for a specific pipe with ACID compliance
const updatePipePrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { price } = req.body;

        if (price === undefined || isNaN(Number(price))) {
            return res.status(400).json({ message: 'Valid price is required' });
        }

        const result = await executeTransaction(async (session) => {
            const updated = await Pipe.findByIdAndUpdate(
                id,
                { price: Number(price) },
                { new: true }
            ).session(session);

            if (!updated) {
                throw new Error('Pipe not found');
            }

            return updated;
        });

        res.json({ 
            message: 'Price updated successfully with ACID compliance', 
            pipe: result,
            transactionId: `PRICE_UPDATE_${Date.now()}`
        });
    } catch (error) {
        console.error('Error updating price:', error);
        res.status(500).json({ message: 'Error updating price', error: error.message });
    }
};

// Manual cleanup of sold pipes with ACID compliance
const manualCleanup = async (req, res) => {
    try {
        const deletedCount = await cleanupSoldPipes();
        res.json({ 
            message: `Cleanup completed with ACID compliance. ${deletedCount} completely sold pipes removed.`,
            deletedCount,
            transactionId: `CLEANUP_${Date.now()}`
        });
    } catch (error) {
        console.error('Error during cleanup:', error);
        res.status(500).json({ message: 'Error during cleanup', error: error.message });
    }
};

// Get pipes by batch number
const getPipesByBatch = async (req, res) => {
    try {
        const { batchNumber } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const pipes = await Pipe.find({ batchNumber })
            .populate('worker', 'name email')
            .sort({ manufacturingDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const totalPipes = await Pipe.countDocuments({ batchNumber });
        const totalPages = Math.ceil(totalPipes / parseInt(limit));

        // Add inventory status
        const pipesWithStatus = pipes.map(pipe => ({
            ...pipe,
            inventoryStatus: getInventoryStatus(pipe.remainingLength, pipe.length),
            utilizationRate: pipe.length > 0 ? ((pipe.length - pipe.remainingLength) / pipe.length * 100).toFixed(2) : 0
        }));

        res.json({
            pipes: pipesWithStatus,
            batchNumber,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalPipes,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('Error fetching pipes by batch:', error);
        res.status(500).json({ message: 'Error fetching pipes by batch', error: error.message });
    }
};

// Helper function to determine inventory status
const getInventoryStatus = (remainingLength, totalLength) => {
    if (remainingLength === 0) return 'sold';
    if (remainingLength === totalLength) return 'available';
    if (remainingLength < totalLength * 0.2) return 'low_stock';
    return 'partial';
};

module.exports = {
    getAllPipes,
    getInventorySummary,
    addPipe,
    deletePipe,
    updatePipe,
    updatePipePrice,
    manualCleanup,
    getPipesByBatch
};