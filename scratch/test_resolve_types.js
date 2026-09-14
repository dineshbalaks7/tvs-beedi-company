const mongoose = require('mongoose');
require('dotenv').config();
const StockMovement = require('../models/StockMovement');

function resolveStockType(movement) {
  const notes = (movement.notes || '').trim();
  const item = movement.item;

  if (notes) {
    const leafPrefix = notes.match(/^Leaf\s*:\s*([A-Za-z0-9_\-\s]+?)(?:\s*\(|\s+Premium|\s+Special|\s+Leaves|$)/i);
    if (leafPrefix && leafPrefix[1].trim()) {
      return leafPrefix[1].trim();
    }

    const powderPrefix = notes.match(/^Powder\s*:\s*([A-Za-z0-9_\-\s]+?)(?:\s*\(|\s+Fine|\s+Mesh|$)/i);
    if (powderPrefix && powderPrefix[1].trim()) {
      return powderPrefix[1].trim();
    }

    if (!/^(Stock added|Initial stock|Stock adjusted|Restored)/i.test(notes)) {
      const clean = notes.split('(')[0].replace(/^(Leaf|Powder|Type)\s*:\s*/i, '').trim();
      if (clean) return clean;
    }
  }

  return item === 'tobacco' ? 'SONA' : 'Grade A';
}

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const movements = await StockMovement.find({
    quantityGrams: { $gt: 0 },
    type: { $in: ['added', 'initial', 'adjustment'] },
    notes: { $not: /Restored/i }
  }).sort({ date: 1, createdAt: 1 });
  
  movements.forEach(m => {
    console.log(m.date.toISOString().split('T')[0], '| Notes:', JSON.stringify(m.notes).padEnd(42), '--> Type:', resolveStockType(m));
  });
  await mongoose.disconnect();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
