# AI OCR Setup Guide

This guide will help you set up AI-powered OCR services for better accuracy in handwriting recognition.

## Available Services

### 1. Google Cloud Vision API (Recommended)
- **Accuracy**: 95%+ for handwriting
- **Cost**: Pay per use, first 1000 requests/month free
- **Best for**: Handwritten text, mixed content

#### Setup Steps:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Vision API
4. Create credentials (API Key)
5. Add to your `.env` file:
   ```
   GOOGLE_CLOUD_API_KEY=your_api_key_here
   ```

### 2. Azure Computer Vision
- **Accuracy**: 90%+ for mixed content
- **Cost**: Pay per use, first 5000 transactions/month free
- **Best for**: Document processing, mixed content

#### Setup Steps:
1. Go to [Azure Portal](https://portal.azure.com/)
2. Create Computer Vision resource
3. Get API key and endpoint
4. Add to your `.env` file:
   ```
   AZURE_VISION_API_KEY=your_api_key_here
   AZURE_VISION_ENDPOINT=https://your-resource.cognitiveservices.azure.com/vision/v3.2/read/analyze
   ```

### 3. OCR.space API
- **Accuracy**: 85%+ for clear text
- **Cost**: Free tier: 500 requests/day, Paid: $0.002 per request
- **Best for**: Budget-friendly option

#### Setup Steps:
1. Go to [OCR.space](https://ocr.space/ocrapi)
2. Sign up for free account
3. Get API key
4. Add to your `.env` file:
   ```
   OCR_SPACE_API_KEY=your_api_key_here
   ```

### 4. Tesseract.js (Fallback)
- **Accuracy**: 70-80% for handwriting
- **Cost**: Free
- **Best for**: Offline processing, no API keys needed

## Installation

1. Install required packages:
   ```bash
   npm install @google-cloud/vision @azure/cognitiveservices-computervision axios
   ```

2. Create `.env` file in the Backend directory with your API keys

3. Restart your server

## Usage

The system will automatically try AI services in order of accuracy:
1. Google Cloud Vision (if enabled)
2. Azure Computer Vision (if enabled)
3. OCR.space (if enabled)
4. Tesseract.js (fallback)

## API Endpoints

- `POST /api/ai-ocr/upload` - Upload image for OCR processing
- `GET /api/ai-ocr/test` - Test available OCR services

## Benefits of AI OCR

- **Better Handwriting Recognition**: AI services are trained on millions of handwritten samples
- **Improved Accuracy**: 90-95% vs 70-80% for Tesseract.js
- **Mixed Content Handling**: Better at processing tables, forms, and complex layouts
- **Language Support**: Better support for various languages and scripts
- **Confidence Scores**: Get confidence levels for extracted text

## Cost Considerations

- **Google Cloud Vision**: ~$1.50 per 1000 requests after free tier
- **Azure Computer Vision**: ~$1.00 per 1000 transactions after free tier
- **OCR.space**: Free tier available, then $0.002 per request
- **Tesseract.js**: Free, but lower accuracy

## Troubleshooting

### Common Issues:
1. **API Key Invalid**: Check your API key and ensure the service is enabled
2. **Rate Limits**: Some services have rate limits on free tiers
3. **Image Format**: Ensure images are in supported formats (JPEG, PNG, etc.)
4. **Image Size**: Very large images may cause timeouts

### Testing:
Use the test endpoint to verify your setup:
```bash
curl http://localhost:5000/api/ai-ocr/test
```

## Security Notes

- Never commit API keys to version control
- Use environment variables for sensitive data
- Consider implementing rate limiting for production use
- Monitor API usage to control costs
