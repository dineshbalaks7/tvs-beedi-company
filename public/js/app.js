/**
 * TVS Beedi Company - Main Application Logic
 * Mobile-first state management, views, auto-calculations, and API synchronization.
 * Seamless language transition with instant in-memory rendering.
 */

// Application State
let appSettings = {
  beedisPerBox: 6000,
  cutsPerBox: 300,
  beedisPerCut: 20,
  tobaccoPer1000Grams: 600,
  powderPer1000Grams: 200,
  salaryPer1000: 320,
  ratePer1000: 340,
  avgWastageKg: 2,
  bagSizeGrams: 600,
  currency: '₹',
  language: 'ta',
  lowStockThresholdKg: 5
};

let currentTab = 'dashboard';
let currentDashboardPeriod = 'day';
let reportFilterMode = 'today';

// In-Memory Data Caches for Instant (0ms) Language Transition
let cachedDashboard = null;
let cachedAnalytics = null;
let cachedProduction = null;
let cachedStock = null;
let cachedReports = null;
let cachedExports = null;
let exportFilterMode = 'today';
let currentDuplicateExportRecord = null;

// Chart Instances
let chartProdInstance = null;
let chartFinanceInstance = null;
let chartMaterialInstance = null;

// Format helpers
function formatINR(val) {
  return '₹' + Number(val || 0).toLocaleString('en-IN');
}

function formatNumber(val) {
  return Number(val || 0).toLocaleString('en-IN');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function getTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Seamless Language Switcher
function toggleLanguage() {
  const newLang = (typeof currentLanguage !== 'undefined' && currentLanguage === 'ta') ? 'en' : 'ta';
  setLanguage(newLang, { notify: true });
  updateThemeButton();
  renderCachedAppData();
}

// Ensure all date pickers defaultly set to the current date (today)
function setDefaultDatesToToday(force = false) {
  const today = getTodayISODate();
  const dateInputIds = [
    'prodDate',
    'expenseDate',
    'expDate',
    'exportDate',
    'exportFromDate',
    'exportToDate',
    'editMovementDate',
    'reportFromDate',
    'reportToDate'
  ];

  dateInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (force || !el.value) {
        el.value = today;
      }
    }
  });
}

// Tab Navigation
function switchTab(tabName) {
  currentTab = tabName;

  // Ensure date fields default to current date when tab opens
  setDefaultDatesToToday(false);

  // Update views
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.remove('active');
  });
  const targetView = document.getElementById(`view-${tabName}`);
  if (targetView) targetView.classList.add('active');

  // Update bottom navigation bar buttons
  document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
    btn.classList.remove('active');
  });

  const tabIndexMap = {
    dashboard: 0,
    production: 1,
    stock: 2,
    expenses: 3,
    export: 4,
    reports: 4,
    chat: 5,
    settings: 6
  };
  const navBtns = document.querySelectorAll('.bottom-nav .nav-item');
  if (navBtns[tabIndexMap[tabName]]) {
    navBtns[tabIndexMap[tabName]].classList.add('active');
  }

  if (tabName === 'export' || tabName === 'reports') {
    loadExportData();
  }

  // Scroll to top of content smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// 1. DASHBOARD & ANALYTICS LOGIC
// ==========================================
function setDashboardPeriod(period) {
  if (period !== 'day' && period !== 'week' && period !== 'month') return;
  currentDashboardPeriod = period;
  updateDashboardPeriodPills();
  loadDashboardAnalytics(period);
}

function updateDashboardPeriodPills() {
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const btnDay = document.getElementById('btnPeriodDay');
  const btnWeek = document.getElementById('btnPeriodWeek');
  const btnMonth = document.getElementById('btnPeriodMonth');
  const badgeText = document.getElementById('dashPeriodBadgeText');
  const mainTitle = document.getElementById('dashMainTitle');
  const mainSubtitle = document.getElementById('dashMainSubtitle');

  const labelBoxes = document.getElementById('metricLabelBoxes');
  const labelCuts = document.getElementById('metricLabelCuts');
  const labelBeedis = document.getElementById('metricLabelBeedis');
  const labelTobacco = document.getElementById('metricLabelTobacco');
  const labelPowder = document.getElementById('metricLabelPowder');
  const labelRate = document.getElementById('metricLabelRate');
  const labelSalary = document.getElementById('metricLabelSalary');
  const labelExpenses = document.getElementById('metricLabelExpenses');
  const labelProfit = document.getElementById('metricLabelProfit');
  const formulaTitle = document.getElementById('dashProfitFormulaTitle');
  const tableTitle = document.getElementById('dashTableTitle');
  const beedisRatio = document.getElementById('dashTodayBeedisRatio');

  [btnDay, btnWeek, btnMonth].forEach(b => b && b.classList.remove('active'));

  if (currentDashboardPeriod === 'day') {
    if (btnDay) btnDay.classList.add('active');
    if (badgeText) badgeText.textContent = isEn ? 'Live: Day-wise' : 'நேரடி: இன்று';
    if (mainTitle) mainTitle.textContent = isEn ? "Today's Status (Day-wise)" : 'இன்றைய நிலவரம் (Day-wise)';
    if (mainSubtitle) mainSubtitle.textContent = isEn ? 'Live daily production, raw material consumption, and financial breakdown' : 'இன்றைய நேரடி உற்பத்தி, மூலப்பொருள் பயன்பாடு & நிதி விவரங்கள்';

    if (labelBoxes) labelBoxes.textContent = isEn ? 'Today Boxes' : 'இன்று கட்டை (Boxes)';
    if (labelCuts) labelCuts.textContent = isEn ? 'Today Cuts' : 'இன்று கட்டுகள்';
    if (labelBeedis) labelBeedis.textContent = isEn ? 'Today Beedis' : 'இன்று பீடிகள்';
    if (beedisRatio) beedisRatio.textContent = isEn ? '1 Box = 6,000 Beedis' : '1 கட்டை = 6,000 பீடிகள்';
    if (labelTobacco) labelTobacco.textContent = isEn ? 'Tobacco Used' : 'Tobacco பயன்பாடு';
    if (labelPowder) labelPowder.textContent = isEn ? 'Powder Used' : 'தூள் பயன்பாடு';
    if (labelRate) labelRate.textContent = isEn ? "Today's Rate" : 'இன்றைய Rate மதிப்பு';
    if (labelSalary) labelSalary.textContent = isEn ? "Today's Salary" : 'இன்றைய சம்பளம்';
    if (labelExpenses) labelExpenses.textContent = isEn ? "Today's Expenses" : 'இன்றைய செலவுகள்';
    if (labelProfit) labelProfit.textContent = isEn ? "Today's Net Profit" : 'இன்றைய நிகர லாபம்';
    if (formulaTitle) formulaTitle.textContent = isEn ? "Today's Net Profit (Profit)" : 'இன்றைய நிகர லாபம் (Profit)';
    if (tableTitle) tableTitle.textContent = isEn ? 'Daily Performance Breakdown' : 'தினசரி சுருக்க அறிக்கை';
  } else if (currentDashboardPeriod === 'week') {
    if (btnWeek) btnWeek.classList.add('active');
    if (badgeText) badgeText.textContent = isEn ? 'Period: Weekly Wise' : 'காலக்கட்டம்: வாராந்திரம் (Weekly)';
    if (mainTitle) mainTitle.textContent = isEn ? 'Weekly Overview & Trends' : 'இந்த வார நிலவரம் (Weekly Wise)';
    if (mainSubtitle) mainSubtitle.textContent = isEn ? 'Aggregated performance for the last 7 days benchmarked against the prior week' : 'கடந்த 7 நாட்களின் உற்பத்தி, Rate மதிப்பு & நிதி நிலவரம் (முந்தைய வாரத்துடன் ஒப்பீடு)';

    if (labelBoxes) labelBoxes.textContent = isEn ? 'This Week Boxes' : 'இந்த வார கட்டை (Boxes)';
    if (labelCuts) labelCuts.textContent = isEn ? 'This Week Cuts' : 'இந்த வார கட்டுகள்';
    if (labelBeedis) labelBeedis.textContent = isEn ? 'This Week Beedis' : 'இந்த வார பீடிகள்';
    if (beedisRatio) beedisRatio.textContent = isEn ? '1 Box = 6,000 Beedis' : '1 கட்டை = 6,000 பீடிகள்';
    if (labelTobacco) labelTobacco.textContent = isEn ? 'Week Tobacco Used' : 'வார Tobacco பயன்பாடு';
    if (labelPowder) labelPowder.textContent = isEn ? 'Week Powder Used' : 'வார தூள் பயன்பாடு';
    if (labelRate) labelRate.textContent = isEn ? 'Weekly Rate Amount' : 'இந்த வார Rate மதிப்பு';
    if (labelSalary) labelSalary.textContent = isEn ? 'Weekly Salary' : 'இந்த வார சம்பளம்';
    if (labelExpenses) labelExpenses.textContent = isEn ? 'Weekly Expenses' : 'இந்த வார செலவுகள்';
    if (labelProfit) labelProfit.textContent = isEn ? 'Weekly Net Profit' : 'இந்த வார நிகர லாபம்';
    if (formulaTitle) formulaTitle.textContent = isEn ? 'Weekly Net Profit (Profit)' : 'இந்த வார நிகர லாபம் (Profit)';
    if (tableTitle) tableTitle.textContent = isEn ? 'Weekly Performance Breakdown' : 'வாராந்திர சுருக்க அறிக்கை';
  } else if (currentDashboardPeriod === 'month') {
    if (btnMonth) btnMonth.classList.add('active');
    if (badgeText) badgeText.textContent = isEn ? 'Period: Monthly Wise' : 'காலக்கட்டம்: மாதாந்திரம் (Monthly)';
    if (mainTitle) mainTitle.textContent = isEn ? 'Monthly Overview & Margins' : 'இந்த மாத நிலவரம் (Monthly Wise)';
    if (mainSubtitle) mainSubtitle.textContent = isEn ? 'Monthly cumulative production, margins, and stock utilization' : 'இந்த மாத மொத்த உற்பத்தி, Rate மதிப்பு, லாப வரம்பு & சரக்கு விவரங்கள்';

    if (labelBoxes) labelBoxes.textContent = isEn ? 'This Month Boxes' : 'இந்த மாத கட்டை (Boxes)';
    if (labelCuts) labelCuts.textContent = isEn ? 'This Month Cuts' : 'இந்த மாத கட்டுகள்';
    if (labelBeedis) labelBeedis.textContent = isEn ? 'This Month Beedis' : 'இந்த மாத பீடிகள்';
    if (beedisRatio) beedisRatio.textContent = isEn ? '1 Box = 6,000 Beedis' : '1 கட்டை = 6,000 பீடிகள்';
    if (labelTobacco) labelTobacco.textContent = isEn ? 'Month Tobacco Used' : 'மாத Tobacco பயன்பாடு';
    if (labelPowder) labelPowder.textContent = isEn ? 'Month Powder Used' : 'மாத தூள் பயன்பாடு';
    if (labelRate) labelRate.textContent = isEn ? 'Monthly Rate Amount' : 'இந்த மாத Rate மதிப்பு';
    if (labelSalary) labelSalary.textContent = isEn ? 'Monthly Salary' : 'இந்த மாத சம்பளம்';
    if (labelExpenses) labelExpenses.textContent = isEn ? 'Monthly Expenses' : 'இந்த மாத செலவுகள்';
    if (labelProfit) labelProfit.textContent = isEn ? 'Monthly Net Profit' : 'இந்த மாத நிகர லாபம்';
    if (formulaTitle) formulaTitle.textContent = isEn ? 'Monthly Net Profit (Profit)' : 'இந்த மாத நிகர லாபம் (Profit)';
    if (tableTitle) tableTitle.textContent = isEn ? 'Monthly Performance Breakdown' : 'மாதாந்திர சுருக்க அறிக்கை';
  }
}

