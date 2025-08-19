const mongoose = require('mongoose');

const pipeSchema = new mongoose.Schema({
    serialNumber: {
        type: String,
        required: true
    },
    soldLength: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    }
});

const sellRequestSchema = new mongoose.Schema({
    billNumber: {
        type: String,
        required: true
    },
    pipes: {
        type: [pipeSchema],
        required: true,
        validate: [array => array.length > 0, 'At least one pipe is required']
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('SellRequest', sellRequestSchema);