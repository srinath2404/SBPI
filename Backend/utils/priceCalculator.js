let pricingFormula = {
    // Base rate in Rs per kilogram, manager can update via API
    baseRatePerKg: 64,
    // Keep legacy fields to avoid breaking older clients; unused in new formula
    colorGradePrice: {
        "GREEN": 15,
        "YELLOW": 12,
        "RED": 8
    },
    sizeMultiplier: {
        "1 inch": 1.0,
        "1-1.4 inch": 1.2,
        "2 inch": 1.5,
        "2-1.2 inch": 1.8,
        "3 inch": 2.0,
        "4 inch": 2.5,
    },
};

// New pricing: price = weightKg * basePrice (from price chart)
// For backwards compatibility, we keep params but only weight and size matter.
const calculatePrice = async (colorGrade, sizeType, length, weight) => {
    const w = Number(weight);
    if (Number.isNaN(w)) {
        throw new Error("Invalid weight. Weight must be a number.");
    }
    
    // Try to get price from price chart first
    try {
        const PriceChart = require('../models/PriceChart');
        const priceEntry = await PriceChart.findOne({ sizeType });
        if (priceEntry) {
            return w * priceEntry.basePrice;
        }
    } catch (e) {
        // Fallback to old formula if price chart not available
    }
    
    // Fallback to old formula
    const rate = Number(pricingFormula.baseRatePerKg || 64);
    if (rate <= 0) {
        throw new Error("Invalid base rate configuration.");
    }
    return w * rate;
};

const getPricingFormula = () => pricingFormula;

const setPricingFormula = (next) => {
    if (next && typeof next === 'object') {
        pricingFormula = {
            baseRatePerKg: typeof next.baseRatePerKg === 'number' ? next.baseRatePerKg : pricingFormula.baseRatePerKg,
            colorGradePrice: next.colorGradePrice || pricingFormula.colorGradePrice,
            sizeMultiplier: next.sizeMultiplier || pricingFormula.sizeMultiplier,
        };
    }
    return pricingFormula;
};

module.exports = {
    calculatePrice,
    getPricingFormula,
    setPricingFormula
};