/**
 * TVS Beedi Company - Stock Service
 * Stock is strictly for reporting physical quantities and tracking consumed quantities.
 * Does not overlap into financial or profit calculations.
 */

const Stock = require('../models/Stock');
const StockMovement = require('../models/StockMovement');
const Settings = require('../models/Settings');
const Production = require('../models/Production');
const Export = require('../models/Export');

async function getStockSummary() {
  const tobaccoStock = await Stock.getStock('tobacco');
  const powderStock = await Stock.getStock('powder');
  const settings = await Settings.getSettings();

  const tobaccoKg = Number((tobaccoStock.quantityGrams / 1000).toFixed(2));
  const powderKg = Number((powderStock.quantityGrams / 1000).toFixed(2));
  const thresholdKg = settings.lowStockThresholdKg || 5;

  // Consumption Reporting (Today, This Week, This Month, All Time)
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const [y, m, d] = dateStr.split('-').map(Number);
  const minTodayStart = new Date(Math.min(new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).getTime(), new Date(y, m - 1, d, 0, 0, 0, 0).getTime()));
  const weekStart = new Date(minTodayStart); weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(y, m - 1, 1, 0, 0, 0, 0);

  const [prodsToday, prodsWeek, prodsMonth, allProds] = await Promise.all([
    Production.find({ date: { $gte: minTodayStart } }),
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

// =========================================================================
// Strict Chronological Stock Reconciliation
// Ensures back-dated incoming stock, usages, and edits recalculate all subsequent
// running balances and update the physical in-hand stock strictly.
// =========================================================================
async function recalculateStockLedger(item = null) {
  const items = item ? [item] : ['tobacco', 'powder'];

  for (const it of items) {
    const movements = await StockMovement.find({ item: it });

    // Deterministic chronological ordering:
    // 1. Calendar date YYYY-MM-DD ascending
    // 2. Incoming stock / additions first on that day, followed by usage, then adjustments
    // 3. Exact createdAt timestamp
    const typePriority = (m) => {
      if (m.type === 'initial') return 1;
      if (m.type === 'added') return 2;
      if (m.type === 'adjustment' && m.quantityGrams > 0) return 3;
      if (m.type === 'production_usage') return 4;
      return 5;
    };

    movements.sort((a, b) => {
      const dateA = (a.date ? new Date(a.date) : new Date(a.createdAt)).toISOString().slice(0, 10);
      const dateB = (b.date ? new Date(b.date) : new Date(b.createdAt)).toISOString().slice(0, 10);
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const pA = typePriority(a);
      const pB = typePriority(b);
      if (pA !== pB) return pA - pB;

      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      return timeA - timeB;
    });

    let runningBalance = 0;
    for (const mov of movements) {
      runningBalance = Math.max(0, runningBalance + (mov.quantityGrams || 0));
      if (mov.balanceAfterGrams !== runningBalance) {
        mov.balanceAfterGrams = runningBalance;
        await mov.save();
      }
    }

    // Update physical Stock document to match true final in-hand balance
    const stockDoc = await Stock.getStock(it);
    stockDoc.quantityGrams = runningBalance;
    stockDoc.lastUpdated = new Date();
    await stockDoc.save();
  }
}

async function recordStockUsage(tobaccoUsedGrams, powderUsedGrams, productionId = null, notes = '', productionDate = null) {
  const tobaccoDeduct = Math.round(Number(tobaccoUsedGrams) || 0);
  const powderDeduct = Math.round(Number(powderUsedGrams) || 0);
  const movementDate = productionDate ? new Date(productionDate) : new Date();

  if (tobaccoDeduct > 0) {
    await StockMovement.create({
      item: 'tobacco',
      type: 'production_usage',
      quantityGrams: -tobaccoDeduct,
      balanceAfterGrams: 0, // Will be set strictly by recalculateStockLedger
      referenceId: productionId,
      notes: notes || `Production consumed: ${tobaccoDeduct}g Tobacco`,
      date: movementDate
    });
  }

  if (powderDeduct > 0) {
    await StockMovement.create({
      item: 'powder',
      type: 'production_usage',
      quantityGrams: -powderDeduct,
      balanceAfterGrams: 0, // Will be set strictly by recalculateStockLedger
      referenceId: productionId,
      notes: notes || `Production consumed: ${powderDeduct}g Powder (தூள்)`,
      date: movementDate
    });
  }

  await recalculateStockLedger();

  const tobaccoStock = await Stock.getStock('tobacco');
  const powderStock = await Stock.getStock('powder');
  return { tobaccoStock, powderStock };
}

async function addStock(item, quantityKg, notes = '', date = null) {
  const gramsToAdd = Math.round(quantityKg * 1000);
  const cleanNotes = (notes && notes.trim()) ? notes.trim() : (item === 'powder' ? '------' : '');
  const movementDate = date ? new Date(date) : new Date();

  const movement = await StockMovement.create({
    item,
    type: 'added',
    quantityGrams: gramsToAdd,
    balanceAfterGrams: 0, // Reconciled chronologically
    variety: cleanNotes,
    notes: cleanNotes,
    date: movementDate
  });

  // Recompute entire timeline so back-dated stock updates all subsequent usages
  await recalculateStockLedger(item);

  const stock = await Stock.getStock(item);
  const refreshedMovement = await StockMovement.findById(movement._id);
  return { stock, movement: refreshedMovement || movement };
}

async function adjustStock(item, newQuantityKg, notes = '', date = null) {
  const newGrams = Math.round(newQuantityKg * 1000);
  const stock = await Stock.getStock(item);
  const difference = newGrams - stock.quantityGrams;
  const cleanNotes = (notes && notes.trim()) ? notes.trim() : (item === 'powder' ? '------' : '');
  const movementDate = date ? new Date(date) : new Date();

  const movement = await StockMovement.create({
    item,
    type: 'adjustment',
    quantityGrams: difference,
    balanceAfterGrams: newGrams,
    variety: cleanNotes,
    notes: cleanNotes,
    date: movementDate
  });

  await recalculateStockLedger(item);

  const updatedStock = await Stock.getStock(item);
  const refreshedMovement = await StockMovement.findById(movement._id);
  return { stock: updatedStock, movement: refreshedMovement || movement };
}

async function deductStockWastage(item, quantityKg, notes = '', date = null) {
  const kg = Number(quantityKg);
  if (!['tobacco', 'powder'].includes(item) || !kg || kg <= 0) {
    throw new Error('Valid item and wastage quantity required');
  }

  const gramsToDeduct = Math.round(kg * 1000);
  const cleanNotes = (notes && notes.trim()) ? notes.trim() : (item === 'powder' ? 'தூள் கழிவு (Wastage)' : 'இலை கழிவு (Wastage)');
  const movementDate = date ? new Date(date) : new Date();

  const movement = await StockMovement.create({
    item,
    type: 'wastage',
    quantityGrams: -gramsToDeduct,
    balanceAfterGrams: 0,
    variety: cleanNotes,
    notes: cleanNotes,
    date: movementDate
  });

  await recalculateStockLedger(item);

  const stock = await Stock.getStock(item);
  const refreshedMovement = await StockMovement.findById(movement._id);
  return { stock, movement: refreshedMovement || movement };
}

async function deleteStockMovement(movementId) {
  const movement = await StockMovement.findById(movementId);
  if (!movement) {
    throw new Error('Stock movement record not found');
  }

  const item = movement.item;
  await StockMovement.findByIdAndDelete(movementId);

  // Recalculate timeline after removing this movement
  await recalculateStockLedger(item);

  const stock = await Stock.getStock(item);
  return { success: true, stock };
}

async function editStockMovement(movementId, { quantityKg, notes, date }) {
  const movement = await StockMovement.findById(movementId);
  if (!movement) {
    throw new Error('Stock movement record not found');
  }

  if (quantityKg !== undefined && quantityKg !== null && quantityKg !== '') {
    const rawKg = Math.abs(Number(quantityKg));
    movement.quantityGrams = (movement.quantityGrams >= 0) ? Math.round(rawKg * 1000) : -Math.round(rawKg * 1000);
  }

  if (notes !== undefined) {
    movement.notes = notes;
  }

  if (date) {
    movement.date = new Date(date);
  }

  await movement.save();

  // Recalculate timeline with updated date/quantity
  await recalculateStockLedger(movement.item);

  const stock = await Stock.getStock(movement.item);
  const refreshedMovement = await StockMovement.findById(movementId);
  return { success: true, movement: refreshedMovement || movement, stock };
}

async function getRecentMovements(limit = null) {
  const movements = await StockMovement.find().populate('referenceId');

  const typePriority = (m) => {
    if (m.type === 'initial') return 1;
    if (m.type === 'added') return 2;
    if (m.type === 'adjustment' && m.quantityGrams > 0) return 3;
    if (m.type === 'production_usage') return 4;
    return 5;
  };

  // Descending sort for the ledger display: newest date on top
  // For same date: usages display on top of additions, with additions below (chronological bottom-to-top flow)
  movements.sort((a, b) => {
    const dateA = (a.date ? new Date(a.date) : new Date(a.createdAt)).toISOString().slice(0, 10);
    const dateB = (b.date ? new Date(b.date) : new Date(b.createdAt)).toISOString().slice(0, 10);
    if (dateA !== dateB) return dateB.localeCompare(dateA);

    const pA = typePriority(a);
    const pB = typePriority(b);
    if (pA !== pB) return pB - pA;

    const timeA = new Date(a.createdAt || a.date).getTime();
    const timeB = new Date(b.createdAt || b.date).getTime();
    return timeB - timeA;
  });

  if (limit && Number.isFinite(limit) && limit > 0) {
    return movements.slice(0, limit);
  }
  return movements;
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

    const cutsPerBoxVal = settings.cutsPerBox || 300;
    const mCuts = mProds.reduce((s, p) => s + (p.cuts || 0), 0);
    const mBoxes = mProds.reduce((s, p) => s + (p.boxes !== undefined && p.boxes !== null && p.boxes > 0 ? p.boxes : ((p.cuts || 0) / cutsPerBoxVal)), 0);
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

  const periodCutsPerBox = settings.cutsPerBox || 300;
  const totalCuts = allProductions.reduce((s, p) => s + (p.cuts || 0), 0);
  const totalBoxes = allProductions.reduce((s, p) => s + (p.boxes !== undefined && p.boxes !== null && p.boxes > 0 ? p.boxes : ((p.cuts || 0) / periodCutsPerBox)), 0);
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

  const includeUsage = params.includeUsage === true || params.includeUsage === 'true' || params.includeProductionUsage === true || params.includeProductionUsage === 'true' || params.includeUsage === '1';

  // Incoming stock movements (purchases / additions only, strictly manually added stock)
  const query = {
    date: { $gte: startDate, $lte: endDate },
    quantityGrams: { $gt: 0 },
    type: { $in: ['added', 'initial'] },
    notes: { $not: /Production/i },
    referenceId: null
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

  const [movements, exportsList, settings] = await Promise.all([
    StockMovement.find(query).sort({ date: 1, createdAt: 1 }),
    includeUsage ? Export.find({ date: { $gte: startDate, $lte: endDate } }).sort({ date: 1, createdAt: 1 }) : Promise.resolve([]),
    Settings.getSettings()
  ]);

  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesTa = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];

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

  const monthsMap = new Map();

  function getOrCreateMonth(d) {
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
        powderKg: 0,
        totalIncomingKg: 0,
        totalUsageKg: 0,
        exportBoxes: 0,
        tobaccoUsageKg: 0,
        powderUsageKg: 0,
        netBalanceKg: 0
      });
    }
    return monthsMap.get(key);
  }

  // 1. Process inward stock movements
  movements.forEach(m => {
    const d = new Date(m.date);
    const monthObj = getOrCreateMonth(d);
    const kg = Number((m.quantityGrams / 1000).toFixed(2));
    const kgDisplay = (Number.isInteger(kg) || kg % 1 === 0) ? Math.round(kg) : Number(kg.toFixed(2));

    const dayStr = pad(d.getDate());
    const monStr = pad(d.getMonth() + 1);
    const yearStr = d.getFullYear();
    const dateFormatted = `${dayStr}-${monStr}-${yearStr}`;

    const isPowder = m.item === 'powder';
    const typeLabel = resolveStockVariety(m);

    monthObj.entries.push({
      _id: m._id,
      date: m.date,
      dateFormatted,
      item: m.item,
      entryType: 'inward',
      typeLabel,
      kg: kgDisplay,
      kgSigned: kgDisplay,
      notes: m.notes || ''
    });

    monthObj.totalKg = Number((monthObj.totalKg + kg).toFixed(2));
    monthObj.totalIncomingKg = Number((monthObj.totalIncomingKg + kg).toFixed(2));
    if (isPowder) {
      monthObj.powderKg = Number((monthObj.powderKg + kg).toFixed(2));
    } else {
      monthObj.tobaccoKg = Number((monthObj.tobaccoKg + kg).toFixed(2));
    }
  });

  // 2. Process export production usage (strictly from Exporting Boxes only, not daily production data)
  if (includeUsage && exportsList && exportsList.length > 0) {
    const beedisPerBox = settings.beedisPerBox || 6000;
    const tobaccoPer1000 = settings.tobaccoPer1000Grams || 600;
    const powderPer1000 = settings.powderPer1000Grams || 200;

    exportsList.forEach(exp => {
      const d = new Date(exp.date);
      const monthObj = getOrCreateMonth(d);

      const dayStr = pad(d.getDate());
      const monStr = pad(d.getMonth() + 1);
      const yearStr = d.getFullYear();
      const dateFormatted = `${dayStr}-${monStr}-${yearStr}`;

      const boxes = (exp.boxes !== undefined && exp.boxes !== null && exp.boxes > 0)
        ? exp.boxes
        : ((exp.cuts || 0) / (settings.cutsPerBox || 300));
      const beedis = exp.beedis || Math.round(boxes * beedisPerBox);

      const tobGrams = (beedis / 1000) * tobaccoPer1000;
      const tobKgRaw = Number((tobGrams / 1000).toFixed(2));
      const tobKg = (Number.isInteger(tobKgRaw) || tobKgRaw % 1 === 0) ? Math.round(tobKgRaw) : Number(tobKgRaw.toFixed(2));

      const powGrams = (beedis / 1000) * powderPer1000;
      const powKgRaw = Number((powGrams / 1000).toFixed(2));
      const powKg = (Number.isInteger(powKgRaw) || powKgRaw % 1 === 0) ? Math.round(powKgRaw) : Number(powKgRaw.toFixed(2));

      monthObj.exportBoxes = Number((monthObj.exportBoxes + boxes).toFixed(1));

      if (itemFilter === 'all' || itemFilter === 'tobacco' || itemFilter === 'sona' || itemFilter === 'a1' || itemFilter === 'super') {
        monthObj.entries.push({
          _id: `exp_tob_${exp._id}`,
          date: exp.date,
          dateFormatted,
          item: 'tobacco',
          entryType: 'usage',
          typeLabel: `ஏற்றுமதி பயன்பாடு (${boxes} Boxes)`,
          typeLabelEn: `Export Usage (${boxes} Boxes)`,
          kg: tobKg,
          kgSigned: -tobKg,
          boxes,
          notes: exp.companyName ? `Company: ${exp.companyName}` : (exp.notes || '')
        });
        monthObj.tobaccoUsageKg = Number((monthObj.tobaccoUsageKg + tobKgRaw).toFixed(2));
        monthObj.totalUsageKg = Number((monthObj.totalUsageKg + tobKgRaw).toFixed(2));
      }

      if (itemFilter === 'all' || itemFilter === 'powder') {
        monthObj.entries.push({
          _id: `exp_pow_${exp._id}`,
          date: exp.date,
          dateFormatted,
          item: 'powder',
          entryType: 'usage',
          typeLabel: `ஏற்றுமதி பயன்பாடு (${boxes} Boxes)`,
          typeLabelEn: `Export Usage (${boxes} Boxes)`,
          kg: powKg,
          kgSigned: -powKg,
          boxes,
          notes: exp.companyName ? `Company: ${exp.companyName}` : (exp.notes || '')
        });
        monthObj.powderUsageKg = Number((monthObj.powderUsageKg + powKgRaw).toFixed(2));
        monthObj.totalUsageKg = Number((monthObj.totalUsageKg + powKgRaw).toFixed(2));
      }
    });
  }

  // Convert map to chronological list
  const monthsList = Array.from(monthsMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  let grandTotalKg = 0;
  let totalTobaccoKg = 0;
  let totalPowderKg = 0;
  let grandTotalUsageKg = 0;
  let grandTotalTobaccoUsageKg = 0;
  let grandTotalPowderUsageKg = 0;
  let grandTotalExportBoxes = 0;
  let totalEntriesCount = 0;

  monthsList.forEach(m => {
    // Sort entries chronologically by calendar date
    m.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const mInwardTotal = (Number.isInteger(m.totalIncomingKg) || m.totalIncomingKg % 1 === 0)
      ? Math.round(m.totalIncomingKg)
      : Number(m.totalIncomingKg.toFixed(2));
    m.totalIncomingKg = mInwardTotal;

    const mUsageTotal = (Number.isInteger(m.totalUsageKg) || m.totalUsageKg % 1 === 0)
      ? Math.round(m.totalUsageKg)
      : Number(m.totalUsageKg.toFixed(2));
    m.totalUsageKg = mUsageTotal;

    const mNet = Number((mInwardTotal - mUsageTotal).toFixed(2));
    m.netBalanceKg = (Number.isInteger(mNet) || mNet % 1 === 0) ? Math.round(mNet) : mNet;

    if (includeUsage) {
      m.totalKg = m.netBalanceKg;
      m.monthTotalLine = `Total in ${m.englishMonth} (${m.tamilMonth}): வரவு = ${mInwardTotal}Kg | பயன்பாடு (${m.exportBoxes} கட்டை) = ${mUsageTotal}Kg | மீதம் = ${m.netBalanceKg}Kg`;
    } else {
      m.totalKg = mInwardTotal;
      m.monthTotalLine = `Total Kg in ${m.englishMonth} (${m.tamilMonth} மாத மொத்த கிலோ) = ${mInwardTotal}Kg`;
    }

    grandTotalKg = Number((grandTotalKg + mInwardTotal).toFixed(2));
    totalTobaccoKg = Number((totalTobaccoKg + m.tobaccoKg).toFixed(2));
    totalPowderKg = Number((totalPowderKg + m.powderKg).toFixed(2));
    grandTotalUsageKg = Number((grandTotalUsageKg + mUsageTotal).toFixed(2));
    grandTotalTobaccoUsageKg = Number((grandTotalTobaccoUsageKg + m.tobaccoUsageKg).toFixed(2));
    grandTotalPowderUsageKg = Number((grandTotalPowderUsageKg + m.powderUsageKg).toFixed(2));
    grandTotalExportBoxes = Number((grandTotalExportBoxes + m.exportBoxes).toFixed(1));
    totalEntriesCount += m.entries.length;
  });

  const finalGrandTotalIncoming = (Number.isInteger(grandTotalKg) || grandTotalKg % 1 === 0) ? Math.round(grandTotalKg) : Number(grandTotalKg.toFixed(2));
  const finalGrandTotalUsage = (Number.isInteger(grandTotalUsageKg) || grandTotalUsageKg % 1 === 0) ? Math.round(grandTotalUsageKg) : Number(grandTotalUsageKg.toFixed(2));
  const finalGrandNetBalance = Number((finalGrandTotalIncoming - finalGrandTotalUsage).toFixed(2));
  const finalGrandNetBalanceDisplay = (Number.isInteger(finalGrandNetBalance) || finalGrandNetBalance % 1 === 0) ? Math.round(finalGrandNetBalance) : finalGrandNetBalance;

  let finalTotalLine;
  if (includeUsage) {
    finalTotalLine = `Total (மொத்தம்): வரவு = ${finalGrandTotalIncoming}Kg | பயன்பாடு (${grandTotalExportBoxes} கட்டை) = ${finalGrandTotalUsage}Kg | நிகர இருப்பு = ${finalGrandNetBalanceDisplay}Kg`;
  } else {
    finalTotalLine = `Total Kg (மொத்த கிலோ) = ${finalGrandTotalIncoming}Kg`;
  }

  return {
    from: fromFormatted,
    to: toFormatted,
    itemFilter,
    includeUsage,
    months: monthsList,
    grandTotalKg: includeUsage ? finalGrandNetBalanceDisplay : finalGrandTotalIncoming,
    grandTotalIncomingKg: finalGrandTotalIncoming,
    grandTotalUsageKg: finalGrandTotalUsage,
    grandTotalExportBoxes,
    grandNetBalanceKg: finalGrandNetBalanceDisplay,
    finalTotalLine,
    totalEntries: totalEntriesCount,
    totalTobaccoKg: (Number.isInteger(totalTobaccoKg) || totalTobaccoKg % 1 === 0) ? Math.round(totalTobaccoKg) : Number(totalTobaccoKg.toFixed(2)),
    totalPowderKg: (Number.isInteger(totalPowderKg) || totalPowderKg % 1 === 0) ? Math.round(totalPowderKg) : Number(totalPowderKg.toFixed(2)),
    totalTobaccoUsageKg: (Number.isInteger(grandTotalTobaccoUsageKg) || grandTotalTobaccoUsageKg % 1 === 0) ? Math.round(grandTotalTobaccoUsageKg) : Number(grandTotalTobaccoUsageKg.toFixed(2)),
    totalPowderUsageKg: (Number.isInteger(grandTotalPowderUsageKg) || grandTotalPowderUsageKg % 1 === 0) ? Math.round(grandTotalPowderUsageKg) : Number(grandTotalPowderUsageKg.toFixed(2)),
    generatedAt: new Date().toISOString()
  };
}

async function getMonthlyStockReport(monthStr) {
  return getIncomingStockReport({ month: monthStr });
}

module.exports = {
  getStockSummary,
  recalculateStockLedger,
  recordStockUsage,
  addStock,
  adjustStock,
  deductStockWastage,
  deleteStockMovement,
  editStockMovement,
  getRecentMovements,
  getStockReport,
  getIncomingStockReport,
  getMonthlyStockReport
};
