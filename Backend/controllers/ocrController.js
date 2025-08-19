const Tesseract = require("tesseract.js");
const Pipe = require("../models/Pipe");

// Upload Image and Extract Text for Add Pipe
exports.uploadImageAndExtractText = async (req, res) => {
    try {
        const { imageUrl } = req.body; // Base64-encoded image URL

        // Perform OCR on the image
        const { data: { text } } = await Tesseract.recognize(imageUrl, "eng");

        // Parse the extracted text to get pipe details
        const pipeDetails = parsePipeDetails(text);

        // Return the extracted data for editing
        res.status(200).json({ message: "Text extracted successfully", extractedData: pipeDetails });
    } catch (error) {
        res.status(400).json({ message: error.message });
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

// Helper function to parse extracted text into pipe details for Add Pipe
const parsePipeDetails = (text) => {
    // Extract details from text based on the Add Pipe Excel template format
    const details = {
        serialNumber: text.match(/Serial\s*Number\s*[:-]?\s*([A-Za-z0-9-]+)/i)?.[1],
        colorGrade: text.match(/Color\s*Grade\s*[:-]?\s*([A-Z]+)/i)?.[1],
        sizeType: text.match(/Size\s*Type\s*[:-]?\s*([\d.-]+\s*inch)/i)?.[1],
        length: parseFloat(text.match(/Length\s*[:-]?\s*([\d.]+)/i)?.[1]),
        weight: parseFloat(text.match(/Weight\s*[:-]?\s*([\d.]+)/i)?.[1])
    };

    return details;
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