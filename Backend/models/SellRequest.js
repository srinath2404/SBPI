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
    customerName: {
        type: String
    },
    customerPlace: {
        type: String
    },
    customerContact: {
        type: String
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
    // Payment tracking for PhonePe / other gateways
    paymentStatus: {
        type: String,
        enum: ['not_started', 'pending', 'success', 'failed'],
        default: 'not_started'
    },
    paymentProvider: {
        type: String
    },
    paymentOrderId: {
        type: String
    },
    paymentTransactionId: {
        type: String
    },
    paymentMeta: {
        type: mongoose.Schema.Types.Mixed
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