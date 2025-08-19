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
  length: {
    type: Number,
    default: 0
  },
  weight: {
    type: Number,
    default: 0
  },
  manufacturingDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Pipe', pipeSchema);