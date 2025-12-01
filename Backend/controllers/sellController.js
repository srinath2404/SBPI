const Pipe = require("../models/Pipe");
const SellRequest = require("../models/SellRequest");
const axios = require("axios");

// Response messages
const MESSAGES = {
    NOT_FOUND: "Pipe not found",
    INSUFFICIENT_LENGTH: "Insufficient pipe length available",
    DUPLICATE_SERIAL: "Serial number already exists",
    REQUEST_SUCCESS: "Sell request created successfully",
    REQUEST_NOT_FOUND: "Sell request not found",
    ALREADY_PROCESSED: "Sell request already processed",
    MANAGER_ONLY: "Only managers can process sell requests",
    APPROVE_SUCCESS: "Sell request approved successfully",
    REJECT_SUCCESS: "Sell request rejected successfully",
    PAYMENT_INIT_FAILED: "Failed to initiate payment with Razorpay",
    SERVER_ERROR: "Server error"
};

// Create sell request
exports.createSellRequest = async (req, res) => {
    try {
        const { billNumber, customerName, customerPlace, customerContact, pipes } = req.body;

        // Validate request data
        if (!billNumber || !pipes || !pipes.length) {
            return res.status(400).json({
                message: "Invalid request data",
                details: "Bill number and pipes array are required"
            });
        }

        // Validate each pipe
        for (const pipe of pipes) {
            if (!pipe.serialNumber || !pipe.soldLength || !pipe.price) {
                return res.status(400).json({
                    message: "Invalid pipe data",
                    details: "Serial number, sold length, and price are required for each pipe"
                });
            }
        }

        // Create and save sell request
        const sellRequest = new SellRequest({
            billNumber,
            customerName,
            customerPlace,
            customerContact,
            pipes: pipes.map(pipe => ({
                serialNumber: pipe.serialNumber,
                soldLength: Number(pipe.soldLength),
                price: Number(pipe.price)
            })),
            requestedBy: req.user._id,
            status: 'pending',
            paymentStatus: 'not_started',
            createdAt: Date.now()
        });

        await sellRequest.save();
        await sellRequest.populate('requestedBy', 'name email');

        res.status(201).json({
            message: MESSAGES.REQUEST_SUCCESS,
            sellRequest
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: MESSAGES.DUPLICATE_SERIAL,
                error: "Please use a unique serial number"
            });
        }
        console.error('Create Sell Request Error:', error);
        res.status(500).json({ 
            message: MESSAGES.SERVER_ERROR, 
            error: error.message 
        });
    }
};
// Get sell requests with pagination (workers see only their own)
exports.getSellRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const filter = {};
        if (req.user && req.user.role === 'worker') {
            filter.requestedBy = req.user._id;
        }

        const [sellRequests, total] = await Promise.all([
            SellRequest.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('requestedBy', 'name email')
                .populate('approvedBy', 'name email')
                .populate('rejectedBy', 'name email'),
            SellRequest.countDocuments(filter)
        ]);

        res.json({
            sellRequests,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        res.status(500).json({ message: MESSAGES.SERVER_ERROR, error: error.message });
    }
};

