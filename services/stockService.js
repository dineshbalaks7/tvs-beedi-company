/**
 * TVS Beedi Company - Stock Service
 * Stock is strictly for reporting physical quantities and tracking consumed quantities.
 * Does not overlap into financial or profit calculations.
 */

const Stock = require('../models/Stock');
const StockMovement = require('../models/StockMovement');
const Settings = require('../models/Settings');
const Production = require('../models/Production');

async function getStockSummary() {
  const tobaccoStock = await Stock.getStock('tobacco');
  const powderStock = await Stock.getStock('powder');
  const settings = await Settings.getSettings();

  const tobaccoKg = Number((tobaccoStock.quantityGrams / 1000).toFixed(2));
  const powderKg = Number((powderStock.quantityGrams / 1000).toFixed(2));
  const thresholdKg = settings.lowStockThresholdKg || 5;

  // Consumption Reporting (Today, This Week, This Month, All Time)
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const [prodsToday, prodsWeek, prodsMonth, allProds] = await Promise.all([
    Production.find({ date: { $gte: todayStart } }),
    Production.find({ date: { $gte: weekStart } }),
    Production.find({ date: { $gte: monthStart } }),
    Production.find()
  ]);

  function sumConsumed(prods) {
    const tGrams = prods.reduce((s, p) => s + (p.tobaccoUsedGrams || 0), 0);
    const pGrams = prods.reduce((s, p) => s + (p.powderUsedGrams || 0), 0);
    const cuts = prods.reduce((s, p) => s + (p.cuts || 0), 0);
    const boxes = prods.reduce((s, p) => s + (p.boxes !== undefined && p.boxes !== null && p.boxes > 0 ? p.boxes : ((p.cuts || 0) / 300)), 0);
    return {
      tobaccoKg: Number((tGrams / 1000).toFixed(2)),
      tobaccoGrams: tGrams,
      powderKg: Number((pGrams / 1000).toFixed(2)),
      powderGrams: pGrams,
      boxes: Number(boxes.toFixed(1)),
      cuts,
      beedis: prods.reduce((s, p) => s + (p.beedis || 0), 0)
    };
  }

  return {
    tobacco: {
      grams: tobaccoStock.quantityGrams,
      kg: tobaccoKg,
      isLow: tobaccoKg <= thresholdKg,
      lastUpdated: tobaccoStock.lastUpdated
    },
    powder: {
      grams: powderStock.quantityGrams,
      kg: powderKg,
      isLow: powderKg <= thresholdKg,
      lastUpdated: powderStock.lastUpdated
    },
    consumption: {
      today: sumConsumed(prodsToday),
      week: sumConsumed(prodsWeek),
      month: sumConsumed(prodsMonth),
      total: sumConsumed(allProds)
    },
    lowStockThresholdKg: thresholdKg
  };
}

async function recordStockUsage(tobaccoUsedGrams, powderUsedGrams, productionId = null, notes = '') {
  // Production usage is an audit trail only. Production must not alter the
  // manually maintained physical stock balance.
  const tobaccoDeduct = Math.round(Number(tobaccoUsedGrams) || 0);
  const tobaccoStock = await Stock.getStock('tobacco');
  if (tobaccoDeduct > 0) {
    await StockMovement.create({
      item: 'tobacco',
      type: 'production_usage',
      quantityGrams: -tobaccoDeduct,
      balanceAfterGrams: tobaccoStock.quantityGrams,
      referenceId: productionId,
      notes: notes || `Production consumed: ${tobaccoDeduct}g Tobacco`
    });
  }

  // Keep the same audit behavior for powder without changing its balance.
  const powderDeduct = Math.round(Number(powderUsedGrams) || 0);
  const powderStock = await Stock.getStock('powder');
  if (powderDeduct > 0) {
    await StockMovement.create({
      item: 'powder',
      type: 'production_usage',
      quantityGrams: -powderDeduct,
      balanceAfterGrams: powderStock.quantityGrams,
      referenceId: productionId,
      notes: notes || `Production consumed: ${powderDeduct}g Powder (தூள்)`
    });
  }

  return { tobaccoStock, powderStock };
}

