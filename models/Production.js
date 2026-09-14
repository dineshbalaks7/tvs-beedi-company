const mongoose = require('mongoose');

const ProductionSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  boxes: {
    type: Number,
    default: 0
  },
  cuts: {
    type: Number,
    required: true,
    min: 0
  },
  beedis: {
    type: Number,
    required: true,
    min: 1
  },
  tobaccoUsedGrams: {
    type: Number,
    required: true,
    min: 0
  },
  powderUsedGrams: {
    type: Number,
    required: true,
    min: 0
  },
  wastageGrams: {
    type: Number,
    default: 0,
    min: 0
  },
  salary: {
    type: Number,
    required: true,
    min: 0
  },
  rate: {
    type: Number,
    required: true,
    min: 0
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

ProductionSchema.virtual('profit').get(function() {
  return Math.round(((this.rate || 0) - (this.salary || 0)) * 100) / 100;
});

ProductionSchema.set('toJSON', { virtuals: true });
ProductionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Production', ProductionSchema);
