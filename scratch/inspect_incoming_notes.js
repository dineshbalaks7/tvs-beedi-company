const mongoose = require('mongoose');
require('dotenv').config();
const StockMovement = require('../models/StockMovement');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const movements = await StockMovement.find({
    quantityGrams: { $gt: 0 },
    type: { $in: ['added', 'initial', 'adjustment'] },
    notes: { $not: /Restored/i }
  }).sort({ date: 1, createdAt: 1 });
  
  movements.forEach(m => {
    console.log(m._id, '| date:', m.date.toISOString().split('T')[0], '| item:', m.item, '| kg:', m.quantityGrams/1000, '| notes:', JSON.stringify(m.notes));
  });
  await mongoose.disconnect();
}
check().catch(err => {
  console.error(err);
  process.exit(1);
});