async function addStock(item, quantityKg, notes = '') {
  const gramsToAdd = Math.round(quantityKg * 1000);
  const stock = await Stock.getStock(item);
  stock.quantityGrams += gramsToAdd;
  stock.lastUpdated = new Date();
  await stock.save();

  const cleanNotes = (notes && notes.trim()) ? notes.trim() : (item === 'powder' ? '------' : '');

  const movement = await StockMovement.create({
    item,
    type: 'added',
    quantityGrams: gramsToAdd,
    balanceAfterGrams: stock.quantityGrams,
    variety: cleanNotes,
    notes: cleanNotes
  });

  return { stock, movement };
}

async function adjustStock(item, newQuantityKg, notes = '') {
  const newGrams = Math.round(newQuantityKg * 1000);
  const stock = await Stock.getStock(item);
  const difference = newGrams - stock.quantityGrams;
  stock.quantityGrams = newGrams;
  stock.lastUpdated = new Date();
  await stock.save();

  const cleanNotes = (notes && notes.trim()) ? notes.trim() : (item === 'powder' ? '------' : '');

  const movement = await StockMovement.create({
    item,
    type: 'adjustment',
    quantityGrams: difference,
    balanceAfterGrams: stock.quantityGrams,
    variety: cleanNotes,
    notes: cleanNotes
  });

  return { stock, movement };
}

async function deleteStockMovement(movementId) {
  const movement = await StockMovement.findById(movementId);
  if (!movement) {
    throw new Error('Stock movement record not found');
  }

  const stock = await Stock.getStock(movement.item);

  if (movement.referenceId || movement.type === 'production_usage') {
    await StockMovement.findByIdAndDelete(movementId);
    return { success: true, stock, auditOnly: true };
  }

  // Reverse this movement from current stock
  if (movement.quantityGrams > 0) {
    // Was addition, so subtract it
    stock.quantityGrams = Math.max(0, stock.quantityGrams - movement.quantityGrams);
  } else if (movement.quantityGrams < 0) {
    // Was usage/deduction, so add it back
    stock.quantityGrams += Math.abs(movement.quantityGrams);
  }

  stock.lastUpdated = new Date();
  await stock.save();

  await StockMovement.findByIdAndDelete(movementId);
  return { success: true, stock };
}

async function editStockMovement(movementId, { quantityKg, notes, date }) {
  const movement = await StockMovement.findById(movementId);
  if (!movement) {
    throw new Error('Stock movement record not found');
  }

  const stock = await Stock.getStock(movement.item);

  if (movement.referenceId || movement.type === 'production_usage') {
    if (notes !== undefined) movement.notes = notes;
    if (date) movement.date = new Date(date);
    await movement.save();
    return { success: true, movement, stock, auditOnly: true };
  }

  if (quantityKg !== undefined && quantityKg !== null && quantityKg !== '') {
    const rawKg = Math.abs(Number(quantityKg));
    const newGrams = (movement.quantityGrams >= 0) ? Math.round(rawKg * 1000) : -Math.round(rawKg * 1000);
    const delta = newGrams - movement.quantityGrams;

    stock.quantityGrams = Math.max(0, stock.quantityGrams + delta);
    stock.lastUpdated = new Date();
    await stock.save();

    movement.quantityGrams = newGrams;
    movement.balanceAfterGrams = stock.quantityGrams;
  }

  if (notes !== undefined) {
    movement.notes = notes;
  }

  if (date) {
    movement.date = new Date(date);
  }

  await movement.save();
  return { success: true, movement, stock };
}

async function getRecentMovements(limit = 20) {
  return StockMovement.find()
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .populate('referenceId');
}

