const pricingFormula = {
    basePrice: 10, // Example base price per meter
    sizeMultiplier: {
        "1 inch": 1.0,
        "1-1.4 inch": 1.2,
        "2 inch": 1.5,
        "2-1.2 inch": 1.8,
        "3 inch": 2.0,
        "4 inch": 2.5,
    },
};

// Update Pricing Formula (Manager)
exports.updatePricingFormula = async (req, res) => {
    try {
        const { basePrice, sizeMultiplier } = req.body;

        if (basePrice) pricingFormula.basePrice = basePrice;
        if (sizeMultiplier) pricingFormula.sizeMultiplier = sizeMultiplier;

        res.status(200).json({ message: "Pricing formula updated successfully", pricingFormula });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};