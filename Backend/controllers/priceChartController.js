const PriceChart = require('../models/PriceChart');

// Initialize price chart with default values
const initializePriceChart = async () => {
    const defaultSizes = [
        { sizeType: '1 inch', basePrice: 64 },
        { sizeType: '1-1.4 inch', basePrice: 76.8 },
        { sizeType: '2 inch', basePrice: 96 },
        { sizeType: '2-1.2 inch', basePrice: 115.2 },
        { sizeType: '3 inch', basePrice: 128 },
        { sizeType: '4 inch', basePrice: 160 }
    ];

    for (const size of defaultSizes) {
        const exists = await PriceChart.findOne({ sizeType: size.sizeType });
        if (!exists) {
            const newEntry = new PriceChart({
                sizeType: size.sizeType,
                basePrice: size.basePrice
            });
            await newEntry.save();
        }
    }
};

// Get all price chart entries
exports.getPriceChart = async (req, res) => {
    try {
        await initializePriceChart(); // Ensure all sizes exist
        const priceChart = await PriceChart.find().sort({ sizeType: 1 });
        res.status(200).json(priceChart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update base price for all sizes
exports.updateBasePrice = async (req, res) => {
    try {
        const { basePrice } = req.body;
        
        if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
            return res.status(400).json({ message: 'Valid base price is required' });
        }

        // Update all price chart entries with new base price
        await PriceChart.updateMany(
            {},
            { 
                basePrice: Number(basePrice),
                updatedBy: req.user._id || undefined
            }
        );

        // Get updated price chart
        const updatedChart = await PriceChart.find().sort({ sizeType: 1 });
        
        res.status(200).json({ 
            message: 'Base price updated successfully', 
            priceChart: updatedChart 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update individual size base price
exports.updateSizeBasePrice = async (req, res) => {
    try {
        const { sizeType } = req.params;
        const { basePrice } = req.body;

        if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
            return res.status(400).json({ message: 'Valid base price is required' });
        }

        const updated = await PriceChart.findOneAndUpdate(
            { sizeType },
            { 
                basePrice: Number(basePrice),
                updatedBy: req.user._id || undefined
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Size type not found' });
        }

        res.status(200).json({ 
            message: 'Base price updated successfully', 
            priceEntry: updated 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get price for specific size and weight
exports.getPriceForSize = async (req, res) => {
    try {
        const { sizeType, weight } = req.query;
        
        if (!sizeType || !weight) {
            return res.status(400).json({ message: 'Size type and weight are required' });
        }

        const priceEntry = await PriceChart.findOne({ sizeType });
        if (!priceEntry) {
            return res.status(404).json({ message: 'Size type not found' });
        }

        const price = priceEntry.basePrice * Number(weight);
        res.status(200).json({ price, priceEntry });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add new size type
exports.addSizeType = async (req, res) => {
    try {
        const { sizeType, basePrice } = req.body;
        
        if (!sizeType) {
            return res.status(400).json({ message: 'Size type is required' });
        }
        
        if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
            return res.status(400).json({ message: 'Valid base price is required' });
        }

        // Check if size type already exists
        const existing = await PriceChart.findOne({ sizeType });
        if (existing) {
            return res.status(400).json({ message: 'Size type already exists' });
        }

        // Create new size type
        const newPriceEntry = new PriceChart({
            sizeType,
            basePrice: Number(basePrice),
            updatedBy: req.user._id || undefined
        });

        await newPriceEntry.save();

        res.status(201).json({ 
            message: 'New size type added successfully', 
            priceEntry: newPriceEntry 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
