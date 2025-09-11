const mongoose = require('mongoose');

const priceChartSchema = new mongoose.Schema({
    sizeType: {
        type: String,
        required: true,
        unique: true,
        enum: ['1 inch', '1-1.4 inch', '2 inch', '2-1.2 inch', '3 inch', '4 inch']
    },
    basePrice: {
        type: Number,
        required: true,
        default: 64
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
        required: false
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    timestamps: true
});

// Update lastUpdated before saving
priceChartSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

module.exports = mongoose.model('PriceChart', priceChartSchema);
