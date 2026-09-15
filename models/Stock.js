const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  item: {
    type: String,
    enum: ['tobacco', 'powder'],
    required: true,
    unique: true
  },
  quantityGrams: {
    type: Number,
    required: true,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Helper to get or initialize stocks
StockSchema.statics.getStock = async function(item) {
  let stock = await this.findOne({ item });
  if (!stock) {
    stock = await this.create({ item, quantityGrams: 0 });
  }
  return stock;
};

module.exports = mongoose.model('Stock', StockSchema);
