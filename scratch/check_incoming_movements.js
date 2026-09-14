const mongoose = require('mongoose');
require('dotenv').config();

async function checkIncoming() {
  await mongoose.connect(process.env.MONGODB_URI);
  const StockMovement = require('../models/StockMovement');

  const incoming = await StockMovement.find({
    $or: [
      { quantityGrams: { $gt: 0 } },
      { type: 'added' },
      { type: 'initial', quantityGrams: { $gt: 0 } }
    ]
  }).sort({ date: 1, createdAt: 1 });

  console.log(`Found ${incoming.length} incoming stock entries:`);
  incoming.forEach(m => {
    const d = new Date(m.date);
    const dateFormatted = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    console.log(`${dateFormatted} | ${m.item} | ${m.type} | ${m.quantityGrams / 1000} Kg | ${m.notes || ''}`);
  });

  await mongoose.disconnect();
}

checkIncoming().catch(console.error);
