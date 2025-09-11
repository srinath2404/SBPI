const Tesseract = require("tesseract.js");
const axios = require("axios");
const Pipe = require("../models/Pipe");
const { executeTransaction } = require("../config/db");
let GenerativeAI;
try { GenerativeAI = require('@google/generative-ai').GoogleGenerativeAI; } catch (_) { GenerativeAI = null; }
const sharp = require('sharp');

const DEBUG_OCR = process.env.DEBUG_OCR === 'true';
const FORCE_OCR_SPACE = process.env.FORCE_OCR_SPACE === 'true';

// Enhanced AI OCR Configuration with accuracy improvements
const AI_OCR_CONFIG = {
    // Google Gemini (Generative AI Vision) - Highest accuracy
    gemini: {
        enabled: process.env.GEMINI_API_KEY ? true : false,
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        confidenceThreshold: 0.85,
        maxRetries: 3
    },
    // Google Cloud Vision API (excellent for handwriting)
    googleVision: {
        enabled: process.env.GOOGLE_CLOUD_API_KEY ? true : false,
        apiKey: process.env.GOOGLE_CLOUD_API_KEY,
        endpoint: 'https://vision.googleapis.com/v1/images:annotate',
        confidenceThreshold: 0.80,
        maxRetries: 2
    },
    
    // Azure Computer Vision (excellent for mixed content)
    azureVision: {
        enabled: process.env.AZURE_VISION_API_KEY ? true : false,
        apiKey: process.env.AZURE_VISION_API_KEY,
        endpoint: process.env.AZURE_VISION_ENDPOINT || 'https://eastus.api.cognitive.microsoft.com/vision/v3.2/read/analyze',
        confidenceThreshold: 0.75,
        maxRetries: 2
    },
    
    // OCR.space API (good free alternative)
    ocrSpace: {
        enabled: process.env.OCR_SPACE_API_KEY ? true : false,
        apiKey: process.env.OCR_SPACE_API_KEY,
        endpoint: 'https://api.ocr.space/parse/image',
        confidenceThreshold: 0.70,
        maxRetries: 2
    }
};

// Preprocess image to improve OCR accuracy
async function preprocessBase64Image(imageUrl) {
    const base64 = (imageUrl || '').split(',')[1];
    if (!base64) return imageUrl;
    const input = Buffer.from(base64, 'base64');

    // Grayscale, increase contrast, slight sharpen, upscale if small
    const processed = await sharp(input)
        .grayscale()
        .normalize()
        .sharpen()
        .resize({ width: 2000, withoutEnlargement: false })
        .toFormat('png')
        .toBuffer();

    return `data:image/png;base64,${processed.toString('base64')}`;
}

// Enhanced OCR with multiple AI services and better accuracy
exports.uploadImageAndExtractText = async (req, res) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ message: "Image URL is required" });
        }

        DEBUG_OCR && console.log("🚀 Starting enhanced AI OCR processing...");

        // Validate image format and size
        const imageValidation = validateImageInput(imageUrl);
        if (!imageValidation.valid) {
            return res.status(400).json({ 
                message: "Invalid image format", 
                error: imageValidation.error 
            });
        }

        // Preprocess image for higher accuracy
        const preprocessedImage = await preprocessBase64Image(imageUrl);

        // If forced to use OCR.space only, short-circuit here
        if (FORCE_OCR_SPACE) {
            if (!AI_OCR_CONFIG.ocrSpace.enabled) {
                return res.status(400).json({ message: 'OCR.space API key is not configured' });
            }
            try {
                const onlyResult = await performOcrSpaceOCRWithRetry(preprocessedImage, AI_OCR_CONFIG.ocrSpace.maxRetries);
                if (!onlyResult || !onlyResult.text) {
                    throw new Error('OCR.space did not return text');
                }
                const correctedText = performMultiPassCorrection(onlyResult.text);
                const pipeDetails = parsePipeDetailsEnhanced(correctedText);
                const parsedRows = parseSnoBnoMtrWeightRowsEnhanced(correctedText);
                const qualityAnalysis = analyzeImageQualityEnhanced(correctedText, onlyResult.confidence, ['OCR.space']);
                const dataQuality = validateExtractedData(parsedRows, pipeDetails, onlyResult.confidence);
                if (parsedRows.length > 0) {
                    const header = 'S NO  Serial Number  MTR  Weight';
                    const lines = parsedRows
                        .sort((a,b) => (a.sno||0)-(b.sno||0))
                        .map(r => `${String(r.sno).padEnd(5)} ${String(r.bno).padEnd(15)} ${String(r.mtr).padEnd(5)} ${Number(r.weight).toFixed(2)}`);
                    const formattedText = [header, ...lines].join('\n');
                    return res.status(200).json({
                        message: 'Rows extracted successfully',
                        parsedRows,
                        rawText: onlyResult.text,
                        correctedText,
                        qualityAnalysis,
                        dataQuality,
                        aiServicesUsed: ['OCR.space'],
                        confidence: onlyResult.confidence,
                        formattedText,
                        extractionMethod: 'ocr_space_rows'
                    });
                }
                return res.status(200).json({
                    message: 'Text extracted successfully',
                    extractedData: pipeDetails,
                    rawText: onlyResult.text,
                    correctedText,
                    qualityAnalysis,
                    dataQuality,
                    aiServicesUsed: ['OCR.space'],
                    confidence: onlyResult.confidence,
                    extractionMethod: 'ocr_space_single'
                });
            } catch (e) {
                return res.status(400).json({ message: 'OCR.space extraction failed', error: e.message });
            }
        }

        // Try AI services with enhanced accuracy and retry logic
        let bestResult = null;
        let aiServicesUsed = [];
        let confidence = 0;

        // 1. Try Google Gemini first (highest accuracy for structured data)
        if (AI_OCR_CONFIG.gemini.enabled) {
            try {
                DEBUG_OCR && console.log("🔍 Attempting Google Gemini OCR with enhanced accuracy...");
                const geminiResult = await performGeminiOCRWithRetry(preprocessedImage, AI_OCR_CONFIG.gemini.maxRetries);
                if (geminiResult && geminiResult.text && geminiResult.confidence >= AI_OCR_CONFIG.gemini.confidenceThreshold) {
                    bestResult = geminiResult;
                    aiServicesUsed.push('Google Gemini');
                    confidence = geminiResult.confidence;
                    DEBUG_OCR && console.log("✅ Gemini OCR successful with high confidence:", confidence);
                }
            } catch (error) {
                DEBUG_OCR && console.log("❌ Gemini OCR failed:", error.message);
            }
        }

        // 2. Try Google Cloud Vision API if Gemini failed or low confidence
        if ((!bestResult || confidence < 0.85) && AI_OCR_CONFIG.googleVision.enabled) {
            try {
                DEBUG_OCR && console.log("🔍 Attempting Google Cloud Vision OCR...");
                const visionResult = await performGoogleVisionOCRWithRetry(preprocessedImage, AI_OCR_CONFIG.googleVision.maxRetries);
                if (visionResult && visionResult.text && visionResult.confidence >= AI_OCR_CONFIG.googleVision.confidenceThreshold) {
                    if (!bestResult || visionResult.confidence > confidence) {
                        bestResult = visionResult;
                        aiServicesUsed = ['Google Cloud Vision'];
                        confidence = visionResult.confidence;
                        DEBUG_OCR && console.log("✅ Google Vision OCR successful with confidence:", confidence);
                    }
                }
            } catch (error) {
                DEBUG_OCR && console.log("❌ Google Vision OCR failed:", error.message);
            }
        }

        // 3. Try Azure Computer Vision if previous services failed
        if ((!bestResult || confidence < 0.80) && AI_OCR_CONFIG.azureVision.enabled) {
            try {
                DEBUG_OCR && console.log("🔍 Attempting Azure Computer Vision OCR...");
                const azureResult = await performAzureVisionOCRWithRetry(preprocessedImage, AI_OCR_CONFIG.azureVision.maxRetries);
                if (azureResult && azureResult.text && azureResult.confidence >= AI_OCR_CONFIG.azureVision.confidenceThreshold) {
                    if (!bestResult || azureResult.confidence > confidence) {
                        bestResult = azureResult;
                        aiServicesUsed = ['Azure Computer Vision'];
                        confidence = azureResult.confidence;
                        DEBUG_OCR && console.log("✅ Azure Vision OCR successful with confidence:", confidence);
                    }
                }
            } catch (error) {
                DEBUG_OCR && console.log("❌ Azure Vision OCR failed:", error.message);
            }
        }

        // 4. Try OCR.space if previous services failed
        if ((!bestResult || confidence < 0.75) && AI_OCR_CONFIG.ocrSpace.enabled) {
            try {
                DEBUG_OCR && console.log("🔍 Attempting OCR.space...");
                const ocrSpaceResult = await performOcrSpaceOCRWithRetry(preprocessedImage, AI_OCR_CONFIG.ocrSpace.maxRetries);
                if (ocrSpaceResult && ocrSpaceResult.text && ocrSpaceResult.confidence >= AI_OCR_CONFIG.ocrSpace.confidenceThreshold) {
                    if (!bestResult || ocrSpaceResult.confidence > confidence) {
                        bestResult = ocrSpaceResult;
                        aiServicesUsed = ['OCR.space'];
                        confidence = ocrSpaceResult.confidence;
                        DEBUG_OCR && console.log("✅ OCR.space successful with confidence:", confidence);
                    }
                }
            } catch (error) {
                DEBUG_OCR && console.log("❌ OCR.space failed:", error.message);
            }
        }

        // 5. Fallback to Tesseract.js if all AI services failed
        if (!bestResult) {
            DEBUG_OCR && console.log("🔍 Falling back to Tesseract.js OCR...");
            try {
                const tesseractResult = await performTesseractOCRWithRetry(preprocessedImage, 2);
                if (tesseractResult && tesseractResult.text) {
                    bestResult = tesseractResult;
                    aiServicesUsed = ['Tesseract.js (Local)'];
                    confidence = tesseractResult.confidence || 0.6;
                    DEBUG_OCR && console.log("✅ Tesseract.js successful with confidence:", confidence);
                }
            } catch (error) {
                DEBUG_OCR && console.log("❌ Tesseract.js failed:", error.message);
            }
        }

        if (!bestResult || !bestResult.text) {
            throw new Error("All OCR methods failed to extract readable text");
        }

        DEBUG_OCR && console.log("📝 Extracted text:", bestResult.text.substring(0, 200) + "...");
        DEBUG_OCR && console.log("🎯 AI services used:", aiServicesUsed);
        DEBUG_OCR && console.log("📊 Confidence score:", confidence);

        // Enhanced text correction with multiple passes
        const correctedText = performMultiPassCorrection(bestResult.text);
        DEBUG_OCR && console.log("🔧 Corrected text:", correctedText.substring(0, 200) + "...");

        // Enhanced parsing with validation
        const pipeDetails = parsePipeDetailsEnhanced(correctedText);
        const parsedRows = parseSnoBnoMtrWeightRowsEnhanced(correctedText);

        DEBUG_OCR && console.log("📊 Parsed pipe details:", pipeDetails);
        DEBUG_OCR && console.log("📋 Parsed rows:", parsedRows.length);

        // Enhanced quality analysis
        const qualityAnalysis = analyzeImageQualityEnhanced(correctedText, confidence, aiServicesUsed);

        // Validate extracted data quality
        const dataQuality = validateExtractedData(parsedRows, pipeDetails, confidence);
        if (!dataQuality.isValid) {
            DEBUG_OCR && console.log("⚠️ Data quality issues detected:", dataQuality.issues);
        }

        // Prefer rows if any were detected with high confidence
        if (parsedRows.length > 0 && confidence >= 0.75) {
            const header = 'S NO  Serial Number  MTR  Weight';
            const lines = parsedRows
                .sort((a,b) => (a.sno||0)-(b.sno||0))
                .map(r => `${String(r.sno).padEnd(5)} ${String(r.bno).padEnd(15)} ${String(r.mtr).padEnd(5)} ${Number(r.weight).toFixed(2)}`);
            const formattedText = [header, ...lines].join('\n');
            
            return res.status(200).json({ 
                message: "Rows extracted successfully with high accuracy", 
                parsedRows,
                rawText: bestResult.text,
                correctedText: correctedText,
                qualityAnalysis,
                dataQuality,
                aiServicesUsed,
                confidence: confidence,
                formattedText,
                extractionMethod: 'high_confidence_rows'
            });
        }

        // Fallback to single record details
        res.status(200).json({ 
            message: "Text extracted successfully", 
            extractedData: pipeDetails,
            rawText: bestResult.text,
            correctedText: correctedText,
            qualityAnalysis,
            dataQuality,
            aiServicesUsed,
            confidence: confidence,
            extractionMethod: 'single_record'
        });

    } catch (error) {
        console.error("❌ Enhanced AI OCR Error:", error);
        res.status(400).json({ 
            message: "OCR processing failed", 
            error: error.message,
            details: "Please ensure the image is clear, well-lit, and contains readable text",
            recommendations: [
                "Use high-resolution images (minimum 300 DPI)",
                "Ensure good lighting and contrast",
                "Avoid shadows and reflections",
                "Use clean, uncluttered backgrounds"
            ]
        });
    }
};

