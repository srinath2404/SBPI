const Tesseract = require("tesseract.js");
const Pipe = require("../models/Pipe");

// Upload Image and Extract Text for Add Pipe
exports.uploadImageAndExtractText = async (req, res) => {
    try {
        const { imageUrl } = req.body; // Base64-encoded image URL

        if (!imageUrl) {
            return res.status(400).json({ message: "Image URL is required" });
        }

        console.log("Starting OCR processing...");

        // Perform OCR on the image with optimized settings for handwriting
        const { data: { text } } = await Tesseract.recognize(imageUrl, "eng", {
            logger: m => console.log("OCR Progress:", m),
            // Optimize for handwriting and mixed text
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.-:() ',
            // Improve accuracy for numbers
            tessedit_pageseg_mode: '6', // Uniform block of text
            // Better handling of mixed content
            preserve_interword_spaces: '1',
            // Optimize for document images
            tessedit_do_invert: '0'
        });

        console.log("Extracted text:", text);

        // Correct common OCR mistakes in numbers
        const correctedText = correctOCRNumbers(text);
        console.log("Corrected text:", correctedText);

        // Attempt both parsers: structured template and SNO/BNO/MTR/WEIGHT list
        const pipeDetails = parsePipeDetails(correctedText);
        const parsedRows = parseSnoBnoMtrWeightRows(correctedText);

        console.log("Parsed pipe details:", pipeDetails);
        console.log("Parsed rows:", parsedRows);

        // Analyze image quality
        const qualityAnalysis = analyzeImageQuality(correctedText);

        // Prefer rows if any were detected
        if (parsedRows.length > 0) {
            return res.status(200).json({ 
                message: "Rows extracted successfully", 
                parsedRows,
                rawText: text,
                correctedText: correctedText,
                qualityAnalysis
            });
        }

        // Fallback to single record details
        res.status(200).json({ 
            message: "Text extracted successfully", 
            extractedData: pipeDetails,
            rawText: text,
            correctedText: correctedText,
            qualityAnalysis
        });
    } catch (error) {
        console.error("OCR Error:", error);
        res.status(400).json({ 
            message: "OCR processing failed", 
            error: error.message,
            details: "Please ensure the image is clear and contains readable text"
        });
    }
};

