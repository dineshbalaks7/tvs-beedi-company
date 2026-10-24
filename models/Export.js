const mongoose = require('mongoose');

const ExportSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  boxes: {
    type: Number,
    required: true,
    min: 0.1
  },
  cuts: {
    type: Number,
    required: true,
    min: 1
  },
  beedis: {
    type: Number,
    required: true,
    min: 1
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  salary: {
    type: Number,
    required: true,
    min: 0
  },
  margin: {
    type: Number,
    default: 0
  },
  // Values are snapshots calculated at save time so later settings changes do
  // not alter the financial or material history of an export.
  tobaccoUsedGrams: { type: Number, default: 0, min: 0 },
  powderUsedGrams: { type: Number, default: 0, min: 0 },
  commissionAmount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  companyName: {
    type: String,
    default: 'TVS Beedi Company'
  },
  vehicleNo: {
    type: String,
    default: ''
  },
  challanNo: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Export', ExportSchema);
