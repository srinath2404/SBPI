const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            // ACID compliance enhancements
            maxPoolSize: 10, // Connection pool size
            serverSelectionTimeoutMS: 5000, // Timeout for server selection
            socketTimeoutMS: 45000, // Socket timeout
            // Transaction support
            retryWrites: true,
            w: 'majority', // Write concern for majority
            // Read preferences for consistency
            readPreference: 'primary',
            // Connection monitoring
            heartbeatFrequencyMS: 10000
        });
        console.log("MongoDB connected with ACID compliance settings");
        
        // Set global mongoose options for ACID compliance
        mongoose.set('debug', process.env.NODE_ENV === 'development');
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });
        
    } catch (err) {
        console.error("MongoDB connection error:", err.message);
        process.exit(1);
    }
};

// Helper function to start a session for transactions
const startSession = async () => {
    try {
        return await mongoose.startSession();
    } catch (error) {
        console.error('Error starting database session:', error);
        throw error;
    }
};

// Helper function to execute operations in a transaction
const executeTransaction = async (operations) => {
    let session;
    try {
        session = await startSession();
        let result;
        
        await session.withTransaction(async () => {
            result = await operations(session);
        });
        
        return result;
    } catch (error) {
        console.error('Transaction execution error:', error);
        
        // If it's a validation error, provide more details
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }
        
        // If it's a duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            throw new Error(`${field} already exists`);
        }
        
        throw error;
    } finally {
        if (session) {
            try {
                await session.endSession();
            } catch (endSessionError) {
                console.error('Error ending session:', endSessionError);
            }
        }
    }
};

module.exports = { connectDB, startSession, executeTransaction };