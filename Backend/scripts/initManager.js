const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const initManager = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        // Delete any existing manager accounts
        await User.deleteMany({ role: 'manager' });
        
        // Create the single manager account
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('9440395658', salt);
        
        const manager = new User({
            name: 'Gaddam Kashinath',
            email: 'gaddamkshinath1947@gmail.com',
            password: hashedPassword,
            role: 'manager'
        });
        
        await manager.save();
        console.log('Manager account initialized successfully');
        
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
};

initManager();