/**
 * TVS Beedi Company - Dashboard Specific Logic
 * Period Switching, Number Differences, Comparative Growth, Charts & CSV Export
 */

let currentDashboardPeriod = 'day';
let currentComparisonPeriod = 'day';
let cachedAnalytics = null;
let dashProdChartInstance = null;
let dashExportChartInstance = null;
let dashProfitChartInstance = null;
let dashProdGranularity = 'day';
let dashExportGranularity = 'day';
let dashProfitGranularity = 'day';
let dashboardRequestId = 0;
const dashboardChartHistoryCache = {};

function getCalendarDate(value) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3] || 1));
  }
  return new Date(value);
}

function getWeekBucket(value) {
  const date = getCalendarDate(value);
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function setDashboardPeriod(period) {
  if (period !== 'day' && period !== 'week' && period !== 'month') return;
  currentDashboardPeriod = period;
  currentComparisonPeriod = period;
  updateDashboardPeriodPills();
  updateComparisonFilterButtons();
  loadDashboardAnalytics(period);
}

function setComparisonPeriod(period) {
  if (period !== 'day' && period !== 'week' && period !== 'month') return;
  currentComparisonPeriod = period;
  updateComparisonFilterButtons();
  if (cachedAnalytics) {
    renderPeriodComparisonCard(cachedAnalytics, currentComparisonPeriod);
  }
}

function updateComparisonFilterButtons() {
  const btnDay = document.getElementById('compFilterDay');
  const btnWeek = document.getElementById('compFilterWeek');
  const btnMonth = document.getElementById('compFilterMonth');
  [btnDay, btnWeek, btnMonth].forEach(b => b && b.classList.remove('active'));
  if (currentComparisonPeriod === 'day' && btnDay) btnDay.classList.add('active');
  if (currentComparisonPeriod === 'week' && btnWeek) btnWeek.classList.add('active');
  if (currentComparisonPeriod === 'month' && btnMonth) btnMonth.classList.add('active');
}

function setDashboardLoading(isLoading) {
  const view = document.getElementById('view-dashboard');
  if (!view) return;
  view.classList.toggle('dashboard-loading', isLoading);
  view.setAttribute('aria-busy', String(isLoading));
}

function updateDashboardPeriodPills() {
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const btnDay = document.getElementById('btnPeriodDay');
  const btnWeek = document.getElementById('btnPeriodWeek');
  const btnMonth = document.getElementById('btnPeriodMonth');
  const badgeText = document.getElementById('dashPeriodBadgeText');
  const mainTitle = document.getElementById('dashMainTitle');
  const mainSubtitle = document.getElementById('dashMainSubtitle');

  [btnDay, btnWeek, btnMonth].forEach(b => b && b.classList.remove('active'));

  if (currentDashboardPeriod === 'day') {
    if (btnDay) btnDay.classList.add('active');
    if (badgeText) badgeText.textContent = isEn ? 'Live: Day-wise' : 'நேரடி: இன்று';
    if (mainTitle) mainTitle.textContent = isEn ? "Today's Business Live" : 'இன்றைய நிலவரம்';
    if (mainSubtitle) mainSubtitle.textContent = isEn ? "Live production & financial breakdown for today" : 'இன்றைய நேரடி உற்பத்தி & நிதி விவரங்கள்';
  } else if (currentDashboardPeriod === 'week') {
    if (btnWeek) btnWeek.classList.add('active');
    if (badgeText) badgeText.textContent = isEn ? 'Weekly: 7 Days' : 'வாராந்திர: 7 நாட்கள்';
    if (mainTitle) mainTitle.textContent = isEn ? "Weekly Performance (7 Days)" : 'இந்த வார நிலவரம் (7 நாட்கள்)';
    if (mainSubtitle) mainSubtitle.textContent = isEn ? "Summary across the current 7-day period" : 'இந்த வார உற்பத்தி, Rate, கூலி & லாப நிலவரம்';
  } else if (currentDashboardPeriod === 'month') {
    if (btnMonth) btnMonth.classList.add('active');
    if (badgeText) badgeText.textContent = isEn ? 'Monthly: Current Month' : 'மாதாந்திர: நடப்பு மாதம்';
    if (mainTitle) mainTitle.textContent = isEn ? "Monthly Performance Overview" : 'இந்த மாத நிலவரம்';
    if (mainSubtitle) mainSubtitle.textContent = isEn ? "Comprehensive overview for the entire current month" : 'இந்த மாத முழுமையான உற்பத்தி & நிதி நிலவரம்';
  }
}

async function loadDashboardAnalytics(period = 'day') {
  const requestId = ++dashboardRequestId;
  setDashboardLoading(true);
  try {
    const res = await fetch(`/api/dashboard/analytics?period=${period}`);
    if (!res.ok) throw new Error('Failed to load dashboard data');
    const data = await res.json();
    if (requestId !== dashboardRequestId || period !== currentDashboardPeriod) return;
    cachedAnalytics = data;
    renderDashboardUI(data);
    await renderDashboardCharts(data);
  } catch (err) {
    console.error('Error loading dashboard analytics:', err);
    showToast('Failed to load dashboard data', 'error');
  } finally {
    if (requestId === dashboardRequestId) setDashboardLoading(false);
  }
}

async function loadDashboardChartHistory(granularity) {
  if (!dashboardChartHistoryCache[granularity]) {
    dashboardChartHistoryCache[granularity] = fetch(`/api/analytics/history?granularity=${granularity}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load chart history');
        return res.json();
      })
      .catch(err => {
        console.error(`Error loading ${granularity} chart history:`, err);
        return { series: [] };
      });
  }
  return dashboardChartHistoryCache[granularity];
}

function renderDashboardUI(data) {
  if (!data || !data.totals) return;
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  // 1. Primary Metrics
  const dashTodayBoxes = document.getElementById('dashTodayBoxes');
  if (dashTodayBoxes) {
    dashTodayBoxes.innerHTML = `${formatNumber(data.totals.boxes)} <span class="metric-unit">${isEn ? 'Boxes' : 'கட்டை'}</span>`;
  }
  const dashTodayBoxesSub = document.getElementById('dashTodayBoxesSub');
  if (dashTodayBoxesSub) {
    dashTodayBoxesSub.textContent = `${formatNumber(data.totals.cuts)} ${isEn ? 'Cuts (300/Box)' : 'கட்டுகள் (300/Box)'}`;
  }

  const dashTodayBeedis = document.getElementById('dashTodayBeedis');
  if (dashTodayBeedis) {
    dashTodayBeedis.innerHTML = `${formatNumber(data.totals.beedis)} <span class="metric-unit">Pcs</span>`;
  }

  const dashTodayTobacco = document.getElementById('dashTodayTobacco');
  if (dashTodayTobacco) {
    dashTodayTobacco.innerHTML = `${data.totals.tobaccoUsedKg.toFixed(2)} <span class="metric-unit">kg</span>`;
  }

  const dashTodayPowder = document.getElementById('dashTodayPowder');
  if (dashTodayPowder) {
    dashTodayPowder.innerHTML = `${data.totals.powderUsedKg.toFixed(2)} <span class="metric-unit">kg</span>`;
  }

  const dashTodayRate = document.getElementById('dashTodayRate');
  if (dashTodayRate) dashTodayRate.textContent = formatINR(data.totals.rate);

  const dashTodaySalary = document.getElementById('dashTodaySalary');
  if (dashTodaySalary) dashTodaySalary.textContent = formatINR(data.totals.salary);

  const dashTodayExpenses = document.getElementById('dashTodayExpenses');
  if (dashTodayExpenses) dashTodayExpenses.textContent = formatINR(data.totals.expenses);

  const dashTodayExpCount = document.getElementById('dashTodayExpCount');
  if (dashTodayExpCount) {
    dashTodayExpCount.textContent = `${data.totals.expenseCount || 0} ${isEn ? 'expenses recorded' : 'செலவு பதிவுகள்'}`;
  }

  const dashTodayProfit = document.getElementById('dashTodayProfit');
  if (dashTodayProfit) {
    dashTodayProfit.textContent = formatINR(data.totals.profit);
    dashTodayProfit.style.color = data.totals.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  }

  const dashTodayMargin = document.getElementById('dashTodayMargin');
  if (dashTodayMargin) {
    dashTodayMargin.textContent = `Margin: ${data.totals.netMarginPercent || 0}%`;
  }

  // 2. Profit Transparency Banner
  const dashCalcRate = document.getElementById('dashCalcRate');
  if (dashCalcRate) dashCalcRate.textContent = formatINR(data.totals.rate);
  const dashCalcSalary = document.getElementById('dashCalcSalary');
  if (dashCalcSalary) dashCalcSalary.textContent = formatINR(data.totals.salary);
  const dashCalcExpenses = document.getElementById('dashCalcExpenses');
  if (dashCalcExpenses) dashCalcExpenses.textContent = formatINR(data.totals.expenses);
  const dashCalcProfit = document.getElementById('dashCalcProfit');
  if (dashCalcProfit) {
    dashCalcProfit.textContent = formatINR(data.totals.profit);
    dashCalcProfit.style.color = data.totals.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  }

  // 3. Comparative Growth Formatting in Numbers
  if (data.comparison && data.comparison.growth) {
    const comp = data.comparison;
    const g = comp.growth;
    const periodLabel = isEn ? comp.labelEn : comp.labelTa;

    const setBadge = (elId, deltaVal, type = 'number', unit = '', isInverse = false) => {
      const el = document.getElementById(elId);
      if (!el) return;
      const d = formatDeltaDisplay(deltaVal, type, unit, isInverse);
      el.className = `dash-metric-compare ${d.cls}`;
      el.textContent = d.text;
      el.setAttribute('title', `${d.text} vs ${periodLabel}`);
    };

    const deltaBoxes = g.deltaBoxes !== undefined ? g.deltaBoxes : g.boxesDelta;
    const deltaBeedis = g.deltaBeedis !== undefined ? g.deltaBeedis : g.beedisDelta;
    const deltaTobacco = g.deltaTobacco !== undefined ? g.deltaTobacco : g.tobaccoDelta;
    const deltaPowder = g.deltaPowder !== undefined ? g.deltaPowder : g.powderDelta;
    const deltaRate = g.deltaRate !== undefined ? g.deltaRate : g.rateDelta;
    const deltaSalary = g.deltaSalary !== undefined ? g.deltaSalary : g.salaryDelta;
    const deltaExpenses = g.deltaExpenses !== undefined ? g.deltaExpenses : g.expensesDelta;
    const deltaProfit = g.deltaProfit !== undefined ? g.deltaProfit : g.profitDelta;

    setBadge('compareBadgeBoxes', deltaBoxes, 'number', isEn ? 'Boxes' : 'கட்டை');
    setBadge('compareBadgeBeedis', deltaBeedis, 'number', 'Pcs');
    setBadge('compareBadgeTobacco', deltaTobacco, 'weight', 'kg', true);
    setBadge('compareBadgePowder', deltaPowder, 'weight', 'kg', true);
    setBadge('compareBadgeRate', deltaRate, 'currency');
    setBadge('compareBadgeSalary', deltaSalary, 'currency');
    setBadge('compareBadgeExpenses', deltaExpenses, 'currency', '', true);
    setBadge('compareBadgeProfit', deltaProfit, 'currency');
  }

  // Render Period Comparison & Growth Analytics Card
  updateComparisonFilterButtons();
  renderPeriodComparisonCard(data, currentComparisonPeriod);

  // 4. Stock Summary in Dashboard
  if (data.stock) {
    const elTob = document.getElementById('dashStockTobacco');
    if (elTob) elTob.innerHTML = `${data.stock.tobacco?.kg || 0} <span class="metric-unit">kg</span>`;
    const elTobCon = document.getElementById('dashStockTobaccoConsumed');
    if (elTobCon) elTobCon.textContent = `${isEn ? 'Consumption' : 'பயன்பாடு'}: ${data.totals.tobaccoUsedKg.toFixed(1)} kg`;

    const elPow = document.getElementById('dashStockPowder');
    if (elPow) elPow.innerHTML = `${data.stock.powder?.kg || 0} <span class="metric-unit">kg</span>`;
    const elPowCon = document.getElementById('dashStockPowderConsumed');
    if (elPowCon) elPowCon.textContent = `${isEn ? 'Consumption' : 'பயன்பாடு'}: ${data.totals.powderUsedKg.toFixed(1)} kg`;

    const alertBanner = document.getElementById('dashboardStockAlert');
    if (alertBanner) {
      if (data.stock.tobacco?.isLow || data.stock.powder?.isLow) {
        alertBanner.style.display = 'flex';
      } else {
        alertBanner.style.display = 'none';
      }
    }
  }

  // 5. Weekly & Monthly Dedicated Cards
  const weekData = data.weekComparison;
  if (weekData && weekData.current) {
    const wc = weekData.current;
    const wg = weekData.growth;
    const elWeekCuts = document.getElementById('dashWeekCuts');
    if (elWeekCuts) elWeekCuts.innerHTML = `${formatNumber(wc.boxes)} <span class="metric-unit">${isEn ? 'Boxes' : 'கட்டை'}</span>`;
    const elWeekBeedis = document.getElementById('dashWeekBeedis');
    if (elWeekBeedis) elWeekBeedis.textContent = `${formatNumber(wc.beedis)} Pcs (${formatNumber(wc.cuts)} Cuts)`;

    const elWeekRate = document.getElementById('dashWeekRate');
    if (elWeekRate) elWeekRate.textContent = formatINR(wc.rate);
    const elWeekSalary = document.getElementById('dashWeekSalary');
    if (elWeekSalary) elWeekSalary.textContent = formatINR(wc.salary);
    const elWeekExpenses = document.getElementById('dashWeekExpenses');
    if (elWeekExpenses) elWeekExpenses.textContent = formatINR(wc.expenses);
    const elWeekProfit = document.getElementById('dashWeekProfit');
    if (elWeekProfit) {
      elWeekProfit.textContent = formatINR(wc.profit);
      elWeekProfit.style.color = wc.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }

    const setOverviewBadge = (id, delta, type = 'number', unit = '', inv = false) => {
      const el = document.getElementById(id);
      if (!el) return;
      const d = formatDeltaDisplay(delta, type, unit, inv);
      el.className = `dash-metric-compare ${d.cls}`;
      el.textContent = d.text;
    };

    setOverviewBadge('dashWeekCutsGrowth', wg.deltaBoxes, 'number', isEn ? 'Boxes' : 'கட்டை');
    setOverviewBadge('dashWeekProfitGrowth', wg.deltaProfit, 'currency');
  }

  const monthData = data.monthComparison;
  if (monthData && monthData.current) {
    const mc = monthData.current;
    const mg = monthData.growth;
    const elMonthCuts = document.getElementById('dashMonthCuts');
    if (elMonthCuts) elMonthCuts.innerHTML = `${formatNumber(mc.boxes)} <span class="metric-unit">${isEn ? 'Boxes' : 'கட்டை'}</span>`;
    const elMonthBeedis = document.getElementById('dashMonthBeedis');
    if (elMonthBeedis) elMonthBeedis.textContent = `${formatNumber(mc.beedis)} Pcs (${formatNumber(mc.cuts)} Cuts)`;

    const elMonthRate = document.getElementById('dashMonthRate');
    if (elMonthRate) elMonthRate.textContent = formatINR(mc.rate);
    const elMonthSalary = document.getElementById('dashMonthSalary');
    if (elMonthSalary) elMonthSalary.textContent = formatINR(mc.salary);
    const elMonthExpenses = document.getElementById('dashMonthExpenses');
    if (elMonthExpenses) elMonthExpenses.textContent = formatINR(mc.expenses);
    const elMonthProfit = document.getElementById('dashMonthProfit');
    if (elMonthProfit) {
      elMonthProfit.textContent = formatINR(mc.profit);
      elMonthProfit.style.color = mc.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }

    const setOverviewBadge = (id, delta, type = 'number', unit = '', inv = false) => {
      const el = document.getElementById(id);
      if (!el) return;
      const d = formatDeltaDisplay(delta, type, unit, inv);
      el.className = `dash-metric-compare ${d.cls}`;
      el.textContent = d.text;
    };

    setOverviewBadge('dashMonthCutsGrowth', mg.deltaBoxes, 'number', isEn ? 'Boxes' : 'கட்டை');
    setOverviewBadge('dashMonthProfitGrowth', mg.deltaProfit, 'currency');
  }

  // 6. Period Breakdown Summary Table
  const tbody = document.getElementById('dashSummaryTableBody');
  if (tbody && data.timeSeries) {
    if (data.timeSeries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-dim);">${isEn ? 'No records for this period' : 'இந்த காலக்கட்டத்தில் பதிவுகள் இல்லை'}</td></tr>`;
    } else {
      tbody.innerHTML = data.timeSeries.map(row => `
        <tr>
          <td><strong>${row.displayDate || formatDate(row.date)}</strong></td>
          <td><span class="badge badge-accent">${row.boxes || 0} Boxes</span></td>
          <td>${formatNumber(row.cuts)}</td>
          <td>${formatNumber(row.beedis)}</td>
          <td>${Number(row.tobaccoKg || 0).toFixed(2)} kg</td>
          <td>${Number(row.powderKg || 0).toFixed(2)} kg</td>
          <td>${formatINR(row.salary)}</td>
          <td><strong>${formatINR(row.rate)}</strong></td>
          <td>${formatINR(row.expenses)}</td>
          <td style="font-weight: 700; color: ${(row.profit >= 0) ? 'var(--accent-green)' : 'var(--accent-red)'}">
            ${formatINR(row.profit)}
          </td>
        </tr>
      `).join('');
    }
  }
}

// 3. Comparative Growth Formatting in Numbers
function formatDeltaDisplay(deltaVal, type = 'number', unit = '', isInverse = false) {
  if (deltaVal === undefined || deltaVal === null || isNaN(Number(deltaVal))) {
    return { text: '—', cls: 'neutral', num: 0 };
  }
  const num = Number(deltaVal);
  let cls = 'neutral';
  let sign = '';

  if (num > 0) {
    sign = '+';
    cls = isInverse ? 'down' : 'up';
  } else if (num < 0) {
    sign = '';
    cls = isInverse ? 'up' : 'down';
  }

  let valStr = '';
  if (type === 'currency') {
    valStr = (num < 0 ? '-₹' : sign + '₹') + Math.abs(Math.round(num)).toLocaleString('en-IN');
  } else if (type === 'weight') {
    valStr = `${sign}${num.toFixed(1)} ${unit}`.trim();
  } else {
    valStr = `${sign}${Math.round(num).toLocaleString('en-IN')} ${unit}`.trim();
  }

  return { text: valStr, cls, num };
}

function updateCompItem(prefix, curVal, prevVal, deltaVal, type = 'number', unit = '', isInverse = false) {
  const elCur = document.getElementById(`compCur${prefix}`);
  const elPrev = document.getElementById(`compPrev${prefix}`);
  const elGrowth = document.getElementById(`compGrowth${prefix}`);
  const elDelta = document.getElementById(`compDelta${prefix}`);

  let curStr = '', prevStr = '';
  if (type === 'currency') {
    curStr = `₹${Math.round(curVal || 0).toLocaleString('en-IN')}`;
    prevStr = `₹${Math.round(prevVal || 0).toLocaleString('en-IN')}`;
  } else if (type === 'weight') {
    curStr = `${Number(curVal || 0).toFixed(1)} ${unit}`;
    prevStr = `${Number(prevVal || 0).toFixed(1)} ${unit}`;
  } else {
    curStr = `${Math.round(curVal || 0).toLocaleString('en-IN')} ${unit}`.trim();
    prevStr = `${Math.round(prevVal || 0).toLocaleString('en-IN')} ${unit}`.trim();
  }

  if (elCur) elCur.textContent = curStr;
  if (elPrev) elPrev.textContent = prevStr;

  const d = formatDeltaDisplay(deltaVal, type, unit, isInverse);
  if (elGrowth) {
    elGrowth.className = `comp-growth-pill ${d.cls}`;
    elGrowth.textContent = d.text;
  }
  if (elDelta) {
    elDelta.textContent = `Δ ${d.text}`;
  }
}

function renderPeriodComparisonCard(data, period = currentComparisonPeriod) {
  if (!data) return;
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  let comp = null;
  if (period === 'day') {
    comp = data.dayComparison || (data.period === 'day' ? data.comparison : null);
  } else if (period === 'month') {
    comp = data.monthComparison || (data.period === 'month' ? data.comparison : null);
  } else {
    comp = data.weekComparison || (data.period === 'week' ? data.comparison : null);
  }

  if (!comp) comp = data.comparison;
  if (!comp || !comp.growth || !comp.current || !comp.previous) return;

  const g = comp.growth;

  const compTag = document.getElementById('comparisonPeriodTag');
  const subTitle = document.getElementById('comparisonSubtitle');

  if (period === 'day') {
    if (compTag) compTag.textContent = isEn ? 'Today vs Yesterday' : 'இன்று vs நேற்று';
    if (subTitle) subTitle.textContent = isEn
      ? 'Direct benchmark comparison against yesterday'
      : 'இன்றைய தினத்திற்கும் நேற்றைய தினத்திற்கும் நேரடி ஒப்பீடு (Today vs Yesterday Direct Comparison)';
  } else if (period === 'month') {
    if (compTag) compTag.textContent = isEn ? 'This Month vs Previous Month' : 'இந்த மாதம் vs கடந்த மாதம்';
    if (subTitle) subTitle.textContent = isEn
      ? 'Direct benchmark comparison against the previous month'
      : 'இந்த மாதத்திற்கும் கடந்த மாதத்திற்கும் நேரடி ஒப்பீடு (This Month vs Previous Month Direct Comparison)';
  } else {
    if (compTag) compTag.textContent = isEn ? 'This Week vs Previous Week' : 'இந்த வாரம் vs கடந்த வாரம்';
    if (subTitle) subTitle.textContent = isEn
      ? 'Direct benchmark comparison against the previous week'
      : 'இந்த வாரத்திற்கும் கடந்த வாரத்திற்கும் நேரடி ஒப்பீடு (This Week vs Previous Week Direct Comparison)';
  }

  let curColText = isEn ? 'Today' : 'இன்று (Today)';
  let prevColText = isEn ? 'Yesterday' : 'நேற்று (Yesterday)';
  if (period === 'week') {
    curColText = isEn ? 'This Week' : 'இந்த வாரம் (This Week)';
    prevColText = isEn ? 'Last Week' : 'கடந்த வாரம் (Last Week)';
  } else if (period === 'month') {
    curColText = isEn ? 'This Month' : 'இந்த மாதம் (This Month)';
    prevColText = isEn ? 'Last Month' : 'கடந்த மாதம் (Last Month)';
  }

  document.querySelectorAll('.comp-label-current').forEach(el => {
    el.textContent = curColText;
  });
  document.querySelectorAll('.comp-label-previous').forEach(el => {
    el.textContent = prevColText;
  });

  const deltaBoxes = g.deltaBoxes !== undefined ? g.deltaBoxes : (g.boxesDelta !== undefined ? g.boxesDelta : Number((comp.current.boxes - comp.previous.boxes).toFixed(1)));
  const deltaBeedis = g.deltaBeedis !== undefined ? g.deltaBeedis : (g.beedisDelta !== undefined ? g.beedisDelta : (comp.current.beedis - comp.previous.beedis));
  const deltaRate = g.deltaRate !== undefined ? g.deltaRate : (g.rateDelta !== undefined ? g.rateDelta : (comp.current.rate - comp.previous.rate));
  const deltaSalary = g.deltaSalary !== undefined ? g.deltaSalary : (g.salaryDelta !== undefined ? g.salaryDelta : (comp.current.salary - comp.previous.salary));
  const deltaExpenses = g.deltaExpenses !== undefined ? g.deltaExpenses : (g.expensesDelta !== undefined ? g.expensesDelta : (comp.current.expenses - comp.previous.expenses));
  const deltaProfit = g.deltaProfit !== undefined ? g.deltaProfit : (g.profitDelta !== undefined ? g.profitDelta : (comp.current.profit - comp.previous.profit));

  updateCompItem('Boxes', comp.current.boxes, comp.previous.boxes, deltaBoxes, 'number', isEn ? 'Boxes' : 'கட்டை');
  updateCompItem('Beedis', comp.current.beedis, comp.previous.beedis, deltaBeedis, 'number', 'Pcs');
  updateCompItem('Rate', comp.current.rate, comp.previous.rate, deltaRate, 'currency');
  updateCompItem('Salary', comp.current.salary, comp.previous.salary, deltaSalary, 'currency');
  updateCompItem('Expenses', comp.current.expenses, comp.previous.expenses, deltaExpenses, 'currency', '', true);
  updateCompItem('Profit', comp.current.profit, comp.previous.profit, deltaProfit, 'currency');
}

function switchDashboardBarChartFilter(type, granularity) {
  if (type === 'prod') {
    dashProdGranularity = granularity;
    const btns = document.querySelectorAll('#dashProdChartFilterGroup .chart-filter-btn');
    btns.forEach(b => b.classList.remove('active'));
    const b = document.getElementById(granularity === 'day' ? 'dashProdFilterDay' : (granularity === 'week' ? 'dashProdFilterWeek' : 'dashProdFilterMonth'));
    if (b) b.classList.add('active');
    loadDashboardChartHistory(granularity).then(history => renderDashboardProductionBarChart(history, granularity));
  } else if (type === 'export') {
    dashExportGranularity = granularity;
    const btns = document.querySelectorAll('#dashExportChartFilterGroup .chart-filter-btn');
    btns.forEach(b => b.classList.remove('active'));
    const b = document.getElementById(granularity === 'day' ? 'dashExportFilterDay' : (granularity === 'week' ? 'dashExportFilterWeek' : 'dashExportFilterMonth'));
    if (b) b.classList.add('active');
    loadDashboardChartHistory(granularity).then(history => renderDashboardExportBarChart(history, granularity));
  } else if (type === 'profit') {
    dashProfitGranularity = granularity;
    const btns = document.querySelectorAll('#dashProfitChartFilterGroup .chart-filter-btn');
    btns.forEach(b => b.classList.remove('active'));
    const b = document.getElementById(granularity === 'day' ? 'dashProfitFilterDay' : (granularity === 'week' ? 'dashProfitFilterWeek' : 'dashProfitFilterMonth'));
    if (b) b.classList.add('active');
    loadDashboardChartHistory(granularity).then(history => renderDashboardProfitBarChart(history, granularity));
  }
}

// 1. Dashboard Production Bar Chart (Day / Week / Month)
function renderDashboardProductionBarChart(data, granularity = dashProdGranularity) {
  const canvas = document.getElementById('dashChartProdBar');
  if (!canvas || typeof Chart === 'undefined') return;

  dashProdGranularity = granularity;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
  const fontFam = "'Outfit', 'Mukta Malar', sans-serif";
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  let labels = [];
  let boxes = [];
  let cuts = [];

  if (data && data.series) {
    labels = data.series.map(row => row.label);
    boxes = data.series.map(row => row.prodBoxes || 0);
    cuts = data.series.map(row => row.prodCuts || 0);
  } else if (granularity === 'month' && data && data.monthlyHistory) {
    labels = data.monthlyHistory.map(m => m.label);
    boxes = data.monthlyHistory.map(m => Number((m.boxes || 0).toFixed(1)));
    cuts = data.monthlyHistory.map(m => m.cuts || 0);
  } else if (granularity === 'week') {
    const ts = (data && data.timeSeries) ? data.timeSeries : [];
    const weekBuckets = {};
    ts.forEach(d => {
      const dt = getCalendarDate(d.date || d.displayDate);
      const mon = getWeekBucket(dt);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      const k = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
      const lbl = `${mon.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${sun.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
      if (!weekBuckets[k]) weekBuckets[k] = { label: lbl, boxes: 0, cuts: 0, rate: 0 };
      weekBuckets[k].boxes += (d.boxes || 0);
      weekBuckets[k].cuts += (d.cuts || 0);
      weekBuckets[k].rate += (d.rate || 0);
    });
    const wkKeys = Object.keys(weekBuckets).sort().slice(-8);
    labels = wkKeys.map(k => weekBuckets[k].label);
    boxes = wkKeys.map(k => Number(weekBuckets[k].boxes.toFixed(1)));
    cuts = wkKeys.map(k => weekBuckets[k].cuts);
  } else {
    // day-wise
    const ts = (data && data.timeSeries) ? data.timeSeries.slice(-14) : [];
    labels = ts.map(d => d.displayDate || d.date);
    boxes = ts.map(d => Number((d.boxes || 0).toFixed(1)));
    cuts = ts.map(d => d.cuts || 0);
  }

  if (dashProdChartInstance) dashProdChartInstance.destroy();

  dashProdChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: isEn ? 'Boxes (கட்டை)' : 'கட்டை (Boxes)',
          data: boxes,
          backgroundColor: 'rgba(217, 119, 6, 0.85)',
          hoverBackgroundColor: '#d97706',
          borderRadius: 6,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: textColor, font: { family: fontFam, size: 11, weight: 'bold' } }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const lbl = ctx.dataset.label || '';
              const val = ctx.raw;
              const idx = ctx.dataIndex;
              const c = cuts[idx] || 0;
              return `${lbl}: ${val} (${c} cuts)`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: textColor, font: { family: fontFam, size: 11 } }, grid: { color: gridColor } },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: isEn ? 'Boxes' : 'கட்டை', color: textColor, font: { family: fontFam, size: 11 } },
          ticks: { color: textColor, font: { family: fontFam, size: 11 } },
          grid: { color: gridColor }
        }
      }
    }
  });
}

// 2. Dashboard Export Bar Chart (Day / Week / Month)
function renderDashboardExportBarChart(data, granularity = dashExportGranularity) {
  const canvas = document.getElementById('dashChartExportBar');
  if (!canvas || typeof Chart === 'undefined') return;

  dashExportGranularity = granularity;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
  const fontFam = "'Outfit', 'Mukta Malar', sans-serif";
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  const exportsList = data && data.series
    ? data.series.map(row => ({
      date: row.key,
      boxes: row.exportBoxes,
      rate: row.exportRate,
      margin: row.exportMargin
    }))
    : [];

  const buckets = {};
  exportsList.forEach(e => {
    if (!e.date) return;
    const d = getCalendarDate(e.date);
    let key = '';
    let label = '';
    if (granularity === 'day') {
      key = d.toISOString().split('T')[0];
      label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } else if (granularity === 'week') {
      const mon = getWeekBucket(d);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      key = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
      label = `${mon.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${sun.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
    } else if (granularity === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    }
    if (!buckets[key]) buckets[key] = { key, label, boxes: 0, rate: 0, margin: 0 };
    const bCount = (e.boxes !== undefined && e.boxes !== null && e.boxes > 0) ? e.boxes : ((e.cuts || 0) / 300);
    buckets[key].boxes += bCount;
    buckets[key].rate += (e.rate || 0);
    buckets[key].margin += (e.margin !== undefined ? e.margin : ((e.rate || 0) - (e.salary || 0)));
  });

  const sortedKeys = Object.keys(buckets).sort();
  const limit = granularity === 'day' ? 14 : (granularity === 'week' ? 8 : 12);
  const activeKeys = sortedKeys.slice(-limit);

  const labels = activeKeys.map(k => buckets[k].label);
  const boxes = activeKeys.map(k => Number(buckets[k].boxes.toFixed(1)));
  const rate = activeKeys.map(k => buckets[k].rate);
  const margin = activeKeys.map(k => buckets[k].margin);

  if (dashExportChartInstance) dashExportChartInstance.destroy();

  dashExportChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : (isEn ? ['No Export Data'] : ['ஏற்றுமதி விவரம் இல்லை']),
      datasets: [
        {
          label: isEn ? 'Exported Boxes' : 'ஏற்றுமதி கட்டை (Boxes)',
          data: labels.length > 0 ? boxes : [0],
          backgroundColor: 'rgba(37, 99, 235, 0.85)',
          hoverBackgroundColor: '#2563eb',
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          label: isEn ? 'Export Value (₹)' : 'ஏற்றுமதி மதிப்பு (₹)',
          data: labels.length > 0 ? rate : [0],
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          hoverBackgroundColor: '#10b981',
          borderRadius: 6,
          yAxisID: 'y1'
        },
        {
          label: isEn ? 'Export Margin (₹)' : 'ஏற்றுமதி லாபம் (₹)',
          data: labels.length > 0 ? margin : [0],
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          hoverBackgroundColor: '#f59e0b',
          borderRadius: 6,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: textColor, font: { family: fontFam, size: 11, weight: 'bold' } }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const lbl = ctx.dataset.label || '';
              const val = ctx.raw;
              if (ctx.dataset.yAxisID === 'y1') return `${lbl}: ₹${Number(val).toLocaleString('en-IN')}`;
              return `${lbl}: ${val} Boxes`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: textColor, font: { family: fontFam, size: 11 } }, grid: { color: gridColor } },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: isEn ? 'Boxes' : 'கட்டை', color: textColor, font: { family: fontFam, size: 11 } },
          ticks: { color: textColor, font: { family: fontFam, size: 11 } },
          grid: { color: gridColor }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: { display: true, text: '₹ Amount', color: textColor, font: { family: fontFam, size: 11 } },
          grid: { drawOnChartArea: false },
          ticks: {
            color: textColor,
            font: { family: fontFam, size: 11 },
            callback: v => '₹' + v.toLocaleString('en-IN')
          }
        }
      }
    }
  });
}

