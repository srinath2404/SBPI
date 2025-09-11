const mongoose = require('mongoose');

const pipeSchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: true,
    unique: true
  },
  colorGrade: {
    type: String,
    required: true
  },
  sizeType: {
    type: String,
    required: true
  },
  section: {
    type: String,
    default: 'A' // Default section
  },
  length: {
    type: Number,
    default: 0
  },
  remainingLength: {
    type: Number,
    default: 0
  },
  weight: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    default: 0
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  manufacturingDate: {
    type: Date,
    default: Date.now
  },
  batchNumber: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Pipe', pipeSchema);