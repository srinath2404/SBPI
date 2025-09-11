// Test script for AI OCR functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testAiOcr() {
    try {
        console.log('🧪 Testing AI OCR Setup...\n');

        // Test 1: Check if AI OCR endpoint is accessible
        console.log('1. Testing AI OCR endpoint accessibility...');
        try {
            const response = await axios.get(`${BASE_URL}/ai-ocr/test`);
            console.log('✅ AI OCR endpoint is working');
            console.log('Available services:', response.data.availableServices);
            console.log('Status:', response.data.status);
        } catch (error) {
            console.log('❌ AI OCR endpoint failed:', error.message);
        }

        // Test 2: Check regular OCR endpoint
        console.log('\n2. Testing regular OCR endpoint...');
        try {
            const response = await axios.get(`${BASE_URL}/ocr/test`);
            console.log('✅ Regular OCR endpoint is working');
            console.log('Tesseract version:', response.data.tesseractVersion);
        } catch (error) {
            console.log('❌ Regular OCR endpoint failed:', error.message);
        }

        // Test 3: Check environment variables
        console.log('\n3. Checking environment variables...');
        const envVars = {
            'GOOGLE_CLOUD_API_KEY': process.env.GOOGLE_CLOUD_API_KEY ? '✅ Set' : '❌ Not set',
            'AZURE_VISION_API_KEY': process.env.AZURE_VISION_API_KEY ? '✅ Set' : '❌ Not set',
            'AZURE_VISION_ENDPOINT': process.env.AZURE_VISION_ENDPOINT ? '✅ Set' : '❌ Not set',
            'OCR_SPACE_API_KEY': process.env.OCR_SPACE_API_KEY ? '✅ Set' : '❌ Not set'
        };

        Object.entries(envVars).forEach(([key, status]) => {
            console.log(`${key}: ${status}`);
        });

        // Test 4: Check package installation
        console.log('\n4. Checking package installation...');
        try {
            require('@google-cloud/vision');
            console.log('✅ @google-cloud/vision is installed');
        } catch (error) {
            console.log('❌ @google-cloud/vision is not installed');
        }

        try {
            require('@azure/cognitiveservices-computervision');
            console.log('✅ @azure/cognitiveservices-computervision is installed');
        } catch (error) {
            console.log('❌ @azure/cognitiveservices-computervision is not installed');
        }

        try {
            require('axios');
            console.log('✅ axios is installed');
        } catch (error) {
            console.log('❌ axios is not installed');
        }

        console.log('\n📋 Summary:');
        console.log('- If you see ❌ for API keys, you need to set them in your .env file');
        console.log('- If you see ❌ for packages, run: npm install @google-cloud/vision @azure/cognitiveservices-computervision axios');
        console.log('- Tesseract.js will always work as a fallback option');

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Run the test
testAiOcr();
