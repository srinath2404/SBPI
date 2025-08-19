const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const createWorker = async (workerData) => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const { name, email, password } = workerData;
        
        // Check if worker exists
        const existingWorker = await User.findOne({ email });
        if (existingWorker) {
            console.log('Worker already exists');
            mongoose.disconnect();
            return;
        }

        // Create new worker with hashed password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const worker = new User({
            name,
            email,
            password: hashedPassword,
            role: 'worker'
        });
        
        await worker.save();
        
        // Log success without exposing password
        const safeWorkerData = {
            _id: worker._id,
            name: worker.name,
            email: worker.email,
            role: worker.role
        };
        
        console.log('Worker created successfully:', safeWorkerData);
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
};
