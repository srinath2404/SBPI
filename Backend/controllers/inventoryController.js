const Pipe = require('../models/Pipe');

// Get all pipes
const getAllPipes = async (req, res) => {
    try {
        const pipes = await Pipe.find().sort({ manufacturingDate: -1 });
        res.json(pipes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pipes', error: error.message });
    }
};

// Add new pipe
const addPipe = async (req, res) => {
    try {
        const {
            serialNumber,
            colorGrade,
            sizeType,
            length,
            weight,
            manufacturingDate
        } = req.body;

        if (!serialNumber || !colorGrade || !sizeType) {
            return res.status(400).json({ message: 'Required fields missing' });
        }

        const existingPipe = await Pipe.findOne({ serialNumber });
        if (existingPipe) {
            return res.status(400).json({ message: 'Serial number already exists' });
        }

        const newPipe = new Pipe({
            serialNumber,
            colorGrade,
            sizeType,
            length,
            weight,
            manufacturingDate: manufacturingDate || new Date()
        });

        await newPipe.save();
        res.status(201).json(newPipe);
    } catch (error) {
        res.status(500).json({ message: 'Error adding pipe', error: error.message });
    }
};

// Delete pipe
const deletePipe = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ message: 'Pipe ID is required' });
        }

        const pipe = await Pipe.findById(id);
        if (!pipe) {
            return res.status(404).json({ message: 'Pipe not found' });
        }

        await Pipe.findByIdAndDelete(id);
        res.json({ message: 'Pipe deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting pipe', error: error.message });
    }
};

module.exports = {
    getAllPipes,
    addPipe,
    deletePipe
};