// 3. Dashboard Financial & Profit Bar Chart (Day / Week / Month)
function renderDashboardProfitBarChart(data, granularity = dashProfitGranularity) {
  const canvas = document.getElementById('dashChartProfitBar');
  if (!canvas || typeof Chart === 'undefined') return;

  dashProfitGranularity = granularity;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
  const fontFam = "'Outfit', 'Mukta Malar', sans-serif";
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  let labels = [];
  let rateData = [];
  let salaryData = [];
  let expenseData = [];
  let profitData = [];

  if (data && data.series) {
    labels = data.series.map(row => row.label);
    rateData = data.series.map(row => row.prodRate || 0);
    salaryData = data.series.map(row => row.prodSalary || 0);
    expenseData = data.series.map(row => row.expenses || 0);
    profitData = data.series.map(row => row.netProfit || 0);
  } else if (granularity === 'month' && data && data.monthlyHistory) {
    labels = data.monthlyHistory.map(m => m.label);
    rateData = data.monthlyHistory.map(m => m.rate || 0);
    salaryData = data.monthlyHistory.map(m => m.salary || 0);
    expenseData = data.monthlyHistory.map(m => m.expenses || 0);
    profitData = data.monthlyHistory.map(m => m.profit || 0);
  } else if (granularity === 'week') {
    const ts = (data && data.timeSeries) ? data.timeSeries : [];
    const weekBuckets = {};
    ts.forEach(d => {
      const dt = getCalendarDate(d.date || d.displayDate);
      const mon = getWeekBucket(dt);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      const k = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
      const lbl = `${mon.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${sun.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
      if (!weekBuckets[k]) weekBuckets[k] = { label: lbl, rate: 0, salary: 0, expenses: 0, profit: 0 };
      weekBuckets[k].rate += (d.rate || 0);
      weekBuckets[k].salary += (d.salary || 0);
      weekBuckets[k].expenses += (d.expenses || 0);
      weekBuckets[k].profit += (d.profit || 0);
    });
    const wkKeys = Object.keys(weekBuckets).sort().slice(-8);
    labels = wkKeys.map(k => weekBuckets[k].label);
    rateData = wkKeys.map(k => weekBuckets[k].rate);
    salaryData = wkKeys.map(k => weekBuckets[k].salary);
    expenseData = wkKeys.map(k => weekBuckets[k].expenses);
    profitData = wkKeys.map(k => weekBuckets[k].profit);
  } else {
    const ts = (data && data.timeSeries) ? data.timeSeries.slice(-14) : [];
    labels = ts.map(d => d.displayDate || d.date);
    rateData = ts.map(d => d.rate || 0);
    salaryData = ts.map(d => d.salary || 0);
    expenseData = ts.map(d => d.expenses || 0);
    profitData = ts.map(d => d.profit || 0);
  }

  if (dashProfitChartInstance) dashProfitChartInstance.destroy();

  dashProfitChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: isEn ? 'Rate Value (₹)' : 'Rate மதிப்பு (₹)',
          data: rateData,
          backgroundColor: 'rgba(217, 119, 6, 0.85)',
          hoverBackgroundColor: '#d97706',
          borderRadius: 6
        },
        {
          label: isEn ? 'Salary (₹)' : 'கூலி (₹)',
          data: salaryData,
          backgroundColor: 'rgba(37, 99, 235, 0.85)',
          hoverBackgroundColor: '#2563eb',
          borderRadius: 6
        },
        {
          label: isEn ? 'Expenses (₹)' : 'செலவுகள் (₹)',
          data: expenseData,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          hoverBackgroundColor: '#ef4444',
          borderRadius: 6
        },
        {
          label: isEn ? 'Net Profit (₹)' : 'நிகர லாபம் (₹)',
          data: profitData,
          backgroundColor: profitData.map(v => v >= 0 ? 'rgba(5, 150, 105, 0.88)' : 'rgba(220, 38, 38, 0.88)'),
          hoverBackgroundColor: profitData.map(v => v >= 0 ? '#059669' : '#dc2626'),
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: textColor, font: { family: fontFam, size: 11, weight: 'bold' } }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const lbl = ctx.dataset.label || '';
              const val = ctx.raw;
              return `${lbl}: ₹${Number(val).toLocaleString('en-IN')}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: textColor, font: { family: fontFam, size: 11 } }, grid: { color: gridColor } },
        y: {
          ticks: {
            color: textColor,
            font: { family: fontFam, size: 11 },
            callback: v => '₹' + v.toLocaleString('en-IN')
          },
          grid: { color: gridColor }
        }
      }
    }
  });
}