// Enhanced image validation
const validateImageInput = (imageUrl) => {
    try {
        // Check if it's a valid base64 image
        if (!imageUrl.startsWith('data:image/')) {
            return { valid: false, error: "Invalid image format. Must be base64 encoded." };
        }

        // Extract base64 data
        const base64Data = imageUrl.split(',')[1];
        if (!base64Data) {
            return { valid: false, error: "Invalid base64 data." };
        }

        // Check image size (limit to 10MB)
        const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
        const sizeInMB = sizeInBytes / (1024 * 1024);
        
        if (sizeInMB > 10) {
            return { valid: false, error: "Image size too large. Maximum 10MB allowed." };
        }

        // Check minimum size (at least 100KB)
        if (sizeInMB < 0.1) {
            return { valid: false, error: "Image size too small. Minimum 100KB required." };
        }

        return { valid: true, sizeInMB: sizeInMB.toFixed(2) };
    } catch (error) {
        return { valid: false, error: "Image validation failed: " + error.message };
    }
};

// Keep backward compatibility function
const validateImageInputLegacy = validateImageInput;

// Enhanced number correction for AI OCR results (safe regex)
const correctOCRNumbers = (text) => {
    const corrections = {
        'O': '0', 'o': '0', 'l': '1', 'I': '1', 'i': '1',
        'S': '5', 's': '5', 'G': '6', 'g': '6', 'B': '8',
        'Z': '2', 'z': '2', 'A': '4', 'a': '4',
        '|': '1', '_': '', '?': '', '!': '1'
    };

    const escapeForRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let corrected = text;
    for (const [wrong, replacement] of Object.entries(corrections)) {
        const pattern = new RegExp(escapeForRegExp(wrong), 'g');
        corrected = corrected.replace(pattern, replacement);
    }

    return corrected;
};

// Keep backward compatibility function
const correctOCRNumbersLegacy = correctOCRNumbers;

// Enhanced multi-pass text correction
const performMultiPassCorrection = (text) => {
    let corrected = text;
    
    // Pass 1: Common OCR character corrections
    const characterCorrections = {
        'O': '0', 'o': '0', 'l': '1', 'I': '1', 'i': '1',
        'S': '5', 's': '5', 'G': '6', 'g': '6', 'B': '8',
        'Z': '2', 'z': '2', 'A': '4', 'a': '4',
        '|': '1', '_': '', '?': '', '!': '1',
        'D': '0', 'd': '0', 'Q': '0', 'q': '0'
    };

    for (const [wrong, replacement] of Object.entries(characterCorrections)) {
        const pattern = new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        corrected = corrected.replace(pattern, replacement);
    }

    // Pass 2: Number pattern corrections
    corrected = corrected.replace(/(\d+)\s*[.,]\s*(\d+)/g, '$1.$2'); // Fix decimal numbers
    corrected = corrected.replace(/(\d+)\s*[mM]\s*(\d+)/g, '$1 m $2'); // Fix meter notation
    
    // Pass 3: Remove excessive whitespace
    corrected = corrected.replace(/\s+/g, ' ').trim();
    
    // Pass 4: Fix common OCR spacing issues
    corrected = corrected.replace(/(\d)([A-Z])/g, '$1 $2'); // Add space between number and letter
    corrected = corrected.replace(/([A-Z])(\d)/g, '$1 $2'); // Add space between letter and number

    return corrected;
};

