const Pipe = require('../models/Pipe');
const RawMaterial = require('../models/RawMaterial');
const RawMaterialTransaction = require('../models/RawMaterialTransaction');
const generateSerialNumber = require('../utils/serialNumberGenerator');
const { calculatePrice } = require('../utils/priceCalculator');
const { executeTransaction } = require('../config/db');
const XLSX = require('xlsx');

// Clean up completely sold pipes (remainingLength = 0) with ACID compliance
const cleanupSoldPipes = async () => {
    try {
        const result = await executeTransaction(async (session) => {
            const pipesToDelete = await Pipe.find({ remainingLength: 0 }).session(session);
            const deletedCount = pipesToDelete.length;
            
            if (deletedCount > 0) {
                await Pipe.deleteMany({ remainingLength: 0 }).session(session);
                console.log(`Cleaned up ${deletedCount} completely sold pipes with ACID compliance`);
            }
            
            return deletedCount;
        });
        
        return result;
    } catch (error) {
        console.error('Error cleaning up sold pipes:', error);
        return 0;
    }
};

// Get all pipes with enhanced filtering and sorting
const getAllPipes = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            sortBy = 'manufacturingDate', 
            sortOrder = 'desc',
            colorGrade,
            sizeType,
            batchNumber,
            worker,
            search
        } = req.query;

        // Clean up completely sold pipes first
        await cleanupSoldPipes();
        
        // Build filter query
        const filter = {};
        
        if (colorGrade) filter.colorGrade = colorGrade;
        if (sizeType) filter.sizeType = sizeType;
        if (batchNumber) filter.batchNumber = batchNumber;
        if (worker) filter.worker = worker;
        
        // Search functionality
        if (search) {
            filter.$or = [
                { serialNumber: { $regex: search, $options: 'i' } },
                { batchNumber: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Execute query with pagination
        const pipes = await Pipe.find(filter)
            .populate('worker', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
        const totalPipes = await Pipe.countDocuments(filter);
        const totalPages = Math.ceil(totalPipes / parseInt(limit));

        // Add inventory status to each pipe
        const pipesWithStatus = pipes.map(pipe => ({
            ...pipe,
            inventoryStatus: getInventoryStatus(pipe.remainingLength, pipe.length),
            utilizationRate: pipe.length > 0 ? ((pipe.length - pipe.remainingLength) / pipe.length * 100).toFixed(2) : 0
        }));

        res.json({
            pipes: pipesWithStatus,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalPipes,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            },
            filters: {
                colorGrade: colorGrade || 'all',
                sizeType: sizeType || 'all',
                batchNumber: batchNumber || 'all',
                worker: worker || 'all'
            }
        });
    } catch (error) {
        console.error('Error fetching pipes:', error);
        res.status(500).json({ message: 'Error fetching pipes', error: error.message });
    }
};

// Get inventory summary with real-time data
const getInventorySummary = async (req, res) => {
    try {
        const summary = await executeTransaction(async (session) => {
            // Total inventory counts
            const totalPipes = await Pipe.countDocuments().session(session);
            const availablePipes = await Pipe.countDocuments({ remainingLength: { $gt: 0 } }).session(session);
            const soldPipes = await Pipe.countDocuments({ remainingLength: 0 }).session(session);
            
            // Inventory by grade
            const gradeSummary = await Pipe.aggregate([
                { $match: { remainingLength: { $gt: 0 } } },
                { $group: { _id: '$colorGrade', count: { $sum: 1 }, totalLength: { $sum: '$remainingLength' }, totalWeight: { $sum: '$weight' } } },
                { $sort: { _id: 1 } }
            ]).session(session);
            
            // Inventory by size
            const sizeSummary = await Pipe.aggregate([
                { $match: { remainingLength: { $gt: 0 } } },
                { $group: { _id: '$sizeType', count: { $sum: 1 }, totalLength: { $sum: '$remainingLength' }, totalWeight: { $sum: '$weight' } } },
                { $sort: { _id: 1 } }
            ]).session(session);
            
            // Recent additions (last 7 days)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentAdditions = await Pipe.countDocuments({
                manufacturingDate: { $gte: sevenDaysAgo }
            }).session(session);
            
            // Low stock alerts (pipes with less than 20% remaining)
            const lowStockPipes = await Pipe.countDocuments({
                remainingLength: { $gt: 0, $lt: { $multiply: ['$length', 0.2] } }
            }).session(session);
            
            return {
                totalPipes,
                availablePipes,
                soldPipes,
                gradeSummary,
                sizeSummary,
                recentAdditions,
                lowStockPipes,
                lastUpdated: new Date().toISOString()
            };
        });
        
        res.json(summary);
    } catch (error) {
        console.error('Error fetching inventory summary:', error);
        res.status(500).json({ message: 'Error fetching inventory summary', error: error.message });
    }
};

