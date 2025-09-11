const mongoose = require('mongoose');
const { processBulkPipes } = require('./controllers/aiOcrController');

// Mock request and response objects for testing
const mockReq = {
    body: {
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        batchNumber: 'TEST_BATCH_001',
        manufacturingDate: new Date().toISOString()
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

// Test the bulk pipe processing
async function testBulkPipes() {
    try {
        console.log('🧪 Testing Bulk Pipe Processing...');
        console.log('=====================================');
        
        // Test with mock data
        await processBulkPipes(mockReq, mockRes);
        
        console.log('\n✅ Bulk pipe processing test completed!');
        
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
            return testBulkPipes();
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

module.exports = { testBulkPipes };
