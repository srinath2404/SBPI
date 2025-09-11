// AI OCR Configuration
// This file contains configuration for various AI-powered OCR services

module.exports = {
    // Google Cloud Vision API
    googleVision: {
        name: 'Google Cloud Vision',
        description: 'Excellent handwriting recognition, high accuracy',
        setup: {
            steps: [
                '1. Go to Google Cloud Console (https://console.cloud.google.com/)',
                '2. Create a new project or select existing one',
                '3. Enable Vision API',
                '4. Create credentials (API Key)',
                '5. Set GOOGLE_CLOUD_API_KEY in .env file'
            ],
            cost: 'Pay per use, first 1000 requests/month free',
            accuracy: '95%+ for handwriting'
        }
    },

    // Azure Computer Vision
    azureVision: {
        name: 'Azure Computer Vision',
        description: 'Great for mixed content and document processing',
        setup: {
            steps: [
                '1. Go to Azure Portal (https://portal.azure.com/)',
                '2. Create Computer Vision resource',
                '3. Get API key and endpoint',
                '4. Set AZURE_VISION_API_KEY and AZURE_VISION_ENDPOINT in .env file'
            ],
            cost: 'Pay per use, first 5000 transactions/month free',
            accuracy: '90%+ for mixed content'
        }
    },

    // OCR.space API
    ocrSpace: {
        name: 'OCR.space',
        description: 'Good free alternative with decent accuracy',
        setup: {
            steps: [
                '1. Go to https://ocr.space/ocrapi',
                '2. Sign up for free account',
                '3. Get API key',
                '4. Set OCR_SPACE_API_KEY in .env file'
            ],
            cost: 'Free tier: 500 requests/day, Paid: $0.002 per request',
            accuracy: '85%+ for clear text'
        }
    },

    // Tesseract.js (fallback)
    tesseract: {
        name: 'Tesseract.js',
        description: 'Local processing, no API keys needed',
        setup: {
            steps: [
                '1. Already installed via npm',
                '2. No additional setup required',
                '3. Works offline'
            ],
            cost: 'Free',
            accuracy: '70-80% for handwriting'
        }
    }
};

// Environment variables needed for AI OCR services
const requiredEnvVars = {
    // Optional - enable if you have API keys
    GOOGLE_CLOUD_API_KEY: 'Your Google Cloud Vision API key',
    AZURE_VISION_API_KEY: 'Your Azure Computer Vision API key',
    AZURE_VISION_ENDPOINT: 'Your Azure Computer Vision endpoint URL',
    OCR_SPACE_API_KEY: 'Your OCR.space API key'
};

// Check which services are available
function getAvailableServices() {
    const available = [];
    
    if (process.env.GOOGLE_CLOUD_API_KEY) {
        available.push('Google Cloud Vision');
    }
    
    if (process.env.AZURE_VISION_API_KEY) {
        available.push('Azure Computer Vision');
    }
    
    if (process.env.OCR_SPACE_API_KEY) {
        available.push('OCR.space');
    }
    
    available.push('Tesseract.js (fallback)');
    
    return available;
}

module.exports.getAvailableServices = getAvailableServices;
module.exports.requiredEnvVars = requiredEnvVars;