// Keep backward compatibility function
const performMultiPassCorrectionLegacy = performMultiPassCorrection;

// Enhanced pipe details parsing with validation
const parsePipeDetailsEnhanced = (text) => {
    console.log("🔍 Enhanced parsing of pipe details from text:", text.substring(0, 200) + "...");
    
    const details = {
        serialNumber: extractSerialNumber(text),
        colorGrade: extractColorGrade(text),
        sizeType: extractSizeType(text),
        length: extractLength(text),
        weight: extractWeight(text)
    };

    // Validate extracted values
    const validation = validatePipeDetails(details);
    if (!validation.isValid) {
        console.log("⚠️ Pipe details validation failed:", validation.issues);
    }

    return { ...details, validation };
};

// Keep backward compatibility function
const parsePipeDetails = parsePipeDetailsEnhanced;
const parsePipeDetailsLegacy = parsePipeDetailsEnhanced;

// Enhanced extraction functions with better patterns
const extractSerialNumber = (text) => {
    const patterns = [
        /Serial\s*Number\s*[:-]?\s*([A-Za-z0-9-_]+)/i,
        /BNO\s*[:-]?\s*([A-Za-z0-9-_]+)/i,
        /B\s*NO\s*[:-]?\s*([A-Za-z0-9-_]+)/i,
        /S\s*NO\s*[:-]?\s*([A-Za-z0-9-_]+)/i,
        /ID\s*[:-]?\s*([A-Za-z0-9-_]+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return '';
};

const extractColorGrade = (text) => {
    const patterns = [
        /Color\s*Grade\s*[:-]?\s*([ABCD])/i,
        /Grade\s*[:-]?\s*([ABCD])/i,
        /Quality\s*[:-]?\s*([ABCD])/i,
        /\b([ABCD])\s*Grade/i,
        /\b([ABCD])\s*Quality/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].toUpperCase();
        }
    }
    return '';
};

