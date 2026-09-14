const mongoose = require('mongoose');
require('dotenv').config();
const StockMovement = require('../models/StockMovement');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const movements = await StockMovement.find().sort({ date: 1 });
  console.log('Total movements:', movements.length);
  const incoming = movements.filter(m => m.quantityGrams > 0 && (m.type === 'added' || m.type === 'initial') && !m.notes.includes('Restored'));
  console.log('Incoming movements count:', incoming.length);
  incoming.forEach(m => {
    const d = new Date(m.date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const kg = m.quantityGrams / 1000;
    console.log(`${day}-${month}-${year} | ${m.item} | ${kg} kg | ${m.type} | ${m.notes}`);
  });
  await mongoose.disconnect();
}
test().catch(err => {
  console.error(err);
  process.exit(1);
});