async function renderDashboardCharts(data) {
  if (typeof Chart === 'undefined') return;
  if (!data) return;

  const granularities = new Set([dashProdGranularity, dashExportGranularity, dashProfitGranularity]);
  const histories = await Promise.all([...granularities].map(granularity => loadDashboardChartHistory(granularity)));
  const historyByGranularity = Object.fromEntries([...granularities].map((granularity, index) => [granularity, histories[index]]));
  const isEn = typeof currentLanguage !== 'undefined' && currentLanguage === 'en';
  const updateChartStatus = (id, series, fields) => {
    const element = document.getElementById(id);
    if (!element) return;
    const hasData = series.some(row => fields.some(field => Number(row[field] || 0) !== 0));
    element.textContent = hasData ? '' : (isEn ? 'No data for this range' : 'இந்த காலத்திற்கு தரவு இல்லை');
    element.hidden = hasData;
  };
  updateChartStatus('dashProdChartStatus', historyByGranularity[dashProdGranularity].series || [], ['prodBoxes', 'prodRate']);
  updateChartStatus('dashExportChartStatus', historyByGranularity[dashExportGranularity].series || [], ['exportBoxes', 'exportRate']);
  updateChartStatus('dashProfitChartStatus', historyByGranularity[dashProfitGranularity].series || [], ['prodRate', 'prodSalary', 'expenses', 'netProfit']);
  renderDashboardProductionBarChart(historyByGranularity[dashProdGranularity], dashProdGranularity);
  renderDashboardExportBarChart(historyByGranularity[dashExportGranularity], dashExportGranularity);
  renderDashboardProfitBarChart(historyByGranularity[dashProfitGranularity], dashProfitGranularity);
}