// Add new pipe with ACID compliance
const addPipe = async (req, res) => {
    try {
        console.log('🚀 Starting addPipe function...');
        console.log('📝 Request body:', req.body);
        
        const {
            serialNumber: providedSerial,
            colorGrade,
            sizeType,
            section = 'A',
            length = 0,
            weight = 0,
            manufacturingDate,
            batchNumber
        } = req.body;

        console.log('🔍 Extracted values:', { colorGrade, sizeType, length, weight, section });

        // Enhanced validation
        if (!colorGrade || !sizeType) {
            console.log('❌ Validation failed: Missing required fields');
            return res.status(400).json({ 
                message: 'Required fields missing',
                required: ['colorGrade', 'sizeType'],
                received: { colorGrade, sizeType }
            });
        }

        // Validate color grade
        if (!['A', 'B', 'C', 'D'].includes(colorGrade.toUpperCase())) {
            console.log('❌ Validation failed: Invalid color grade');
            return res.status(400).json({ 
                message: 'Invalid color grade. Must be A, B, C, or D',
                received: colorGrade
            });
        }

        // Validate length and weight
        const numericLength = Number(length || 0);
        const numericWeight = Number(weight || 0);
        
        console.log('📏 Numeric values:', { numericLength, numericWeight });
        
        if (numericLength < 0 || numericWeight < 0) {
            console.log('❌ Validation failed: Negative values');
            return res.status(400).json({ 
                message: 'Length and weight must be positive numbers',
                received: { length: numericLength, weight: numericWeight }
            });
        }

        // Auto-generate serial number if not provided
        let serialNumber;
        try {
            console.log('🔢 Generating serial number...');
            serialNumber = providedSerial && providedSerial.trim().length > 0
                ? providedSerial.trim()
                : await generateSerialNumber();
            console.log('✅ Serial number generated:', serialNumber);
        } catch (error) {
            console.error('❌ Error generating serial number:', error);
            return res.status(500).json({ 
                message: 'Failed to generate serial number',
                error: error.message 
            });
        }

        // Ensure uniqueness with ACID compliance
        let result;
        try {
            console.log('💾 Starting database transaction...');
            result = await executeTransaction(async (session) => {
                console.log('🔍 Checking for existing pipe with serial number:', serialNumber);
                const existingPipe = await Pipe.findOne({ serialNumber }).session(session);
                if (existingPipe) {
                    throw new Error('Serial number already exists');
                }
                console.log('✅ Serial number is unique');

                // Calculate price using formula
                let computedPrice = 0;
                try {
                    console.log('💰 Calculating price...');
                    computedPrice = await calculatePrice(colorGrade, sizeType, numericLength, numericWeight);
                    console.log('✅ Price calculated:', computedPrice);
                } catch (e) {
                    console.error('⚠️ Price calculation error, using fallback:', e);
                    // Use fallback price calculation
                    const baseRate = 64; // Default rate per kg
                    computedPrice = numericWeight * baseRate;
                    console.log('💰 Fallback price calculated:', computedPrice);
                }

                console.log('🏗️ Creating new pipe object...');
                const newPipe = new Pipe({
                    serialNumber,
                    colorGrade: colorGrade.toUpperCase(),
                    sizeType,
                    section,
                    length: numericLength,
                    remainingLength: numericLength,
                    weight: numericWeight,
                    price: computedPrice,
                    manufacturingDate: manufacturingDate || new Date(),
                    batchNumber: batchNumber || null,
                    worker: req.user ? req.user._id : undefined
                });

                console.log('💾 Saving pipe to database...');
                await newPipe.save({ session });
                console.log('✅ Pipe saved successfully');

                // Optional raw material consumption
                if (Array.isArray(req.body.consumption)) {
                    console.log('📦 Processing raw material consumption...');
                    for (const item of req.body.consumption) {
                        try {
                            const material = await RawMaterial.findById(item.materialId).session(session);
                            if (!material) continue;
                            
                            const qty = Number(item.quantity || 0);
                            if (qty > 0) {
                                material.quantity = Math.max(0, Number(material.quantity) - qty);
                                await material.save({ session });
                                
                                await RawMaterialTransaction.create([{
                                    material: material._id,
                                    type: 'out',
                                    quantity: qty,
                                    unit: material.unit,
                                    relatedPipe: newPipe._id,
                                    note: 'Consumption for pipe production',
                                    createdBy: req.user ? req.user._id : undefined
                                }], { session });
                            }
                        } catch (consumptionError) {
                            console.error('Error processing consumption:', consumptionError);
                            // Continue with other consumption items
                        }
                    }
                }

                return newPipe;
            });
            console.log('✅ Transaction completed successfully');
        } catch (transactionError) {
            console.error('❌ Transaction error:', transactionError);
            return res.status(500).json({ 
                message: 'Database transaction failed',
                error: transactionError.message 
            });
        }

        console.log('🎉 Pipe added successfully:', result._id);
        res.status(201).json({ 
            message: 'Pipe added successfully with ACID compliance', 
            pipe: result,
            transactionId: `PIPE_${Date.now()}`
        });
    } catch (error) {
        console.error('❌ Error adding pipe:', error);
        res.status(500).json({ 
            message: 'Error adding pipe', 
            error: error.message,
            details: 'Please check the server logs for more information'
        });
    }
};

