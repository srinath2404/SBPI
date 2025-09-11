const mongoose = require('mongoose');
const { processBulkPipes } = require('./controllers/aiOcrController');

// Mock request and response objects for testing enhanced bulk processing
const mockReq = {
    body: {
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        batchNumber: 'TEST_BATCH_SIZE_001',
        manufacturingDate: new Date().toISOString(),
        sizeType: '6 inch', // New size preset
        defaultColorGrade: 'A' // New grade preset
    },
    user: {
        id: '507f1f77bcf86cd799439011' // Mock user ID
    }
};

const mockRes = {
    status: (code) => ({
        json: (data) => {
            console.log(`Status: ${code}`);
            console.log('Response:', JSON.stringify(data, null, 2));
            return mockRes;
        }
    })
};

// Test the enhanced bulk pipe processing
async function testEnhancedBulkPipes() {
    try {
        console.log('🧪 Testing Enhanced Bulk Pipe Processing...');
        console.log('=============================================');
        console.log('📦 Batch:', mockReq.body.batchNumber);
        console.log('📏 Size:', mockReq.body.sizeType);
        console.log('🎨 Grade:', mockReq.body.defaultColorGrade);
        console.log('📅 Date:', mockReq.body.manufacturingDate);
        console.log('');
        
        // Test with mock data
        await processBulkPipes(mockReq, mockRes);
        
        console.log('\n✅ Enhanced bulk pipe processing test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    // Connect to MongoDB (adjust connection string as needed)
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sbpi';
    
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log('📦 Connected to MongoDB');
            return testEnhancedBulkPipes();
        })
        .then(() => {
            console.log('🏁 Test completed, closing connection...');
            mongoose.connection.close();
        })
        .catch((error) => {
            console.error('❌ Database connection failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testEnhancedBulkPipes };