function exportDashboardPeriodCSV() {
  if (!cachedAnalytics || !cachedAnalytics.timeSeries || cachedAnalytics.timeSeries.length === 0) {
    showToast('No data to export', 'warning');
    return;
  }
  const headers = ['Date', 'Boxes', 'Cuts', 'Beedis', 'Tobacco_kg', 'Powder_kg', 'Salary_INR', 'Rate_INR', 'Expenses_INR', 'Profit_INR'];
  const rows = cachedAnalytics.timeSeries.map(r => [
    r.date ? r.date.split('T')[0] : '',
    r.boxes || 0,
    r.cuts || 0,
    r.beedis || 0,
    (r.tobaccoKg || 0).toFixed(2),
    (r.powderKg || 0).toFixed(2),
    r.salary || 0,
    r.rate || 0,
    r.expenses || 0,
    r.profit || 0
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `TVS_Dashboard_${currentDashboardPeriod}_${getTodayISODate()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Dashboard CSV downloaded successfully', 'success');
}

// Re-render when theme or language changes
window.addEventListener('themeChanged', () => {
  if (cachedAnalytics) renderDashboardCharts(cachedAnalytics);
});

window.addEventListener('languageChanged', () => {
  updateDashboardPeriodPills();
  if (cachedAnalytics) {
    renderDashboardUI(cachedAnalytics);
    renderDashboardCharts(cachedAnalytics);
  }
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  setDashboardPeriod('day');
});