function renderDashboardUI(data) {
  if (!data || !data.totals) return;
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  updateDashboardPeriodPills();

  // Metrics Grid
  const todayBoxes = data.totals.boxes !== undefined ? data.totals.boxes : Number(((data.totals.cuts || 0) / 300).toFixed(1));
  const dashTodayBoxesEl = document.getElementById('dashTodayBoxes');
  if (dashTodayBoxesEl) {
    dashTodayBoxesEl.innerHTML = `${formatNumber(todayBoxes)} <span class="metric-unit">${getTranslation('unitBoxes')}</span>`;
  }
  const dashTodayBoxesSubEl = document.getElementById('dashTodayBoxesSub');
  if (dashTodayBoxesSubEl) {
    dashTodayBoxesSubEl.textContent = `${formatNumber(data.totals.cuts)} ${getTranslation('unitCuts')} (300/Box)`;
  }
  const dashTodayCutsEl = document.getElementById('dashTodayCuts');
  if (dashTodayCutsEl) {
    dashTodayCutsEl.innerHTML = `${formatNumber(data.totals.cuts)} <span class="metric-unit">${getTranslation('unitCuts')}</span>`;
  }
  const dashTodayCutsBeedisEl = document.getElementById('dashTodayCutsBeedis');
  if (dashTodayCutsBeedisEl) {
    dashTodayCutsBeedisEl.textContent = `${formatNumber(data.totals.beedis)} ${getTranslation('unitBeedis')}`;
  }
  document.getElementById('dashTodayBeedis').innerHTML = `${formatNumber(data.totals.beedis)} <span class="metric-unit">Pcs</span>`;
  document.getElementById('dashTodayTobacco').innerHTML = `${data.totals.tobaccoUsedKg} <span class="metric-unit">kg</span>`;
  document.getElementById('dashTodayPowder').innerHTML = `${data.totals.powderUsedKg} <span class="metric-unit">kg</span>`;
  document.getElementById('dashTodayRate').textContent = formatINR(data.totals.rate);
  document.getElementById('dashTodaySalary').textContent = formatINR(data.totals.salary);
  document.getElementById('dashTodayExpenses').textContent = formatINR(data.totals.expenses);
  document.getElementById('dashTodayExpCount').textContent = `${data.totals.expenseCount} ${getTranslation('expensesCount')}`;

  const commissionAmount = Number(data.totals.commissionAmount || 0);
  const commissionEl = document.getElementById('dashTodayCommission');
  if (commissionEl) {
    commissionEl.textContent = formatINR(commissionAmount);
    commissionEl.style.color = commissionAmount >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  }

  const baseNetProfit = Number(data.totals.profitWithoutCommission || data.totals.baseNetProfit || 0);
  const baseProfitEl = document.getElementById('dashTodayBaseProfit');
  if (baseProfitEl) {
    baseProfitEl.textContent = formatINR(baseNetProfit);
    baseProfitEl.style.color = baseNetProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  }

  const profitEl = document.getElementById('dashTodayProfit');
  profitEl.textContent = formatINR(data.totals.profit);
  profitEl.style.color = data.totals.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  document.getElementById('dashTodayMargin').textContent = `Margin: ${data.totals.profitMargin}%`;

  // Transparent calculation breakdown
  document.getElementById('dashCalcRate').textContent = formatINR(data.totals.rate);
  document.getElementById('dashCalcSalary').textContent = formatINR(data.totals.salary);
  document.getElementById('dashCalcExpenses').textContent = formatINR(data.totals.expenses);
  const dashCalcBaseProfitEl = document.getElementById('dashCalcBaseProfit');
  if (dashCalcBaseProfitEl) dashCalcBaseProfitEl.textContent = formatINR(baseNetProfit);
  const dashCalcCommissionEl = document.getElementById('dashCalcCommission');
  if (dashCalcCommissionEl) dashCalcCommissionEl.textContent = formatINR(commissionAmount);
  const dashCalcProfitEl = document.getElementById('dashCalcProfit');
  dashCalcProfitEl.textContent = formatINR(data.totals.profit);
  dashCalcProfitEl.style.color = data.totals.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  // ==========================================
  // Comparative Analytics (Day / Week / Month vs Previous)
  // ==========================================
  if (data.comparison && data.comparison.growth) {
    const comp = data.comparison;
    const g = comp.growth;
    const periodLabel = isEn ? comp.labelEn : comp.labelTa;

    function formatDeltaDisplay(deltaVal, type = 'number', unit = '', isInverse = false) {
      if (deltaVal === undefined || deltaVal === null || isNaN(Number(deltaVal))) {
        return { text: '—', cls: 'neutral', num: 0 };
      }
      const num = Number(deltaVal);
      let cls = 'neutral';
      let arrow = '—';
      if (num > 0) {
        arrow = '▲';
        cls = isInverse ? 'down' : 'up';
      } else if (num < 0) {
        arrow = '▼';
        cls = isInverse ? 'up' : 'down';
      }

      let formattedVal = '';
      if (type === 'currency') {
        formattedVal = `₹${formatNumber(Math.abs(num))}`;
      } else if (type === 'kg') {
        formattedVal = `${Math.abs(num).toFixed(1)} kg`;
      } else {
        const absVal = Math.abs(num);
        const displayNum = Number.isInteger(absVal) ? formatNumber(absVal) : absVal.toFixed(1);
        formattedVal = `${displayNum}${unit ? ' ' + unit : ''}`;
      }

      let text = '';
      if (num === 0) {
        text = type === 'currency' ? '— ₹0' : (type === 'kg' ? '— 0.0 kg' : `— 0${unit ? ' ' + unit : ''}`);
      } else {
        const sign = num > 0 ? '+' : '-';
        text = `${arrow} ${sign}${formattedVal}`;
      }

      return { text, cls, num };
    }

    // Populate metric cards comparison badges with numbers
    const badgeMap = [
      { id: 'compareBadgeBoxes', delta: g.boxesDelta, type: 'number', unit: 'Bx' },
      { id: 'compareBadgeCuts', delta: g.cutsDelta, type: 'number', unit: 'Cuts' },
      { id: 'compareBadgeBeedis', delta: g.beedisDelta, type: 'number', unit: 'Pcs' },
      { id: 'compareBadgeTobacco', delta: g.tobaccoDelta, type: 'kg' },
      { id: 'compareBadgePowder', delta: g.powderDelta, type: 'kg' },
      { id: 'compareBadgeRate', delta: g.rateDelta, type: 'currency' },
      { id: 'compareBadgeSalary', delta: g.salaryDelta, type: 'currency' },
      { id: 'compareBadgeExpenses', delta: g.expensesDelta, type: 'currency', isInverse: true },
      { id: 'compareBadgeProfit', delta: g.profitDelta, type: 'currency' }
    ];

    badgeMap.forEach(b => {
      const el = document.getElementById(b.id);
      if (el) {
        const d = formatDeltaDisplay(b.delta, b.type, b.unit, b.isInverse);
        el.className = `dash-metric-compare ${d.cls}`;
        el.setAttribute('title', `${periodLabel}: ${d.text}`);
        el.textContent = d.text;
      }
    });

    // Populate Period Comparison Breakdown Card
    const tagEl = document.getElementById('comparisonPeriodTag');
    if (tagEl) {
      if (currentDashboardPeriod === 'day') {
        tagEl.textContent = isEn ? 'Today vs Yesterday' : 'இன்று vs நேற்று';
      } else if (currentDashboardPeriod === 'week') {
        tagEl.textContent = isEn ? 'This Week vs Last Week' : 'இந்த வாரம் vs கடந்த வாரம்';
      } else if (currentDashboardPeriod === 'month') {
        tagEl.textContent = isEn ? 'This Month vs Last Month' : 'இந்த மாதம் vs கடந்த மாதம்';
      }
    }

    const subEl = document.getElementById('comparisonSubtitle');
    if (subEl) {
      subEl.textContent = isEn
        ? `Direct benchmark comparison against the previous period (${periodLabel})`
        : `முந்தைய காலக்கட்டத்துடன் நேரடி ஒப்பீடு (${periodLabel})`;
    }

    // Boxes (கட்டை)
    const curBoxes = comp.current?.boxes !== undefined ? comp.current.boxes : Number(((comp.current?.cuts || 0) / 300).toFixed(1));
    const prevBoxes = comp.previous?.boxes !== undefined ? comp.previous.boxes : Number(((comp.previous?.cuts || 0) / 300).toFixed(1));
    const compCurBoxesEl = document.getElementById('compCurBoxes');
    if (compCurBoxesEl) compCurBoxesEl.textContent = `${formatNumber(curBoxes)} Boxes`;
    const compPrevBoxesEl = document.getElementById('compPrevBoxes');
    if (compPrevBoxesEl) compPrevBoxesEl.textContent = `${formatNumber(prevBoxes)} Boxes`;
    const boxesDelta = g.boxesDelta !== undefined ? g.boxesDelta : Number((curBoxes - prevBoxes).toFixed(1));
    const dBoxes = formatDeltaDisplay(boxesDelta, 'number', 'Boxes');
    const pillBoxes = document.getElementById('compGrowthBoxes');
    if (pillBoxes) {
      pillBoxes.className = `comp-growth-pill ${dBoxes.cls}`;
      pillBoxes.textContent = dBoxes.text;
    }
    const compDeltaBoxesEl = document.getElementById('compDeltaBoxes');
    if (compDeltaBoxesEl) {
      compDeltaBoxesEl.textContent = `Δ ${boxesDelta >= 0 ? '+' : ''}${formatNumber(boxesDelta)} Boxes`;
    }

    // Cuts
    const curCuts = comp.current?.cuts || 0;
    const prevCuts = comp.previous?.cuts || 0;
    const compCurCutsEl = document.getElementById('compCurCuts');
    if (compCurCutsEl) compCurCutsEl.textContent = `${formatNumber(curCuts)} Cuts`;
    const compPrevCutsEl = document.getElementById('compPrevCuts');
    if (compPrevCutsEl) compPrevCutsEl.textContent = `${formatNumber(prevCuts)} Cuts`;
    const dCuts = formatDeltaDisplay(g.cutsDelta, 'number', 'Cuts');
    const pillCuts = document.getElementById('compGrowthCuts');
    if (pillCuts) {
      pillCuts.className = `comp-growth-pill ${dCuts.cls}`;
      pillCuts.textContent = dCuts.text;
    }
    const compDeltaCutsEl = document.getElementById('compDeltaCuts');
    if (compDeltaCutsEl) compDeltaCutsEl.textContent = `Δ ${g.cutsDelta >= 0 ? '+' : ''}${formatNumber(g.cutsDelta)} Cuts`;

    // Beedis
    const curBeedis = comp.current?.beedis || 0;
    const prevBeedis = comp.previous?.beedis || 0;
    const compCurBeedisEl = document.getElementById('compCurBeedis');
    if (compCurBeedisEl) compCurBeedisEl.textContent = `${formatNumber(curBeedis)} Pcs`;
    const compPrevBeedisEl = document.getElementById('compPrevBeedis');
    if (compPrevBeedisEl) compPrevBeedisEl.textContent = `${formatNumber(prevBeedis)} Pcs`;
    const dBeedis = formatDeltaDisplay(g.beedisDelta, 'number', 'Pcs');
    const pillBeedis = document.getElementById('compGrowthBeedis');
    if (pillBeedis) {
      pillBeedis.className = `comp-growth-pill ${dBeedis.cls}`;
      pillBeedis.textContent = dBeedis.text;
    }
    const compDeltaBeedisEl = document.getElementById('compDeltaBeedis');
    if (compDeltaBeedisEl) compDeltaBeedisEl.textContent = `Δ ${g.beedisDelta >= 0 ? '+' : ''}${formatNumber(g.beedisDelta)} Pcs`;

    // Rate
    const curRate = comp.current?.rate || 0;
    const prevRate = comp.previous?.rate || 0;
    const compCurRateEl = document.getElementById('compCurRate');
    if (compCurRateEl) compCurRateEl.textContent = formatINR(curRate);
    const compPrevRateEl = document.getElementById('compPrevRate');
    if (compPrevRateEl) compPrevRateEl.textContent = formatINR(prevRate);
    const dRate = formatDeltaDisplay(g.rateDelta, 'currency');
    const pillRate = document.getElementById('compGrowthRate');
    if (pillRate) {
      pillRate.className = `comp-growth-pill ${dRate.cls}`;
      pillRate.textContent = dRate.text;
    }
    const compDeltaRateEl = document.getElementById('compDeltaRate');
    if (compDeltaRateEl) compDeltaRateEl.textContent = `Δ ${g.rateDelta >= 0 ? '+' : ''}${formatINR(g.rateDelta)}`;

    // Salary
    const curSalary = comp.current?.salary || 0;
    const prevSalary = comp.previous?.salary || 0;
    const compCurSalaryEl = document.getElementById('compCurSalary');
    if (compCurSalaryEl) compCurSalaryEl.textContent = formatINR(curSalary);
    const compPrevSalaryEl = document.getElementById('compPrevSalary');
    if (compPrevSalaryEl) compPrevSalaryEl.textContent = formatINR(prevSalary);
    const dSalary = formatDeltaDisplay(g.salaryDelta, 'currency');
    const pillSalary = document.getElementById('compGrowthSalary');
    if (pillSalary) {
      pillSalary.className = `comp-growth-pill ${dSalary.cls}`;
      pillSalary.textContent = dSalary.text;
    }
    const compDeltaSalaryEl = document.getElementById('compDeltaSalary');
    if (compDeltaSalaryEl) compDeltaSalaryEl.textContent = `Δ ${g.salaryDelta >= 0 ? '+' : ''}${formatINR(g.salaryDelta)}`;

    // Expenses
    const curExpenses = comp.current?.expenses || 0;
    const prevExpenses = comp.previous?.expenses || 0;
    const compCurExpensesEl = document.getElementById('compCurExpenses');
    if (compCurExpensesEl) compCurExpensesEl.textContent = formatINR(curExpenses);
    const compPrevExpensesEl = document.getElementById('compPrevExpenses');
    if (compPrevExpensesEl) compPrevExpensesEl.textContent = formatINR(prevExpenses);
    const dExpenses = formatDeltaDisplay(g.expensesDelta, 'currency', '', true);
    const pillExpenses = document.getElementById('compGrowthExpenses');
    if (pillExpenses) {
      pillExpenses.className = `comp-growth-pill ${dExpenses.cls}`;
      pillExpenses.textContent = dExpenses.text;
    }
    const compDeltaExpensesEl = document.getElementById('compDeltaExpenses');
    if (compDeltaExpensesEl) compDeltaExpensesEl.textContent = `Δ ${g.expensesDelta >= 0 ? '+' : ''}${formatINR(g.expensesDelta)}`;

    // Profit
    const curProfit = comp.current?.profit || 0;
    const prevProfit = comp.previous?.profit || 0;
    const curProfitEl = document.getElementById('compCurProfit');
    if (curProfitEl) {
      curProfitEl.textContent = formatINR(curProfit);
      curProfitEl.style.color = curProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
    const prevProfitEl = document.getElementById('compPrevProfit');
    if (prevProfitEl) {
      prevProfitEl.textContent = formatINR(prevProfit);
      prevProfitEl.style.color = prevProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
    const dProfit = formatDeltaDisplay(g.profitDelta, 'currency');
    const pillProfit = document.getElementById('compGrowthProfit');
    if (pillProfit) {
      pillProfit.className = `comp-growth-pill ${dProfit.cls}`;
      pillProfit.textContent = dProfit.text;
    }
    const compDeltaProfitEl = document.getElementById('compDeltaProfit');
    if (compDeltaProfitEl) compDeltaProfitEl.textContent = `Δ ${g.profitDelta >= 0 ? '+' : ''}${formatINR(g.profitDelta)}`;
  }

  // Stock overview and alerts
  if (data.stock) {
    const elDashTob = document.getElementById('dashStockTobacco');
    if (elDashTob) elDashTob.innerHTML = `${data.stock.tobacco?.kg || 0} <span class="metric-unit">kg</span>`;
    const elDashPow = document.getElementById('dashStockPowder');
    if (elDashPow) elDashPow.innerHTML = `${data.stock.powder?.kg || 0} <span class="metric-unit">kg</span>`;

    // Low stock warning
    const alertBanner = document.getElementById('dashboardStockAlert');
    if (alertBanner) {
      if (data.stock.tobacco?.isLow || data.stock.powder?.isLow) {
        alertBanner.style.display = 'flex';
        let alertItems = [];
        if (data.stock.tobacco?.isLow) alertItems.push('Tobacco');
        if (data.stock.powder?.isLow) alertItems.push(isEn ? 'Powder' : 'தூள்');
        const alertTextEl = document.getElementById('stockAlertText');
        if (alertTextEl) {
          alertTextEl.textContent = isEn
            ? `⚠️ ${alertItems.join(', ')} stock is low (under ${data.stock.lowStockThresholdKg} kg)! Restock now.`
            : `⚠️ ${alertItems.join(', ')} இருப்பு குறைவாக உள்ளது (${data.stock.lowStockThresholdKg} kg-க்கு கீழ்)! உடனடியாக சரக்கு சேர்க்கவும்.`;
        }
      } else {
        alertBanner.style.display = 'none';
      }
    }
  }

  // ==========================================
  // Dedicated Weekly Wise & Monthly Wise Overview Cards
  // ==========================================
  function setOverviewDeltaBadge(elId, deltaVal, type = 'number', unit = '', isInverse = false) {
    const el = document.getElementById(elId);
    if (!el) return;
    const d = (typeof formatDeltaDisplay === 'function')
      ? formatDeltaDisplay(deltaVal, type, unit, isInverse)
      : { text: String(deltaVal || 0), cls: 'neutral' };
    el.className = `dash-metric-compare ${d.cls}`;
    el.textContent = d.text;
  }

  // 1. Weekly Overview Card
  const weekData = data.weekComparison || (data.period === 'week' ? data.comparison : null);
  if (weekData && weekData.current) {
    const wCur = weekData.current;
    const wGrowth = weekData.growth || {};
    const wBoxes = wCur.boxes !== undefined ? wCur.boxes : Number(((wCur.cuts || 0) / 300).toFixed(1));

    const elCuts = document.getElementById('dashWeekCuts');
    if (elCuts) elCuts.innerHTML = `${formatNumber(wBoxes)} <span class="metric-unit">${getTranslation('unitBoxes')}</span>`;
    const elBeedis = document.getElementById('dashWeekBeedis');
    if (elBeedis) elBeedis.textContent = `${formatNumber(wCur.beedis)} ${getTranslation('unitBeedis')} (${formatNumber(wCur.cuts)} Cuts)`;
    
    const wBoxesDelta = wGrowth.boxesDelta !== undefined ? wGrowth.boxesDelta : Number(((wGrowth.cutsDelta || 0) / 300).toFixed(1));
    setOverviewDeltaBadge('dashWeekCutsGrowth', wBoxesDelta, 'number', 'Bx');

    const elRate = document.getElementById('dashWeekRate');
    if (elRate) elRate.textContent = formatINR(wCur.rate);
    const elRateDelta = document.getElementById('dashWeekRateDelta');
    if (elRateDelta) elRateDelta.textContent = `Δ ${wGrowth.rateDelta >= 0 ? '+' : ''}${formatINR(wGrowth.rateDelta || 0)}`;

    const elSalary = document.getElementById('dashWeekSalary');
    if (elSalary) elSalary.textContent = formatINR(wCur.salary);
    const elSalaryDelta = document.getElementById('dashWeekSalaryDelta');
    if (elSalaryDelta) elSalaryDelta.textContent = `Δ ${wGrowth.salaryDelta >= 0 ? '+' : ''}${formatINR(wGrowth.salaryDelta || 0)}`;

    const elExp = document.getElementById('dashWeekExpenses');
    if (elExp) elExp.textContent = formatINR(wCur.expenses);
    const elExpDelta = document.getElementById('dashWeekExpDelta');
    if (elExpDelta) elExpDelta.textContent = `Δ ${wGrowth.expensesDelta >= 0 ? '+' : ''}${formatINR(wGrowth.expensesDelta || 0)}`;

    const elProfit = document.getElementById('dashWeekProfit');
    if (elProfit) {
      elProfit.textContent = formatINR(wCur.profit);
      elProfit.style.color = wCur.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
    setOverviewDeltaBadge('dashWeekProfitGrowth', wGrowth.profitDelta, 'currency');
    const elMargin = document.getElementById('dashWeekMargin');
    if (elMargin) elMargin.textContent = `Margin: ${wCur.profitMargin}%`;
  }

  // 2. Monthly Overview Card
  const monthData = data.monthComparison || (data.period === 'month' ? data.comparison : null);
  if (monthData && monthData.current) {
    const mCur = monthData.current;
    const mGrowth = monthData.growth || {};
    const mBoxes = mCur.boxes !== undefined ? mCur.boxes : Number(((mCur.cuts || 0) / 300).toFixed(1));

    const elCuts = document.getElementById('dashMonthCuts');
    if (elCuts) elCuts.innerHTML = `${formatNumber(mBoxes)} <span class="metric-unit">${getTranslation('unitBoxes')}</span>`;
    const elBeedis = document.getElementById('dashMonthBeedis');
    if (elBeedis) elBeedis.textContent = `${formatNumber(mCur.beedis)} ${getTranslation('unitBeedis')} (${formatNumber(mCur.cuts)} Cuts)`;
    
    const mBoxesDelta = mGrowth.boxesDelta !== undefined ? mGrowth.boxesDelta : Number(((mGrowth.cutsDelta || 0) / 300).toFixed(1));
    setOverviewDeltaBadge('dashMonthCutsGrowth', mBoxesDelta, 'number', 'Bx');

    const elRate = document.getElementById('dashMonthRate');
    if (elRate) elRate.textContent = formatINR(mCur.rate);
    const elRateDelta = document.getElementById('dashMonthRateDelta');
    if (elRateDelta) elRateDelta.textContent = `Δ ${mGrowth.rateDelta >= 0 ? '+' : ''}${formatINR(mGrowth.rateDelta || 0)}`;

    const elSalary = document.getElementById('dashMonthSalary');
    if (elSalary) elSalary.textContent = formatINR(mCur.salary);
    const elSalaryDelta = document.getElementById('dashMonthSalaryDelta');
    if (elSalaryDelta) elSalaryDelta.textContent = `Δ ${mGrowth.salaryDelta >= 0 ? '+' : ''}${formatINR(mGrowth.salaryDelta || 0)}`;

    const elExp = document.getElementById('dashMonthExpenses');
    if (elExp) elExp.textContent = formatINR(mCur.expenses);
    const elExpDelta = document.getElementById('dashMonthExpDelta');
    if (elExpDelta) elExpDelta.textContent = `Δ ${mGrowth.expensesDelta >= 0 ? '+' : ''}${formatINR(mGrowth.expensesDelta || 0)}`;

    const elProfit = document.getElementById('dashMonthProfit');
    if (elProfit) {
      elProfit.textContent = formatINR(mCur.profit);
      elProfit.style.color = mCur.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
    setOverviewDeltaBadge('dashMonthProfitGrowth', mGrowth.profitDelta, 'currency');
    const elMargin = document.getElementById('dashMonthMargin');
    if (elMargin) elMargin.textContent = `Margin: ${mCur.profitMargin}%`;
  } else if (data.monthlyHistory && data.monthlyHistory.length > 0) {
    const currentM = data.monthlyHistory[data.monthlyHistory.length - 1];
    const cBoxes = currentM.boxes !== undefined ? currentM.boxes : Number(((currentM.cuts || 0) / 300).toFixed(1));
    const elBeedis = document.getElementById('dashMonthBeedis');
    if (elBeedis) elBeedis.textContent = `${formatNumber(currentM.beedis)} ${getTranslation('unitBeedis')} (${formatNumber(currentM.cuts)} Cuts)`;
    const elCuts = document.getElementById('dashMonthCuts');
    if (elCuts) elCuts.innerHTML = `${formatNumber(cBoxes)} <span class="metric-unit">${getTranslation('unitBoxes')}</span>`;
    const elRate = document.getElementById('dashMonthRate');
    if (elRate) elRate.textContent = formatINR(currentM.rate);
    const elSalary = document.getElementById('dashMonthSalary');
    if (elSalary) elSalary.textContent = formatINR(currentM.salary);
    const elProfit = document.getElementById('dashMonthProfit');
    if (elProfit) {
      elProfit.textContent = formatINR(currentM.profit);
      elProfit.style.color = currentM.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
    const elMargin = document.getElementById('dashMonthMargin');
    if (elMargin) elMargin.textContent = `Margin: ${currentM.profitMargin}%`;
  }

  // Summary Table render
  renderDashboardSummaryTable(data);
}

function renderDashboardSummaryTable(data) {
  const tbody = document.getElementById('dashSummaryTableBody');
  if (!tbody) return;

  if (!data.timeSeries || data.timeSeries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color: var(--text-dim);">${getTranslation('noData')}</td></tr>`;
    return;
  }

  // Show active period days in reverse chronological order
  const rows = [...data.timeSeries].reverse();
  tbody.innerHTML = rows.map(d => {
    const profitColor = d.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    const boxes = d.boxes !== undefined ? d.boxes : Number(((d.cuts || 0) / 300).toFixed(1));
    return `
      <tr>
        <td><strong>${d.displayDate}</strong></td>
        <td><strong style="color: var(--accent-amber);">${formatNumber(boxes)}</strong></td>
        <td>${formatNumber(d.cuts)}</td>
        <td>${formatNumber(d.beedis)}</td>
        <td>${d.tobaccoKg} kg</td>
        <td>${d.powderKg} kg</td>
        <td>${formatINR(d.salary)}</td>
        <td style="color: var(--accent-gold); font-weight: 600;">${formatINR(d.rate)}</td>
        <td>${formatINR(d.expenses)}</td>
        <td style="color: ${profitColor}; font-weight: 700;">${formatINR(d.profit)}</td>
      </tr>
    `;
  }).join('');
}

function renderDashboardCharts(data) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js library is not yet loaded');
    return;
  }
  if (!data || !data.timeSeries) return;

  const isDark = (document.documentElement.getAttribute('data-theme') === 'dark');
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const fontFam = "'Outfit', 'Inter', system-ui, -apple-system, sans-serif";

  // 1. Production Trend Chart (With comparative overlay in Week mode)
  const prodCanvas = document.getElementById('chartProduction');
  if (prodCanvas) {
    if (chartProdInstance) {
      chartProdInstance.destroy();
    }

    let labels = [];
    let datasets = [];
    const prodBadgeEl = document.getElementById('chartProdBadge');

    if (currentDashboardPeriod === 'week' && data.weeklyComparison && data.weeklyComparison.length > 0) {
      // Direct Week vs Last Week comparative overlay
      labels = data.weeklyComparison.map(d => d.dayName);
      datasets = [
        {
          type: 'bar',
          label: getTranslation('compThisWeekCuts'),
          data: data.weeklyComparison.map(d => d.curCuts),
          backgroundColor: 'rgba(217, 119, 6, 0.88)',
          borderColor: '#d97706',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: getTranslation('compLastWeekCuts'),
          data: data.weeklyComparison.map(d => d.prevCuts),
          backgroundColor: 'rgba(217, 119, 6, 0.28)',
          borderColor: 'rgba(217, 119, 6, 0.65)',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: getTranslation('compThisWeekBeedis'),
          data: data.weeklyComparison.map(d => d.curBeedis),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: '#10b981',
          pointRadius: 4,
          fill: false,
          tension: 0.35,
          yAxisID: 'y1'
        },
        {
          type: 'line',
          label: getTranslation('compLastWeekBeedis'),
          data: data.weeklyComparison.map(d => d.prevBeedis),
          borderColor: 'rgba(16, 185, 129, 0.55)',
          borderDash: [5, 4],
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(16, 185, 129, 0.55)',
          pointRadius: 3,
          fill: false,
          tension: 0.35,
          yAxisID: 'y1'
        }
      ];
      if (prodBadgeEl) {
        prodBadgeEl.textContent = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en')
          ? 'This Week vs Last Week'
          : 'இந்த வாரம் vs கடந்த வாரம்';
      }
    } else {
      labels = data.timeSeries.map(d => d.displayDate);
      const cutsData = data.timeSeries.map(d => d.cuts);
      const beedisData = data.timeSeries.map(d => d.beedis);

      datasets = [
        {
          type: 'bar',
          label: getTranslation('chartCuts'),
          data: cutsData,
          backgroundColor: 'rgba(217, 119, 6, 0.85)',
          borderColor: '#d97706',
          borderWidth: 1,
          borderRadius: 5,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: getTranslation('chartBeedis'),
          data: beedisData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          borderWidth: 2.5,
          pointBackgroundColor: '#10b981',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.35,
          yAxisID: 'y1'
        }
      ];
      if (prodBadgeEl) {
        if (currentDashboardPeriod === 'day') {
          prodBadgeEl.textContent = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en') ? 'Today & Recent Days' : 'இன்று & சமீபத்திய நாட்கள்';
        } else {
          prodBadgeEl.textContent = 'Cuts & Beedis';
        }
      }
    }

    chartProdInstance = new Chart(prodCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, font: { family: fontFam, size: 11.5, weight: 'bold' } }
          },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { family: fontFam, size: 11 } },
            grid: { color: gridColor }
          },
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: getTranslation('chartCuts'), color: textColor, font: { family: fontFam, size: 11 } },
            ticks: { color: textColor, font: { family: fontFam, size: 11 } },
            grid: { color: gridColor }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: getTranslation('chartBeedis'), color: textColor, font: { family: fontFam, size: 11 } },
            ticks: { color: textColor, font: { family: fontFam, size: 11 } },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  // 2. Financial Overview Chart (Rate vs Salary vs Profit)
  const finCanvas = document.getElementById('chartFinance');
  if (finCanvas) {
    if (chartFinanceInstance) {
      chartFinanceInstance.destroy();
    }

    const labels = data.timeSeries.map(d => d.displayDate);
    const rateData = data.timeSeries.map(d => d.rate);
    const salaryData = data.timeSeries.map(d => d.salary);
    const profitData = data.timeSeries.map(d => d.profit);

    chartFinanceInstance = new Chart(finCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: getTranslation('chartRate'),
            data: rateData,
            backgroundColor: 'rgba(245, 158, 11, 0.82)',
            borderRadius: 4
          },
          {
            label: getTranslation('chartSalary'),
            data: salaryData,
            backgroundColor: 'rgba(59, 130, 246, 0.82)',
            borderRadius: 4
          },
          {
            label: getTranslation('chartNetProfit'),
            data: profitData,
            backgroundColor: profitData.map(val => val >= 0 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)'),
            borderRadius: 4
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
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ₹${Number(context.raw || 0).toLocaleString('en-IN')}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { family: fontFam, size: 11 } },
            grid: { color: gridColor }
          },
          y: {
            ticks: {
              color: textColor,
              font: { family: fontFam, size: 11 },
              callback: function(v) { return '₹' + v.toLocaleString('en-IN'); }
            },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  // 3. Material Consumption vs Stock Chart
  const matCanvas = document.getElementById('chartMaterial');
  if (matCanvas) {
    if (chartMaterialInstance) {
      chartMaterialInstance.destroy();
    }

    const matLabels = [
      getTranslation('chartTobaccoUsed'),
      getTranslation('chartPowderUsed'),
      getTranslation('chartTobaccoStock'),
      getTranslation('chartPowderStock')
    ];
    const matData = [
      data.totals.tobaccoUsedKg,
      data.totals.powderUsedKg,
      data.stock?.tobacco?.kg || 0,
      data.stock?.powder?.kg || 0
    ];

    chartMaterialInstance = new Chart(matCanvas, {
      type: 'doughnut',
      data: {
        labels: matLabels,
        datasets: [
          {
            data: matData,
            backgroundColor: [
              '#d97706',
              '#8b5cf6',
              '#10b981',
              '#06b6d4'
            ],
            borderWidth: 2,
            borderColor: isDark ? '#1e293b' : '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, font: { family: fontFam, size: 11 } }
          },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return ` ${context.label}: ${context.raw} kg`;
              }
            }
          }
        }
      }
    });
  }
}

