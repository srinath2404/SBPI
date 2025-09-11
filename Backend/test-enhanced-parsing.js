// Test script for enhanced OCR parsing
const { parseSnoBnoMtrWeightRowsEnhanced } = require('./controllers/aiOcrController');

// Test with the actual OCR output from the user's image
const testOCRText = `! wor) LI
0 po m3 | 4
MD 61 26 "18+!
® ng Aa 19: |
®@ ass 4d 4
2 asy  %0 cc SOM |
5) 1539 88 20:
© A 90 10% |
5 176 Ja 1 |
® 1% 90 3% |
9) 206 40 90-1 |
> > |
D, 176+ 90 BL |
soioo-008 SE |`;

console.log("🧪 Testing enhanced OCR parsing...");
console.log("📝 Input OCR text:");
console.log(testOCRText);
console.log("\n" + "=".repeat(50) + "\n");

try {
    const parsedRows = parseSnoBnoMtrWeightRowsEnhanced(testOCRText);
    
    console.log("✅ Parsing completed!");
    console.log(`📊 Found ${parsedRows.length} valid rows:`);
    
    parsedRows.forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`);
        console.log(`  SNO: ${row.sno}`);
        console.log(`  Serial Number: ${row.serialNumber}`);
        console.log(`  Length: ${row.mtr}m`);
        console.log(`  Weight: ${row.weight}kg`);
        console.log(`  Method: ${row.method}`);
        console.log(`  Confidence: ${row.confidence}`);
        console.log(`  Original: "${row.originalLine}"`);
    });
    
    if (parsedRows.length === 0) {
        console.log("\n❌ No valid rows found. This indicates the parsing needs further improvement.");
    }
    
} catch (error) {
    console.error("❌ Error during parsing:", error.message);
}
