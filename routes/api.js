/**
 * TVS Beedi Company - API Routes
 */

const express = require('express');
const router = express.Router();

const Settings = require('../models/Settings');
const Production = require('../models/Production');
const Expense = require('../models/Expense');
const Stock = require('../models/Stock');
const StockMovement = require('../models/StockMovement');
const ChatHistory = require('../models/ChatHistory');
const Export = require('../models/Export');

const { calculateProductionMetrics, calculateBags, calculateProfit } = require('../services/calculationService');
const {
  getStockSummary,
  addStock,
  adjustStock,
  deleteStockMovement,
  editStockMovement,
  recordStockUsage,
  getRecentMovements,
  getStockReport,
  getIncomingStockReport,
  getMonthlyStockReport
} = require('../services/stockService');
const { processChatMessage, executePendingAction } = require('../services/assistantService');

// Helper for date ranges
function getDateFilter(query) {
  const filter = {};
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) {
      const bounds = getDayBounds(query.from);
      filter.date.$gte = bounds.minStart;
    }
    if (query.to) {
      const bounds = getDayBounds(query.to);
      filter.date.$lte = bounds.maxEnd;
    }
  }
  return filter;
}

// Helper for calendar day boundaries across UTC and local timezones
function getDayBounds(dateInput) {
  let dateStr = '';
  let targetDate;
  if (!dateInput) {
    targetDate = new Date();
    dateStr = targetDate.toISOString().split('T')[0];
  } else if (typeof dateInput === 'string') {
    dateStr = dateInput.split('T')[0].trim();
    const [y, m, d] = dateStr.split('-').map(Number);
    targetDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  } else if (dateInput instanceof Date) {
    targetDate = dateInput;
    dateStr = dateInput.toISOString().split('T')[0];
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const startUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const endUtc = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

  const startLocal = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endLocal = new Date(y, m - 1, d, 23, 59, 59, 999);

  const minStart = new Date(Math.min(startUtc.getTime(), startLocal.getTime()));
  const maxEnd = new Date(Math.max(endUtc.getTime(), endLocal.getTime()));

  return { dateStr, minStart, maxEnd, startUtc, endUtc, targetDate };
}

function getCalendarDateKey(dateInput) {
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Find existing production entry on given calendar day
async function findProductionByDate(dateInput, excludeId = null) {
  const bounds = getDayBounds(dateInput);
  const query = {
    date: { $gte: bounds.minStart, $lte: bounds.maxEnd }
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const candidates = await Production.find(query);
  return candidates.find(r => {
    const isoDay = new Date(r.date).toISOString().split('T')[0];
    const localDay = new Date(r.date).toLocaleDateString('en-CA');
    return isoDay === bounds.dateStr || localDay === bounds.dateStr;
  }) || null;
}

// Find existing export entry on given calendar day
async function findExportByDate(dateInput, excludeId = null) {
  const bounds = getDayBounds(dateInput);
  const query = {
    date: { $gte: bounds.minStart, $lte: bounds.maxEnd }
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const candidates = await Export.find(query);
  return candidates.find(r => {
    const isoDay = new Date(r.date).toISOString().split('T')[0];
    const localDay = new Date(r.date).toLocaleDateString('en-CA');
    return isoDay === bounds.dateStr || localDay === bounds.dateStr;
  }) || null;
}

// ==========================================
// 1. DASHBOARD
// ==========================================
router.get('/dashboard', async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    // Today's boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // This Month's boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Today's productions & expenses
    const [todayProductions, todayExpenses, monthProductions, monthExpenses, stockSummary] = await Promise.all([
      Production.find({ date: { $gte: todayStart, $lte: todayEnd } }),
      Expense.find({ date: { $gte: todayStart, $lte: todayEnd } }),
      Production.find({ date: { $gte: monthStart, $lte: monthEnd } }),
      Expense.find({ date: { $gte: monthStart, $lte: monthEnd } }),
      getStockSummary()
    ]);

    // Today calculations
    const todayCuts = todayProductions.reduce((sum, p) => sum + (p.cuts || 0), 0);
    const todayBeedis = todayProductions.reduce((sum, p) => sum + (p.beedis || 0), 0);
    const todayTobaccoGrams = todayProductions.reduce((sum, p) => sum + (p.tobaccoUsedGrams || 0), 0);
    const todayPowderGrams = todayProductions.reduce((sum, p) => sum + (p.powderUsedGrams || 0), 0);
    const todaySalary = todayProductions.reduce((sum, p) => sum + (p.salary || 0), 0);
    const todayRate = todayProductions.reduce((sum, p) => sum + (p.rate || 0), 0);
    const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const todayProfit = calculateProfit(todayRate, todaySalary, todayExpenseTotal);

    // Month calculations
    const monthCuts = monthProductions.reduce((sum, p) => sum + (p.cuts || 0), 0);
    const monthBeedis = monthProductions.reduce((sum, p) => sum + (p.beedis || 0), 0);
    const monthTobaccoGrams = monthProductions.reduce((sum, p) => sum + (p.tobaccoUsedGrams || 0), 0);
    const monthPowderGrams = monthProductions.reduce((sum, p) => sum + (p.powderUsedGrams || 0), 0);
    const monthSalary = monthProductions.reduce((sum, p) => sum + (p.salary || 0), 0);
    const monthRate = monthProductions.reduce((sum, p) => sum + (p.rate || 0), 0);
    const monthExpenseTotal = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const monthProfit = calculateProfit(monthRate, monthSalary, monthExpenseTotal);

    res.json({
      today: {
        cuts: todayCuts,
        beedis: todayBeedis,
        tobaccoUsedKg: Number((todayTobaccoGrams / 1000).toFixed(2)),
        tobaccoUsedGrams: todayTobaccoGrams,
        powderUsedKg: Number((todayPowderGrams / 1000).toFixed(2)),
        powderUsedGrams: todayPowderGrams,
        salary: todaySalary,
        rate: todayRate,
        expenses: todayExpenseTotal,
        profit: todayProfit.profit,
        profitMargin: todayProfit.profitMarginPercent,
        productionCount: todayProductions.length,
        expenseCount: todayExpenses.length
      },
      month: {
        cuts: monthCuts,
        beedis: monthBeedis,
        tobaccoUsedKg: Number((monthTobaccoGrams / 1000).toFixed(2)),
        powderUsedKg: Number((monthPowderGrams / 1000).toFixed(2)),
        salary: monthSalary,
        rate: monthRate,
        expenses: monthExpenseTotal,
        profit: monthProfit.profit,
        profitMargin: monthProfit.profitMarginPercent
      },
      stock: stockSummary,
      settings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get(['/dashboard/analytics', '/analytics/dashboard'], async (req, res) => {
  try {
    const period = req.query.period || 'week'; // 'day', 'week', 'month'
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Standard time windows for Day, Week, and Month
    const dayCurStart = new Date(now); dayCurStart.setHours(0, 0, 0, 0);
    const dayCurEnd = new Date(now); dayCurEnd.setHours(23, 59, 59, 999);
    const dayPrevStart = new Date(now); dayPrevStart.setDate(now.getDate() - 1); dayPrevStart.setHours(0, 0, 0, 0);
    const dayPrevEnd = new Date(now); dayPrevEnd.setDate(now.getDate() - 1); dayPrevEnd.setHours(23, 59, 59, 999);

    const weekCurStart = new Date(now); weekCurStart.setDate(now.getDate() - 6); weekCurStart.setHours(0, 0, 0, 0);
    const weekCurEnd = new Date(now); weekCurEnd.setHours(23, 59, 59, 999);
    const weekPrevStart = new Date(now); weekPrevStart.setDate(now.getDate() - 13); weekPrevStart.setHours(0, 0, 0, 0);
    const weekPrevEnd = new Date(now); weekPrevEnd.setDate(now.getDate() - 7); weekPrevEnd.setHours(23, 59, 59, 999);

    const monthCurStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthCurEnd = new Date(now); monthCurEnd.setHours(23, 59, 59, 999);
    const monthPrevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const monthPrevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    if (period === 'day') {
      curStart = dayCurStart; curEnd = dayCurEnd;
      prevStart = dayPrevStart; prevEnd = dayPrevEnd;
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      comparisonLabelTa = 'vs நேற்று (Yesterday)';
      comparisonLabelEn = 'vs Yesterday';
    } else if (period === 'week') {
      curStart = weekCurStart; curEnd = weekCurEnd;
      prevStart = weekPrevStart; prevEnd = weekPrevEnd;
      startDate = new Date(prevStart);
      comparisonLabelTa = 'vs கடந்த வாரம் (Last Week)';
      comparisonLabelEn = 'vs Last Week';
    } else if (period === 'month') {
      curStart = monthCurStart; curEnd = monthCurEnd;
      prevStart = monthPrevStart; prevEnd = monthPrevEnd;
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      comparisonLabelTa = 'vs கடந்த மாதம் (Last Month)';
      comparisonLabelEn = 'vs Last Month';
    }

    function calcGrowth(prev, curr) {
      if (!prev || prev === 0) {
        if (!curr || curr === 0) return 0;
        return 100;
      }
      return Number((((curr - prev) / Math.abs(prev)) * 100).toFixed(1));
    }

    function summarize(prods, exps) {
      const cuts = prods.reduce((s, p) => s + (p.cuts || 0), 0);
      const boxes = prods.reduce((s, p) => s + (p.boxes !== undefined && p.boxes !== null && p.boxes > 0 ? p.boxes : ((p.cuts || 0) / 300)), 0);
      const beedis = prods.reduce((s, p) => s + (p.beedis || 0), 0);
      const tobaccoGrams = prods.reduce((s, p) => s + (p.tobaccoUsedGrams || 0), 0);
      const powderGrams = prods.reduce((s, p) => s + (p.powderUsedGrams || 0), 0);
      const salary = prods.reduce((s, p) => s + (p.salary || 0), 0);
      const rate = prods.reduce((s, p) => s + (p.rate || 0), 0);
      const expensesTotal = exps.reduce((s, e) => s + (e.amount || 0), 0);
      const profitData = calculateProfit(rate, salary, expensesTotal);
      return {
        boxes: Number(boxes.toFixed(1)),
        cuts,
        beedis,
        tobaccoUsedKg: Number((tobaccoGrams / 1000).toFixed(2)),
        powderUsedKg: Number((powderGrams / 1000).toFixed(2)),
        salary,
        rate,
        expenses: expensesTotal,
        profit: profitData.profit,
        profitMargin: profitData.profitMarginPercent,
        productionCount: prods.length,
        expenseCount: exps.length
      };
    }

    function makeComparison(curProds, curExps, prevProds, prevExps, labelTa, labelEn, pKey) {
      const current = summarize(curProds, curExps);
      const previous = summarize(prevProds, prevExps);
      return {
        period: pKey,
        labelTa,
        labelEn,
        current,
        previous,
        growth: {
          boxes: calcGrowth(previous.boxes, current.boxes),
          boxesDelta: Number((current.boxes - previous.boxes).toFixed(1)),
          deltaBoxes: Number((current.boxes - previous.boxes).toFixed(1)),
          cuts: calcGrowth(previous.cuts, current.cuts),
          cutsDelta: current.cuts - previous.cuts,
          deltaCuts: current.cuts - previous.cuts,
          beedis: calcGrowth(previous.beedis, current.beedis),
          beedisDelta: current.beedis - previous.beedis,
          deltaBeedis: current.beedis - previous.beedis,
          tobaccoDelta: Number((current.tobaccoUsedKg - previous.tobaccoUsedKg).toFixed(2)),
          deltaTobacco: Number((current.tobaccoUsedKg - previous.tobaccoUsedKg).toFixed(2)),
          powderDelta: Number((current.powderUsedKg - previous.powderUsedKg).toFixed(2)),
          deltaPowder: Number((current.powderUsedKg - previous.powderUsedKg).toFixed(2)),
          rate: calcGrowth(previous.rate, current.rate),
          rateDelta: current.rate - previous.rate,
          deltaRate: current.rate - previous.rate,
          salary: calcGrowth(previous.salary, current.salary),
          salaryDelta: current.salary - previous.salary,
          deltaSalary: current.salary - previous.salary,
          expenses: calcGrowth(previous.expenses, current.expenses),
          expensesDelta: current.expenses - previous.expenses,
          deltaExpenses: current.expenses - previous.expenses,
          profit: calcGrowth(previous.profit, current.profit),
          profitDelta: current.profit - previous.profit,
          deltaProfit: current.profit - previous.profit
        }
      };
    }

    const minFetchDate = new Date(Math.min(startDate.getTime(), prevStart.getTime(), weekPrevStart.getTime(), monthPrevStart.getTime()));
    const [allProductions, allExpenses, stockSummary, settings] = await Promise.all([
      Production.find({ date: { $gte: minFetchDate, $lte: endDate } }).sort({ date: 1 }),
      Expense.find({ date: { $gte: minFetchDate, $lte: endDate } }).sort({ date: 1 }),
      getStockSummary(),
      Settings.getSettings()
    ]);

    // Active period current & previous
    const curProds = allProductions.filter(p => new Date(p.date) >= curStart && new Date(p.date) <= curEnd);
    const curExps = allExpenses.filter(e => new Date(e.date) >= curStart && new Date(e.date) <= curEnd);
    const prevProds = allProductions.filter(p => new Date(p.date) >= prevStart && new Date(p.date) <= prevEnd);
    const prevExps = allExpenses.filter(e => new Date(e.date) >= prevStart && new Date(e.date) <= prevEnd);

    const currentTotals = summarize(curProds, curExps);
    const previousTotals = summarize(prevProds, prevExps);
    const comparison = makeComparison(curProds, curExps, prevProds, prevExps, comparisonLabelTa, comparisonLabelEn, period);

    // Also compute standalone day, week, and month comparisons for persistent dashboard overviews
    const dayCurP = allProductions.filter(p => new Date(p.date) >= dayCurStart && new Date(p.date) <= dayCurEnd);
    const dayCurE = allExpenses.filter(e => new Date(e.date) >= dayCurStart && new Date(e.date) <= dayCurEnd);
    const dayPrevP = allProductions.filter(p => new Date(p.date) >= dayPrevStart && new Date(p.date) <= dayPrevEnd);
    const dayPrevE = allExpenses.filter(e => new Date(e.date) >= dayPrevStart && new Date(e.date) <= dayPrevEnd);
    const dayComparison = makeComparison(dayCurP, dayCurE, dayPrevP, dayPrevE, 'vs நேற்று (Yesterday)', 'vs Yesterday', 'day');

    const weekCurP = allProductions.filter(p => new Date(p.date) >= weekCurStart && new Date(p.date) <= weekCurEnd);
    const weekCurE = allExpenses.filter(e => new Date(e.date) >= weekCurStart && new Date(e.date) <= weekCurEnd);
    const weekPrevP = allProductions.filter(p => new Date(p.date) >= weekPrevStart && new Date(p.date) <= weekPrevEnd);
    const weekPrevE = allExpenses.filter(e => new Date(e.date) >= weekPrevStart && new Date(e.date) <= weekPrevEnd);
    const weekComparison = makeComparison(weekCurP, weekCurE, weekPrevP, weekPrevE, 'vs கடந்த வாரம் (Last Week)', 'vs Last Week', 'week');

    const monthCurP = allProductions.filter(p => new Date(p.date) >= monthCurStart && new Date(p.date) <= monthCurEnd);
    const monthCurE = allExpenses.filter(e => new Date(e.date) >= monthCurStart && new Date(e.date) <= monthCurEnd);
    const monthPrevP = allProductions.filter(p => new Date(p.date) >= monthPrevStart && new Date(p.date) <= monthPrevEnd);
    const monthPrevE = allExpenses.filter(e => new Date(e.date) >= monthPrevStart && new Date(e.date) <= monthPrevEnd);
    const monthComparison = makeComparison(monthCurP, monthCurE, monthPrevP, monthPrevE, 'vs கடந்த மாதம் (Last Month)', 'vs Last Month', 'month');

    // Build day-by-day buckets for active timeSeries
    const dayMap = {};
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const key = curr.toISOString().split('T')[0];
      dayMap[key] = {
        date: key,
        displayDate: curr.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        boxes: 0,
        cuts: 0,
        beedis: 0,
        tobaccoGrams: 0,
        powderGrams: 0,
        salary: 0,
        rate: 0,
        expenses: 0,
        profit: 0
      };
      curr.setDate(curr.getDate() + 1);
    }

    allProductions.forEach(p => {
      const key = new Date(p.date).toISOString().split('T')[0];
      if (dayMap[key]) {
        dayMap[key].boxes += (p.boxes !== undefined && p.boxes !== null && p.boxes > 0 ? p.boxes : ((p.cuts || 0) / 300));
        dayMap[key].cuts += (p.cuts || 0);
        dayMap[key].beedis += (p.beedis || 0);
        dayMap[key].tobaccoGrams += (p.tobaccoUsedGrams || 0);
        dayMap[key].powderGrams += (p.powderUsedGrams || 0);
        dayMap[key].salary += (p.salary || 0);
        dayMap[key].rate += (p.rate || 0);
      }
    });

    allExpenses.forEach(e => {
      const key = new Date(e.date).toISOString().split('T')[0];
      if (dayMap[key]) {
        dayMap[key].expenses += (e.amount || 0);
      }
    });

    const timeSeries = Object.values(dayMap).map(d => {
      const profitCalc = calculateProfit(d.rate, d.salary, d.expenses);
      return {
        ...d,
        boxes: Number((d.boxes || 0).toFixed(1)),
        tobaccoKg: Number((d.tobaccoGrams / 1000).toFixed(2)),
        powderKg: Number((d.powderGrams / 1000).toFixed(2)),
        profit: profitCalc.profit,
        profitMargin: profitCalc.profitMarginPercent
      };
    });

    // Weekly comparative overlay (Day 1 to 7: This Week vs Last Week)
    const weeklyComparison = [];
    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const dCurrent = new Date(now);
        dCurrent.setDate(now.getDate() - i);
        const curKey = dCurrent.toISOString().split('T')[0];

        const dPrev = new Date(now);
        dPrev.setDate(now.getDate() - i - 7);
        const prevKey = dPrev.toISOString().split('T')[0];

        const curBucket = dayMap[curKey] || { boxes: 0, cuts: 0, beedis: 0, profit: 0, rate: 0 };
        const prevBucket = dayMap[prevKey] || { boxes: 0, cuts: 0, beedis: 0, profit: 0, rate: 0 };

        weeklyComparison.push({
          dayName: dCurrent.toLocaleDateString('en-GB', { weekday: 'short' }),
          curDate: curKey,
          prevDate: prevKey,
          curBoxes: Number((curBucket.boxes || (curBucket.cuts / 300)).toFixed(1)),
          prevBoxes: Number((prevBucket.boxes || (prevBucket.cuts / 300)).toFixed(1)),
          curCuts: curBucket.cuts,
          prevCuts: prevBucket.cuts,
          curBeedis: curBucket.beedis,
          prevBeedis: prevBucket.beedis,
          curProfit: curBucket.profit,
          prevProfit: prevBucket.profit
        });
      }
    }

    // 6-Month historical profit summary for month view
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
    const [histProductions, histExpenses] = await Promise.all([
      Production.find({ date: { $gte: sixMonthsAgo } }),
      Expense.find({ date: { $gte: sixMonthsAgo } })
    ]);

    const monthBuckets = {};
    for (let i = 5; i >= 0; i--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = mDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      monthBuckets[mKey] = { key: mKey, label: mLabel, boxes: 0, beedis: 0, cuts: 0, rate: 0, salary: 0, expenses: 0, profit: 0 };
    }

    histProductions.forEach(p => {
      const d = new Date(p.date);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthBuckets[mKey]) {
        monthBuckets[mKey].boxes += (p.boxes !== undefined && p.boxes !== null && p.boxes > 0 ? p.boxes : ((p.cuts || 0) / 300));
        monthBuckets[mKey].beedis += (p.beedis || 0);
        monthBuckets[mKey].cuts += (p.cuts || 0);
        monthBuckets[mKey].rate += (p.rate || 0);
        monthBuckets[mKey].salary += (p.salary || 0);
      }
    });

    histExpenses.forEach(e => {
      const d = new Date(e.date);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthBuckets[mKey]) {
        monthBuckets[mKey].expenses += (e.amount || 0);
      }
    });

    const monthlyHistory = Object.values(monthBuckets).map(m => {
      const pCalc = calculateProfit(m.rate, m.salary, m.expenses);
      return { ...m, profit: pCalc.profit, profitMargin: pCalc.profitMarginPercent };
    });

    res.json({
      period,
      totals: currentTotals,
      comparison,
      dayComparison,
      weekComparison,
      monthComparison,
      timeSeries,
      weeklyComparison,
      monthlyHistory,
      stock: stockSummary,
      recentRecords: curProds.slice(-10).reverse()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dedicated Historical Analytics for Production, Export, and Profit Bar Charts
router.get('/analytics/history', async (req, res) => {
  try {
    const granularity = (req.query.granularity || req.query.view || req.query.period || 'day').toLowerCase();
    const now = new Date();

    let startDate, endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (granularity === 'day') {
      const days = parseInt(req.query.limit, 10) || 14;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);
    } else if (granularity === 'week') {
      const weeks = parseInt(req.query.limit, 10) || 8;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - (weeks * 7));
      startDate.setHours(0, 0, 0, 0);
    } else if (granularity === 'month') {
      const months = parseInt(req.query.limit, 10) || 6;
      startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1, 0, 0, 0, 0);
    } else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 13);
      startDate.setHours(0, 0, 0, 0);
    }

    const [productions, exportsList, expenses] = await Promise.all([
      Production.find({ date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }),
      Export.find({ date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }),
      Expense.find({ date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 })
    ]);

    const buckets = {};

    if (granularity === 'day') {
      const cur = new Date(startDate);
      while (cur <= endDate) {
        const key = getCalendarDateKey(cur);
        const label = cur.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        buckets[key] = {
          key,
          label,
          prodBoxes: 0,
          prodCuts: 0,
          prodBeedis: 0,
          prodRate: 0,
          prodSalary: 0,
          prodProfit: 0,
          exportBoxes: 0,
          exportCuts: 0,
          exportBeedis: 0,
          exportRate: 0,
          exportSalary: 0,
          exportMargin: 0,
          expenses: 0,
          netProfit: 0
        };
        cur.setDate(cur.getDate() + 1);
      }
    } else if (granularity === 'week') {
      const cur = new Date(startDate);
      const day = cur.getDay();
      const diff = cur.getDate() - day + (day === 0 ? -6 : 1);
      cur.setDate(diff);

      while (cur <= endDate) {
        const endWeek = new Date(cur);
        endWeek.setDate(cur.getDate() + 6);
        endWeek.setHours(23, 59, 59, 999);

        const key = cur.toISOString().split('T')[0];
        const weekNumber = Math.ceil(cur.getDate() / 7);
        const monthLabel = cur.toLocaleDateString('en-GB', { month: 'short' });
        const label = `Week ${weekNumber} ${monthLabel}`;
        buckets[key] = {
          key,
          label,
          start: new Date(cur),
          end: new Date(endWeek),
          prodBoxes: 0,
          prodCuts: 0,
          prodBeedis: 0,
          prodRate: 0,
          prodSalary: 0,
          prodProfit: 0,
          exportBoxes: 0,
          exportCuts: 0,
          exportBeedis: 0,
          exportRate: 0,
          exportSalary: 0,
          exportMargin: 0,
          expenses: 0,
          netProfit: 0
        };
        cur.setDate(cur.getDate() + 7);
      }
    } else if (granularity === 'month') {
      const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const endM = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      while (cur <= endM) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const label = cur.toLocaleDateString('en-GB', { month: 'short' });
        buckets[key] = {
          key,
          label,
          prodBoxes: 0,
          prodCuts: 0,
          prodBeedis: 0,
          prodRate: 0,
          prodSalary: 0,
          prodProfit: 0,
          exportBoxes: 0,
          exportCuts: 0,
          exportBeedis: 0,
          exportRate: 0,
          exportSalary: 0,
          exportMargin: 0,
          expenses: 0,
          netProfit: 0
        };
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    function getBucketKey(d) {
      const date = new Date(d);
      if (granularity === 'day') {
        return getCalendarDateKey(d);
      } else if (granularity === 'month') {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (granularity === 'week') {
        for (const [k, b] of Object.entries(buckets)) {
          if (b.start && b.end && date >= b.start && date <= b.end) {
            return k;
          }
        }
      }
      return null;
    }

    productions.forEach(p => {
      const k = getBucketKey(p.date);
      if (k && buckets[k]) {
        const boxes = (p.boxes !== undefined && p.boxes !== null && p.boxes > 0) ? p.boxes : ((p.cuts || 0) / 300);
        buckets[k].prodBoxes += boxes;
        buckets[k].prodCuts += (p.cuts || 0);
        buckets[k].prodBeedis += (p.beedis || 0);
        buckets[k].prodRate += (p.rate || 0);
        buckets[k].prodSalary += (p.salary || 0);
      }
    });

    exportsList.forEach(e => {
      const k = getBucketKey(e.date);
      if (k && buckets[k]) {
        const boxes = (e.boxes !== undefined && e.boxes !== null && e.boxes > 0) ? e.boxes : ((e.cuts || 0) / 300);
        buckets[k].exportBoxes += boxes;
        buckets[k].exportCuts += (e.cuts || 0);
        buckets[k].exportBeedis += (e.beedis || 0);
        buckets[k].exportRate += (e.rate || 0);
        buckets[k].exportSalary += (e.salary || 0);
        buckets[k].exportMargin += (e.margin !== undefined ? e.margin : ((e.rate || 0) - (e.salary || 0)));
      }
    });

    expenses.forEach(e => {
      const k = getBucketKey(e.date);
      if (k && buckets[k]) {
        buckets[k].expenses += (e.amount || 0);
      }
    });

    const series = Object.values(buckets).map(b => {
      const prodProfit = b.prodRate - b.prodSalary;
      const netProfit = prodProfit - b.expenses;
      return {
        key: b.key,
        label: b.label,
        prodBoxes: Number(b.prodBoxes.toFixed(1)),
        prodCuts: b.prodCuts,
        prodBeedis: b.prodBeedis,
        prodRate: b.prodRate,
        prodSalary: b.prodSalary,
        prodProfit,
        exportBoxes: Number(b.exportBoxes.toFixed(1)),
        exportCuts: b.exportCuts,
        exportBeedis: b.exportBeedis,
        exportRate: b.exportRate,
        exportSalary: b.exportSalary,
        exportMargin: b.exportMargin,
        expenses: b.expenses,
        netProfit
      };
    });

    res.json({
      granularity,
      series
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. PRODUCTION
// ==========================================
router.get('/production', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const limit = req.query.limit ? Number(req.query.limit) : ((req.query.from || req.query.to) ? 2000 : 100);
    const productions = await Production.find(filter).sort({ date: -1, createdAt: -1 }).limit(limit);
    res.json(productions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if a production entry already exists for a date
router.get('/production/check-date', async (req, res) => {
  try {
    const { date, excludeId } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    const bounds = getDayBounds(date);
    const existing = await findProductionByDate(date, excludeId);
    if (existing) {
      return res.json({
        exists: true,
        date: bounds.dateStr,
        record: existing
      });
    }
    return res.json({
      exists: false,
      date: bounds.dateStr,
      record: null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Preview calculation without saving
router.get('/production/preview', async (req, res) => {
  try {
    const boxes = (req.query.boxes !== undefined && req.query.boxes !== '') ? Number(req.query.boxes) : null;
    const cuts = (req.query.cuts !== undefined && req.query.cuts !== '') ? Number(req.query.cuts) : null;
    const settings = await Settings.getSettings();
    const metrics = calculateProductionMetrics({ boxes, cuts }, settings);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/production', async (req, res) => {
  try {
    const { boxes, cuts, date, wastageGrams, notes } = req.body;
    const settings = await Settings.getSettings();

    let boxesNum = (boxes !== undefined && boxes !== null && boxes !== '') ? Number(boxes) : null;
    let cutsNum = (cuts !== undefined && cuts !== null && cuts !== '') ? Number(cuts) : null;

    if (boxesNum === null && cutsNum === null) {
      return res.status(400).json({ error: 'Number of boxes or cuts must be greater than 0' });
    }

    const metrics = calculateProductionMetrics({ boxes: boxesNum, cuts: cutsNum }, settings);

    if (metrics.beedis <= 0) {
      return res.status(400).json({ error: 'Production quantity must be greater than 0' });
    }

    // Strict duplicate date check
    const bounds = getDayBounds(date);
    const existingRecord = await findProductionByDate(date);
    if (existingRecord) {
      return res.status(409).json({
        error: `Production entry already exists for ${bounds.dateStr}. Duplicate entry on the same date is strictly disallowed.`,
        errorTa: `${bounds.dateStr} தேதியில் ஏற்கனவே உற்பத்தி பதிவு உள்ளது. ஒரே தேதியில் நகல் பதிவு அனுமதிக்கப்படாது. ஏற்கனவே உள்ள பதிவைத் திருத்தவும்.`,
        duplicate: true,
        existingRecord
      });
    }

    const wastage = Number(wastageGrams) || 0;
    const entryDate = bounds.targetDate || (date ? new Date(date) : new Date());

    const production = await Production.create({
      date: entryDate,
      boxes: metrics.boxes,
      cuts: metrics.cuts,
      beedis: metrics.beedis,
      tobaccoUsedGrams: metrics.tobaccoUsedGrams,
      powderUsedGrams: metrics.powderUsedGrams,
      wastageGrams: wastage,
      salary: metrics.salary,
      rate: metrics.rate,
      notes: notes || ''
    });

    // Record consumed stock for reporting (no wastage addition)
    await recordStockUsage(
      metrics.tobaccoUsedGrams,
      metrics.powderUsedGrams,
      production._id,
      notes || `Production: ${metrics.boxes} boxes / கட்டை (${metrics.cuts} cuts, ${metrics.beedis} beedis)`
    );

    res.status(201).json(production);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update existing production entry with stock delta adjustment & collision prevention
router.put('/production/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { boxes, cuts, date, wastageGrams, notes } = req.body;
    const settings = await Settings.getSettings();

    const production = await Production.findById(id);
    if (!production) {
      return res.status(404).json({ error: 'Production record not found' });
    }

    let boxesNum = (boxes !== undefined && boxes !== null && boxes !== '') ? Number(boxes) : null;
    let cutsNum = (cuts !== undefined && cuts !== null && cuts !== '') ? Number(cuts) : null;

    if (boxesNum === null && cutsNum === null) {
      return res.status(400).json({ error: 'Number of boxes or cuts must be greater than 0' });
    }

    const metrics = calculateProductionMetrics({ boxes: boxesNum, cuts: cutsNum }, settings);
    if (metrics.beedis <= 0) {
      return res.status(400).json({ error: 'Production quantity must be greater than 0' });
    }

    // Check if target date collides with another existing record
    const targetDateInput = date || production.date;
    const bounds = getDayBounds(targetDateInput);
    const dateConflict = await findProductionByDate(targetDateInput, id);
    if (dateConflict) {
      return res.status(409).json({
        error: `Another production entry already exists for ${bounds.dateStr}. Duplicate entries on the same date are disallowed.`,
        errorTa: `${bounds.dateStr} தேதியில் ஏற்கனவே வேறொரு உற்பத்தி பதிவு உள்ளது. ஒரே தேதியில் நகல் பதிவு அனுமதிக்கப்படாது.`,
        duplicate: true,
        existingRecord: dateConflict
      });
    }

    // Keep production edits independent from physical stock balances.
    const oldTobaccoGrams = production.tobaccoUsedGrams || 0;
    const newTobaccoGrams = metrics.tobaccoUsedGrams;
    const deltaTobacco = newTobaccoGrams - oldTobaccoGrams;

    const oldPowderGrams = production.powderUsedGrams || 0;
    const newPowderGrams = metrics.powderUsedGrams;
    const deltaPowder = newPowderGrams - oldPowderGrams;

    if (deltaTobacco !== 0) {
      const tobaccoStock = await Stock.getStock('tobacco');
      await StockMovement.create({
        item: 'tobacco',
        type: 'adjustment',
        quantityGrams: -deltaTobacco,
        balanceAfterGrams: tobaccoStock.quantityGrams,
        referenceId: id,
        notes: `Production #${id} updated: ${deltaTobacco > 0 ? 'additional ' + deltaTobacco + 'g consumed' : Math.abs(deltaTobacco) + 'g restored to stock'}`
      });
    }

    if (deltaPowder !== 0) {
      const powderStock = await Stock.getStock('powder');
      await StockMovement.create({
        item: 'powder',
        type: 'adjustment',
        quantityGrams: -deltaPowder,
        balanceAfterGrams: powderStock.quantityGrams,
        referenceId: id,
        notes: `Production #${id} updated: ${deltaPowder > 0 ? 'additional ' + deltaPowder + 'g consumed' : Math.abs(deltaPowder) + 'g restored to stock'}`
      });
    }

    // Update document
    production.date = bounds.targetDate || (date ? new Date(date) : production.date);
    production.boxes = metrics.boxes;
    production.cuts = metrics.cuts;
    production.beedis = metrics.beedis;
    production.tobaccoUsedGrams = metrics.tobaccoUsedGrams;
    production.powderUsedGrams = metrics.powderUsedGrams;
    if (wastageGrams !== undefined) production.wastageGrams = Number(wastageGrams) || 0;
    production.salary = metrics.salary;
    production.rate = metrics.rate;
    if (notes !== undefined) production.notes = notes;

    await production.save();

    res.json(production);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/production/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const production = await Production.findById(id);
    if (!production) {
      return res.status(404).json({ error: 'Production record not found' });
    }

    // Record the reversal for audit purposes without changing physical stock.
    const tobaccoStock = await Stock.getStock('tobacco');
    const powderStock = await Stock.getStock('powder');

    await StockMovement.create({
      item: 'tobacco',
      type: 'adjustment',
      quantityGrams: production.tobaccoUsedGrams || 0,
      balanceAfterGrams: tobaccoStock.quantityGrams,
      referenceId: id,
      notes: `Restored from deleted production #${id}`
    });

    await StockMovement.create({
      item: 'powder',
      type: 'adjustment',
      quantityGrams: production.powderUsedGrams,
      balanceAfterGrams: powderStock.quantityGrams,
      referenceId: id,
      notes: `Restored from deleted production #${id}`
    });

    await Production.findByIdAndDelete(id);
    res.json({ message: 'Production deleted; stock balance unchanged' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. STOCK
// ==========================================
router.get('/stock', async (req, res) => {
  try {
    const summary = await getStockSummary();
    const movements = await getRecentMovements(30);
    const settings = await Settings.getSettings();

    // Bag calculation breakdown
    const bagCalc = calculateBags(summary.tobacco.kg, settings.avgWastageKg, settings.bagSizeGrams, settings);

    res.json({
      ...summary,
      bagCalculation: bagCalc,
      movements
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock Report with date filtering and incoming-only materials filter (for TVS minimal PDF generation)
router.get('/stock/report', async (req, res) => {
  try {
    const { from, to, month, item, material } = req.query; // YYYY-MM-DD or YYYY-MM
    const report = await getIncomingStockReport({
      from,
      to,
      month,
      item: item || material || 'all'
    });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/stock/add', async (req, res) => {
  try {
    const { item, quantityKg, notes, date } = req.body;
    const kg = Number(quantityKg);
    if (!['tobacco', 'powder'].includes(item) || !kg || kg <= 0) {
      return res.status(400).json({ error: 'Invalid item or quantity' });
    }

    const result = await addStock(item, kg, notes ? notes.trim() : '', date || null);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/stock/adjust', async (req, res) => {
  try {
    const { item, newQuantityKg, notes } = req.body;
    const kg = Number(newQuantityKg);
    if (!['tobacco', 'powder'].includes(item) || kg < 0 || isNaN(kg)) {
      return res.status(400).json({ error: 'Invalid item or quantity' });
    }

    const result = await adjustStock(item, kg, notes);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/stock/movement/:id', async (req, res) => {
  try {
    const { quantityKg, notes, date } = req.body;
    const result = await editStockMovement(req.params.id, { quantityKg, notes: notes !== undefined ? notes.trim() : undefined, date });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/stock/movement/:id', async (req, res) => {
  try {
    const result = await deleteStockMovement(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. EXPENSES
// ==========================================
router.get('/expenses', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }

    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 }).limit(100);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const { date, category, amount, paymentMethod, description, notes } = req.body;
    const amountNum = Number(amount);

    if (!category || !amountNum || amountNum <= 0) {
      return res.status(400).json({ error: 'Valid category and amount required' });
    }

    const expense = await Expense.create({
      date: date ? new Date(date) : new Date(),
      category: category.trim(),
      amount: amountNum,
      paymentMethod: paymentMethod || 'Cash',
      description: description || '',
      notes: notes || ''
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Expense.findByIdAndDelete(id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate available packed stock in hand (all-time produced boxes minus all-time exported boxes)
async function getPackedStockInHand(excludeExportId = null) {
  const [productions, exports] = await Promise.all([
    Production.find({}, { boxes: 1, cuts: 1 }),
    Export.find(excludeExportId ? { _id: { $ne: excludeExportId } } : {}, { boxes: 1, cuts: 1 })
  ]);

  const totalProduced = productions.reduce((sum, p) => sum + (p.boxes !== undefined && p.boxes !== null && p.boxes > 0 ? p.boxes : ((p.cuts || 0) / 300)), 0);
  const totalExported = exports.reduce((sum, p) => sum + (p.boxes !== undefined && p.boxes !== null && p.boxes > 0 ? p.boxes : ((p.cuts || 0) / 300)), 0);

  const available = Math.max(0, Number((totalProduced - totalExported).toFixed(1)));
  return {
    totalProduced: Number(totalProduced.toFixed(1)),
    totalExported: Number(totalExported.toFixed(1)),
    available
  };
}

// ==========================================
// 5. EXPORT & DISPATCH (கம்பெனி ஏற்றுமதி)
// ==========================================
router.get('/export', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [exports, stockData, settings] = await Promise.all([
      Export.find(filter).sort({ date: -1, createdAt: -1 }),
      getPackedStockInHand(),
      Settings.getSettings()
    ]);

    const totalCuts = exports.reduce((sum, p) => sum + (p.cuts || 0), 0);
    const totalBoxes = exports.reduce((sum, p) => sum + (p.boxes !== undefined && p.boxes !== null && p.boxes > 0 ? p.boxes : ((p.cuts || 0) / 300)), 0);
    const totalBeedis = exports.reduce((sum, p) => sum + (p.beedis || 0), 0);
    const totalSalary = exports.reduce((sum, p) => sum + (p.salary || 0), 0);
    const totalRate = exports.reduce((sum, p) => sum + (p.rate || 0), 0);
    const totalProfit = totalRate - totalSalary;

    // Today's exported boxes
    const todayBounds = getDayBounds(new Date());
    const todayExports = exports.filter(p => {
      const dStr = new Date(p.date).toISOString().split('T')[0];
      return dStr === todayBounds.dateStr;
    });
    const todayBoxes = todayExports.reduce((sum, p) => sum + (p.boxes || (p.cuts / 300)), 0);

    const packedStockInHand = stockData.available;
    const totalProducedBoxes = stockData.totalProduced;

    res.json({
      totals: {
        boxes: Number(totalBoxes.toFixed(1)),
        cuts: totalCuts,
        beedis: totalBeedis,
        salary: totalSalary,
        rate: totalRate,
        profit: totalProfit,
        todayBoxes: Number(todayBoxes.toFixed(1)),
        totalProducedBoxes: Number(totalProducedBoxes.toFixed(1)),
        packedStockInHand
      },
      exports,
      settings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if an export entry already exists on a given date
router.get('/export/check-date', async (req, res) => {
  try {
    const { date, excludeId } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    const bounds = getDayBounds(date);
    const existing = await findExportByDate(date, excludeId);
    if (existing) {
      return res.json({
        exists: true,
        date: bounds.dateStr,
        record: existing
      });
    }
    return res.json({
      exists: false,
      date: bounds.dateStr,
      record: null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record new company export dispatch
router.post('/export', async (req, res) => {
  try {
    const { boxes, cuts, date, companyName, vehicleNo, challanNo, notes } = req.body;
    const settings = await Settings.getSettings();

    let boxesNum = (boxes !== undefined && boxes !== null && boxes !== '') ? Number(boxes) : null;
    let cutsNum = (cuts !== undefined && cuts !== null && cuts !== '') ? Number(cuts) : null;

    if (boxesNum === null && cutsNum === null) {
      return res.status(400).json({ error: 'Number of boxes or cuts must be greater than 0' });
    }

    const metrics = calculateProductionMetrics({ boxes: boxesNum, cuts: cutsNum }, settings);
    if (metrics.beedis <= 0) {
      return res.status(400).json({ error: 'Export quantity must be greater than 0' });
    }

    // Strictly enforce: Exported boxes must be <= packed stock in hand
    const stock = await getPackedStockInHand();
    if (metrics.boxes > stock.available) {
      return res.status(400).json({
        error: `Export quantity (${metrics.boxes} Boxes) cannot exceed packed stock in hand (${stock.available} Boxes available).`,
        errorTa: `ஏற்றுமதி கட்டை எண்ணிக்கை (${metrics.boxes} கட்டை) கையிருப்பு பேக்கிங் கட்டை அளவை (${stock.available} கட்டை) விட அதிகமாக இருக்கக்கூடாது. கையிருப்பில் உள்ள அளவு அல்லது அதற்குக் குறைவாக மட்டுமே ஏற்றுமதி செய்ய முடியும்.`,
        insufficientStock: true,
        availableBoxes: stock.available,
        requestedBoxes: metrics.boxes
      });
    }

    // Strict duplicate check per date
    const bounds = getDayBounds(date);
    const existingRecord = await findExportByDate(date);
    if (existingRecord) {
      return res.status(409).json({
        error: `Export dispatch entry already exists for ${bounds.dateStr}. Duplicate entry on the same date is strictly disallowed.`,
        errorTa: `${bounds.dateStr} தேதியில் ஏற்கனவே ஏற்றுமதி பதிவு உள்ளது. ஒரே தேதியில் நகல் பதிவு அனுமதிக்கப்படாது. ஏற்கனவே உள்ள பதிவைத் திருத்தவும்.`,
        duplicate: true,
        existingRecord
      });
    }

    const entryDate = bounds.targetDate || (date ? new Date(date) : new Date());

    const exportRecord = await Export.create({
      date: entryDate,
      boxes: metrics.boxes,
      cuts: metrics.cuts,
      beedis: metrics.beedis,
      salary: metrics.salary,
      rate: metrics.rate,
      margin: metrics.rate - metrics.salary,
      companyName: companyName || 'TVS Beedi Company',
      vehicleNo: vehicleNo || '',
      challanNo: challanNo || '',
      notes: notes || ''
    });

    res.status(201).json(exportRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update existing export dispatch
router.put('/export/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { boxes, cuts, date, companyName, vehicleNo, challanNo, notes } = req.body;
    const settings = await Settings.getSettings();

    const exportRecord = await Export.findById(id);
    if (!exportRecord) {
      return res.status(404).json({ error: 'Export dispatch record not found' });
    }

    let boxesNum = (boxes !== undefined && boxes !== null && boxes !== '') ? Number(boxes) : null;
    let cutsNum = (cuts !== undefined && cuts !== null && cuts !== '') ? Number(cuts) : null;

    if (boxesNum === null && cutsNum === null) {
      return res.status(400).json({ error: 'Number of boxes or cuts must be greater than 0' });
    }

    const metrics = calculateProductionMetrics({ boxes: boxesNum, cuts: cutsNum }, settings);
    if (metrics.beedis <= 0) {
      return res.status(400).json({ error: 'Export quantity must be greater than 0' });
    }

    // Strictly enforce: Updated exported boxes must be <= available packed stock (excluding this record)
    const stock = await getPackedStockInHand(id);
    if (metrics.boxes > stock.available) {
      return res.status(400).json({
        error: `Export quantity (${metrics.boxes} Boxes) cannot exceed available packed stock (${stock.available} Boxes available).`,
        errorTa: `ஏற்றுமதி கட்டை எண்ணிக்கை (${metrics.boxes} கட்டை) கையிருப்பு பேக்கிங் கட்டை அளவை (${stock.available} கட்டை) விட அதிகமாக இருக்கக்கூடாது. கையிருப்பில் உள்ள அளவு அல்லது அதற்குக் குறைவாக மட்டுமே ஏற்றுமதி செய்ய முடியும்.`,
        insufficientStock: true,
        availableBoxes: stock.available,
        requestedBoxes: metrics.boxes
      });
    }

    const targetDateInput = date || exportRecord.date;
    const bounds = getDayBounds(targetDateInput);
    const dateConflict = await findExportByDate(targetDateInput, id);
    if (dateConflict) {
      return res.status(409).json({
        error: `Another export dispatch already exists for ${bounds.dateStr}. Duplicate entries on the same date are disallowed.`,
        errorTa: `${bounds.dateStr} தேதியில் ஏற்கனவே வேறொரு ஏற்றுமதி பதிவு உள்ளது. ஒரே தேதியில் நகல் பதிவு அனுமதிக்கப்படாது.`,
        duplicate: true,
        existingRecord: dateConflict
      });
    }

    exportRecord.date = bounds.targetDate || (date ? new Date(date) : exportRecord.date);
    exportRecord.boxes = metrics.boxes;
    exportRecord.cuts = metrics.cuts;
    exportRecord.beedis = metrics.beedis;
    exportRecord.salary = metrics.salary;
    exportRecord.rate = metrics.rate;
    exportRecord.margin = metrics.rate - metrics.salary;
    if (companyName !== undefined) exportRecord.companyName = companyName;
    if (vehicleNo !== undefined) exportRecord.vehicleNo = vehicleNo;
    if (challanNo !== undefined) exportRecord.challanNo = challanNo;
    if (notes !== undefined) exportRecord.notes = notes;

    await exportRecord.save();
    res.json(exportRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete export dispatch
router.delete('/export/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const exportRecord = await Export.findById(id);
    if (!exportRecord) {
      return res.status(404).json({ error: 'Export record not found' });
    }
    await Export.findByIdAndDelete(id);
    res.json({ message: 'Export record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CSV Export route for company dispatches
router.get('/export/csv', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const exports = await Export.find(filter).sort({ date: -1 });

    const headers = [
      'தேதி / Date',
      'கட்டை / Boxes',
      'கட்டுகள் / Cuts',
      'பீடிகள் / Beedis',
      'Rate மதிப்பு / Value (₹)',
      'கூலி / Salary (₹)',
      'மார்ஜின் / Margin (₹)',
      'கம்பெனி / Company',
      'குறிப்புகள் / Notes'
    ];

    const rows = exports.map(p => [
      new Date(p.date).toISOString().split('T')[0],
      p.boxes,
      p.cuts,
      p.beedis,
      p.rate,
      p.salary,
      p.margin !== undefined ? p.margin : ((p.rate || 0) - (p.salary || 0)),
      `"${(p.companyName || 'TVS Beedi Company').replace(/"/g, '""')}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tvs_beedi_company_exports.csv"');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backwards compatibility alias for reports
router.get('/reports', async (req, res) => {
  res.redirect(307, '/api/export' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''));
});
router.get('/reports/csv', async (req, res) => {
  res.redirect(307, '/api/export/csv' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''));
});

// ==========================================
// 6. SETTINGS
// ==========================================
router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const allowedFields = [
      'beedisPerBox',
      'cutsPerBox',
      'beedisPerCut',
      'tobaccoPer1000Grams',
      'powderPer1000Grams',
      'salaryPer1000',
      'ratePer1000',
      'avgWastageKg',
      'bagSizeGrams',
      'currency',
      'language',
      'lowStockThresholdKg'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    settings.updatedAt = new Date();
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. CHAT ASSISTANT
// ==========================================
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const sid = sessionId || 'default-session';
    const response = await processChatMessage(message, sid);

    // Save chat history
    await ChatHistory.create({
      sender: 'user',
      text: message,
      language: response.language || 'ta'
    });

    await ChatHistory.create({
      sender: 'assistant',
      text: response.reply,
      language: response.language || 'ta',
      actionPayload: response.actionPayload || null,
      actionStatus: response.actionRequired ? 'pending_confirmation' : 'none'
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat/confirm', async (req, res) => {
  try {
    const { sessionId, confirm } = req.body;
    const sid = sessionId || 'default-session';
    const response = await processChatMessage(confirm ? 'ஆம்' : 'இல்லை', sid);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/chat/history', async (req, res) => {
  try {
    const history = await ChatHistory.find().sort({ createdAt: -1 }).limit(30);
    res.json(history.reverse());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