// Approve sell request
exports.approveSellRequest = async (req, res) => {
    try {
        const sellRequest = await SellRequest.findById(req.params.id);
        
        if (!sellRequest) {
            return res.status(404).json({ message: MESSAGES.REQUEST_NOT_FOUND });
        }

        if (sellRequest.status !== 'pending') {
            return res.status(400).json({ message: MESSAGES.ALREADY_PROCESSED });
        }

        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: MESSAGES.MANAGER_ONLY });
        }

        // Process each pipe in the sell request
        for (const pipeItem of sellRequest.pipes) {
            const pipe = await Pipe.findOne({ serialNumber: pipeItem.serialNumber });
            
            if (!pipe) {
                return res.status(404).json({ 
                    message: MESSAGES.NOT_FOUND,
                    serialNumber: pipeItem.serialNumber 
                });
            }
            
            // Determine available length:
            // - If remainingLength > 0, pipe is available (use remainingLength)
            // - If remainingLength is 0 or null/undefined, check if it's an old pipe:
            //   - For old pipes (remainingLength not set), use length if length > 0
            //   - For new pipes, remainingLength === 0 means fully sold
            let availableLength = 0;
            if (pipe.remainingLength != null) {
                // remainingLength field exists
                if (pipe.remainingLength > 0) {
                    availableLength = pipe.remainingLength;
                } else {
                    // remainingLength is 0 - pipe is fully sold
                    availableLength = 0;
                }
            } else {
                // remainingLength is null/undefined - old pipe schema, use length
                availableLength = pipe.length || 0;
            }
            
            if (availableLength < pipeItem.soldLength) {
                return res.status(400).json({
                    message: MESSAGES.INSUFFICIENT_LENGTH,
                    serialNumber: pipeItem.serialNumber,
                    requested: pipeItem.soldLength,
                    available: availableLength
                });
            }
            
            // Calculate remaining length after sale
            const newRemainingLength = availableLength - pipeItem.soldLength;
            
            // If selling the entire pipe (or very close to it, within 0.01 tolerance)
            if (newRemainingLength <= 0.01) {
                // Remove pipe from inventory by deleting it
                await Pipe.findByIdAndDelete(pipe._id);
            } else {
                // If selling part of the pipe
                // Calculate proportional weight for remaining length
                const weightRatio = newRemainingLength / availableLength;
                const newWeight = pipe.weight * weightRatio;
                
                // Update the original pipe with remaining length and adjusted weight
                // Keep original length for record-keeping, only update remainingLength
                await Pipe.findByIdAndUpdate(pipe._id, {
                    remainingLength: newRemainingLength,
                    weight: newWeight
                    // Note: We keep the original length field unchanged for historical record
                });
            }
        }

        // Update sell request status
        const updatedRequest = await SellRequest.findByIdAndUpdate(
            sellRequest._id,
            {
                status: 'approved',
                approvedBy: req.user._id,
                approvedAt: Date.now()
            },
            { new: true }
        ).populate('approvedBy', 'name email');

        res.json({
            message: MESSAGES.APPROVE_SUCCESS,
            sellRequest: updatedRequest
        });
    } catch (error) {
        res.status(500).json({ message: MESSAGES.SERVER_ERROR, error: error.message });
    }
};

// Reject sell request
exports.rejectSellRequest = async (req, res) => {
    try {
        const sellRequest = await SellRequest.findById(req.params.id);
        
        if (!sellRequest) {
            return res.status(404).json({ message: MESSAGES.REQUEST_NOT_FOUND });
        }

        if (sellRequest.status !== 'pending') {
            return res.status(400).json({ message: MESSAGES.ALREADY_PROCESSED });
        }

        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: MESSAGES.MANAGER_ONLY });
        }

        const updatedRequest = await SellRequest.findByIdAndUpdate(
            req.params.id,
            {
                status: 'rejected',
                rejectedBy: req.user._id,
                rejectedAt: Date.now()
            },
            { new: true }
        ).populate('rejectedBy', 'name email');

        res.json({
            message: MESSAGES.REJECT_SUCCESS,
            sellRequest: updatedRequest
        });
    } catch (error) {
        res.status(500).json({ message: MESSAGES.SERVER_ERROR, error: error.message });
    }
};

// Initiate Razorpay payment for a sell request
exports.initiateRazorpayPayment = async (req, res) => {
    try {
        const sellRequest = await SellRequest.findById(req.params.id);
        if (!sellRequest) {
            return res.status(404).json({ message: MESSAGES.REQUEST_NOT_FOUND });
        }

        // Compute total amount in paise (Razorpay expects smallest currency unit)
        const totalAmount = sellRequest.pipes.reduce((sum, pipe) => sum + (pipe.price || 0), 0);
        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ message: 'Invalid amount for payment' });
        }
        const amountInPaise = Math.round(totalAmount * 100);

        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!razorpayKeyId || !razorpayKeySecret) {
            return res.status(500).json({
                message: MESSAGES.PAYMENT_INIT_FAILED,
                details: 'Razorpay environment variables are not fully configured'
            });
        }

        const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');

        const orderPayload = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: sellRequest.billNumber || `sell_${sellRequest._id}`,
            notes: {
                sellRequestId: sellRequest._id.toString(),
                customerName: sellRequest.customerName || '',
                customerContact: sellRequest.customerContact || ''
            }
        };

        const razorpayResponse = await axios.post(
            'https://api.razorpay.com/v1/orders',
            orderPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`
                }
            }
        );

        const order = razorpayResponse.data;

        // Save payment info on sell request
        sellRequest.paymentStatus = 'pending';
        sellRequest.paymentProvider = 'RAZORPAY';
        sellRequest.paymentOrderId = order.id;
        sellRequest.paymentMeta = order;
        await sellRequest.save();

        return res.json({
            message: 'Razorpay order created',
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            razorpayKeyId,
            sellRequestId: sellRequest._id
        });
    } catch (error) {
        console.error('Razorpay initiate error:', error.response?.data || error.message);
        return res.status(500).json({
            message: MESSAGES.PAYMENT_INIT_FAILED,
            error: error.response?.data || error.message
        });
    }
};
