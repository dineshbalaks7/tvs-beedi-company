const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const StockMovement = require('../models/StockMovement');
  const Production = require('../models/Production');
  const Stock = require('../models/Stock');
  const Settings = require('../models/Settings');

  const settings = await Settings.getSettings();

  const startDate = new Date('2026-08-01T00:00:00.000Z');
  const endDate = new Date('2026-09-30T23:59:59.999Z');

  const allMovements = await StockMovement.find({ date: { $gte: startDate, $lte: endDate } }).sort({ date: 1, createdAt: 1 });
  const allProductions = await Production.find({ date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 });

  const [lastTobaccoBefore, lastPowderBefore] = await Promise.all([
    StockMovement.findOne({ item: 'tobacco', date: { $lt: startDate } }).sort({ date: -1, createdAt: -1 }),
    StockMovement.findOne({ item: 'powder', date: { $lt: startDate } }).sort({ date: -1, createdAt: -1 })
  ]);

  let periodOpeningTobacco = lastTobaccoBefore ? lastTobaccoBefore.balanceAfterGrams : 0;
  if (!lastTobaccoBefore) {
    const firstT = allMovements.find(m => m.item === 'tobacco');
    if (firstT) periodOpeningTobacco = Math.max(0, firstT.balanceAfterGrams - firstT.quantityGrams);
  }

  let periodOpeningPowder = lastPowderBefore ? lastPowderBefore.balanceAfterGrams : 0;
  if (!lastPowderBefore) {
    const firstP = allMovements.find(m => m.item === 'powder');
    if (firstP) periodOpeningPowder = Math.max(0, firstP.balanceAfterGrams - firstP.quantityGrams);
  }

  console.log('Period Opening Tobacco:', periodOpeningTobacco, 'g | Powder:', periodOpeningPowder, 'g');

  const months = [];
  let iter = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endIter = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (iter <= endIter) {
    const y = iter.getFullYear();
    const m = iter.getMonth();
    const mStart = (iter < startDate) ? new Date(startDate) : new Date(y, m, 1, 0, 0, 0, 0);
    const lastDayOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const mEnd = (lastDayOfMonth > endDate) ? new Date(endDate) : lastDayOfMonth;

    months.push({
      key: `${y}-${String(m + 1).padStart(2, '0')}`,
      startDate: mStart,
      endDate: mEnd
    });
    iter.setMonth(iter.getMonth() + 1);
  }

  let runningTobaccoBal = periodOpeningTobacco;
  let runningPowderBal = periodOpeningPowder;
  const breakdown = [];

  for (const m of months) {
    const mMovements = allMovements.filter(mov => {
      const d = new Date(mov.date);
      return d >= m.startDate && d <= m.endDate;
    });

    const mProds = allProductions.filter(p => {
      const d = new Date(p.date);
      return d >= m.startDate && d <= m.endDate;
    });

    const mOpeningTobacco = runningTobaccoBal;
    const mOpeningPowder = runningPowderBal;

    let mTobaccoAdded = 0, mTobaccoUsed = 0, mTobaccoAdjust = 0;
    let mPowderAdded = 0, mPowderUsed = 0, mPowderAdjust = 0;

    mMovements.forEach(mov => {
      const qty = mov.quantityGrams || 0;
      if (mov.item === 'tobacco') {
        runningTobaccoBal = mov.balanceAfterGrams;
        if (mov.type === 'added' || (mov.type === 'initial' && qty > 0)) mTobaccoAdded += qty;
        else if (mov.type === 'production_usage') mTobaccoUsed += Math.abs(qty);
        else if (mov.type === 'adjustment') mTobaccoAdjust += qty;
      } else if (mov.item === 'powder') {
        runningPowderBal = mov.balanceAfterGrams;
        if (mov.type === 'added' || (mov.type === 'initial' && qty > 0)) mPowderAdded += qty;
        else if (mov.type === 'production_usage') mPowderUsed += Math.abs(qty);
        else if (mov.type === 'adjustment') mPowderAdjust += qty;
      }
    });

    breakdown.push({
      month: m.key,
      tobacco: {
        openingKg: (mOpeningTobacco / 1000).toFixed(2),
        addedKg: (mTobaccoAdded / 1000).toFixed(2),
        usedKg: (mTobaccoUsed / 1000).toFixed(2),
        adjustKg: (mTobaccoAdjust / 1000).toFixed(2),
        closingKg: (runningTobaccoBal / 1000).toFixed(2)
      },
      powder: {
        openingKg: (mOpeningPowder / 1000).toFixed(2),
        addedKg: (mPowderAdded / 1000).toFixed(2),
        usedKg: (mPowderUsed / 1000).toFixed(2),
        adjustKg: (mPowderAdjust / 1000).toFixed(2),
        closingKg: (runningPowderBal / 1000).toFixed(2)
      },
      productionCount: mProds.length,
      movementsCount: mMovements.length
    });
  }

  console.log('Monthly Breakdown:');
  console.dir(breakdown, { depth: null });

  await mongoose.disconnect();
}

test().catch(console.error);