// Delete pipe with ACID compliance
const deletePipe = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Pipe ID is required' });
        }

        const result = await executeTransaction(async (session) => {
            const pipe = await Pipe.findById(id).session(session);
            if (!pipe) {
                throw new Error('Pipe not found');
            }

            // Check if pipe can be deleted (not sold)
            if (pipe.remainingLength < pipe.length) {
                throw new Error('Cannot delete pipe that has been partially sold');
            }

            await Pipe.findByIdAndDelete(id).session(session);
            return pipe;
        });

        res.json({ 
            message: 'Pipe deleted successfully with ACID compliance',
            deletedPipe: result,
            transactionId: `DELETE_${Date.now()}`
        });
    } catch (error) {
        console.error('Error deleting pipe:', error);
        res.status(500).json({ message: 'Error deleting pipe', error: error.message });
    }
};

// Update pipe with ACID compliance
const updatePipe = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Pipe ID is required' });
        }

        const result = await executeTransaction(async (session) => {
            const pipe = await Pipe.findById(id).session(session);
            if (!pipe) {
                throw new Error('Pipe not found');
            }

            // Validate updates
            if (updateData.length !== undefined && updateData.length < pipe.remainingLength) {
                throw new Error('New length cannot be less than remaining length');
            }

            // Update pipe
            const updatedPipe = await Pipe.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).session(session);

            return updatedPipe;
        });

        res.json({ 
            message: 'Pipe updated successfully with ACID compliance',
            pipe: result,
            transactionId: `UPDATE_${Date.now()}`
        });
    } catch (error) {
        console.error('Error updating pipe:', error);
        res.status(500).json({ message: 'Error updating pipe', error: error.message });
    }
};

// Update price for a specific pipe with ACID compliance
const updatePipePrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { price } = req.body;

        if (price === undefined || isNaN(Number(price))) {
            return res.status(400).json({ message: 'Valid price is required' });
        }

        const result = await executeTransaction(async (session) => {
            const updated = await Pipe.findByIdAndUpdate(
                id,
                { price: Number(price) },
                { new: true }
            ).session(session);

            if (!updated) {
                throw new Error('Pipe not found');
            }

            return updated;
        });

        res.json({ 
            message: 'Price updated successfully with ACID compliance', 
            pipe: result,
            transactionId: `PRICE_UPDATE_${Date.now()}`
        });
    } catch (error) {
        console.error('Error updating price:', error);
        res.status(500).json({ message: 'Error updating price', error: error.message });
    }
};