function exportDashboardPeriodCSV() {
  if (!cachedAnalytics || !cachedAnalytics.timeSeries) {
    showToast(getTranslation('noData'), 'error');
    return;
  }

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const headers = isEn ? [
    'Date',
    'Cuts',
    'Beedis',
    'Tobacco (kg)',
    'Powder (kg)',
    'Salary (₹)',
    'Rate (₹)',
    'Expenses (₹)',
    'Net Profit (₹)'
  ] : [
    'தேதி',
    'கட்டுகள்',
    'பீடிகள்',
    'Tobacco (kg)',
    'தூள் (kg)',
    'சம்பளம் (₹)',
    'Rate (₹)',
    'செலவுகள் (₹)',
    'நிகர லாபம் (₹)'
  ];

  const rows = cachedAnalytics.timeSeries.map(d => [
    d.date,
    d.cuts,
    d.beedis,
    d.tobaccoKg,
    d.powderKg,
    d.salary,
    d.rate,
    d.expenses,
    d.profit
  ]);

  const csvContent = '\uFEFF' + [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tvs_beedi_dashboard_${currentDashboardPeriod}_${getTodayISODate()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function loadDashboardAnalytics(period = currentDashboardPeriod) {
  try {
    const res = await fetch(`/api/dashboard/analytics?period=${period}`);
    const data = await res.json();
    if (!data || !data.totals) return;

    cachedAnalytics = data;
    if (data.settings) appSettings = data.settings;
    renderDashboardUI(data);
    renderDashboardCharts(data);
  } catch (err) {
    console.error('Error loading dashboard analytics:', err);
  }
}

async function loadDashboardData() {
  await loadDashboardAnalytics(currentDashboardPeriod);
}

// ==========================================
// 2. PRODUCTION LOGIC
// ==========================================
function handleBoxesInput(val) {
  const boxes = Number(val) || 0;
  const beedisPerBox = appSettings.beedisPerBox || 6000;
  const cutsPerBox = appSettings.cutsPerBox || 300;
  const tobaccoPer1000 = appSettings.tobaccoPer1000Grams || 600;
  const powderPer1000 = appSettings.powderPer1000Grams || 200;
  const salaryPer1000 = appSettings.salaryPer1000 || 320;
  const ratePer1000 = appSettings.ratePer1000 || 340;

  const cuts = Math.round(boxes * cutsPerBox);
  const beedis = Math.round(boxes * beedisPerBox);
  const tobaccoGrams = (beedis / 1000) * tobaccoPer1000;
  const powderGrams = (beedis / 1000) * powderPer1000;
  const salary = (beedis / 1000) * salaryPer1000;
  const rate = (beedis / 1000) * ratePer1000;

  const prevBoxesEl = document.getElementById('prevBoxes');
  if (prevBoxesEl) prevBoxesEl.textContent = formatNumber(boxes);
  const prevCutsEl = document.getElementById('prevCuts');
  if (prevCutsEl) prevCutsEl.textContent = formatNumber(cuts);
  const prevBeedisEl = document.getElementById('prevBeedis');
  if (prevBeedisEl) prevBeedisEl.textContent = formatNumber(beedis);

  const prevTobaccoEl = document.getElementById('prevTobacco');
  if (prevTobaccoEl) {
    prevTobaccoEl.textContent = (tobaccoGrams >= 1000)
      ? `${(tobaccoGrams / 1000).toFixed(2)} kg`
      : `${tobaccoGrams} g`;
  }
  const prevPowderEl = document.getElementById('prevPowder');
  if (prevPowderEl) {
    prevPowderEl.textContent = (powderGrams >= 1000)
      ? `${(powderGrams / 1000).toFixed(2)} kg`
      : `${powderGrams} g`;
  }
  const prevSalaryEl = document.getElementById('prevSalary');
  if (prevSalaryEl) prevSalaryEl.textContent = formatINR(salary);
  const prevRateEl = document.getElementById('prevRate');
  if (prevRateEl) prevRateEl.textContent = formatINR(rate);
}

function handleCutsInput(val) {
  const cuts = Number(val) || 0;
  const cutsPerBox = appSettings.cutsPerBox || 300;
  const boxes = cuts > 0 ? Number((cuts / cutsPerBox).toFixed(2)) : 0;
  handleBoxesInput(boxes);
}

// Production duplicate tracking state
let currentDuplicateRecord = null;

async function handleProdDateChange(dateVal) {
  if (!dateVal) return;
  const currentEditId = document.getElementById('prodEditId') ? document.getElementById('prodEditId').value : '';

  try {
    const excludeParam = currentEditId ? `&excludeId=${encodeURIComponent(currentEditId)}` : '';
    const res = await fetch(`/api/production/check-date?date=${encodeURIComponent(dateVal)}${excludeParam}`);
    const data = await res.json();

    if (data.exists && data.record) {
      currentDuplicateRecord = data.record;
      showDuplicateAlert(data.record);
    } else {
      currentDuplicateRecord = null;
      if (!currentEditId) {
        hideDuplicateAlert();
      }
    }
  } catch (err) {
    console.warn('Error checking duplicate production date:', err);
  }
}

function showDuplicateAlert(record) {
  const alertEl = document.getElementById('prodDuplicateAlert');
  const descEl = document.getElementById('prodAlertDesc');
  if (!alertEl) return;

  const boxes = (record.boxes !== undefined && record.boxes > 0) ? record.boxes : Number(((record.cuts || 0) / 300).toFixed(1));
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  const recDateStr = formatDate(record.date);
  const recDetails = isEn
    ? `An entry already exists on ${recDateStr} (${boxes} Boxes, ${record.cuts} Cuts, ${formatNumber(record.beedis)} Beedis). Duplicate entries on the same date are strictly disallowed. Click below to edit this entry.`
    : `${recDateStr} தேதியில் ஏற்கனவே உற்பத்தி பதிவு உள்ளது (${boxes} கட்டை, ${record.cuts} கட்டுகள், ${formatNumber(record.beedis)} பீடிகள்). ஒரே தேதியில் நகல் பதிவு அனுமதிக்கப்படாது. திருத்தம் செய்ய கீழே உள்ள பொத்தானை அழுத்தவும்.`;

  if (descEl) descEl.textContent = recDetails;
  alertEl.style.display = 'block';
}

function hideDuplicateAlert() {
  const alertEl = document.getElementById('prodDuplicateAlert');
  if (alertEl) alertEl.style.display = 'none';
}

function dismissDuplicateAlert() {
  hideDuplicateAlert();
}

function loadExistingRecordForEdit() {
  if (currentDuplicateRecord && currentDuplicateRecord._id) {
    startEditProduction(currentDuplicateRecord._id);
  }
}

async function startEditProduction(id) {
  let record = cachedProduction.find(p => p._id === id);
  if (!record) {
    try {
      const res = await fetch('/api/production');
      const records = await res.json();
      cachedProduction = records;
      record = records.find(p => p._id === id);
    } catch (e) {
      console.error(e);
    }
  }

  if (!record) {
    showToast(getTranslation('noData'), 'error');
    return;
  }

  // Switch to Production tab if not already on it
  if (typeof switchTab === 'function') {
    switchTab('production');
  }

  const editIdInput = document.getElementById('prodEditId');
  const boxesInput = document.getElementById('prodBoxes');
  const dateInput = document.getElementById('prodDate');
  const submitText = document.getElementById('prodSubmitText');
  const submitIcon = document.getElementById('prodSubmitIcon');
  const cancelBtn = document.getElementById('btnCancelEditProd');
  const editBadge = document.getElementById('prodEditModeBadge');
  const editModeText = document.getElementById('prodEditModeText');

  if (editIdInput) editIdInput.value = record._id;

  const boxes = (record.boxes !== undefined && record.boxes > 0) ? record.boxes : Number(((record.cuts || 0) / 300).toFixed(2));
  if (boxesInput) {
    boxesInput.value = boxes;
    handleBoxesInput(boxes);
  }

  if (dateInput) {
    const d = new Date(record.date);
    const dateStr = d.toISOString().split('T')[0];
    dateInput.value = dateStr;
  }

  // Update UI for Edit Mode
  if (submitText) submitText.textContent = getTranslation('updateProductionBtn');
  if (submitIcon) submitIcon.textContent = '✏️';
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  if (editBadge) {
    editBadge.style.display = 'flex';
    if (editModeText) {
      editModeText.textContent = isEn
        ? `✏️ Editing Record for ${formatDate(record.date)} (${boxes} Boxes)`
        : `✏️ ${formatDate(record.date)} தேதிக்கான பதிவு திருத்தம் செய்யப்படுகிறது (${boxes} கட்டை)`;
    }
  }

  hideDuplicateAlert();

  // Smooth scroll to form
  const formCard = document.getElementById('productionForm');
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  showToast(getTranslation('editModeActive'), 'info');
}

function cancelEditProduction() {
  const editIdInput = document.getElementById('prodEditId');
  const boxesInput = document.getElementById('prodBoxes');
  const dateInput = document.getElementById('prodDate');
  const submitText = document.getElementById('prodSubmitText');
  const submitIcon = document.getElementById('prodSubmitIcon');
  const cancelBtn = document.getElementById('btnCancelEditProd');
  const editBadge = document.getElementById('prodEditModeBadge');

  if (editIdInput) editIdInput.value = '';
  if (boxesInput) boxesInput.value = '';
  if (dateInput) dateInput.value = getTodayISODate();

  handleBoxesInput(0);

  if (submitText) submitText.textContent = getTranslation('saveProductionBtn');
  if (submitIcon) submitIcon.textContent = '💾';
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (editBadge) editBadge.style.display = 'none';

  hideDuplicateAlert();
  currentDuplicateRecord = null;
}

async function handleProductionSubmit(event) {
  event.preventDefault();
  const editId = document.getElementById('prodEditId') ? document.getElementById('prodEditId').value : '';
  const isEditing = Boolean(editId);

  const boxesInput = document.getElementById('prodBoxes');
  const cutsInput = document.getElementById('prodCuts');
  const cutsPerBox = appSettings.cutsPerBox || 300;

  let boxes = 0;
  let cuts = 0;
  if (boxesInput && boxesInput.value !== '') {
    boxes = Number(boxesInput.value) || 0;
    cuts = Math.round(boxes * cutsPerBox);
  } else if (cutsInput) {
    cuts = Number(cutsInput.value) || 0;
    boxes = cuts > 0 ? Number((cuts / cutsPerBox).toFixed(2)) : 0;
  }

  const date = document.getElementById('prodDate').value;
  const wastageGrams = 0;
  const notes = isEditing ? 'Updated entry' : '';

  try {
    const url = isEditing ? `/api/production/${editId}` : '/api/production';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boxes, cuts, date, wastageGrams, notes })
    });

    if (res.status === 409) {
      // Conflict - duplicate date!
      const err = await res.json();
      showToast(getTranslation('duplicateErrorToast'), 'error');
      if (err.existingRecord && err.existingRecord._id) {
        currentDuplicateRecord = err.existingRecord;
        showDuplicateAlert(err.existingRecord);
        // Automatic redirect to edit the existing record!
        setTimeout(() => {
          startEditProduction(err.existingRecord._id);
        }, 600);
      }
      return;
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save production');
    }

    showToast(isEditing ? getTranslation('successUpdated') : getTranslation('successSaved'), 'success');
    cancelEditProduction();

    loadProductionData();
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderProductionUI(records) {
  const tbody = document.getElementById('productionTableBody');
  if (!tbody) return;

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--text-dim);">${getTranslation('noData')}</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(p => {
    const boxes = p.boxes !== undefined ? p.boxes : Number(((p.cuts || 0) / 300).toFixed(1));
    return `
    <tr>
      <td><strong>${formatDate(p.date)}</strong></td>
      <td><span style="color: var(--accent-amber); font-weight: 700;">${formatNumber(boxes)}</span> ${getTranslation('unitBoxes')}</td>
      <td>${formatNumber(p.cuts)} ${getTranslation('unitCuts')}</td>
      <td>${formatNumber(p.beedis)}</td>
      <td>${(p.tobaccoUsedGrams / 1000).toFixed(2)} kg</td>
      <td>${(p.powderUsedGrams / 1000).toFixed(2)} kg</td>
      <td>${formatINR(p.salary)}</td>
      <td style="color: var(--accent-gold); font-weight: 700;">${formatINR(p.rate)}</td>
      <td>
        <div class="table-actions-cell">
          <button class="btn-secondary btn-table-action" onclick="startEditProduction('${p._id}')" title="${getTranslation('editBtn')}">✏️</button>
          <button class="btn-danger btn-table-action" onclick="deleteProduction('${p._id}')" title="${getTranslation('deleteBtn')}">✕</button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

async function loadProductionData() {
  try {
    const res = await fetch('/api/production');
    const records = await res.json();
    cachedProduction = records;
    renderProductionUI(records);
  } catch (err) {
    console.error('Error loading production records:', err);
  }
}

async function deleteProduction(id) {
  if (!await showConfirmDialog(getTranslation('deleteConfirm'))) return;

  try {
    const res = await fetch(`/api/production/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    showToast(getTranslation('successDeleted'), 'success');
    loadProductionData();
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}


