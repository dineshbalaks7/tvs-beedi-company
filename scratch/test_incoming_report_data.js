const mongoose = require('mongoose');
require('dotenv').config();

async function testIncomingReport() {
  await mongoose.connect(process.env.MONGODB_URI);
  const StockMovement = require('../models/StockMovement');

  const englishMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const tamilMonths = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];

  const startDate = new Date('2026-08-01T00:00:00.000Z');
  const endDate = new Date('2026-09-30T23:59:59.999Z');

  const query = {
    date: { $gte: startDate, $lte: endDate },
    $or: [
      { type: 'added' },
      { type: 'initial', quantityGrams: { $gt: 0 } },
      { type: 'adjustment', quantityGrams: { $gt: 0 }, notes: { $not: /Restored from deleted production/i } }
    ]
  };

  const movements = await StockMovement.find(query).sort({ date: 1, createdAt: 1 });

  // Group by Month Key (YYYY-MM)
  const monthMap = new Map();

  movements.forEach(m => {
    const d = new Date(m.date);
    const y = d.getFullYear();
    const mIdx = d.getMonth();
    const key = `${y}-${String(mIdx + 1).padStart(2, '0')}`;

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        year: y,
        monthIndex: mIdx,
        monthNameEn: englishMonths[mIdx],
        monthNameTa: tamilMonths[mIdx],
        header: `${englishMonths[mIdx]} (${tamilMonths[mIdx]})`,
        entries: [],
        totalKg: 0
      });
    }

    const kg = Number((m.quantityGrams / 1000).toFixed(2));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(mIdx + 1).padStart(2, '0');
    const dateFormatted = `${day}-${month}-${y}`;

    const typeText = m.item === 'tobacco' ? 'Tobacco (புகையிலை)' : 'Powder (தூள்)';

    const group = monthMap.get(key);
    group.entries.push({
      date: dateFormatted,
      type: typeText,
      item: m.item,
      kg
    });
    group.totalKg = Number((group.totalKg + kg).toFixed(2));
  });

  const months = Array.from(monthMap.values());
  const grandTotalKg = months.reduce((s, m) => s + m.totalKg, 0);

  console.log('--- GENERATED INCOMING REPORT DATA ---');
  months.forEach(m => {
    console.log(`\n${m.header}`);
    console.log('Date (தேதி) | Type (வகை) | Kg (கிலோ)');
    console.log('------------------------------------');
    m.entries.forEach(e => {
      console.log(`${e.date} | ${e.type} | ${e.kg}`);
    });
    console.log(`Total Kg in ${m.monthNameEn} (${m.monthNameTa} மாத மொத்த கிலோ) = ${m.totalKg}`);
  });

  console.log(`\n====================================`);
  console.log(`Total Kg (மொத்த கிலோ) = ${Number(grandTotalKg.toFixed(2))}`);

  await mongoose.disconnect();
}

testIncomingReport().catch(console.error);