// Manual cleanup of sold pipes with ACID compliance
const manualCleanup = async (req, res) => {
    try {
        const deletedCount = await cleanupSoldPipes();
        res.json({ 
            message: `Cleanup completed with ACID compliance. ${deletedCount} completely sold pipes removed.`,
            deletedCount,
            transactionId: `CLEANUP_${Date.now()}`
        });
    } catch (error) {
        console.error('Error during cleanup:', error);
        res.status(500).json({ message: 'Error during cleanup', error: error.message });
    }
};

// Get pipes by batch number
const getPipesByBatch = async (req, res) => {
    try {
        const { batchNumber } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const pipes = await Pipe.find({ batchNumber })
            .populate('worker', 'name email')
            .sort({ manufacturingDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const totalPipes = await Pipe.countDocuments({ batchNumber });
        const totalPages = Math.ceil(totalPipes / parseInt(limit));

        // Add inventory status
        const pipesWithStatus = pipes.map(pipe => ({
            ...pipe,
            inventoryStatus: getInventoryStatus(pipe.remainingLength, pipe.length),
            utilizationRate: pipe.length > 0 ? ((pipe.length - pipe.remainingLength) / pipe.length * 100).toFixed(2) : 0
        }));

        res.json({
            pipes: pipesWithStatus,
            batchNumber,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalPipes,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('Error fetching pipes by batch:', error);
        res.status(500).json({ message: 'Error fetching pipes by batch', error: error.message });
    }
};

const getVal = (obj, keys, def = '') => {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return obj[k];
  }
  return def;
};

const normalizeSheetRows = (sheet) => {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map((r) => ({
    // Serial number (support various headers and typos)
    serialNumber: String(getVal(r, [
      'serialNumber','SerialNumber','SERIALNUMBER','serial','Serial','SERIAL',
      'BNO','bno','SNO','sno',
      'serial no','Serial no','Serial No','SERIAL NO',
      'seiral no','Seiral No','Seiral no' // user-provided typo
    ], '')).trim(),
    // Color grade and sizeType may be missing in preview
    colorGrade: String(getVal(r, ['colorGrade','ColorGrade','GRADE','Grade'], '')).trim(),
    sizeType: String(getVal(r, ['sizeType','SizeType','SIZE','Size'], '')).trim(),
    section: String(getVal(r, ['section','Section','SECTION'], 'A')).trim(),
    // Length (support Length(MTR) variants)
    length: Number(getVal(r, ['length','Length','MTR','mtr','Length(MTR)','length(mtr)','Length (MTR)'], 0)),
    // Weight (support Weight(KG's) and typo "weigth(KG's)")
    weight: Number(getVal(r, ['weight','Weight','WEIGHT','wt','WT','Weight(KG\'s)','Weight (KG\'s)','weigth(KG\'s)','Weigth(KG\'s)'], 0)),
    manufacturingDate: getVal(r, ['manufacturingDate','ManufacturingDate','DATE','Date'], null),
    batchNumber: String(getVal(r, ['batchNumber','BatchNumber','BATCH','Batch'], '')).trim()
  }));
};

const validateRowPreview = (row) => {
  const issues = [];
  if (!(Number(row.length) > 0)) issues.push('Invalid length');
  if (!(Number(row.weight) > 0)) issues.push('Invalid weight');
  // colorGrade/sizeType optional at preview time
  return { isValid: issues.length === 0, issues };
};

const validateRowCommit = (row) => {
  const issues = [];
  if (!row.colorGrade || !['A','B','C','D','a','b','c','d'].includes(row.colorGrade)) {
    issues.push('Invalid or missing colorGrade');
  }
  if (!row.sizeType) issues.push('Missing sizeType');
  if (!(Number(row.length) > 0)) issues.push('Invalid length');
  if (!(Number(row.weight) > 0)) issues.push('Invalid weight');
  return { isValid: issues.length === 0, issues };
};

// Preview Excel import (no save)
const previewExcelImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Excel file is required (field name: file)' });
    }
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return res.status(400).json({ message: 'No sheets found in uploaded file' });
    }
    const sheet = workbook.Sheets[firstSheetName];
    const normalizedRows = normalizeSheetRows(sheet);
    if (!normalizedRows.length) {
      return res.status(400).json({ message: 'No data rows found in the sheet' });
    }

    const preview = [];
    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const validation = validateRowPreview(row);
      let price = 0;
      if (validation.isValid && row.colorGrade && row.sizeType) {
        try {
          price = await calculatePrice(String(row.colorGrade).toUpperCase(), row.sizeType, Number(row.length), Number(row.weight));
        } catch {
          price = Number(row.weight) * 64;
        }
      }
      preview.push({ index: i, ...row, colorGrade: row.colorGrade ? String(row.colorGrade).toUpperCase() : '', price, validation });
    }

    res.json({ message: 'Preview generated', rows: preview, sheetName: firstSheetName, totalRows: preview.length });
  } catch (error) {
    console.error('Excel preview error:', error);
    res.status(500).json({ message: 'Failed to generate preview', error: error.message });
  }
};

