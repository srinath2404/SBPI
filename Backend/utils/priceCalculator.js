const pricingFormula = {
    colorGradePrice: {
        "GREEN": 15,    // Higher quality grade
        "YELLOW": 12,   // Medium quality grade
        "RED": 8        // Lower quality grade
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

const calculatePrice = (colorGrade, sizeType, length) => {
    const colorPrice = pricingFormula.colorGradePrice[colorGrade];
    const sizeMultiplier = pricingFormula.sizeMultiplier[sizeType];

    // Validate color grade
    if (!colorPrice) {
        throw new Error(`Invalid color grade. Available grades are: ${Object.keys(pricingFormula.colorGradePrice).join(', ')}`);
    }

    // Validate size type
    if (!sizeMultiplier) {
        throw new Error(`Invalid size type. Available sizes are: ${Object.keys(pricingFormula.sizeMultiplier).join(', ')}`);
    }

    // Ensure length is a valid number
    if (isNaN(length)) {
        throw new Error("Invalid length. Length must be a number.");
    }

    return colorPrice * sizeMultiplier * length;
};

// Export calculatePrice as default
module.exports = calculatePrice;