const extractSizeType = (text) => {
    const patterns = [
        /Size\s*Type\s*[:-]?\s*([\d.-]+\s*inch)/i,
        /Size\s*[:-]?\s*([\d.-]+\s*inch)/i,
        /Diameter\s*[:-]?\s*([\d.-]+\s*inch)/i,
        /Width\s*[:-]?\s*([\d.-]+\s*inch)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return '';
};

const extractLength = (text) => {
    const patterns = [
        /Length\s*[:-]?\s*([\d.]+)/i,
        /MTR\s*[:-]?\s*([\d.]+)/i,
        /Meter\s*[:-]?\s*([\d.]+)/i,
        /Height\s*[:-]?\s*([\d.]+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const value = parseFloat(match[1]);
            return isNaN(value) ? 0 : value;
        }
    }
    return 0;
};

const extractWeight = (text) => {
    const patterns = [
        /Weight\s*[:-]?\s*([\d.]+)/i,
        /WT\s*[:-]?\s*([\d.]+)/i,
        /Mass\s*[:-]?\s*([\d.]+)/i,
        /KG\s*[:-]?\s*([\d.]+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const value = parseFloat(match[1]);
            return isNaN(value) ? 0 : value;
        }
    }
    return 0;
};

// Keep backward compatibility functions
const extractSerialNumberLegacy = extractSerialNumber;
const extractColorGradeLegacy = extractColorGrade;
const extractSizeTypeLegacy = extractSizeType;
const extractLengthLegacy = extractLength;
const extractWeightLegacy = extractWeight;

// Enhanced validation for pipe details
const validatePipeDetails = (details) => {
    const issues = [];
    const warnings = [];

    if (!details.serialNumber) {
        issues.push("Serial number not found");
    }

    if (!details.colorGrade) {
        warnings.push("Color grade not detected");
    } else if (!['A', 'B', 'C', 'D'].includes(details.colorGrade)) {
        issues.push("Invalid color grade: " + details.colorGrade);
    }

    if (!details.sizeType) {
        warnings.push("Size type not detected");
    }

    if (details.length <= 0) {
        issues.push("Invalid or missing length");
    } else if (details.length > 100) {
        warnings.push("Length seems unusually high: " + details.length);
    }

    if (details.weight <= 0) {
        issues.push("Invalid or missing weight");
    } else if (details.weight > 1000) {
        warnings.push("Invalid or missing weight");
    }

    return {
        isValid: issues.length === 0,
        issues,
        warnings,
        confidence: details.serialNumber && details.length && details.weight ? 'high' : 'low'
    };
};

// Keep backward compatibility function
const validatePipeDetailsLegacy = validatePipeDetails;

/**
 * Enhanced parsing for 4-column format: Number | Serial Number | Length | Weight
 * 
 * Expected image structure:
 * Column 1: Number (1, 2, 3...n) - Row identifier
 * Column 2: Pipe serial number - Unique identifier for the pipe
 * Column 3: Length of pipe - Measured in meters
 * Column 4: Weight of pipe - Measured in kilograms
 * 
 * Supports multiple formats:
 * - Space separated: "1 12345 6 15.5"
 * - Tab separated: "1\t12345\t6\t15.5"
 * - Comma separated: "1,12345,6,15.5"
 * - Pipe separated: "1|12345|6|15.5"
 * - Dash separated: "1-12345-6-15.5"
 * - Messy OCR: "1) 1539 88 20" (extracts numbers intelligently)
 */
const parseSnoBnoMtrWeightRowsEnhanced = (text) => {
    // Normalize common OCR quirks before splitting to lines
    const replaceCircledNumeral = (ch) => {
        const map = {
            '①': '1','②': '2','③': '3','④': '4','⑤': '5','⑥': '6','⑦': '7','⑧': '8','⑨': '9','⑩': '10'
        };
        return map[ch] || ch;
    };

    const normalizeLine = (line) => {
        if (!line) return '';
        let s = line
            .split('')
            .map(replaceCircledNumeral)
            .join('');
        // Convert hyphenated decimals like 75-00 → 75.00 (use only when between digits)
        s = s.replace(/(\d)[\-–](\d{2,})/g, '$1.$2');
        // Remove ellipses and stray dots around numbers like "176." or "..."
        s = s.replace(/\.\.+/g, ' ')
             .replace(/(\d+)\.(?=\s|$)/g, '$1');
        // Collapse multiple spaces and trim
        s = s.replace(/[^\w\d\s.\-]/g, ' ').replace(/\s{2,}/g, ' ').trim();
        return s;
    };

    const lines = text
        .split(/\r?\n/)
        .map(normalizeLine)
        .filter(l => l.length > 0);

    DEBUG_OCR && console.log("📝 Processing enhanced rows:", lines.length);
    const rows = [];

    // Enhanced patterns for 4-column format: Number | Serial Number | Length | Weight
    const patterns = [
        // Standard 4-column pattern: Number | Serial | Length | Weight
        /^(\d+)[)\.]?\s+(\d{2,})\s+(\d{1,3})(?:\s*mtr)?\s+([\d.]+)/i,
        /^(\d+)\.\s+(\d{2,})\s+(\d{1,3})\s+([\d.]+)/i,
        /^(\d+)\s+(\d{2,})\s+(\d{1,3})m\s+([\d.]+)/i,
        /^(\d+)\s+(\d{2,})\s+(\d{1,3})\s+(\d+)/i,
        
        // Hyphen-decimal tolerance already normalized, but keep permissive pattern
        /^(\d+)\s*(\d{2,})\s*(\d{1,3})\s*([\d.]+)/i,
        
        // Tab and comma separated 4 columns
        /^(\d+)\t+(\d+)\t+(\d+)\t+([\d.]+)/i,
        /^(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)/i,
        
        // Pipe separator format
        /^(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)/i,
        /^(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*([\d.]+)/i
    ];

    const hasHeaders = /\bS\s*NO\b|\bSerial\s*Number\b|\bMTR\b|\bWeight\b/i.test(text);

    for (const line of lines) {
        // Ignore lines that don't have at least 3 numbers (likely totals/date/etc.)
        const numericTokens = (line.match(/[\d.]+/g) || []).length;
        if (numericTokens < 3) continue;

        let matched = false;

        for (const pattern of patterns) {
            const m = line.match(pattern);
            if (m) {
                const rowNumber = parseInt(m[1], 10);        // Column 1: Number (1,2,3...n)
                const serialNumber = m[2];                   // Column 2: Pipe serial number
                const length = parseFloat(m[3]);             // Column 3: Length of pipe
                const weight = parseFloat(m[4]);             // Column 4: Weight of pipe
                
                if (!Number.isNaN(length) && !Number.isNaN(weight) && length > 0 && weight > 0) {
                    // Validate reasonable ranges for pipe dimensions
                    if (length > 100 || weight > 1000) {
                        DEBUG_OCR && console.log(`⚠️ Skipping row with unusual values: Row=${rowNumber}, Length=${length}m, Weight=${weight}kg`);
                        continue;
                    }

                    rows.push({ 
                        sno: rowNumber,           // Row number (1,2,3...n)
                        bno: serialNumber,        // Serial number
                        serialNumber: serialNumber,
                        mtr: length,              // Length in meters
                        weight: weight,           // Weight in kg
                        hasHeaders,
                        originalLine: line,
                        pattern: 'regex',
                        confidence: 'high'
                    });
                    matched = true;
                    break;
                }
            }
        }
        
        // Enhanced intelligent extraction for messy OCR when regex patterns fail
        if (!matched) {
            const cleanLine = line.replace(/[^\d\s.]/g, ' ').replace(/\s+/g, ' ').trim();
            const parts = cleanLine.split(/\s+/).filter(part => part.trim().length > 0);
            
            if (parts.length >= 4) {
                const numbers = [];
                for (let i = 0; i < parts.length; i++) {
                    const num = parseFloat(parts[i]);
                    if (!Number.isNaN(num) && num >= 0) {
                        numbers.push({ value: num, index: i });
                    }
                }
                
                if (numbers.length >= 4) {
                    numbers.sort((a, b) => a.index - b.index);
                    const rowNumber = parseInt(numbers[0].value, 10);
                    const serialNumber = numbers[1].value.toString();
                    const length = numbers[2].value;
                    const weight = numbers[3].value;
                    
                    if (length > 0 && weight > 0 && length <= 100 && weight <= 1000) {
                        rows.push({ 
                            sno: rowNumber,           // Row number
                            bno: serialNumber,        // Serial number
                            serialNumber: serialNumber,
                            mtr: length,              // Length in meters
                            weight: weight,           // Weight in kg
                            hasHeaders: false,
                            originalLine: line,
                            method: 'intelligent',
                            confidence: 'medium'
                        });
                    }
                }
            }
        }
    }

    // De-duplicate by SNO and validate data quality
    const unique = new Map();
    for (const r of rows) {
        if (!unique.has(r.sno)) {
            unique.set(r.sno, r);
        } else {
            const existing = unique.get(r.sno);
            if (r.confidence === 'high' && existing.confidence !== 'high') {
                unique.set(r.sno, r);
            }
        }
    }
    
    const result = Array.from(unique.values());
    DEBUG_OCR && console.log("✅ Final parsed rows:", result.length);
    return result;
};

// Keep backward compatibility function
const parseSnoBnoMtrWeightRows = parseSnoBnoMtrWeightRowsEnhanced;
const parseSnoBnoMtrWeightRowsLegacy = parseSnoBnoMtrWeightRowsEnhanced;

// Enhanced quality analysis
const analyzeImageQualityEnhanced = (text, confidence, aiServicesUsed) => {
    const issues = [];
    const recommendations = [];
    const qualityScore = calculateQualityScore(text, confidence, aiServicesUsed);
    
    if (text.length < 10) {
        issues.push("Very short text extracted");
        recommendations.push("Ensure image contains sufficient text content");
    }
    
    if (text.includes('?') || text.includes('|') || text.includes('_')) {
        issues.push("Uncertain characters detected");
        recommendations.push("Improve image clarity and contrast");
    }
    
    if (confidence && confidence < 0.7) {
        issues.push("Low confidence in text extraction");
        recommendations.push("Use higher resolution images with better lighting");
    }
    
    const numberCount = (text.match(/\d/g) || []).length;
    if (numberCount < 4) {
        issues.push("Insufficient numbers detected");
        recommendations.push("Ensure numbers are clearly visible and well-spaced");
    }

    // Check for common OCR artifacts
    const artifactPatterns = [/[^\w\s\d.,\-]/g, /[^\x00-\x7F]/g];
    for (const pattern of artifactPatterns) {
        const artifacts = text.match(pattern);
        if (artifacts && artifacts.length > text.length * 0.1) {
            issues.push("High number of OCR artifacts detected");
            recommendations.push("Clean image and remove noise before processing");
        }
    }
    
    return { 
        issues, 
        recommendations, 
        qualityScore,
        confidence: confidence,
        textLength: text.length,
        numberCount: numberCount
    };
};

// Keep backward compatibility function
const analyzeImageQuality = analyzeImageQualityEnhanced;
const analyzeImageQualityLegacy = analyzeImageQualityEnhanced;

// Calculate quality score based on multiple factors
const calculateQualityScore = (text, confidence, aiServicesUsed) => {
    let score = 0;
    
    // Base score from confidence
    score += confidence * 40;
    
    // Text length factor
    if (text.length > 50) score += 20;
    else if (text.length > 20) score += 15;
    else if (text.length > 10) score += 10;
    
    // Number density factor
    const numberCount = (text.match(/\d/g) || []).length;
    if (numberCount > 10) score += 20;
    else if (numberCount > 5) score += 15;
    else if (numberCount > 2) score += 10;
    
    // AI service quality factor
    if (aiServicesUsed.includes('Google Gemini')) score += 15;
    else if (aiServicesUsed.includes('Google Cloud Vision')) score += 12;
    else if (aiServicesUsed.includes('Azure Computer Vision')) score += 10;
    else if (aiServicesUsed.includes('OCR.space')) score += 8;
    else score += 5; // Tesseract
    
    return Math.min(100, Math.max(0, score));
};

// Keep backward compatibility function
const calculateQualityScoreLegacy = calculateQualityScore;

// Enhanced data quality validation
const validateExtractedData = (parsedRows, pipeDetails, confidence) => {
    const issues = [];
    const warnings = [];
    
    if (parsedRows.length === 0 && !pipeDetails.serialNumber) {
        issues.push("No valid pipe data extracted");
    }
    
    if (parsedRows.length > 0) {
        // Validate row data consistency
        const lengths = parsedRows.map(r => r.mtr).filter(l => l > 0);
        const weights = parsedRows.map(r => r.weight).filter(w => w > 0);
        
        if (lengths.length > 0) {
            const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
            const lengthVariance = lengths.map(l => Math.abs(l - avgLength)).reduce((a, b) => a + b, 0) / lengths.length;
            
            if (lengthVariance > avgLength * 0.5) {
                warnings.push("High variance in pipe lengths detected");
            }
        }
        
        if (weights.length > 0) {
            const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
            const weightVariance = weights.map(w => Math.abs(w - avgWeight)).reduce((a, b) => a + b, 0) / weights.length;
            
            if (weightVariance > avgWeight * 0.5) {
                warnings.push("High variance in pipe weights detected");
            }
        }
    }
    
    if (confidence < 0.8) {
        warnings.push("Low confidence extraction - manual verification recommended");
    }
    
    return {
        isValid: issues.length === 0,
        issues,
        warnings,
        confidence: confidence,
        dataQuality: confidence >= 0.9 ? 'excellent' : confidence >= 0.8 ? 'good' : confidence >= 0.7 ? 'fair' : 'poor'
    };
};

// Keep backward compatibility function
const validateExtractedDataLegacy = validateExtractedData;

// Google Cloud Vision API OCR
async function performGoogleVisionOCR(imageUrl) {
    try {
        const requestBody = {
            requests: [{
                image: {
                    content: imageUrl.split(',')[1] // Remove data:image/... prefix
                },
                features: [{
                    type: 'TEXT_DETECTION',
                    maxResults: 1
                }],
                imageContext: {
                    languageHints: ['en'],
                    textDetectionParams: {
                        enableTextDetectionConfidenceScore: true
                    }
                }
            }]
        };

        const response = await axios.post(
            `${AI_OCR_CONFIG.googleVision.endpoint}?key=${AI_OCR_CONFIG.googleVision.apiKey}`,
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.responses && response.data.responses[0].textAnnotations) {
            const text = response.data.responses[0].textAnnotations[0].description;
            let confidence = response.data.responses[0].textAnnotations[0].confidence;
            if (typeof confidence !== 'number' || Number.isNaN(confidence)) confidence = 0.9;
            if (confidence > 1) confidence = confidence / 100; // normalize percent → 0..1
            return { text, confidence, source: 'google' };
        }

        return null;
    } catch (error) {
        console.error("Google Vision API error:", error.message);
        throw error;
    }
}

// Keep backward compatibility function
const performGoogleVisionOCRLegacy = performGoogleVisionOCR;

// Azure Computer Vision OCR
async function performAzureVisionOCR(imageUrl) {
    try {
        // First, submit the image for analysis
        const submitResponse = await axios.post(
            AI_OCR_CONFIG.azureVision.endpoint,
            {
                url: imageUrl
            },
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': AI_OCR_CONFIG.azureVision.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        const operationLocation = submitResponse.headers['operation-location'];
        
        // Poll for results
        let result = null;
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const statusResponse = await axios.get(operationLocation, {
                headers: {
                    'Ocp-Apim-Subscription-Key': AI_OCR_CONFIG.azureVision.apiKey
                }
            });

            if (statusResponse.data.status === 'succeeded') {
                result = statusResponse.data;
                break;
            }
        }

        if (result && result.analyzeResult && result.analyzeResult.readResults) {
            const text = result.analyzeResult.readResults
                .map(page => page.lines.map(line => line.text).join(' '))
                .join('\n');

            // Azure Read API does not return a single confidence; use heuristic
            return { text, confidence: 0.95, source: 'azure' };
        }

        return null;
    } catch (error) {
        console.error("Azure Vision API error:", error.message);
        throw error;
    }
}

// Keep backward compatibility function
const performAzureVisionOCRLegacy = performAzureVisionOCR;

// OCR.space API
async function performOcrSpaceOCR(imageUrl) {
    try {
        const formData = new FormData();
        formData.append('apikey', AI_OCR_CONFIG.ocrSpace.apiKey);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('filetype', 'png');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', '2'); // Better accuracy

        // Convert base64 to blob
        const base64Data = imageUrl.split(',')[1];
        const blob = await fetch(`data:image/png;base64,${base64Data}`).then(r => r.blob());
        formData.append('image', blob, 'image.png');

        const response = await axios.post(AI_OCR_CONFIG.ocrSpace.endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if (response.data.ParsedResults && response.data.ParsedResults[0]) {
            const text = response.data.ParsedResults[0].ParsedText;
            let confidence = response.data.ParsedResults[0].TextOverlay?.Lines?.[0]?.Words?.[0]?.Confidence;
            if (typeof confidence !== 'number' || Number.isNaN(confidence)) confidence = 80;
            return { text, confidence: confidence > 1 ? confidence / 100 : confidence, source: 'ocrspace' };
        }

        return null;
    } catch (error) {
        console.error("OCR.space API error:", error.message);
        throw error;
    }
}

// Keep backward compatibility function
const performOcrSpaceOCRLegacy = performOcrSpaceOCR;

// Tesseract.js OCR (fallback)
async function performTesseractOCR(imageUrl) {
    try {
        const { data: { text, confidence } } = await Tesseract.recognize(imageUrl, "eng", {
            logger: m => console.log("Tesseract Progress:", m),
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.-:() ',
            tessedit_pageseg_mode: '6',
            preserve_interword_spaces: '1',
            tessedit_do_invert: '0'
        });

        // Tesseract sometimes returns confidence 0..100
        let conf = typeof confidence === 'number' ? confidence : 70;
        if (conf > 1) conf = conf / 100;
        return { text, confidence: conf, source: 'tesseract' };
    } catch (error) {
        console.error("Tesseract.js error:", error.message);
        throw error;
    }
}

// Keep backward compatibility function
const performTesseractOCRLegacy = performTesseractOCR;

// Google Gemini OCR (Vision via Generative AI)
async function performGeminiOCR(imageUrl) {
    if (!GenerativeAI) {
        throw new Error("@google/generative-ai is not installed");
    }
    if (!AI_OCR_CONFIG.gemini.apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
    }
    try {
        const genAI = new GenerativeAI(AI_OCR_CONFIG.gemini.apiKey);
        const model = genAI.getGenerativeModel({ model: AI_OCR_CONFIG.gemini.model });

        const base64 = (imageUrl || '').split(',')[1];
        const mimeMatch = (imageUrl || '').match(/^data:(.*?);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

        const prompt = "Extract all readable text from this image. Preserve line breaks. Do not explain, return only the extracted text.";

        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { data: base64, mimeType } }
        ]);

        const response = result.response;
        const text = typeof response.text === 'function' ? response.text() : (response.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '');

        return { text, confidence: 0.95, source: 'gemini' };
    } catch (error) {
        console.error("Gemini API error:", error.message);
        throw error;
    }
}