// Commit Excel import from edited rows
const commitExcelImport = async (req, res) => {
  try {
    const { rows } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'rows array is required' });
    }

    const toInsert = [];
    const errors = [];

    // Validate rows strictly
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i] || {};
      const row = {
        serialNumber: String(raw.serialNumber || '').trim(),
        colorGrade: String(raw.colorGrade || '').trim().toUpperCase(),
        sizeType: String(raw.sizeType || '').trim(),
        section: String(raw.section || 'A').trim(),
        length: Number(raw.length || 0),
        weight: Number(raw.weight || 0),
        manufacturingDate: raw.manufacturingDate ? new Date(raw.manufacturingDate) : new Date(),
        batchNumber: String(raw.batchNumber || '').trim()
      };
      const validation = validateRowCommit(row);
      if (!validation.isValid) {
        errors.push({ index: i, issues: validation.issues });
        continue;
      }
      toInsert.push({ index: i, row });
    }

    if (toInsert.length === 0) {
      return res.status(400).json({ message: 'No valid rows to import', errors });
    }

    const created = await executeTransaction(async (session) => {
      const out = [];
      for (const item of toInsert) {
        const r = item.row;
        let serial = r.serialNumber && r.serialNumber.length > 0 ? r.serialNumber : await generateSerialNumber();

        const existing = await Pipe.findOne({ serialNumber: serial }).session(session);
        if (existing) {
          serial = await generateSerialNumber();
        }

        let price;
        try {
          price = await calculatePrice(String(r.colorGrade).toUpperCase(), r.sizeType, Number(r.length), Number(r.weight));
        } catch {
          price = Number(r.weight) * 64;
        }

        const doc = new Pipe({
          serialNumber: serial,
          colorGrade: String(r.colorGrade).toUpperCase(),
          sizeType: r.sizeType,
          section: r.section || 'A',
          length: Number(r.length),
          remainingLength: Number(r.length),
          weight: Number(r.weight),
          price,
          manufacturingDate: r.manufacturingDate || new Date(),
          batchNumber: r.batchNumber || null,
          worker: req.user ? req.user._id : undefined
        });

        await doc.save({ session });
        out.push({ index: item.index, serialNumber: doc.serialNumber, sizeType: doc.sizeType, length: doc.length, weight: doc.weight });
      }
      return out;
    });

    res.json({ message: `Imported ${created.length} pipes successfully`, imported: created.length, errors, details: created });
  } catch (error) {
    console.error('Excel commit error:', error);
    res.status(500).json({ message: 'Failed to import edited rows', error: error.message });
  }
};

