const mongoose = require('mongoose');
require('dotenv').config();

async function testRange() {
  await mongoose.connect(process.env.MONGODB_URI);
  const StockMovement = require('../models/StockMovement');
  const Production = require('../models/Production');
  const Stock = require('../models/Stock');
  const Settings = require('../models/Settings');

  const settings = await Settings.getSettings();

  // Test with range: 2026-08-01 to 2026-09-13
  const startDate = new Date(2026, 7, 1, 0, 0, 0, 0); // Aug 1
  const endDate = new Date(2026, 8, 13, 23, 59, 59, 999); // Sep 13

  const allMovements = await StockMovement.find({
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1, createdAt: 1 }).populate('referenceId');

  const allProductions = await Production.find({
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  const [lastTobaccoBefore, lastPowderBefore] = await Promise.all([
    StockMovement.findOne({ item: 'tobacco', date: { $lt: startDate } }).sort({ date: -1, createdAt: -1 }),
    StockMovement.findOne({ item: 'powder', date: { $lt: startDate } }).sort({ date: -1, createdAt: -1 })
  ]);

  let periodOpeningTobacco = lastTobaccoBefore ? lastTobaccoBefore.balanceAfterGrams : 0;
  if (!lastTobaccoBefore) {
    const firstT = allMovements.find(m => m.item === 'tobacco');
    if (firstT) periodOpeningTobacco = Math.max(0, (firstT.balanceAfterGrams || 0) - (firstT.quantityGrams || 0));
    else {
      const curT = await Stock.getStock('tobacco');
      periodOpeningTobacco = curT.quantityGrams || 0;
    }
  }

  let periodOpeningPowder = lastPowderBefore ? lastPowderBefore.balanceAfterGrams : 0;
  if (!lastPowderBefore) {
    const firstP = allMovements.find(m => m.item === 'powder');
    if (firstP) periodOpeningPowder = Math.max(0, (firstP.balanceAfterGrams || 0) - (firstP.quantityGrams || 0));
    else {
      const curP = await Stock.getStock('powder');
      periodOpeningPowder = curP.quantityGrams || 0;
    }
  }

  console.log('Period Opening Tobacco:', periodOpeningTobacco, 'g | Powder:', periodOpeningPowder, 'g');

  const months = [];
  let iter = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endIter = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const tamilMonths = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];

  while (iter <= endIter) {
    const y = iter.getFullYear();
    const m = iter.getMonth();
    const mStart = (new Date(y, m, 1, 0, 0, 0, 0) < startDate) ? new Date(startDate) : new Date(y, m, 1, 0, 0, 0, 0);
    const lastDayOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const mEnd = (lastDayOfMonth > endDate) ? new Date(endDate) : lastDayOfMonth;

    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const monthDate = new Date(y, m, 1);
    const monthLabelEn = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const monthLabelTa = `${tamilMonths[m]} ${y}`;

    months.push({
      key: monthKey,
      labelEn: monthLabelEn,
      labelTa: monthLabelTa,
      year: y,
      monthIndex: m,
      startDate: mStart,
      endDate: mEnd
    });
    iter.setMonth(iter.getMonth() + 1);
  }

  let runningTobaccoBal = periodOpeningTobacco;
  let runningPowderBal = periodOpeningPowder;
  const monthlyBreakdown = [];

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

    let mTobaccoAdded = 0;
    let mTobaccoUsed = 0;
    let mTobaccoWastage = 0;
    let mTobaccoAdjust = 0;

    let mPowderAdded = 0;
    let mPowderUsed = 0;
    let mPowderWastage = 0;
    let mPowderAdjust = 0;

    mMovements.forEach(mov => {
      const qty = mov.quantityGrams || 0;
      if (mov.item === 'tobacco') {
        runningTobaccoBal = mov.balanceAfterGrams !== undefined ? mov.balanceAfterGrams : (runningTobaccoBal + qty);
        if (mov.type === 'added' || (mov.type === 'initial' && qty > 0)) {
          mTobaccoAdded += qty;
        } else if (mov.type === 'production_usage') {
          mTobaccoUsed += Math.abs(qty);
        } else if (mov.type === 'wastage') {
          mTobaccoWastage += Math.abs(qty);
        } else if (mov.type === 'adjustment') {
          mTobaccoAdjust += qty;
        }
      } else if (mov.item === 'powder') {
        runningPowderBal = mov.balanceAfterGrams !== undefined ? mov.balanceAfterGrams : (runningPowderBal + qty);
        if (mov.type === 'added' || (mov.type === 'initial' && qty > 0)) {
          mPowderAdded += qty;
        } else if (mov.type === 'production_usage') {
          mPowderUsed += Math.abs(qty);
        } else if (mov.type === 'wastage') {
          mPowderWastage += Math.abs(qty);
        } else if (mov.type === 'adjustment') {
          mPowderAdjust += qty;
        }
      }
    });

    const mCuts = mProds.reduce((s, p) => s + (p.cuts || 0), 0);
    const mBoxes = mProds.reduce((s, p) => s + (p.boxes !== undefined && p.boxes !== null && p.boxes > 0 ? p.boxes : ((p.cuts || 0) / 300)), 0);
    const mBeedis = mProds.reduce((s, p) => s + (p.beedis || 0), 0);

    const mClosingTobaccoKg = Number((runningTobaccoBal / 1000).toFixed(2));
    const mUsableTobaccoKg = Math.max(0, mClosingTobaccoKg - (settings.avgWastageKg || 2));
    const bagSizeGrams = settings.bagSizeGrams || 600;
    const mPackableBags = bagSizeGrams > 0 ? Math.floor((mUsableTobaccoKg * 1000) / bagSizeGrams) : 0;

    monthlyBreakdown.push({
      month: m.key,
      labelEn: m.labelEn,
      labelTa: m.labelTa,
      startDate: m.startDate,
      endDate: m.endDate,
      tobacco: {
        openingKg: Number((mOpeningTobacco / 1000).toFixed(2)),
        addedKg: Number((mTobaccoAdded / 1000).toFixed(2)),
        usedKg: Number((mTobaccoUsed / 1000).toFixed(2)),
        wastageKg: Number((mTobaccoWastage / 1000).toFixed(2)),
        adjustKg: Number((mTobaccoAdjust / 1000).toFixed(2)),
        closingKg: mClosingTobaccoKg,
        packableBags: mPackableBags
      },
      powder: {
        openingKg: Number((mOpeningPowder / 1000).toFixed(2)),
        addedKg: Number((mPowderAdded / 1000).toFixed(2)),
        usedKg: Number((mPowderUsed / 1000).toFixed(2)),
        wastageKg: Number((mPowderWastage / 1000).toFixed(2)),
        adjustKg: Number((mPowderAdjust / 1000).toFixed(2)),
        closingKg: Number((runningPowderBal / 1000).toFixed(2))
      },
      production: {
        recordCount: mProds.length,
        cuts: mCuts,
        boxes: Number(mBoxes.toFixed(1)),
        beedis: mBeedis
      },
      movementsCount: mMovements.length
    });
  }

  console.log('Monthly Breakdown result count:', monthlyBreakdown.length);
  monthlyBreakdown.forEach(mb => {
    console.log(`Month: ${mb.month} | T.Open: ${mb.tobacco.openingKg}kg | T.Add: ${mb.tobacco.addedKg}kg | T.Use: ${mb.tobacco.usedKg}kg | T.Close: ${mb.tobacco.closingKg}kg | P.Close: ${mb.powder.closingKg}kg | Boxes: ${mb.production.boxes}`);
  });

  await mongoose.disconnect();
}

testRange().catch(console.error);