// Keep backward compatibility function
const performGeminiOCRLegacy = performGeminiOCR;

// Enhanced OCR functions with retry logic
const performGeminiOCRWithRetry = async (imageUrl, maxRetries) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔍 Gemini OCR attempt ${attempt}/${maxRetries}`);
            const result = await performGeminiOCR(imageUrl);
            if (result && result.text) {
                return result;
            }
        } catch (error) {
            console.log(`❌ Gemini OCR attempt ${attempt} failed:`, error.message);
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
    }
    return null;
};

const performGoogleVisionOCRWithRetry = async (imageUrl, maxRetries) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔍 Google Vision OCR attempt ${attempt}/${maxRetries}`);
            const result = await performGoogleVisionOCR(imageUrl);
            if (result && result.text) {
                return result;
            }
        } catch (error) {
            console.log(`❌ Google Vision OCR attempt ${attempt} failed:`, error.message);
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    return null;
};

const performAzureVisionOCRWithRetry = async (imageUrl, maxRetries) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔍 Azure Vision OCR attempt ${attempt}/${maxRetries}`);
            const result = await performAzureVisionOCR(imageUrl);
            if (result && result.text) {
                return result;
            }
        } catch (error) {
            console.log(`❌ Azure Vision OCR attempt ${attempt} failed:`, error.message);
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    return null;
};

const performOcrSpaceOCRWithRetry = async (imageUrl, maxRetries) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔍 OCR.space attempt ${attempt}/${maxRetries}`);
            const result = await performOcrSpaceOCR(imageUrl);
            if (result && result.text) {
                return result;
            }
        } catch (error) {
            console.log(`❌ OCR.space attempt ${attempt} failed:`, error.message);
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    return null;
};