// Import pipes from Excel (XLSX/XLS/CSV)
const importPipesFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Excel file is required (field name: file)' });
    }

    // Read workbook from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return res.status(400).json({ message: 'No sheets found in uploaded file' });
    }
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'No data rows found in the sheet' });
    }

    // Expected columns (case-insensitive): serialNumber (optional), colorGrade, sizeType, length, weight, manufacturingDate(optional), batchNumber(optional), section(optional)
    const normalizedRows = rows.map((r) => ({
      serialNumber: String(r.serialNumber || r.SerialNumber || r.SERIALNUMBER || r.SERIAL || r.BNO || '').trim(),
      colorGrade: String(r.colorGrade || r.ColorGrade || r.GRADE || r.Grade || '').trim(),
      sizeType: String(r.sizeType || r.SizeType || r.SIZE || r.Size || '').trim(),
      section: String(r.section || r.Section || r.SECTION || 'A').trim(),
      length: Number(r.length || r.Length || r.MTR || r.mtr || 0),
      weight: Number(r.weight || r.Weight || r.WEIGHT || r.wt || r.WT || 0),
      manufacturingDate: r.manufacturingDate || r.ManufacturingDate || r.DATE || r.Date || null,
      batchNumber: String(r.batchNumber || r.BatchNumber || r.BATCH || r.Batch || '').trim()
    }));

    // Validate and prepare inserts
    const toInsert = [];
    const errors = [];

    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const index = i + 2; // considering headers on row 1

      if (!row.colorGrade || !['A','B','C','D','a','b','c','d'].includes(row.colorGrade)) {
        errors.push(`Row ${index}: Invalid or missing colorGrade`);
        continue;
      }
      if (!row.sizeType) {
        errors.push(`Row ${index}: Missing sizeType`);
        continue;
      }
      if (!(row.length > 0)) {
        errors.push(`Row ${index}: Invalid length`);
        continue;
      }
      if (!(row.weight > 0)) {
        errors.push(`Row ${index}: Invalid weight`);
        continue;
      }

      toInsert.push(row);
    }

    if (toInsert.length === 0) {
      return res.status(400).json({ message: 'No valid rows to import', errors });
    }

    const result = await executeTransaction(async (session) => {
      const created = [];
      for (const r of toInsert) {
        // Ensure serial number (autogenerate if empty)
        let serial = r.serialNumber && r.serialNumber.length > 0 ? r.serialNumber : await generateSerialNumber();

        // Unique check
        const existing = await Pipe.findOne({ serialNumber: serial }).session(session);
        if (existing) {
          // Try regenerating if the provided serial collides
          serial = await generateSerialNumber();
        }

        // Compute price
        let price;
        try {
          price = await calculatePrice(String(r.colorGrade).toUpperCase(), r.sizeType, Number(r.length), Number(r.weight));
        } catch {
          const baseRate = 64;
          price = Number(r.weight) * baseRate;
        }

        const doc = new Pipe({
          serialNumber: serial,
          colorGrade: String(r.colorGrade).toUpperCase(),
          sizeType: r.sizeType,
          section: r.section || 'A',
          length: Number(r.length),
          remainingLength: Number(r.length),
          weight: Number(r.weight),
          price,
          manufacturingDate: r.manufacturingDate ? new Date(r.manufacturingDate) : new Date(),
          batchNumber: r.batchNumber || null,
          worker: req.user ? req.user._id : undefined
        });

        await doc.save({ session });
        created.push({ serialNumber: doc.serialNumber, sizeType: doc.sizeType, length: doc.length, weight: doc.weight });
      }
      return created;
    });

    res.json({
      message: `Imported ${result.length} pipes successfully`,
      imported: result.length,
      errors,
      details: result
    });
  } catch (error) {
    console.error('Excel import error:', error);
    res.status(500).json({ message: 'Failed to import Excel', error: error.message });
  }
};

// Helper function to determine inventory status
const getInventoryStatus = (remainingLength, totalLength) => {
    if (remainingLength === 0) return 'sold';
    if (remainingLength === totalLength) return 'available';
    if (remainingLength < totalLength * 0.2) return 'low_stock';
    return 'partial';
};

module.exports = {
    getAllPipes,
    getInventorySummary,
    addPipe,
    deletePipe,
    updatePipe,
    updatePipePrice,
    manualCleanup,
    getPipesByBatch,
    importPipesFromExcel,
    previewExcelImport,
    commitExcelImport
};