async function getStockReport(params = {}) {
  const settings = await Settings.getSettings();
  const now = new Date();

  let fromStr = '';
  let toStr = '';

  if (typeof params === 'string') {
    if (/^\d{4}-\d{2}$/.test(params)) {
      params = { month: params };
    } else {
      params = {};
    }
  }

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

  // 1. Fetch all movements and productions within the full date range
  const allMovements = await StockMovement.find({
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1, createdAt: 1 }).populate('referenceId');

  const allProductions = await Production.find({
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  // 2. Determine Opening Stock before the startDate
  const [lastTobaccoBefore, lastPowderBefore] = await Promise.all([
    StockMovement.findOne({ item: 'tobacco', date: { $lt: startDate } }).sort({ date: -1, createdAt: -1 }),
    StockMovement.findOne({ item: 'powder', date: { $lt: startDate } }).sort({ date: -1, createdAt: -1 })
  ]);

  let periodOpeningTobacco = 0;
  if (lastTobaccoBefore) {
    periodOpeningTobacco = lastTobaccoBefore.balanceAfterGrams || 0;
  } else {
    const firstT = allMovements.find(m => m.item === 'tobacco');
    if (firstT) {
      periodOpeningTobacco = Math.max(0, (firstT.balanceAfterGrams || 0) - (firstT.quantityGrams || 0));
    } else {
      const curT = await Stock.getStock('tobacco');
      periodOpeningTobacco = curT.quantityGrams || 0;
    }
  }

  let periodOpeningPowder = 0;
  if (lastPowderBefore) {
    periodOpeningPowder = lastPowderBefore.balanceAfterGrams || 0;
  } else {
    const firstP = allMovements.find(m => m.item === 'powder');
    if (firstP) {
      periodOpeningPowder = Math.max(0, (firstP.balanceAfterGrams || 0) - (firstP.quantityGrams || 0));
    } else {
      const curP = await Stock.getStock('powder');
      periodOpeningPowder = curP.quantityGrams || 0;
    }
  }

  // 3. Build month buckets spanning [startDate, endDate]
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

  // 4. Compute monthly breakdown with strict continuity
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
        runningTobaccoBal = (mov.balanceAfterGrams !== undefined && mov.balanceAfterGrams !== null) ? mov.balanceAfterGrams : (runningTobaccoBal + qty);
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
        runningPowderBal = (mov.balanceAfterGrams !== undefined && mov.balanceAfterGrams !== null) ? mov.balanceAfterGrams : (runningPowderBal + qty);
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
        openingGrams: mOpeningTobacco,
        addedKg: Number((mTobaccoAdded / 1000).toFixed(2)),
        addedGrams: mTobaccoAdded,
        usedKg: Number((mTobaccoUsed / 1000).toFixed(2)),
        usedGrams: mTobaccoUsed,
        wastageKg: Number((mTobaccoWastage / 1000).toFixed(2)),
        adjustKg: Number((mTobaccoAdjust / 1000).toFixed(2)),
        closingKg: mClosingTobaccoKg,
        closingGrams: runningTobaccoBal,
        packableBags: mPackableBags
      },
      powder: {
        openingKg: Number((mOpeningPowder / 1000).toFixed(2)),
        openingGrams: mOpeningPowder,
        addedKg: Number((mPowderAdded / 1000).toFixed(2)),
        addedGrams: mPowderAdded,
        usedKg: Number((mPowderUsed / 1000).toFixed(2)),
        usedGrams: mPowderUsed,
        wastageKg: Number((mPowderWastage / 1000).toFixed(2)),
        adjustKg: Number((mPowderAdjust / 1000).toFixed(2)),
        closingKg: Number((runningPowderBal / 1000).toFixed(2)),
        closingGrams: runningPowderBal
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

  // 5. Total Period Statistics
  let totalTobaccoAdded = 0;
  let totalTobaccoUsed = 0;
  let totalTobaccoWastage = 0;
  let totalTobaccoAdjust = 0;

  let totalPowderAdded = 0;
  let totalPowderUsed = 0;
  let totalPowderWastage = 0;
  let totalPowderAdjust = 0;

  monthlyBreakdown.forEach(mb => {
    totalTobaccoAdded += mb.tobacco.addedGrams;
    totalTobaccoUsed += mb.tobacco.usedGrams;
    totalTobaccoAdjust += mb.tobacco.adjustKg * 1000;
    totalPowderAdded += mb.powder.addedGrams;
    totalPowderUsed += mb.powder.usedGrams;
    totalPowderAdjust += mb.powder.adjustKg * 1000;
  });

  const periodClosingTobaccoGrams = runningTobaccoBal;
  const periodClosingPowderGrams = runningPowderBal;

  const totalCuts = allProductions.reduce((s, p) => s + (p.cuts || 0), 0);
  const totalBoxes = allProductions.reduce((s, p) => s + (p.boxes !== undefined && p.boxes !== null && p.boxes > 0 ? p.boxes : ((p.cuts || 0) / 300)), 0);
  const totalBeedis = allProductions.reduce((s, p) => s + (p.beedis || 0), 0);

  const closingTobaccoKg = Number((periodClosingTobaccoGrams / 1000).toFixed(2));
  const usableTobaccoKg = Math.max(0, closingTobaccoKg - (settings.avgWastageKg || 2));
  const bagSizeGrams = settings.bagSizeGrams || 600;
  const packableBags = bagSizeGrams > 0 ? Math.floor((usableTobaccoKg * 1000) / bagSizeGrams) : 0;

  const isSingleMonth = months.length === 1;
  const monthKey = isSingleMonth ? months[0].key : `${months[0].key} to ${months[months.length - 1].key}`;
  const monthLabelEn = isSingleMonth ? months[0].labelEn : `${months[0].labelEn} - ${months[months.length - 1].labelEn}`;
  const monthLabelTa = isSingleMonth ? months[0].labelTa : `${months[0].labelTa} - ${months[months.length - 1].labelTa}`;

  return {
    from: fromFormatted,
    to: toFormatted,
    month: monthKey,
    monthLabelEn,
    monthLabelTa,
    dateRangeLabelEn: `${fromFormatted} to ${toFormatted}`,
    dateRangeLabelTa: `${fromFormatted} முதல் ${toFormatted} வரை`,
    isRange: !isSingleMonth,
    generatedAt: new Date().toISOString(),
    settings: {
      avgWastageKg: settings.avgWastageKg || 2,
      bagSizeGrams,
      beedisPerBox: settings.beedisPerBox || 6000,
      cutsPerBox: settings.cutsPerBox || 300
    },
    tobacco: {
      openingKg: Number((periodOpeningTobacco / 1000).toFixed(2)),
      openingGrams: periodOpeningTobacco,
      addedKg: Number((totalTobaccoAdded / 1000).toFixed(2)),
      addedGrams: totalTobaccoAdded,
      usedKg: Number((totalTobaccoUsed / 1000).toFixed(2)),
      usedGrams: totalTobaccoUsed,
      adjustKg: Number((totalTobaccoAdjust / 1000).toFixed(2)),
      closingKg: closingTobaccoKg,
      closingGrams: periodClosingTobaccoGrams,
      usableKg: Number(usableTobaccoKg.toFixed(2)),
      packableBags
    },
    powder: {
      openingKg: Number((periodOpeningPowder / 1000).toFixed(2)),
      openingGrams: periodOpeningPowder,
      addedKg: Number((totalPowderAdded / 1000).toFixed(2)),
      addedGrams: totalPowderAdded,
      usedKg: Number((totalPowderUsed / 1000).toFixed(2)),
      usedGrams: totalPowderUsed,
      adjustKg: Number((totalPowderAdjust / 1000).toFixed(2)),
      closingKg: Number((periodClosingPowderGrams / 1000).toFixed(2)),
      closingGrams: periodClosingPowderGrams
    },
    production: {
      totalRecords: allProductions.length,
      cuts: totalCuts,
      boxes: Number(totalBoxes.toFixed(1)),
      beedis: totalBeedis
    },
    monthlyBreakdown,
    movements: allMovements.map(m => ({
      _id: m._id,
      date: m.date,
      item: m.item,
      type: m.type,
      quantityGrams: m.quantityGrams,
      quantityKg: Number((Math.abs(m.quantityGrams) / 1000).toFixed(2)),
      isInward: m.quantityGrams > 0,
      balanceAfterKg: Number((m.balanceAfterGrams / 1000).toFixed(2)),
      notes: m.notes || ''
    }))
  };
}

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

  // Only incoming stock movements (purchases / additions, excluding rolled back items from deleted productions)
  const query = {
    date: { $gte: startDate, $lte: endDate },
    quantityGrams: { $gt: 0 },
    type: { $in: ['added', 'initial', 'adjustment'] },
    notes: { $not: /Restored from deleted production/i }
  };

  if (itemFilter === 'tobacco' || itemFilter === 'powder') {
    query.item = itemFilter;
  } else if (itemFilter === 'sona') {
    query.item = 'tobacco';
    query.$or = [{ notes: /SONA/i }, { variety: /SONA/i }];
  } else if (itemFilter === 'a1') {
    query.item = 'tobacco';
    query.$or = [{ notes: /A1/i }, { variety: /A1/i }];
  } else if (itemFilter === 'super') {
    query.item = 'tobacco';
    query.$or = [{ notes: /SUPER/i }, { variety: /SUPER/i }];
  }

  const movements = await StockMovement.find(query).sort({ date: 1, createdAt: 1 });

  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesTa = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];

  // Resolves the specific variety/type name (e.g. SONA, A1, SUPER, Grade A)
  function resolveStockVariety(m) {
    const raw = (m.variety || m.notes || '').trim();
    if (raw) {
      const leafPrefix = raw.match(/^Leaf\s*:\s*([A-Za-z0-9_\-\s]+?)(?:\s*\(|\s+Premium|\s+Special|\s+Leaves|$)/i);
      if (leafPrefix && leafPrefix[1].trim()) {
        return leafPrefix[1].trim().toUpperCase();
      }

      const powderPrefix = raw.match(/^Powder\s*:\s*([A-Za-z0-9_\-\s]+?)(?:\s*\(|\s+Fine|\s+Mesh|$)/i);
      if (powderPrefix && powderPrefix[1].trim()) {
        return powderPrefix[1].trim();
      }

      if (!/^(Stock added|Initial stock|Stock adjusted|Restored)/i.test(raw)) {
        const clean = raw.split('(')[0].replace(/^(Leaf|Powder|Type)\s*:\s*/i, '').trim();
        if (clean) return clean;
      }
    }

    return m.item === 'powder' ? '------' : 'SONA';
  }

  // IMPORTANT DATE RULE: Only include actual stock-entry dates from data. Do NOT generate all calendar days.
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
    const typeLabel = resolveStockVariety(m);

    monthObj.entries.push({
      _id: m._id,
      date: m.date,
      dateFormatted,
      item: m.item,
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

  // Convert map to chronological list; skips empty months automatically
  const monthsList = Array.from(monthsMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  let grandTotalKg = 0;
  let totalTobaccoKg = 0;
  let totalPowderKg = 0;
  let totalEntriesCount = 0;

  monthsList.forEach(m => {
    const mTotal = (Number.isInteger(m.totalKg) || m.totalKg % 1 === 0) ? Math.round(m.totalKg) : Number(m.totalKg.toFixed(2));
    m.totalKg = mTotal;
    m.monthTotalLine = `Total Kg in ${m.englishMonth} (${m.tamilMonth} மாத மொத்த கிலோ) = ${mTotal}Kg`;

    grandTotalKg = Number((grandTotalKg + m.totalKg).toFixed(2));
    totalTobaccoKg = Number((totalTobaccoKg + m.tobaccoKg).toFixed(2));
    totalPowderKg = Number((totalPowderKg + m.powderKg).toFixed(2));
    totalEntriesCount += m.entries.length;
  });

  const finalGrandTotal = (Number.isInteger(grandTotalKg) || grandTotalKg % 1 === 0) ? Math.round(grandTotalKg) : Number(grandTotalKg.toFixed(2));
  const finalTotalLine = `Total Kg (மொத்த கிலோ) = ${finalGrandTotal}Kg`;

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

async function getMonthlyStockReport(monthStr) {
  return getIncomingStockReport({ month: monthStr });
}

module.exports = {
  getStockSummary,
  recordStockUsage,
  addStock,
  adjustStock,
  deleteStockMovement,
  editStockMovement,
  getRecentMovements,
  getStockReport,
  getIncomingStockReport,
  getMonthlyStockReport
};