// ==========================================
// 3. STOCK LOGIC
// ==========================================
function renderStockUI(data) {
  if (!data) return;
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  // Tobacco & Powder cards
  const elTobKg = document.getElementById('stockTobaccoKg');
  if (elTobKg) elTobKg.innerHTML = `${data.tobacco.kg} <span class="metric-unit">kg</span>`;
  const elTobGrams = document.getElementById('stockTobaccoGrams');
  if (elTobGrams) elTobGrams.textContent = `${formatNumber(data.tobacco.grams)} ${getTranslation('unitGrams')}`;

  const consumedTodayTobKg = data.consumption?.today?.tobaccoKg ?? 0;
  const consumedTodayTobGrams = data.consumption?.today?.tobaccoGrams ?? 0;
  const elTobConsumedSub = document.getElementById('stockTobaccoConsumedSub');
  if (elTobConsumedSub) {
    elTobConsumedSub.textContent = isEn
      ? `Today Consumed: ${consumedTodayTobKg} kg (${formatNumber(consumedTodayTobGrams)}g)`
      : `இன்று உற்பத்தி பயன்பாடு: ${consumedTodayTobKg} kg (${formatNumber(consumedTodayTobGrams)}g)`;
  }

  const elPowKg = document.getElementById('stockPowderKg');
  if (elPowKg) elPowKg.innerHTML = `${data.powder.kg} <span class="metric-unit">kg</span>`;
  const elPowGrams = document.getElementById('stockPowderGrams');
  if (elPowGrams) elPowGrams.textContent = `${formatNumber(data.powder.grams)} ${getTranslation('unitGrams')}`;

  const consumedTodayPowKg = data.consumption?.today?.powderKg ?? 0;
  const consumedTodayPowGrams = data.consumption?.today?.powderGrams ?? 0;
  const elPowConsumedSub = document.getElementById('stockPowderConsumedSub');
  if (elPowConsumedSub) {
    elPowConsumedSub.textContent = isEn
      ? `Today Consumed: ${consumedTodayPowKg} kg (${formatNumber(consumedTodayPowGrams)}g)`
      : `இன்று உற்பத்தி பயன்பாடு: ${consumedTodayPowKg} kg (${formatNumber(consumedTodayPowGrams)}g)`;
  }

  // Material Consumption Reporting Card breakdown
  if (data.consumption) {
    const cToday = data.consumption.today || {};
    const cWeek = data.consumption.week || {};
    const cMonth = data.consumption.month || {};
    const cTotal = data.consumption.total || {};

    const elRepTodayTob = document.getElementById('stockRepTodayTobacco');
    if (elRepTodayTob) elRepTodayTob.textContent = `${cToday.tobaccoKg || 0} kg`;
    const elRepTodayPow = document.getElementById('stockRepTodayPowder');
    if (elRepTodayPow) elRepTodayPow.textContent = `${cToday.powderKg || 0} kg`;
    const elRepTodayCuts = document.getElementById('stockRepTodayCuts');
    if (elRepTodayCuts) elRepTodayCuts.textContent = `${formatNumber(cToday.cuts || 0)} Cuts (${formatNumber(cToday.beedis || 0)} ${getTranslation('unitBeedis')})`;

    const elRepWeekTob = document.getElementById('stockRepWeekTobacco');
    if (elRepWeekTob) elRepWeekTob.textContent = `${cWeek.tobaccoKg || 0} kg`;
    const elRepWeekPow = document.getElementById('stockRepWeekPowder');
    if (elRepWeekPow) elRepWeekPow.textContent = `${cWeek.powderKg || 0} kg`;
    const elRepWeekCuts = document.getElementById('stockRepWeekCuts');
    if (elRepWeekCuts) elRepWeekCuts.textContent = `${formatNumber(cWeek.cuts || 0)} Cuts (${formatNumber(cWeek.beedis || 0)} ${getTranslation('unitBeedis')})`;

    const elRepMonthTob = document.getElementById('stockRepMonthTobacco');
    if (elRepMonthTob) elRepMonthTob.textContent = `${cMonth.tobaccoKg || 0} kg`;
    const elRepMonthPow = document.getElementById('stockRepMonthPowder');
    if (elRepMonthPow) elRepMonthPow.textContent = `${cMonth.powderKg || 0} kg`;
    const elRepMonthCuts = document.getElementById('stockRepMonthCuts');
    if (elRepMonthCuts) elRepMonthCuts.textContent = `${formatNumber(cMonth.cuts || 0)} Cuts (${formatNumber(cMonth.beedis || 0)} ${getTranslation('unitBeedis')})`;

    const elRepTotalTob = document.getElementById('stockRepTotalTobacco');
    if (elRepTotalTob) elRepTotalTob.textContent = `${cTotal.tobaccoKg || 0} kg`;
    const elRepTotalPow = document.getElementById('stockRepTotalPowder');
    if (elRepTotalPow) elRepTotalPow.textContent = `${cTotal.powderKg || 0} kg`;
    const elRepTotalCuts = document.getElementById('stockRepTotalCuts');
    if (elRepTotalCuts) elRepTotalCuts.textContent = `${formatNumber(cTotal.cuts || 0)} Cuts (${formatNumber(cTotal.beedis || 0)} ${getTranslation('unitBeedis')})`;
  }

  // Movements ledger table
  const tbody = document.getElementById('stockMovementsTableBody');
  if (tbody && data.movements) {
    if (data.movements.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-dim);">${getTranslation('noData')}</td></tr>`;
    } else {
      const typeMap = {
        initial: getTranslation('typeInitial'),
        added: getTranslation('typeAdded'),
        production_usage: getTranslation('typeProdUsage'),
        adjustment: getTranslation('typeAdjustment'),
        wastage: getTranslation('typeWastage')
      };
      tbody.innerHTML = data.movements.map(m => {
        const isAdd = m.quantityGrams > 0;
        const qtyText = isAdd ? `+${(m.quantityGrams / 1000).toFixed(2)} kg` : `${(m.quantityGrams / 1000).toFixed(2)} kg`;
        const qtyColor = isAdd ? 'var(--accent-green)' : 'var(--accent-red)';
        const itemDisplay = (m.item === 'tobacco') ? 'Tobacco' : (isEn ? 'Powder' : 'தூள்');
        const movementType = typeMap[m.type] || m.type;
        return `
          <tr>
            <td>${formatDate(m.date)}</td>
            <td><strong>${itemDisplay}</strong></td>
            <td><span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.06);">${movementType}</span></td>
            <td style="color: ${qtyColor}; font-weight: 700;">${qtyText}</td>
            <td>${(m.balanceAfterGrams / 1000).toFixed(2)} kg</td>
            <td style="color: var(--text-muted); font-size: 12px;">${m.notes || '-'}</td>
            <td>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button class="btn-action-edit" onclick="openEditStockMovementModal('${m._id}')" title="${getTranslation('editBtn')}">✏️</button>
                <button class="btn-danger" onclick="deleteStockMovementAction('${m._id}')" title="${getTranslation('deleteBtn')}">✕</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}

async function loadStockData() {
  try {
    const res = await fetch('/api/stock');
    const data = await res.json();
    if (!data) return;

    cachedStock = data;
    renderStockUI(data);
  } catch (err) {
    console.error('Error loading stock data:', err);
  }
}

function runBagCalculator() {
  const totalKg = Number(document.getElementById('bagCalcTotalKg')?.value) || 35;
  const wastageKg = Number(document.getElementById('bagCalcWastageKg')?.value) || 2;
  const bagSize = Number(document.getElementById('bagCalcBagSize')?.value) || 600;

  const usableGrams = Math.max(0, (totalKg - wastageKg) * 1000);
  const usableKg = usableGrams / 1000;
  const bags = bagSize > 0 ? Math.floor(usableGrams / bagSize) : 0;

  const resBagsEl = document.getElementById('bagCalcResultBags');
  const resUsableEl = document.getElementById('bagCalcResultUsable');
  if (resBagsEl) resBagsEl.innerHTML = `${bags} <span class="metric-unit">Bags</span>`;
  if (resUsableEl) resUsableEl.textContent = `${usableKg} kg Usable (${formatNumber(usableGrams)}g ÷ ${bagSize}g)`;
}

function updateStockModalItemFields() {
  const notesLabel = document.getElementById('stockActionNotesLabel');
  const notesInput = document.getElementById('stockActionNotes');
  if (notesLabel) notesLabel.textContent = getTranslation('modalNotesLabel') || 'குறிப்புகள் / விவரம் (Notes / Details)';
  if (notesInput) notesInput.placeholder = getTranslation('notesPlaceholder') || 'விருப்பத்தேர்வு (Optional)';
}

function setLeafType(val) {
  const input = document.getElementById('stockActionNotes');
  if (input) {
    input.value = val;
    input.focus();
  }
}

function setEditLeafType(val) {
  const input = document.getElementById('editMovementNotes');
  if (input) {
    input.value = val;
    input.focus();
  }
}

function openStockModal(item = 'tobacco', type = 'add') {
  const modal = document.getElementById('stockModal');
  const itemSelect = document.getElementById('stockActionItem');
  const actionType = document.getElementById('stockActionType');
  const title = document.getElementById('stockModalTitle');
  const kgLabel = document.getElementById('stockActionKgLabel');

  if (itemSelect) itemSelect.value = item;
  if (actionType) actionType.value = type;

  if (type === 'adjust') {
    title.textContent = getTranslation('modalAdjustTitle');
    kgLabel.textContent = getTranslation('modalKgLabelAdjust');
  } else {
    title.textContent = getTranslation('modalAddTitle');
    kgLabel.textContent = getTranslation('modalKgLabelAdd');
  }

  updateStockModalItemFields();

  if (modal) modal.classList.add('active');
}

function closeStockModal() {
  const modal = document.getElementById('stockModal');
  if (modal) modal.classList.remove('active');
}

async function handleStockActionSubmit(event) {
  event.preventDefault();
  const type = document.getElementById('stockActionType').value;
  const item = document.getElementById('stockActionItem').value;
  const quantityKg = document.getElementById('stockActionKg').value;
  const notes = document.getElementById('stockActionNotes').value;

  const endpoint = (type === 'adjust') ? '/api/stock/adjust' : '/api/stock/add';
  const payload = (type === 'adjust')
    ? { item, newQuantityKg: quantityKg, notes }
    : { item, quantityKg, notes };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Stock action failed');

    showToast(getTranslation('successSaved'), 'success');
    closeStockModal();
    document.getElementById('stockActionForm').reset();
    loadStockData();
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openEditStockMovementModal(movementId) {
  const m = cachedStock?.movements?.find(x => x._id === movementId);
  if (!m) return;

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const modal = document.getElementById('editStockMovementModal');
  const idInput = document.getElementById('editMovementId');
  const itemInput = document.getElementById('editMovementItem');
  const dateInput = document.getElementById('editMovementDate');
  const kgInput = document.getElementById('editMovementKg');
  const notesInput = document.getElementById('editMovementNotes');
  const notesLabel = document.getElementById('editMovementNotesLabel');
  const editChips = document.getElementById('editLeafChips');

  if (idInput) idInput.value = m._id;
  if (itemInput) itemInput.value = (m.item === 'tobacco') ? 'Tobacco' : (isEn ? 'Powder' : 'தூள்');
  if (dateInput) {
    dateInput.value = m.date ? new Date(m.date).toISOString().split('T')[0] : getTodayISODate();
  }
  if (kgInput) {
    kgInput.value = (Math.abs(m.quantityGrams) / 1000).toFixed(2);
  }
  if (notesInput) {
    notesInput.value = m.notes || '';
    notesInput.placeholder = getTranslation('notesPlaceholder') || 'விருப்பத்தேர்வு (Optional)';
  }
  if (notesLabel) {
    notesLabel.textContent = getTranslation('modalNotesLabel') || 'குறிப்புகள் / விவரம் (Notes / Details)';
  }
  if (editChips) {
    editChips.style.display = 'none';
  }

  if (modal) modal.classList.add('active');
}

function closeEditStockMovementModal() {
  const modal = document.getElementById('editStockMovementModal');
  if (modal) modal.classList.remove('active');
}

async function handleEditStockMovementSubmit(event) {
  event.preventDefault();
  const id = document.getElementById('editMovementId')?.value;
  const date = document.getElementById('editMovementDate')?.value;
  const quantityKg = document.getElementById('editMovementKg')?.value;
  const notes = document.getElementById('editMovementNotes')?.value;

  if (!id) return;

  try {
    const res = await fetch(`/api/stock/movement/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        quantityKg: Number(quantityKg),
        notes
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Edit stock movement failed');
    }

    showToast(getTranslation('successSaved'), 'success');
    closeEditStockMovementModal();
    loadStockData();
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteStockMovementAction(movementId) {
  if (!await showConfirmDialog(getTranslation('deleteMovementConfirm'))) return;

  try {
    const res = await fetch(`/api/stock/movement/${movementId}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Delete failed');
    }

    showToast(getTranslation('successDeleted'), 'success');
    loadStockData();
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// 4. EXPENSES LOGIC
// ==========================================
function selectExpenseCat(btn, category) {
  document.querySelectorAll('.category-pills .cat-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('expCategory').value = category;
}

async function handleExpenseSubmit(event) {
  event.preventDefault();
  const category = document.getElementById('expCategory').value;
  const amount = document.getElementById('expAmount').value;
  const dateEl = document.getElementById('expenseDate') || document.getElementById('expDate');
  const date = dateEl ? dateEl.value : getTodayISODate();
  const paymentMethod = document.getElementById('expPayment').value;
  const description = document.getElementById('expDesc').value;

  try {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, amount, date, paymentMethod, description })
    });

    if (!res.ok) throw new Error('Failed to record expense');

    showToast(getTranslation('successSaved'), 'success');
    document.getElementById('expenseForm').reset();
    if (dateEl) dateEl.value = getTodayISODate();

    loadExpensesData();
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderExpensesUI(records) {
  const tbody = document.getElementById('expenseTableBody');
  if (!tbody) return;

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-dim);">${getTranslation('noData')}</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(e => `
    <tr>
      <td><strong>${formatDate(e.date)}</strong></td>
      <td><span style="color: var(--accent-gold); font-weight: 600;">${e.category}</span></td>
      <td style="color: var(--accent-red); font-weight: 700;">${formatINR(e.amount)}</td>
      <td>${e.paymentMethod}</td>
      <td style="color: var(--text-muted);">${e.description || '-'}</td>
      <td>
        <button class="btn-danger" onclick="deleteExpense('${e._id}')" title="${getTranslation('deleteBtn')}">✕</button>
      </td>
    </tr>
  `).join('');
}

async function loadExpensesData() {
  try {
    const res = await fetch('/api/expenses');
    const records = await res.json();
    cachedExpenses = records;
    renderExpensesUI(records);
  } catch (err) {
    console.error('Error loading expenses:', err);
  }
}

async function deleteExpense(id) {
  if (!await showConfirmDialog(getTranslation('deleteConfirm'))) return;

  try {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    showToast(getTranslation('successDeleted'), 'success');
    loadExpensesData();
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// 5. EXPORT & DISPATCH LOGIC (கம்பெனி ஏற்றுமதி)
// ==========================================
function setExportFilter(mode, btn) {
  exportFilterMode = mode;
  document.querySelectorAll('#view-export .cat-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const now = new Date();
  let from = '';
  let to = '';

  if (mode === 'today') {
    from = getTodayISODate();
    to = getTodayISODate();
  } else if (mode === 'yesterday') {
    const y = new Date(now.getTime() - 86400000);
    from = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    to = from;
  } else if (mode === 'week') {
    const w = new Date(now.getTime() - (7 * 86400000));
    from = `${w.getFullYear()}-${String(w.getMonth() + 1).padStart(2, '0')}-${String(w.getDate()).padStart(2, '0')}`;
    to = getTodayISODate();
  } else if (mode === 'month') {
    from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    to = getTodayISODate();
  }

  const fromEl = document.getElementById('exportFromDate');
  const toEl = document.getElementById('exportToDate');
  if (fromEl) fromEl.value = from;
  if (toEl) toEl.value = to;

  loadExportData(from, to);
}

function applyCustomExportDateFilter() {
  const from = document.getElementById('exportFromDate') ? document.getElementById('exportFromDate').value : '';
  const to = document.getElementById('exportToDate') ? document.getElementById('exportToDate').value : '';
  loadExportData(from, to);
}

function getAvailableStockForExport() {
  const baseStock = (cachedExports && cachedExports.totals && typeof cachedExports.totals.packedStockInHand === 'number')
    ? cachedExports.totals.packedStockInHand
    : 0;

  const currentEditId = document.getElementById('expEditId') ? document.getElementById('expEditId').value : '';
  if (currentEditId && cachedExports && cachedExports.exports) {
    const existing = cachedExports.exports.find(e => e._id === currentEditId);
    if (existing) {
      const recBoxes = existing.boxes !== undefined ? existing.boxes : ((existing.cuts || 0) / 300);
      return Number((baseStock + recBoxes).toFixed(1));
    }
  }

  return Number(baseStock.toFixed(1));
}

function handleExportBoxesInput(val) {
  const boxes = Number(val) || 0;
  const beedisPerBox = appSettings.beedisPerBox || 6000;
  const cutsPerBox = appSettings.cutsPerBox || 300;
  const salaryPer1000 = appSettings.salaryPer1000 || 320;
  const ratePer1000 = appSettings.ratePer1000 || 340;

  const cuts = Math.round(boxes * cutsPerBox);
  const beedis = Math.round(boxes * beedisPerBox);
  const salary = (beedis / 1000) * salaryPer1000;
  const rate = (beedis / 1000) * ratePer1000;
  const margin = rate - salary;

  const elBoxes = document.getElementById('prevExpBoxes');
  if (elBoxes) elBoxes.textContent = formatNumber(boxes);
  const elCuts = document.getElementById('prevExpCuts');
  if (elCuts) elCuts.textContent = formatNumber(cuts);
  const elBeedis = document.getElementById('prevExpBeedis');
  if (elBeedis) elBeedis.textContent = formatNumber(beedis);
  const elRate = document.getElementById('prevExpRate');
  if (elRate) elRate.textContent = formatINR(rate);
  const elSalary = document.getElementById('prevExpSalary');
  if (elSalary) elSalary.textContent = formatINR(salary);
  const elMargin = document.getElementById('prevExpMargin');
  if (elMargin) elMargin.textContent = formatINR(margin);

  // Live stock limit validation
  const available = getAvailableStockForExport();
  const exceededEl = document.getElementById('expStockExceededMsg');
  const submitBtn = document.getElementById('expSubmitBtn');
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  if (boxes > available) {
    if (exceededEl) {
      exceededEl.style.display = 'block';
      exceededEl.textContent = isEn
        ? `⚠️ Cannot exceed packed stock in hand (${available} Boxes available)!`
        : `⚠️ ஏற்றுமதி அளவு கையிருப்பை விட அதிகமாக உள்ளது! (கையிருப்பு: ${available} கட்டை மட்டுமே உள்ளது)`;
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
    }
  } else {
    if (exceededEl) exceededEl.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    }
  }
}

async function handleExportDateChange(dateVal) {
  if (!dateVal) return;
  const currentEditId = document.getElementById('expEditId') ? document.getElementById('expEditId').value : '';

  try {
    const excludeParam = currentEditId ? `&excludeId=${encodeURIComponent(currentEditId)}` : '';
    const res = await fetch(`/api/export/check-date?date=${encodeURIComponent(dateVal)}${excludeParam}`);
    const data = await res.json();

    if (data.exists && data.record) {
      currentDuplicateExportRecord = data.record;
      showExportDuplicateAlert(data.record);
    } else {
      currentDuplicateExportRecord = null;
      if (!currentEditId) {
        hideExportDuplicateAlert();
      }
    }
  } catch (err) {
    console.warn('Error checking duplicate export date:', err);
  }
}

function showExportDuplicateAlert(record) {
  const alertEl = document.getElementById('expDuplicateAlert');
  const descEl = document.getElementById('expAlertDesc');
  if (!alertEl) return;

  const boxes = (record.boxes !== undefined && record.boxes > 0) ? record.boxes : Number(((record.cuts || 0) / 300).toFixed(1));
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const recDateStr = formatDate(record.date);

  const recDetails = isEn
    ? `An export entry already exists on ${recDateStr} (${boxes} Boxes, ${record.cuts} Cuts, ${formatNumber(record.beedis)} Beedis, ${record.companyName || 'TVS'}). Duplicate export on the same date is disallowed. Click below to edit it.`
    : `${recDateStr} தேதியில் ஏற்கனவே ஏற்றுமதி பதிவு உள்ளது (${boxes} கட்டை, ${record.cuts} கட்டுகள், ${formatNumber(record.beedis)} பீடிகள், ${record.companyName || 'TVS'}). ஒரே தேதியில் நகல் பதிவு அனுமதிக்கப்படாது. திருத்தம் செய்ய கீழே உள்ள பொத்தானை அழுத்தவும்.`;

  if (descEl) descEl.textContent = recDetails;
  alertEl.style.display = 'block';
}

function hideExportDuplicateAlert() {
  const alertEl = document.getElementById('expDuplicateAlert');
  if (alertEl) alertEl.style.display = 'none';
}

function dismissExportDuplicateAlert() {
  hideExportDuplicateAlert();
}

function loadExistingExportForEdit() {
  if (currentDuplicateExportRecord && currentDuplicateExportRecord._id) {
    startEditExport(currentDuplicateExportRecord._id);
  }
}

async function startEditExport(id) {
  let record = cachedExports && cachedExports.exports ? cachedExports.exports.find(p => p._id === id) : null;
  if (!record) {
    try {
      const res = await fetch('/api/export');
      const data = await res.json();
      if (data && data.exports) {
        cachedExports = data;
        record = data.exports.find(p => p._id === id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!record) {
    showToast(getTranslation('noData'), 'error');
    return;
  }

  if (typeof switchTab === 'function') {
    switchTab('export');
  }

  const editIdInput = document.getElementById('expEditId');
  const boxesInput = document.getElementById('expBoxes');
  const dateInput = document.getElementById('exportDate') || document.getElementById('expDate');
  const companyInput = document.getElementById('expCompany');
  const notesInput = document.getElementById('expNotes');

  const submitText = document.getElementById('expSubmitText');
  const submitIcon = document.getElementById('expSubmitIcon');
  const cancelBtn = document.getElementById('btnCancelEditExp');
  const editBadge = document.getElementById('expEditModeBadge');
  const editModeText = document.getElementById('expEditModeText');

  if (editIdInput) editIdInput.value = record._id;
  const expAvailBadgeVal = document.getElementById('expAvailableStockVal');
  if (expAvailBadgeVal) expAvailBadgeVal.textContent = formatNumber(getAvailableStockForExport());

  if (boxesInput) {
    boxesInput.value = record.boxes;
    handleExportBoxesInput(record.boxes);
  }
  if (dateInput) {
    const d = new Date(record.date);
    dateInput.value = d.toISOString().split('T')[0];
  }
  if (companyInput) companyInput.value = record.companyName || 'TVS Beedi Company';
  if (notesInput) notesInput.value = record.notes || '';

  if (submitText) submitText.textContent = getTranslation('updateExportBtn');
  if (submitIcon) submitIcon.textContent = '✏️';
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  if (editBadge) {
    editBadge.style.display = 'flex';
    if (editModeText) {
      editModeText.textContent = isEn
        ? `✏️ Editing Export for ${formatDate(record.date)} (${record.boxes} Boxes)`
        : `✏️ ${formatDate(record.date)} தேதிக்கான ஏற்றுமதி திருத்தம் (${record.boxes} கட்டை)`;
    }
  }

  hideExportDuplicateAlert();

  const formCard = document.getElementById('exportForm');
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  showToast(getTranslation('editExportModeActive'), 'info');
}

function cancelEditExport() {
  const editIdInput = document.getElementById('expEditId');
  const boxesInput = document.getElementById('expBoxes');
  const dateInput = document.getElementById('exportDate') || document.getElementById('expDate');
  const notesInput = document.getElementById('expNotes');

  const submitText = document.getElementById('expSubmitText');
  const submitIcon = document.getElementById('expSubmitIcon');
  const cancelBtn = document.getElementById('btnCancelEditExp');
  const editBadge = document.getElementById('expEditModeBadge');
  const exceededEl = document.getElementById('expStockExceededMsg');
  const submitBtn = document.getElementById('expSubmitBtn');

  if (editIdInput) editIdInput.value = '';
  if (boxesInput) boxesInput.value = '';
  if (dateInput) dateInput.value = getTodayISODate();
  if (notesInput) notesInput.value = '';

  const expAvailBadgeVal = document.getElementById('expAvailableStockVal');
  if (expAvailBadgeVal) expAvailBadgeVal.textContent = formatNumber(getAvailableStockForExport());

  if (exceededEl) exceededEl.style.display = 'none';
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
  }

  handleExportBoxesInput(0);

  if (submitText) submitText.textContent = getTranslation('saveExportBtn');
  if (submitIcon) submitIcon.textContent = '🚚';
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (editBadge) editBadge.style.display = 'none';

  hideExportDuplicateAlert();
  currentDuplicateExportRecord = null;
}

async function handleExportSubmit(event) {
  event.preventDefault();
  const editId = document.getElementById('expEditId') ? document.getElementById('expEditId').value : '';
  const isEditing = Boolean(editId);

  const boxesInput = document.getElementById('expBoxes');
  const cutsPerBox = appSettings.cutsPerBox || 300;
  const boxes = Number(boxesInput.value) || 0;
  const cuts = Math.round(boxes * cutsPerBox);

  if (boxes <= 0) {
    showToast(getTranslation('errorInvalidData') || 'Please enter valid boxes count', 'error');
    return;
  }

  // Client-side validation against packed stock in hand
  const available = getAvailableStockForExport();
  if (boxes > available) {
    const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
    showToast(isEn
      ? `Export quantity (${boxes} Boxes) cannot exceed packed stock in hand (${available} Boxes)!`
      : `ஏற்றுமதி கட்டை (${boxes}) கையிருப்பை (${available}) விட அதிகமாக இருக்கக்கூடாது!`, 'error');
    return;
  }

  const dateEl = document.getElementById('exportDate') || document.getElementById('expDate');
  const date = dateEl ? dateEl.value : getTodayISODate();
  const companyName = document.getElementById('expCompany') ? document.getElementById('expCompany').value : '';
  const notes = document.getElementById('expNotes') ? document.getElementById('expNotes').value : '';

  try {
    const url = isEditing ? `/api/export/${editId}` : '/api/export';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boxes, cuts, date, companyName, notes })
    });

    if (res.status === 409) {
      const err = await res.json();
      showToast(getTranslation('duplicateExportWarning'), 'error');
      if (err.existingRecord && err.existingRecord._id) {
        currentDuplicateExportRecord = err.existingRecord;
        showExportDuplicateAlert(err.existingRecord);
        setTimeout(() => {
          startEditExport(err.existingRecord._id);
        }, 600);
      }
      return;
    }

    if (!res.ok) {
      const err = await res.json();
      const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
      const msg = (err.insufficientStock && !isEn && err.errorTa) ? err.errorTa : (err.error || 'Failed to save export');
      throw new Error(msg);
    }

    showToast(isEditing ? getTranslation('successExportUpdated') : getTranslation('successExportSaved'), 'success');
    cancelEditExport();

    loadExportData();
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderExportUI(data) {
  if (!data || !data.totals) return;

  // Metric Cards
  const expTodayBoxesEl = document.getElementById('expTodayBoxes');
  if (expTodayBoxesEl) {
    expTodayBoxesEl.innerHTML = `${formatNumber(data.totals.todayBoxes || 0)} <span class="metric-unit">${getTranslation('unitBoxes')}</span>`;
  }
  const expTodayBeedisEl = document.getElementById('expTodayBeedis');
  if (expTodayBeedisEl) {
    const todayBeedis = (data.totals.todayBoxes || 0) * (appSettings.beedisPerBox || 6000);
    expTodayBeedisEl.textContent = `${formatNumber(todayBeedis)} ${getTranslation('unitBeedis')}`;
  }

  const expTotalBoxesEl = document.getElementById('expTotalBoxes');
  if (expTotalBoxesEl) {
    expTotalBoxesEl.innerHTML = `${formatNumber(data.totals.boxes)} <span class="metric-unit">${getTranslation('unitBoxes')}</span>`;
  }
  const expTotalCutsEl = document.getElementById('expTotalCuts');
  if (expTotalCutsEl) {
    expTotalCutsEl.textContent = `${formatNumber(data.totals.cuts)} ${getTranslation('unitCuts')} (300/Box)`;
  }

  const expTotalRateEl = document.getElementById('expTotalRate');
  if (expTotalRateEl) expTotalRateEl.textContent = formatINR(data.totals.rate);

  const expTotalProfitEl = document.getElementById('expTotalProfit');
  if (expTotalProfitEl) expTotalProfitEl.textContent = `வித்தியாசம்: ${formatINR(data.totals.profit)}`;

  const expPackedStockEl = document.getElementById('expPackedStock');
  if (expPackedStockEl) {
    expPackedStockEl.innerHTML = `${formatNumber(data.totals.packedStockInHand || 0)} <span class="metric-unit">${getTranslation('unitBoxes')}</span>`;
  }
  const expStockSubEl = document.getElementById('expStockSub');
  if (expStockSubEl) {
    expStockSubEl.textContent = `உற்பத்தி: ${formatNumber(data.totals.totalProducedBoxes || 0)} Bx | ஏற்றுமதி: ${formatNumber(data.totals.boxes || 0)} Bx`;
  }

  const expAvailBadgeVal = document.getElementById('expAvailableStockVal');
  if (expAvailBadgeVal) {
    expAvailBadgeVal.textContent = formatNumber(getAvailableStockForExport());
  }

  // History Table
  const tbody = document.getElementById('exportTableBody');
  if (tbody && data.exports) {
    if (data.exports.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-dim);">${getTranslation('noData')}</td></tr>`;
      return;
    }

    tbody.innerHTML = data.exports.map(p => {
      const boxes = p.boxes !== undefined ? p.boxes : Number(((p.cuts || 0) / 300).toFixed(1));
      return `
        <tr>
          <td><strong>${formatDate(p.date)}</strong></td>
          <td><span style="color: var(--accent-amber); font-weight: 700;">${formatNumber(boxes)}</span> ${getTranslation('unitBoxes')}</td>
          <td>${formatNumber(p.cuts)} ${getTranslation('unitCuts')}</td>
          <td>${formatNumber(p.beedis)}</td>
          <td style="color: var(--accent-gold); font-weight: 700;">${formatINR(p.rate)}</td>
          <td><span style="color: var(--text-main); font-weight: 500;">${p.companyName || 'TVS Beedi Company'}</span></td>
          <td>
            <div class="table-actions-cell">
              <button class="btn-secondary btn-table-action" onclick="startEditExport('${p._id}')" title="${getTranslation('editBtn')}">✏️</button>
              <button class="btn-danger btn-table-action" onclick="deleteExport('${p._id}')" title="${getTranslation('deleteBtn')}">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function loadExportData(from = '', to = '') {
  try {
    let url = '/api/export';
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (params.toString()) url += '?' + params.toString();

    const res = await fetch(url);
    const data = await res.json();
    if (!data || !data.totals) return;

    cachedExports = data;
    renderExportUI(data);
  } catch (err) {
    console.error('Error loading export data:', err);
  }
}

async function deleteExport(id) {
  if (!await showConfirmDialog(getTranslation('deleteConfirm'))) return;

  try {
    const res = await fetch(`/api/export/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    showToast(getTranslation('successExportDeleted'), 'success');
    loadExportData();
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function exportExportCSV() {
  const from = document.getElementById('exportFromDate') ? document.getElementById('exportFromDate').value : '';
  const to = document.getElementById('exportToDate') ? document.getElementById('exportToDate').value : '';
  let url = '/api/export/csv';
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (params.toString()) url += '?' + params.toString();
  window.location.href = url;
}

// Backward compatibility alias for reports
function loadReportsData(from = '', to = '') {
  return loadExportData(from, to);
}
function setReportFilter(mode, btn) {
  return setExportFilter(mode, btn);
}
function applyCustomDateFilter() {
  return applyCustomExportDateFilter();
}
function exportReportsCSV() {
  return exportExportCSV();
}

// ==========================================
// 6. SETTINGS LOGIC
// ==========================================
async function loadSettingsData() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (!data) return;

    appSettings = data;
    const setBeedisPerBoxEl = document.getElementById('setBeedisPerBox');
    if (setBeedisPerBoxEl) setBeedisPerBoxEl.value = data.beedisPerBox || 6000;
    const setCutsPerBoxEl = document.getElementById('setCutsPerBox');
    if (setCutsPerBoxEl) setCutsPerBoxEl.value = data.cutsPerBox || 300;
    document.getElementById('setBeedisPerCut').value = data.beedisPerCut || 20;
    document.getElementById('setTobaccoPer1000').value = data.tobaccoPer1000Grams || 600;
    document.getElementById('setPowderPer1000').value = data.powderPer1000Grams || 200;
    document.getElementById('setSalaryPer1000').value = data.salaryPer1000 || 320;
    document.getElementById('setRatePer1000').value = data.ratePer1000 || 340;
    document.getElementById('setAvgWastage').value = data.avgWastageKg ?? 2;
    document.getElementById('setBagSize').value = data.bagSizeGrams || 600;
    document.getElementById('setLowStock').value = data.lowStockThresholdKg || 5;
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

async function handleSettingsSubmit(event) {
  event.preventDefault();
  const payload = {
    beedisPerBox: Number(document.getElementById('setBeedisPerBox')?.value) || 6000,
    cutsPerBox: Number(document.getElementById('setCutsPerBox')?.value) || 300,
    beedisPerCut: Number(document.getElementById('setBeedisPerCut')?.value) || 20,
    tobaccoPer1000Grams: Number(document.getElementById('setTobaccoPer1000').value),
    powderPer1000Grams: Number(document.getElementById('setPowderPer1000').value),
    salaryPer1000: Number(document.getElementById('setSalaryPer1000').value),
    ratePer1000: Number(document.getElementById('setRatePer1000').value),
    avgWastageKg: Number(document.getElementById('setAvgWastage').value),
    bagSizeGrams: Number(document.getElementById('setBagSize').value),
    lowStockThresholdKg: Number(document.getElementById('setLowStock').value)
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Failed to update settings');
    appSettings = await res.json();
    showToast(getTranslation('successSaved'), 'success');
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// In-Memory Re-render on Language Toggle (0ms Latency)
function renderCachedAppData() {
  if (cachedAnalytics) {
    renderDashboardUI(cachedAnalytics);
    renderDashboardCharts(cachedAnalytics);
  } else if (cachedDashboard) {
    renderDashboardUI(cachedDashboard);
  }
  if (cachedProduction) renderProductionUI(cachedProduction);
  if (cachedStock) renderStockUI(cachedStock);
  if (cachedExpenses) renderExpensesUI(cachedExpenses);
  if (cachedReports) renderReportsUI(cachedReports);
}

// Global Refresh Helper
function loadAllAppData() {
  loadDashboardData();
  loadProductionData();
  loadStockData();
  loadExpensesData();
  loadReportsData();
  loadSettingsData();
}
window.loadAllAppData = loadAllAppData;

// Theme Handling (Light theme by default)
let currentTheme = localStorage.getItem('tvs_beedi_theme') || 'light';

function initTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeButton();
}

function toggleTheme() {
  currentTheme = (currentTheme === 'light') ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('tvs_beedi_theme', currentTheme);
  updateThemeButton();
  if (cachedAnalytics) {
    renderDashboardCharts(cachedAnalytics);
  }
}

function updateThemeButton() {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    if (typeof currentLanguage !== 'undefined' && currentLanguage === 'en') {
      btn.textContent = (currentTheme === 'light') ? '🌙 Dark' : '☀️ Light';
    } else {
      btn.textContent = (currentTheme === 'light') ? '🌙 இரவு' : '☀️ பகல்';
    }
  }
}

// Initialization on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Set default dates across all modules to current date (today)
  setDefaultDatesToToday(true);

  loadAllAppData();
});
