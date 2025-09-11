const { getPricingFormula, setPricingFormula, calculatePrice } = require("../utils/priceCalculator");

// Get Pricing Formula (Manager)
exports.getPricingFormula = async (req, res) => {
    try {
        res.status(200).json(getPricingFormula());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update Pricing Formula (Manager)
exports.updatePricingFormula = async (req, res) => {
    try {
        const { colorGradePrice, sizeMultiplier, baseRatePerKg } = req.body;

        const updated = setPricingFormula({ colorGradePrice, sizeMultiplier, baseRatePerKg: typeof baseRatePerKg === 'number' ? baseRatePerKg : undefined });

        res.status(200).json({ message: "Pricing formula updated successfully", pricingFormula: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Compute price for preview
exports.computePrice = async (req, res) => {
    try {
        const { colorGrade, sizeType, length, weight } = req.body;
        const price = await calculatePrice(colorGrade, sizeType, Number(length || 0), Number(weight || 0));
        res.json({ price });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};