const performTesseractOCRWithRetry = async (imageUrl, maxRetries) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔍 Tesseract.js attempt ${attempt}/${maxRetries}`);
            const result = await performTesseractOCR(imageUrl);
            if (result && result.text) {
                return result;
            }
        } catch (error) {
            console.log(`❌ Tesseract.js attempt ${attempt} failed:`, error.message);
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    return null;
};

// Keep backward compatibility functions
const performGeminiOCRWithRetryLegacy = performGeminiOCRWithRetry;
const performGoogleVisionOCRWithRetryLegacy = performGoogleVisionOCRWithRetry;
const performAzureVisionOCRWithRetryLegacy = performAzureVisionOCRWithRetry;
const performOcrSpaceOCRWithRetryLegacy = performOcrSpaceOCRWithRetry;
const performTesseractOCRWithRetryLegacy = performTesseractOCRWithRetry;

// Test endpoint
exports.testOcr = async (req, res) => {
    try {
        const availableServices = [];
        
        if (AI_OCR_CONFIG.googleVision.enabled) availableServices.push('Google Cloud Vision');
        if (AI_OCR_CONFIG.azureVision.enabled) availableServices.push('Azure Computer Vision');
        if (AI_OCR_CONFIG.ocrSpace.enabled) availableServices.push('OCR.space');
        availableServices.push('Tesseract.js (fallback)');

        res.status(200).json({ 
            message: "AI OCR endpoint is working",
            status: "ready",
            availableServices,
            tesseractVersion: require("tesseract.js/package.json").version
        });
    } catch (error) {
        console.error("AI OCR Test Error:", error);
        res.status(500).json({ 
            message: "AI OCR test failed", 
            error: error.message 
        });
    }
};

// Keep existing functions for backward compatibility
exports.uploadSellRequestImage = async (req, res) => {
    try {
        const { imageUrl } = req.body;
        const result = await performGoogleVisionOCR(imageUrl) || 
                      await performAzureVisionOCR(imageUrl) || 
                      await performOcrSpaceOCR(imageUrl) || 
                      await performTesseractOCR(imageUrl);

        if (!result) {
            throw new Error("All OCR methods failed");
        }

        const sellDetails = parseSellRequestDetails(result.text);
        res.status(200).json({ message: "Text extracted successfully", extractedData: sellDetails });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.saveEditedData = async (req, res) => {
    try {
        const { colorGrade, sizeType, length, weight, serialNumber, price } = req.body;

        if (!colorGrade || !sizeType || !length || !weight || !serialNumber || !price) {
            throw new Error("All fields are required.");
        }

        const pipe = new Pipe({
            colorGrade,
            sizeType,
            length,
            remainingLength: length,
            weight,
            serialNumber,
            price,
            worker: req.user.id,
        });

        await pipe.save();
        res.status(201).json({ message: "Pipe added to stock successfully", pipe });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const parseSellRequestDetails = (text) => {
    const details = {
        billNumber: text.match(/Bill\s*Number\s*[:-]?\s*([A-Za-z0-9-]+)/i)?.[1],
        customerName: text.match(/Customer\s*Name\s*[:-]?\s*([A-Za-z\s]+)/i)?.[1],
        customerPlace: text.match(/Customer\s*Place\s*[:-]?\s*([A-Za-z\s]+)/i)?.[1],
        serialNumber: text.match(/Serial\s*Number\s*[:-]?\s*([A-Za-z0-9-]+)/i)?.[1],
        soldLength: parseFloat(text.match(/Sold\s*Length\s*[:-]?\s*([\d.]+)/i)?.[1]),
        price: parseFloat(text.match(/Price\s*[:-]?\s*([\d.]+)/i)?.[1])
    };

    return details;
};

// Keep backward compatibility function
const parseSellRequestDetailsLegacy = parseSellRequestDetails;

// Bulk pipe processing with AI OCR
exports.processBulkPipes = async (req, res) => {
    try {
        const { imageUrl, batchNumber, manufacturingDate, sizeType, defaultColorGrade } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ message: 'Image URL is required' });
        }
        
        if (!batchNumber) {
            return res.status(400).json({ message: 'Batch number is required' });
        }

        if (!sizeType) {
            return res.status(400).json({ message: 'Pipe size type is required for bulk processing' });
        }

        // Preprocess for accuracy
        const preprocessedImage = await preprocessBase64Image(imageUrl);

        let extractedText = '';
        let aiServicesUsed = [];
        let confidence = 0;

        if (FORCE_OCR_SPACE) {
            if (!AI_OCR_CONFIG.ocrSpace.enabled) {
                return res.status(400).json({ message: 'OCR.space API key is not configured' });
            }
            try {
                const onlyResult = await performOcrSpaceOCRWithRetry(preprocessedImage, AI_OCR_CONFIG.ocrSpace.maxRetries);
                if (!onlyResult || !onlyResult.text) throw new Error('OCR.space did not return text');
                extractedText = onlyResult.text;
                confidence = onlyResult.confidence || 0.75;
                aiServicesUsed = ['OCR.space'];
            } catch (e) {
                return res.status(400).json({ message: 'OCR.space extraction failed', error: e.message });
            }
        }

        // Existing multi-provider flow if not forced (rest of function unchanged below)
        if (!FORCE_OCR_SPACE) {
            // Try AI OCR services in order of preference
            try {
                if (process.env.GEMINI_API_KEY) {
                    const geminiResult = await performGeminiOCRWithRetry(preprocessedImage, AI_OCR_CONFIG.gemini.maxRetries);
                    if (geminiResult && geminiResult.text) {
                        extractedText = geminiResult.text;
                        confidence = geminiResult.confidence || 0.9;
                        aiServicesUsed.push('Google Gemini');
                    }
                }
            } catch (error) {}
            if (!extractedText && process.env.GOOGLE_CLOUD_API_KEY) {
                try {
                    const visionResult = await performGoogleVisionOCRWithRetry(preprocessedImage, AI_OCR_CONFIG.googleVision.maxRetries);
                    if (visionResult && visionResult.text) {
                        extractedText = visionResult.text;
                        confidence = visionResult.confidence || 0.85;
                        aiServicesUsed.push('Google Cloud Vision');
                    }
                } catch (error) {}
            }
            if (!extractedText && process.env.AZURE_VISION_API_KEY) {
                try {
                    const azureResult = await performAzureVisionOCRWithRetry(preprocessedImage, AI_OCR_CONFIG.azureVision.maxRetries);
                    if (azureResult && azureResult.text) {
                        extractedText = azureResult.text;
                        confidence = azureResult.confidence || 0.8;
                        aiServicesUsed.push('Azure Computer Vision');
                    }
                } catch (error) {}
            }
            if (!extractedText && process.env.OCR_SPACE_API_KEY) {
                try {
                    const ocrSpaceResult = await performOcrSpaceOCRWithRetry(preprocessedImage, AI_OCR_CONFIG.ocrSpace.maxRetries);
                    if (ocrSpaceResult && ocrSpaceResult.text) {
                        extractedText = ocrSpaceResult.text;
                        confidence = ocrSpaceResult.confidence || 0.75;
                        aiServicesUsed.push('OCR.space');
                    }
                } catch (error) {}
            }
            if (!extractedText) {
                try {
                    const tesseractResult = await performTesseractOCRWithRetry(preprocessedImage, 2);
                    if (tesseractResult && tesseractResult.text) {
                        extractedText = tesseractResult.text;
                        confidence = tesseractResult.confidence || 0.7;
                        aiServicesUsed.push('Tesseract.js (Local)');
                    }
                } catch (error) {}
            }
            if (!extractedText) {
                return res.status(400).json({ 
                    message: 'Failed to extract text from image using available OCR services',
                    aiServicesUsed
                });
            }
        }

        const correctedText = performMultiPassCorrection(extractedText);
        const pipes = parseBulkPipeDataEnhanced(correctedText, batchNumber, manufacturingDate, sizeType, defaultColorGrade);
        if (!pipes || pipes.length === 0) {
            return res.status(400).json({ 
                message: 'No valid pipe data found in the image',
                rawText: extractedText,
                correctedText: correctedText,
                confidence: confidence,
                aiServicesUsed: aiServicesUsed,
                recommendations: [
                    'Ensure the image contains clear, readable text',
                    'Check that numbers are properly formatted',
                    'Verify the image is not rotated or blurry'
                ]
            });
        }

        const dataQuality = validateBulkDataQuality(pipes, confidence);

        const result = await executeTransaction(async (session) => {
            const savedPipes = [];
            const errorDetails = [];
            let savedCount = 0;
            let errorCount = 0;
            for (const pipeData of pipes) {
                try {
                    const pipeValidation = validatePipeData(pipeData);
                    if (!pipeValidation.isValid) {
                        errorDetails.push({ serialNumber: pipeData.serialNumber, error: `Validation failed: ${pipeValidation.issues.join(', ')}` });
                        errorCount++;
                        continue;
                    }
                    const pipe = new Pipe({
                        ...pipeData,
                        worker: req.user.id,
                        manufacturingDate: manufacturingDate || new Date(),
                        batchNumber: batchNumber
                    });
                    await pipe.save({ session });
                    savedPipes.push(pipe);
                    savedCount++;
                } catch (error) {
                    errorDetails.push({ serialNumber: pipeData.serialNumber, error: error.message });
                    errorCount++;
                }
            }
            return { savedPipes, errorDetails, savedCount, errorCount };
        });

        res.json({
            success: true,
            message: `Successfully processed ${result.savedCount} pipes with ${result.errorCount} errors`,
            totalPipes: pipes.length,
            savedPipes: result.savedCount,
            errors: result.errorCount,
            savedPipesData: result.savedPipes.map(pipe => ({
                serialNumber: pipe.serialNumber,
                colorGrade: pipe.colorGrade,
                sizeType: pipe.sizeType,
                length: pipe.length,
                weight: pipe.weight,
                price: pipe.price,
                batchNumber: pipe.batchNumber,
                manufacturingDate: pipe.manufacturingDate
            })),
            errorDetails: result.errorDetails,
            rawText: extractedText,
            correctedText: correctedText,
            confidence: confidence,
            aiServicesUsed: aiServicesUsed,
            dataQuality: dataQuality,
            batchInfo: {
                batchNumber: batchNumber,
                sizeType: sizeType,
                defaultColorGrade: defaultColorGrade || 'A',
                manufacturingDate: manufacturingDate || new Date()
            },
            processingMetadata: {
                timestamp: new Date().toISOString(),
                userId: req.user.id,
                transactionId: `BULK_${Date.now()}`,
                acideCompliant: true
            }
        });

    } catch (error) {
        console.error('❌ Bulk pipe processing error:', error);
        res.status(500).json({ 
            message: 'Internal server error during bulk processing',
            error: error.message 
        });
    }
};

// Enhanced bulk pipe data parsing with better validation
const parseBulkPipeDataEnhanced = (text, batchNumber, manufacturingDate, sizeType, defaultColorGrade = 'A') => {
    console.log('🔍 Enhanced parsing of bulk pipe data...');
    console.log('📏 Preset size:', sizeType);
    console.log('🎨 Default grade:', defaultColorGrade);
    
    const pipes = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    console.log(`📝 Processing ${lines.length} text lines`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
            // Try to extract pipe data from the line with enhanced validation
            const pipeData = extractPipeFromLineEnhanced(line, sizeType, defaultColorGrade);
            
            if (pipeData) {
                // Always generate a unique serial number for bulk processing
                pipeData.serialNumber = generateUniqueSerialNumber();
                
                // Validate pipe data before adding
                const validation = validatePipeData(pipeData);
                if (validation.isValid) {
                    pipes.push(pipeData);
                    console.log(`✅ Parsed pipe: ${pipeData.serialNumber} - ${pipeData.length}m, ${pipeData.weight}kg, Grade ${pipeData.colorGrade}`);
                } else {
                    console.log(`⚠️ Skipping invalid pipe data: ${validation.issues.join(', ')}`);
                }
            }
        } catch (error) {
            console.log(`⚠️ Skipping line ${i + 1}: ${error.message}`);
        }
    }

    console.log(`📊 Total valid pipes parsed: ${pipes.length}`);
    return pipes;
};

// Keep backward compatibility function
const parseBulkPipeData = parseBulkPipeDataEnhanced;
const parseBulkPipeDataLegacy = parseBulkPipeDataEnhanced;

/**
 * Enhanced pipe extraction with better validation for 4-column format
 * 
 * Extracts pipe data from a single line of OCR text
 * Expected format: Number | Serial Number | Length | Weight
 * 
 * @param {string} line - OCR text line to parse
 * @param {string} sizeType - Pipe size type (e.g., "2 inch", "3 inch")
 * @param {string} defaultColorGrade - Default color grade if not specified
 * @returns {object|null} Pipe object or null if parsing fails
 */
const extractPipeFromLineEnhanced = (line, sizeType, defaultColorGrade) => {
    // Remove extra spaces and normalize
    const cleanLine = line.replace(/\s+/g, ' ').trim();
    
    // Try multiple patterns for different data formats
    let match;
    
    // Pattern 1: 4-column format: Number | Serial | Length | Weight
    const pattern1 = /^(\d+)[)\.]?\s+(\d{2,})\s+(\d{1,3})(?:\s*mtr)?\s+([\d.]+)/i;
    
    // Pattern 2: Tab/Comma separated 4 columns
    const pattern2 = /^(\d+)\t+(\d+)\t+(\d+)\t+([\d.]+)/i;
    const pattern3 = /^(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)/i;
    
    // Pattern 3: Pipe separator format
    const pattern4 = /^(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)/i;
    
    // Pattern 4: Legacy patterns for backward compatibility
    const pattern5 = /(?:SNO[:\s]*(\d+)[\s|]*)?(?:Serial[:\s]*([A-Z0-9_]+)[\s|]*)?(?:MTR[:\s]*([\d.]+)[\s|]*)?(?:Weight[:\s]*([\d.]+)[\s|]*)?(?:Grade[:\s]*([ABCD])[\s|]*)?(?:Size[:\s]*([\d.]+)\s*inch)?/i;
    
    // Try 4-column pattern first (most common for your format)
    match = cleanLine.match(pattern1);
    if (match) {
        const [, rowNumber, serial, length, weight] = match;
        
        if (length && weight) {
            const lengthValue = parseFloat(length);
            const weightValue = parseFloat(weight);
            
            // Enhanced validation
            if (isValidLength(lengthValue) && isValidWeight(weightValue)) {
                return {
                    serialNumber: serial || generateUniqueSerialNumber(),
                    length: lengthValue,
                    weight: weightValue,
                    colorGrade: defaultColorGrade,
                    sizeType: sizeType,
                    price: calculatePipePriceEnhanced(lengthValue, weightValue, defaultColorGrade)
                };
            }
        }
    }
    
    // Try tab-separated format
    match = cleanLine.match(pattern2);
    if (match) {
        const [, rowNumber, serial, length, weight] = match;
        const lengthValue = parseFloat(length);
        const weightValue = parseFloat(weight);
        
        if (isValidLength(lengthValue) && isValidWeight(weightValue)) {
            return {
                serialNumber: serial,
                length: lengthValue,
                weight: weightValue,
                colorGrade: defaultColorGrade,
                sizeType: sizeType,
                price: calculatePipePriceEnhanced(lengthValue, weightValue, defaultColorGrade)
            };
        }
    }
    
    // Try comma-separated format
    match = cleanLine.match(pattern3);
    if (match) {
        const [, rowNumber, serial, length, weight] = match;
        const lengthValue = parseFloat(length);
        const weightValue = parseFloat(weight);
        
        if (isValidLength(lengthValue) && isValidWeight(weightValue)) {
            return {
                serialNumber: serial,
                length: lengthValue,
                weight: weightValue,
                colorGrade: defaultColorGrade,
                sizeType: sizeType,
                price: calculatePipePriceEnhanced(lengthValue, weightValue, defaultColorGrade)
            };
        }
    }
    
    // Try pipe separator format
    match = cleanLine.match(pattern4);
    if (match) {
        const [, rowNumber, serial, length, weight] = match;
        const lengthValue = parseFloat(length);
        const weightValue = parseFloat(weight);
        
        if (isValidLength(lengthValue) && isValidWeight(weightValue)) {
            return {
                serialNumber: serial,
                length: lengthValue,
                weight: weightValue,
                colorGrade: defaultColorGrade,
                sizeType: sizeType,
                price: calculatePipePriceEnhanced(lengthValue, weightValue, defaultColorGrade)
            };
        }
    }
    
    // Try legacy pattern for backward compatibility
    match = cleanLine.match(pattern5);
    if (match) {
        const [, sno, serial, mtr, weight, grade, size] = match;
        
        if (mtr && weight) {
            const length = parseFloat(mtr);
            const weightValue = parseFloat(weight);
            
            // Enhanced validation
            if (isValidLength(length) && isValidWeight(weightValue)) {
                return {
                    serialNumber: serial || generateUniqueSerialNumber(),
                    length: length,
                    weight: weightValue,
                    colorGrade: grade || defaultColorGrade,
                    sizeType: sizeType,
                    price: calculatePipePriceEnhanced(length, weightValue, grade || defaultColorGrade)
                };
            }
        }
    }
    
    // Enhanced intelligent extraction for messy OCR
    // Clean the line and extract all numbers
    const cleanLineForNumbers = line.replace(/[^\d\s\.]/g, ' ').replace(/\s+/g, ' ').trim();
    const parts = cleanLineForNumbers.split(/\s+/).filter(part => part.trim().length > 0);
    
    if (parts.length >= 4) {
        const numbers = [];
        for (let i = 0; i < parts.length; i++) {
            const num = parseFloat(parts[i]);
            if (!Number.isNaN(num) && num >= 0) {
                numbers.push({ value: num, index: i });
            }
        }
        
        if (numbers.length >= 4) {
            numbers.sort((a, b) => a.index - b.index);
            
            const rowNumber = parseInt(numbers[0].value, 10);    // Column 1: Number
            const serialNumber = numbers[1].value.toString();   // Column 2: Serial Number
            const length = numbers[2].value;                    // Column 3: Length
            const weight = numbers[3].value;                    // Column 4: Weight
            
            if (isValidLength(length) && isValidWeight(weight)) {
                return {
                    serialNumber: serialNumber,
                    length: length,
                    weight: weight,
                    colorGrade: defaultColorGrade,
                    sizeType: sizeType,
                    price: calculatePipePriceEnhanced(length, weight, defaultColorGrade)
                };
            }
        }
    }
    
    // If no pattern matches, try to extract any numbers that might be length/weight
    const numbers = cleanLine.match(/[\d.]+/g);
    if (numbers && numbers.length >= 2) {
        // Try to find the most likely length/weight combination
        const validPairs = [];
        
        for (let i = 0; i < numbers.length - 1; i++) {
            const length = parseFloat(numbers[i]);
            const weight = parseFloat(numbers[i + 1]);
            
            if (isValidLength(length) && isValidWeight(weight)) {
                validPairs.push({ length, weight, index: i });
            }
        }
        
        if (validPairs.length > 0) {
            // Choose the pair with the most reasonable weight/length ratio
            const bestPair = validPairs.reduce((best, current) => {
                const currentRatio = current.weight / current.length;
                const bestRatio = best.weight / best.length;
                
                // Prefer ratios between 0.5 and 50 kg/m (reasonable for pipes)
                const currentScore = Math.abs(currentRatio - 10);
                const bestScore = Math.abs(bestRatio - 10);
                
                return currentScore < bestScore ? current : best;
            });
            
            return {
                serialNumber: generateUniqueSerialNumber(),
                length: bestPair.length,
                weight: bestPair.weight,
                colorGrade: defaultColorGrade,
                sizeType: sizeType,
                price: calculatePipePriceEnhanced(bestPair.length, bestPair.weight, defaultColorGrade)
            };
        }
    }
    
    return null;
};

// Keep backward compatibility function
const extractPipeFromLine = extractPipeFromLineEnhanced;
const extractPipeFromLineLegacy = extractPipeFromLineEnhanced;

// Generate a unique serial number for bulk processing
const generateUniqueSerialNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000); // Increased randomness
    const uniqueId = `${timestamp}_${random}`;
    return `BULK_${uniqueId}`;
};

// Keep backward compatibility function
const generateUniqueSerialNumberLegacy = generateUniqueSerialNumber;

// Enhanced validation functions
const isValidLength = (length) => {
    return !Number.isNaN(length) && length > 0 && length <= 100; // Max 100 meters
};

const isValidWeight = (weight) => {
    return !Number.isNaN(weight) && weight > 0 && weight <= 1000; // Max 1000 kg
};

// Keep backward compatibility functions
const isValidLengthLegacy = isValidLength;
const isValidWeightLegacy = isValidWeight;

// Enhanced pipe data validation
const validatePipeData = (pipeData) => {
    const issues = [];
    const warnings = [];

    // Required fields validation
    if (!pipeData.serialNumber) {
        issues.push("Serial number is required");
    }

    if (!pipeData.colorGrade) {
        issues.push("Color grade is required");
    } else if (!['A', 'B', 'C', 'D'].includes(pipeData.colorGrade.toUpperCase())) {
        issues.push("Invalid color grade: " + pipeData.colorGrade);
    }

    if (!pipeData.sizeType) {
        issues.push("Size type is required");
    }

    if (!isValidLength(pipeData.length)) {
        issues.push("Invalid length: " + pipeData.length);
    }

    if (!isValidWeight(pipeData.weight)) {
        issues.push("Invalid weight: " + pipeData.weight);
    }

    // Business logic validation
    if (pipeData.length > 0 && pipeData.weight > 0) {
        const weightPerMeter = pipeData.weight / pipeData.length;
        if (weightPerMeter > 50) {
            warnings.push("Unusually high weight per meter: " + weightPerMeter.toFixed(2) + " kg/m");
        }
        if (weightPerMeter < 0.1) {
            warnings.push("Unusually low weight per meter: " + weightPerMeter.toFixed(2) + " kg/m");
        }
    }

    return {
        isValid: issues.length === 0,
        issues,
        warnings,
        severity: issues.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'success'
    };
};

// Keep backward compatibility function
const validatePipeDataLegacy = validatePipeData;

// Enhanced bulk data quality validation
const validateBulkDataQuality = (pipes, confidence) => {
    const issues = [];
    const warnings = [];
    
    if (pipes.length === 0) {
        issues.push("No pipes to process");
        return { isValid: false, issues, warnings };
    }

    // Check for data consistency
    const lengths = pipes.map(p => p.length).filter(l => l > 0);
    const weights = pipes.map(p => p.weight).filter(w => w > 0);
    
    if (lengths.length > 0) {
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const lengthVariance = lengths.map(l => Math.abs(l - avgLength)).reduce((a, b) => a + b, 0) / lengths.length;
        
        if (lengthVariance > avgLength * 0.5) {
            warnings.push("High variance in pipe lengths detected");
        }
    }
    
    if (weights.length > 0) {
        const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
        const weightVariance = weights.map(w => Math.abs(w - avgWeight)).reduce((a, b) => a + b, 0) / weights.length;
        
        if (weightVariance > avgWeight * 0.5) {
            warnings.push("High variance in pipe weights detected");
        }
    }

    // Check for duplicate serial numbers
    const serialNumbers = pipes.map(p => p.serialNumber);
    const duplicates = serialNumbers.filter((item, index) => serialNumbers.indexOf(item) !== index);
    if (duplicates.length > 0) {
        issues.push("Duplicate serial numbers detected: " + duplicates.join(', '));
    }

    // Check confidence level
    if (confidence < 0.8) {
        warnings.push("Low confidence extraction - manual verification recommended");
    }

    return {
        isValid: issues.length === 0,
        issues,
        warnings,
        confidence: confidence,
        dataQuality: confidence >= 0.9 ? 'excellent' : confidence >= 0.8 ? 'good' : confidence >= 0.7 ? 'fair' : 'poor',
        totalPipes: pipes.length,
        validPipes: pipes.length - issues.length
    };
};

// Keep backward compatibility function
const validateBulkDataQualityLegacy = validateBulkDataQuality;

// Enhanced price calculation with market factors
const calculatePipePriceEnhanced = (length, weight, colorGrade) => {
    // Base price per meter with market adjustment
    const basePricePerMeter = 150; // Base price in currency units
    
    // Enhanced grade multiplier with quality premium
    const gradeMultipliers = {
        'A': 1.2, // Premium grade
        'B': 1.0, // Standard grade
        'C': 0.8, // Economy grade
        'D': 0.6  // Discount grade
    };
    
    const gradeMultiplier = gradeMultipliers[colorGrade.toUpperCase()] || 1.0;
    
    // Weight factor (heavier pipes cost more due to material cost)
    const weightFactor = weight / length; // weight per meter
    
    // Length discount for longer pipes
    const lengthDiscount = length > 10 ? 0.95 : length > 5 ? 0.98 : 1.0;
    
    // Calculate final price with enhanced factors
    const price = length * basePricePerMeter * gradeMultiplier * lengthDiscount * (1 + weightFactor * 0.15);
    
    return Math.round(price * 100) / 100; // Round to 2 decimal places
};

// Keep backward compatibility function
const calculatePipePrice = calculatePipePriceEnhanced;
const calculatePipePriceLegacy = calculatePipePriceEnhanced;
