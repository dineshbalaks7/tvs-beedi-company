const mongoose = require('mongoose');

const StockMovementSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  item: {
    type: String,
    enum: ['tobacco', 'powder'],
    required: true
  },
  type: {
    type: String,
    enum: ['initial', 'added', 'production_usage', 'export_usage', 'wastage', 'adjustment'],
    required: true
  },
  quantityGrams: {
    type: Number,
    required: true // positive for additions, negative for usage
  },
  balanceAfterGrams: {
    type: Number,
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    // References can be legacy Production records or current Export records.
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  variety: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

StockMovementSchema.index({ item: 1, date: -1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', StockMovementSchema);