// Upload Image and Extract Text for Sell Request
exports.uploadSellRequestImage = async (req, res) => {
    try {
        const { imageUrl } = req.body; // Base64-encoded image URL

        // Perform OCR on the image
        const { data: { text } } = await Tesseract.recognize(imageUrl, "eng");

        // Parse the extracted text to get sell request details
        const sellDetails = parseSellRequestDetails(text);

        // Return the extracted data for editing
        res.status(200).json({ message: "Text extracted successfully", extractedData: sellDetails });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Save Edited Data to Stock
exports.saveEditedData = async (req, res) => {
    try {
        const { colorGrade, sizeType, length, weight, serialNumber, price } = req.body;

        // Validate required fields
        if (!colorGrade || !sizeType || !length || !weight || !serialNumber || !price) {
            throw new Error("All fields are required.");
        }

        // Add the pipe to the stock
        const pipe = new Pipe({
            colorGrade,
            sizeType,
            length,
            remainingLength: length, // Initially, remaining length = total length
            weight,
            serialNumber,
            price,
            worker: req.user.id, // Attach the manager's ID
        });

        await pipe.save();
        res.status(201).json({ message: "Pipe added to stock successfully", pipe });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Analyze image quality and provide recommendations
const analyzeImageQuality = (text, confidence) => {
    const issues = [];
    const recommendations = [];
    
    // Check for common OCR issues
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
    
    // Check for number patterns
    const numberCount = (text.match(/\d/g) || []).length;
    if (numberCount < 4) {
        issues.push("Insufficient numbers detected");
        recommendations.push("Ensure numbers are clearly visible and well-spaced");
    }
    
    return { issues, recommendations };
};

// Test endpoint to check OCR functionality
exports.testOcr = async (req, res) => {
    try {
        res.status(200).json({ 
            message: "OCR endpoint is working",
            status: "ready",
            tesseractVersion: require("tesseract.js/package.json").version
        });
    } catch (error) {
        console.error("OCR Test Error:", error);
        res.status(500).json({ 
            message: "OCR test failed", 
            error: error.message 
        });
    }
};

// Helper function to correct common OCR mistakes in numbers
const correctOCRNumbers = (text) => {
    // Common OCR mistakes in handwriting
    const corrections = {
        'O': '0', 'o': '0', 'l': '1', 'I': '1', 'i': '1',
        'S': '5', 's': '5', 'G': '6', 'g': '6', 'B': '8',
        'Z': '2', 'z': '2', 'A': '4', 'a': '4'
    };
    
    let corrected = text;
    Object.entries(corrections).forEach(([wrong, correct]) => {
        corrected = corrected.replace(new RegExp(wrong, 'g'), correct);
    });
    
    return corrected;
};

// Helper function to parse extracted text into pipe details for Add Pipe
const parsePipeDetails = (text) => {
    console.log("Parsing pipe details from text:", text);
    
    // Extract details from text based on the Add Pipe Excel template format
    const details = {
        serialNumber: text.match(/Serial\s*Number\s*[:-]?\s*([A-Za-z0-9-]+)/i)?.[1] ||
                    text.match(/BNO\s*[:-]?\s*([A-Za-z0-9-]+)/i)?.[1] ||
                    text.match(/B\s*NO\s*[:-]?\s*([A-Za-z0-9-]+)/i)?.[1],
        colorGrade: text.match(/Color\s*Grade\s*[:-]?\s*([A-Z]+)/i)?.[1] ||
                   text.match(/Grade\s*[:-]?\s*([A-Z]+)/i)?.[1],
        sizeType: text.match(/Size\s*Type\s*[:-]?\s*([\d.-]+\s*inch)/i)?.[1] ||
                 text.match(/Size\s*[:-]?\s*([\d.-]+\s*inch)/i)?.[1],
        length: parseFloat(text.match(/Length\s*[:-]?\s*([\d.]+)/i)?.[1]) ||
                parseFloat(text.match(/MTR\s*[:-]?\s*([\d.]+)/i)?.[1]) ||
                parseFloat(text.match(/Meter\s*[:-]?\s*([\d.]+)/i)?.[1]),
        weight: parseFloat(text.match(/Weight\s*[:-]?\s*([\d.]+)/i)?.[1]) ||
                parseFloat(text.match(/WT\s*[:-]?\s*([\d.]+)/i)?.[1])
    };

    // Clean up the data
    Object.keys(details).forEach(key => {
        if (details[key] === undefined || details[key] === null) {
            details[key] = '';
        }
    });

    console.log("Parsed details:", details);
    return details;
};

// Parse SNO/BNO/MTR/WEIGHT rows from free-form handwritten/typed lists
// Returns array of { sno, bno, mtr, weight }
const parseSnoBnoMtrWeightRows = (text) => {
    const lines = text
        .split(/\r?\n/)
        .map(l => l.replace(/\s{2,}/g, ' ').trim())
        .filter(l => l.length > 0);

    console.log("Processing lines:", lines);
    const rows = [];

    // Multiple regex patterns to catch different formats
    const patterns = [
        // Pattern 1: "1 267 80 78.00" or "1) 267 80 78.00" - flexible spacing
        /^(\d+)[)\.]?\s+(\d{2,})\s+(\d{1,3})(?:\s*mtr)?\s+([\d.]+)/i,
        
        // Pattern 2: "1. 267 80 78.00" with dots
        /^(\d+)\.\s+(\d{2,})\s+(\d{1,3})\s+([\d.]+)/i,
        
        // Pattern 3: "1 267 80m 78.00" with mtr suffix
        /^(\d+)\s+(\d{2,})\s+(\d{1,3})m\s+([\d.]+)/i,
        
        // Pattern 4: "1 267 80 78" without decimal
        /^(\d+)\s+(\d{2,})\s+(\d{1,3})\s+(\d+)/i,
        
        // Pattern 5: "SNO: 1 BNO: 267 MTR: 80 WEIGHT: 78.00"
        /(?:SNO|S\.NO)[:\s]*(\d+)[\s,]+(?:BNO|B\.NO)[:\s]*(\d+)[\s,]+(?:MTR|METER)[:\s]*(\d+)[\s,]+(?:WEIGHT|WT)[:\s]*([\d.]+)/i,
        
        // Pattern 6: Tab-separated or fixed-width columns
        /^(\d+)\t+(\d+)\t+(\d+)\t+([\d.]+)/i,
        
        // Pattern 7: Comma-separated values
        /^(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)/i
    ];

    // Support labeled headers like SNO, BNO, MTR present on the page
    const hasHeaders = /\bS\s*NO\b|\bBNO\b|\bMTR\b|\bWEIGHT\b|\bWT\b/i.test(text);

    for (const line of lines) {
        let matched = false;
        
        for (const pattern of patterns) {
            const m = line.match(pattern);
            if (m) {
                const sno = parseInt(m[1], 10);
                const bno = m[2];
                const mtr = parseFloat(m[3]);
                const weight = parseFloat(m[4]);
                
                if (!Number.isNaN(mtr) && !Number.isNaN(weight) && mtr > 0 && weight > 0) {
                    rows.push({ 
                        sno, 
                        bno, 
                        mtr, 
                        weight, 
                        hasHeaders,
                        originalLine: line,
                        pattern: 'regex'
                    });
                    matched = true;
                    break;
                }
            }
        }
        
        // If no pattern matched, try to extract numbers manually with better logic
        if (!matched) {
            // Split by multiple delimiters (space, tab, comma)
            const parts = line.split(/[\s\t,]+/).filter(part => part.trim().length > 0);
            
            if (parts.length >= 4) {
                // Try to find 4 consecutive numbers
                const numbers = [];
                for (let i = 0; i < parts.length; i++) {
                    const num = parseFloat(parts[i]);
                    if (!Number.isNaN(num) && num >= 0) {
                        numbers.push({ value: num, index: i });
                    }
                }
                
                // If we have at least 4 numbers, try to extract them
                if (numbers.length >= 4) {
                    // Sort by index to maintain order
                    numbers.sort((a, b) => a.index - b.index);
                    
                    const sno = parseInt(numbers[0].value, 10);
                    const bno = numbers[1].value.toString();
                    const mtr = numbers[2].value;
                    const weight = numbers[3].value;
                    
                    if (mtr > 0 && weight > 0) {
                        rows.push({ 
                            sno, 
                            bno, 
                            mtr, 
                            weight, 
                            hasHeaders: false,
                            originalLine: line,
                            method: 'manual',
                            confidence: 'low'
                        });
                    }
                }
            }
        }
    }

    // De-duplicate by SNO if OCR repeated lines
    const unique = new Map();
    for (const r of rows) {
        if (!unique.has(r.sno)) unique.set(r.sno, r);
    }
    
    const result = Array.from(unique.values());
    console.log("Final parsed rows:", result);
    return result;
};

// Helper function to parse extracted text into sell request details
const parseSellRequestDetails = (text) => {
    // Extract details from text based on the Sell Request Excel template format
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