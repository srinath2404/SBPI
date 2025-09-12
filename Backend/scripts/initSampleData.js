const mongoose = require('mongoose');
const User = require('../models/User');
const Pipe = require('../models/Pipe');
const RawMaterial = require('../models/RawMaterial');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const initSampleData = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to database');
        
        // Create sample worker if none exists
        const workerExists = await User.findOne({ role: 'worker' });
        if (!workerExists) {
            console.log('Creating sample worker...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('worker123', salt);
            
            const worker = new User({
                name: 'Sample Worker',
                email: 'worker@example.com',
                password: hashedPassword,
                role: 'worker'
            });
            
            await worker.save();
            console.log('Sample worker created');
        } else {
            console.log('Worker already exists, skipping creation');
        }
        
        // Add sample raw materials
        const rawMaterialsExist = await RawMaterial.countDocuments();
        if (rawMaterialsExist === 0) {
            console.log('Adding sample raw materials...');
            const rawMaterials = [
                { name: 'HDPE Resin Grade A', quantity: 1000, unit: 'kg' },
                { name: 'HDPE Resin Grade B', quantity: 800, unit: 'kg' },
                { name: 'HDPE Resin Grade C', quantity: 600, unit: 'kg' },
                { name: 'HDPE Resin Grade D', quantity: 400, unit: 'kg' },
                { name: 'Colorant - Blue', quantity: 50, unit: 'kg' },
                { name: 'Colorant - Black', quantity: 50, unit: 'kg' },
                { name: 'Stabilizer', quantity: 100, unit: 'kg' },
            ];
            
            await RawMaterial.insertMany(rawMaterials);
            console.log('Sample raw materials added');
        } else {
            console.log('Raw materials already exist, skipping creation');
        }
        
        // Add sample pipes
        const pipesExist = await Pipe.countDocuments();
        if (pipesExist === 0) {
            console.log('Adding sample pipes...');
            const worker = await User.findOne({ role: 'worker' });
            
            // Generate 20 sample pipes with different attributes
            const sizeTypes = ['2', '2.5', '3', '4', '6'];
            const colorGrades = ['A', 'B', 'C', 'D'];
            const sections = ['A', 'B', 'C'];
            
            const pipes = [];
            for (let i = 1; i <= 20; i++) {
                const sizeType = sizeTypes[Math.floor(Math.random() * sizeTypes.length)];
                const colorGrade = colorGrades[Math.floor(Math.random() * colorGrades.length)];
                const section = sections[Math.floor(Math.random() * sections.length)];
                const length = Math.floor(Math.random() * 500) + 100; // 100-600 cm
                const weight = Math.floor(Math.random() * 50) + 10; // 10-60 kg
                
                // Calculate a simple price based on weight
                const baseRate = 64; // Default rate per kg
                const price = weight * baseRate;
                
                pipes.push({
                    serialNumber: `SAMPLE-${i.toString().padStart(4, '0')}`,
                    colorGrade,
                    sizeType,
                    section,
                    length,
                    remainingLength: length,
                    weight,
                    price,
                    manufacturingDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000), // Random date in last 30 days
                    worker: worker ? worker._id : undefined
                });
            }
            
            await Pipe.insertMany(pipes);
            console.log('Sample pipes added');
        } else {
            console.log('Pipes already exist, skipping creation');
        }
        
        console.log('Sample data initialization complete');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error initializing sample data:', error);
        mongoose.disconnect();
    }
};

initSampleData();