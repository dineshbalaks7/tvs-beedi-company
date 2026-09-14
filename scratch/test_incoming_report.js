const mongoose = require('mongoose');
require('dotenv').config();
const StockMovement = require('../models/StockMovement');

async function getIncomingStockReport(params = {}) {
  const now = new Date();
  let startDate, endDate;

  if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
    const [y, m] = params.month.split('-').map(Number);
    startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
    endDate = new Date(y, m, 0, 23, 59, 59, 999);
  } else if (params.from || params.to) {
    if (params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from)) {
      const [fy, fm, fd] = params.from.split('-').map(Number);
      startDate = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    if (params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to)) {
      const [ty, tm, td] = params.to.split('-').map(Number);
      endDate = new Date(ty, tm - 1, td, 23, 59, 59, 999);
    } else {
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    if (startDate > endDate) {
      const tmp = startDate;
      startDate = endDate;
      endDate = tmp;
    }
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const pad = n => String(n).padStart(2, '0');
  const fromFormatted = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
  const toFormatted = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

  let itemFilter = (params.item || params.material || 'all').toLowerCase();
  if (itemFilter === 'leaf') itemFilter = 'tobacco';

  const query = {
    date: { $gte: startDate, $lte: endDate },
    quantityGrams: { $gt: 0 },
    type: { $in: ['added', 'initial', 'adjustment'] },
    notes: { $not: /Restored from deleted production/i }
  };

  if (itemFilter === 'tobacco' || itemFilter === 'powder') {
    query.item = itemFilter;
  }

  const movements = await StockMovement.find(query).sort({ date: 1, createdAt: 1 });

  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesTa = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];

  const monthsMap = new Map();

  movements.forEach(m => {
    const d = new Date(m.date);
    const y = d.getFullYear();
    const mIdx = d.getMonth();
    const key = `${y}-${pad(mIdx + 1)}`;

    if (!monthsMap.has(key)) {
      monthsMap.set(key, {
        key,
        year: y,
        monthIndex: mIdx,
        englishMonth: monthNamesEn[mIdx],
        tamilMonth: monthNamesTa[mIdx],
        monthHeading: `${monthNamesEn[mIdx]} (${monthNamesTa[mIdx]})`,
        entries: [],
        totalKg: 0,
        tobaccoKg: 0,
        powderKg: 0
      });
    }

    const monthObj = monthsMap.get(key);
    const kg = Number((m.quantityGrams / 1000).toFixed(2));
    const kgDisplay = (Number.isInteger(kg) || kg % 1 === 0) ? Math.round(kg) : Number(kg.toFixed(2));

    const dayStr = pad(d.getDate());
    const monStr = pad(mIdx + 1);
    const yearStr = d.getFullYear();
    const dateFormatted = `${dayStr}-${monStr}-${yearStr}`;

    const isPowder = m.item === 'powder';
    const typeEn = isPowder ? 'Powder' : 'Tobacco';
    const typeTa = isPowder ? 'தூள்' : 'புகையிலை';
    const typeLabel = `${typeEn} (${typeTa})`;

    monthObj.entries.push({
      _id: m._id,
      date: m.date,
      dateFormatted,
      item: m.item,
      typeEn,
      typeTa,
      typeLabel,
      kg: kgDisplay,
      notes: m.notes || ''
    });

    monthObj.totalKg = Number((monthObj.totalKg + kg).toFixed(2));
    if (isPowder) {
      monthObj.powderKg = Number((monthObj.powderKg + kg).toFixed(2));
    } else {
      monthObj.tobaccoKg = Number((monthObj.tobaccoKg + kg).toFixed(2));
    }
  });

  const monthsList = Array.from(monthsMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  let grandTotalKg = 0;
  let totalTobaccoKg = 0;
  let totalPowderKg = 0;
  let totalEntriesCount = 0;

  monthsList.forEach(m => {
    const mTotal = (Number.isInteger(m.totalKg) || m.totalKg % 1 === 0) ? Math.round(m.totalKg) : Number(m.totalKg.toFixed(2));
    m.totalKg = mTotal;
    m.monthTotalLine = `Total Kg in ${m.englishMonth} (${m.tamilMonth} மாத மொத்த கிலோ) = ${mTotal}`;

    grandTotalKg = Number((grandTotalKg + m.totalKg).toFixed(2));
    totalTobaccoKg = Number((totalTobaccoKg + m.tobaccoKg).toFixed(2));
    totalPowderKg = Number((totalPowderKg + m.powderKg).toFixed(2));
    totalEntriesCount += m.entries.length;
  });

  const finalGrandTotal = (Number.isInteger(grandTotalKg) || grandTotalKg % 1 === 0) ? Math.round(grandTotalKg) : Number(grandTotalKg.toFixed(2));
  const finalTotalLine = `Total Kg (மொத்த கிலோ) = ${finalGrandTotal}`;

  return {
    from: fromFormatted,
    to: toFormatted,
    itemFilter,
    months: monthsList,
    grandTotalKg: finalGrandTotal,
    finalTotalLine,
    totalEntries: totalEntriesCount,
    totalTobaccoKg: (Number.isInteger(totalTobaccoKg) || totalTobaccoKg % 1 === 0) ? Math.round(totalTobaccoKg) : Number(totalTobaccoKg.toFixed(2)),
    totalPowderKg: (Number.isInteger(totalPowderKg) || totalPowderKg % 1 === 0) ? Math.round(totalPowderKg) : Number(totalPowderKg.toFixed(2)),
    generatedAt: new Date().toISOString()
  };
}

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- TEST 1: All Materials (September 2026) ---');
  const rAll = await getIncomingStockReport({ from: '2026-09-01', to: '2026-09-30', item: 'all' });
  console.log('Months count:', rAll.months.length);
  rAll.months.forEach(m => {
    console.log('\nHeader:', m.monthHeading);
    m.entries.forEach(e => {
      console.log(`  ${e.dateFormatted} | ${e.typeLabel} | ${e.kg}`);
    });
    console.log(m.monthTotalLine);
  });
  console.log('\n' + rAll.finalTotalLine);

  console.log('\n--- TEST 2: Leaf / Tobacco Only ---');
  const rLeaf = await getIncomingStockReport({ from: '2026-09-01', to: '2026-09-30', item: 'tobacco' });
  console.log('Leaf entries:', rLeaf.totalEntries, 'Total Kg:', rLeaf.grandTotalKg);
  rLeaf.months.forEach(m => {
    console.log(m.monthHeading, 'Total:', m.totalKg);
  });

  console.log('\n--- TEST 3: Powder Only ---');
  const rPowder = await getIncomingStockReport({ from: '2026-09-01', to: '2026-09-30', item: 'powder' });
  console.log('Powder entries:', rPowder.totalEntries, 'Total Kg:', rPowder.grandTotalKg);
  rPowder.months.forEach(m => {
    console.log(m.monthHeading, 'Total:', m.totalKg);
  });

  await mongoose.disconnect();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
