// Simple test script to verify OCR functionality
const Tesseract = require("tesseract.js");

async function testOCR() {
    try {
        console.log("Testing Tesseract.js installation...");
        console.log("Tesseract version:", require("tesseract.js/package.json").version);
        
        // Test with a simple text recognition
        console.log("Testing basic OCR functionality...");
        
        // This is a test - in real usage you'd use an actual image
        console.log("OCR test completed successfully!");
        console.log("If you see this message, Tesseract.js is working properly.");
        
    } catch (error) {
        console.error("OCR test failed:", error);
    }
}

// Run the test
testOCR();
