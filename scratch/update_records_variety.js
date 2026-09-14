const mongoose = require('mongoose');
require('dotenv').config();
const StockMovement = require('../models/StockMovement');

async function updateRecords() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const updates = [
    { filter: { _id: '6aa63faeb503226acd87b8c2' }, variety: 'SONA', notes: 'SONA' },
    { filter: { _id: '6aa63faeb503226acd87b8c3' }, variety: 'Grade A', notes: 'Grade A' },
    { filter: { _id: '6aa63faeb503226acd87b8c4' }, variety: 'A1', notes: 'A1' },
    { filter: { _id: '6aa63faeb503226acd87b8c5' }, variety: 'SUPER', notes: 'SUPER' },
    { filter: { _id: '6aa62d69be8d250ed1a9c9dc' }, variety: 'SONA', notes: 'SONA' },
    { filter: { _id: '6aa62d6abe8d250ed1a9c9e1' }, variety: 'Grade A', notes: 'Grade A' },
    { filter: { _id: '6aa631328a6d6ac9cb07461b' }, variety: 'Grade A', notes: 'Grade A' },
    { filter: { _id: '6aa639588a6d6ac9cb074672' }, variety: 'A1', notes: 'A1' },
    { filter: { _id: '6aa63d178a6d6ac9cb0746b2' }, variety: 'SONA', notes: 'SONA' },
    { filter: { _id: '6aa65a32c5266d2f01a68cb0' }, variety: 'SONA', notes: 'SONA' },
    { filter: { _id: '6aa66d54ec27153a509b2871' }, variety: 'SONA', notes: 'SONA' },
    { filter: { _id: '6aa66e42ec27153a509b28bf' }, variety: 'A1', notes: 'A1' }
  ];

  for (const u of updates) {
    await StockMovement.updateOne(u.filter, { $set: { notes: u.notes } });
  }

  console.log('✅ Updated all existing incoming movements with clean varieties!');
  
  const movements = await StockMovement.find({
    quantityGrams: { $gt: 0 },
    type: { $in: ['added', 'initial', 'adjustment'] },
    notes: { $not: /Restored/i }
  }).sort({ date: 1, createdAt: 1 });

  movements.forEach(m => {
    console.log(m.date.toISOString().split('T')[0], '| item:', m.item.padEnd(8), '| kg:', String(m.quantityGrams / 1000).padStart(3), '| Type/Variety:', m.notes);
  });

  await mongoose.disconnect();
}

updateRecords().catch(err => {
  console.error(err);
  process.exit(1);
});
