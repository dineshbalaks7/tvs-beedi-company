/**
 * TVS Beedi Company — Dashboard JavaScript (Simplified)
 * Loads from 2 endpoints: /api/dashboard (KPIs) + /api/analytics/history (charts).
 * No period switching, no comparison card, no weekly/monthly/daily overview cards.
 */

'use strict';

// ── State ────────────────────────────────────────────────────────────────────
let exportChartInstance = null;
let profitChartInstance = null;
let exportChartGranularity = 'month';
let profitChartGranularity = 'month';
const chartHistoryCache = {}; // keyed by granularity
const chartHistoryPromises = {}; // keyed by granularity, prevents duplicate in-flight requests

// ── KPI Element IDs ──────────────────────────────────────────────────────────
const KPI_ELEMENT_IDS = {
  tobaccoValue: 'dashKpiTobacco',
  tobaccoSub: 'dashKpiTobaccoSub',
  powderValue: 'dashKpiPowder',
  powderSub: 'dashKpiPowderSub',
  expensesValue: 'dashKpiExpenses',
  expensesSub: 'dashKpiExpensesSub',
  profitValue: 'dashKpiProfit',
  profitSub: 'dashKpiProfitSub'
};

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateDateBadge();
  window.setTimeout(hideDashboardSplash, 2000);
  loadDashboard();
  // Refresh settings label once settings are applied by common.js
  window.addEventListener('settingsLoaded', updateDateBadge);
  window.addEventListener('languageChanged', updateDateBadge);
});

function hideDashboardSplash() {
  const splash = document.getElementById('dashboardSplash');
  if (!splash) return;
  splash.classList.add('is-hidden');
  window.setTimeout(() => splash.remove(), 350);
}

// ── Date Badge ───────────────────────────────────────────────────────────────
function updateDateBadge() {
  const el = document.getElementById('dashDateBadge');
  if (!el) return;
  const now = new Date();
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const month = now.toLocaleDateString(isEn ? 'en-US' : 'ta-IN', { month: 'long', year: 'numeric' });
  el.textContent = month;
}

// ── Show KPI Loading Spinners ─────────────────────────────────────────────────
function showKpiLoadingSpinners() {
  Object.values(KPI_ELEMENT_IDS).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('is-loaded');
      el.classList.add('loading-spinner');
      // Fade the sub text while loading
      const card = el.closest('.dash-kpi-card');
      if (card) card.classList.add('is-loading');
    }
  });
}

// ── Hide KPI Loading Spinners & Restore Default Text ─────────────────────────
function hideKpiLoadingSpinners() {
  Object.values(KPI_ELEMENT_IDS).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('loading-spinner');
      el.classList.add('is-loaded');
      // Remove loading state from parent card
      const card = el.closest('.dash-kpi-card');
      if (card) card.classList.remove('is-loading');
    }
  });
}

// ── Primary Data Load ─────────────────────────────────────────────────────────
async function loadDashboard() {
  // Show loading spinners on KPI value elements
  showKpiLoadingSpinners();

  try {
    const res = await fetch('/api/dashboard');
    if (!res.ok) throw new Error('Dashboard data unavailable');
    const data = await res.json();

    // Persist settings to local cache (same pattern as common.js)
    if (data.settings) {
      window.appSettings = { ...window.appSettings, ...data.settings };
      try { localStorage.setItem('tvs_app_settings', JSON.stringify(window.appSettings)); } catch (_) {}
    }

    renderKPICards(data);
    renderStockAlert(data.stock);
  } catch (err) {
    console.error('[Dashboard] KPI load error:', err);
    showToast('Dashboard data unavailable', 'error');
  } finally {
    hideKpiLoadingSpinners();
    hideDashboardSplash();
  }

  // Charts load independently — failure does not block KPI display
  await Promise.all([
    loadChartHistory(exportChartGranularity).then(data => renderExportChart(data, exportChartGranularity)),
    loadChartHistory(profitChartGranularity).then(data => renderProfitChart(data, profitChartGranularity))
  ]);
}

// ── KPI Rendering ─────────────────────────────────────────────────────────────
function renderKPICards(data) {
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const stock = data.stock || {};
  const month = data.month || {};

  // KPI 1: Tobacco Stock
  const tobaccoEl = document.getElementById('dashKpiTobacco');
  const tobaccoSubEl = document.getElementById('dashKpiTobaccoSub');
  if (tobaccoEl) {
    const kg = (stock.tobacco && stock.tobacco.kg !== undefined) ? stock.tobacco.kg : '—';
    tobaccoEl.innerHTML = kg !== '—'
      ? `${kg} <span style="font-size:14px;font-weight:600;color:var(--text-muted)">kg</span>`
      : '—';
    if (stock.tobacco && stock.tobacco.isLow) {
      tobaccoEl.style.color = 'var(--accent-red)';
    }
  }
  if (tobaccoSubEl) {
    const consumed = stock.consumption?.today?.tobaccoKg ?? '—';
    tobaccoSubEl.textContent = isEn
      ? `Today used: ${consumed} kg`
      : `இன்று பயன்பாடு: ${consumed} kg`;
  }

  // KPI 2: Powder Stock
  const powderEl = document.getElementById('dashKpiPowder');
  const powderSubEl = document.getElementById('dashKpiPowderSub');
  if (powderEl) {
    const kg = (stock.powder && stock.powder.kg !== undefined) ? stock.powder.kg : '—';
    powderEl.innerHTML = kg !== '—'
      ? `${kg} <span style="font-size:14px;font-weight:600;color:var(--text-muted)">kg</span>`
      : '—';
    if (stock.powder && stock.powder.isLow) {
      powderEl.style.color = 'var(--accent-red)';
    }
  }
  if (powderSubEl) {
    const consumed = stock.consumption?.today?.powderKg ?? '—';
    powderSubEl.textContent = isEn
      ? `Today used: ${consumed} kg`
      : `இன்று பயன்பாடு: ${consumed} kg`;
  }

  // KPI 3: Monthly Expenses
  const expEl = document.getElementById('dashKpiExpenses');
  if (expEl) {
    expEl.textContent = formatINR(month.expenses || 0);
    expEl.style.color = (month.expenses || 0) > 0 ? 'var(--accent-amber)' : 'var(--text-main)';
  }
  const expSubEl = document.getElementById('dashKpiExpensesSub');
  if (expSubEl) {
    expSubEl.textContent = isEn
      ? `Rate: ${formatINR(month.rate || 0)}`
      : `Rate: ${formatINR(month.rate || 0)}`;
  }

  // KPI 4: Monthly Net Profit
  const profitEl = document.getElementById('dashKpiProfit');
  const profitSubEl = document.getElementById('dashKpiProfitSub');
  const totalProfit = month.totalProfit ?? month.profit ?? 0;
  if (profitEl) {
    profitEl.textContent = formatINR(totalProfit);
    profitEl.style.color = totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  }
  if (profitSubEl) {
    const margin = month.profitMargin ?? 0;
    profitSubEl.textContent = `Margin: ${Number(margin).toFixed(1)}%`;
    profitSubEl.style.color = margin >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  }
}

// ── Stock Alert ───────────────────────────────────────────────────────────────
function renderStockAlert(stock) {
  const banner = document.getElementById('dashboardStockAlert');
  if (!banner || !stock) return;
  const tobaccoLow = stock.tobacco?.isLow;
  const powderLow = stock.powder?.isLow;
  if (tobaccoLow || powderLow) {
    banner.style.display = 'flex';
    const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
    const alertTextEl = document.getElementById('stockAlertText');
    if (alertTextEl) {
      if (tobaccoLow && powderLow) {
        alertTextEl.textContent = isEn
          ? 'Tobacco and powder stock are running low. Add stock immediately.'
          : 'Tobacco மற்றும் தூள் இருப்பு குறைவாக உள்ளது! உடனடியாக சரக்கு சேர்க்கவும்.';
      } else if (tobaccoLow) {
        alertTextEl.textContent = isEn
          ? `Tobacco stock is low (${stock.tobacco.kg} kg). Add stock immediately.`
          : `Tobacco இருப்பு குறைவாக உள்ளது (${stock.tobacco.kg} kg)! உடனடியாக சேர்க்கவும்.`;
      } else {
        alertTextEl.textContent = isEn
          ? `Powder stock is low (${stock.powder.kg} kg). Add stock immediately.`
          : `தூள் இருப்பு குறைவாக உள்ளது (${stock.powder.kg} kg)! உடனடியாக சேர்க்கவும்.`;
      }
    }
  } else {
    banner.style.display = 'none';
  }
}

// ── Chart History API ─────────────────────────────────────────────────────────
async function loadChartHistory(granularity) {
  if (chartHistoryCache[granularity]) return chartHistoryCache[granularity];
  if (chartHistoryPromises[granularity]) return chartHistoryPromises[granularity];

  const limit = granularity === 'day' ? 14 : granularity === 'week' ? 12 : 12;
  chartHistoryPromises[granularity] = fetch(`/api/analytics/history?granularity=${granularity}&limit=${limit}`)
    .then(res => {
      if (!res.ok) throw new Error('Chart history unavailable');
      return res.json();
    })
    .then(json => {
      chartHistoryCache[granularity] = json;
      return json;
    })
    .catch(err => {
      console.warn(`[Dashboard] Chart history (${granularity}) error:`, err);
      return { series: [] };
    })
    .finally(() => {
      delete chartHistoryPromises[granularity];
    });

  return chartHistoryPromises[granularity];
}

// ── Chart: Export Trend ───────────────────────────────────────────────────────
function renderExportChart(data, granularity) {
  const canvas = document.getElementById('dashExportChart');
  const emptyEl = document.getElementById('exportChartEmpty');
  if (!canvas) return;
  const series = (data && data.series) ? data.series : [];

  if (series.length === 0) {
    if (emptyEl) emptyEl.hidden = false;
    if (exportChartInstance) { exportChartInstance.destroy(); exportChartInstance = null; }
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const labels = series.map(r => r.label || r.key || '');
  const values = series.map(r => Number(r.exportBoxes ?? r.prodBoxes ?? 0));

  const chartColor = isDark ? 'rgba(245, 158, 11, 0.85)' : 'rgba(217, 119, 6, 0.85)';
  const chartColorFill = isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.1)';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const labelColor = isDark ? '#94a3b8' : '#64748b';

  if (exportChartInstance) exportChartInstance.destroy();
  exportChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: isEn ? 'Boxes Exported' : 'ஏற்றுமதி கட்டை',
        data: values,
        backgroundColor: chartColorFill,
        borderColor: chartColor,
        borderWidth: 2,
        borderRadius: 5,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#94a3b8' : '#475569',
          borderColor: isDark ? '#27354f' : '#e2e8f0',
          borderWidth: 1,
          cornerRadius: 10,
          displayColors: false,
          padding: 10,
          callbacks: {
            label: ctx => `${ctx.parsed.y} ${isEn ? 'Boxes' : 'கட்டை'}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: labelColor, font: { size: 11, weight: '600' }, maxRotation: 0 }
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { size: 11 }, maxTicksLimit: 5 }
        }
      }
    }
  });
}

// ── Chart: Profit Trend ───────────────────────────────────────────────────────
function renderProfitChart(data, granularity) {
  const canvas = document.getElementById('dashProfitChart');
  const emptyEl = document.getElementById('profitChartEmpty');
  if (!canvas) return;
  const series = (data && data.series) ? data.series : [];

  if (series.length === 0) {
    if (emptyEl) emptyEl.hidden = false;
    if (profitChartInstance) { profitChartInstance.destroy(); profitChartInstance = null; }
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const labels = series.map(r => r.label || r.key || '');
  const profitValues = series.map(r => {
    const netProfit = r.totalProfit ?? r.netProfit ?? r.prodProfit ?? 0;
    return Number(netProfit);
  });

  const posColor = isDark ? 'rgba(16,185,129,0.85)' : 'rgba(5,150,105,0.85)';
  const negColor = isDark ? 'rgba(239,68,68,0.85)' : 'rgba(220,38,38,0.85)';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const labelColor = isDark ? '#94a3b8' : '#64748b';

  const barColors = profitValues.map(v => v >= 0 ? posColor.replace('0.85', '0.2') : negColor.replace('0.85', '0.15'));
  const borderColors = profitValues.map(v => v >= 0 ? posColor : negColor);

  if (profitChartInstance) profitChartInstance.destroy();
  profitChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: isEn ? 'Net Profit' : 'நிகர லாபம்',
        data: profitValues,
        backgroundColor: barColors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: 5,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#94a3b8' : '#475569',
          borderColor: isDark ? '#27354f' : '#e2e8f0',
          borderWidth: 1,
          cornerRadius: 10,
          displayColors: false,
          padding: 10,
          callbacks: {
            label: ctx => `₹${Number(ctx.parsed.y).toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: labelColor, font: { size: 11, weight: '600' }, maxRotation: 0 }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: labelColor,
            font: { size: 11 },
            maxTicksLimit: 5,
            callback: v => `₹${Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`
          }
        }
      }
    }
  });
}

// ── Chart Filter Switch ───────────────────────────────────────────────────────
function switchDashChart(type, granularity) {
  const isExport = type === 'export';
  const filterGroup = document.getElementById(isExport ? 'exportChartFilters' : 'profitChartFilters');

  // Update active button
  if (filterGroup) {
    filterGroup.querySelectorAll('.dash-chart-filter-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = filterGroup.querySelector(`#${isExport ? 'export' : 'profit'}Filter${granularity.charAt(0).toUpperCase() + granularity.slice(1)}`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  if (isExport) {
    exportChartGranularity = granularity;
    loadChartHistory(granularity).then(d => renderExportChart(d, granularity));
  } else {
    profitChartGranularity = granularity;
    loadChartHistory(granularity).then(d => renderProfitChart(d, granularity));
  }
}

// ── Theme-aware chart refresh ─────────────────────────────────────────────────
// Re-render charts when theme toggles so colors update correctly
const _origToggleTheme = window.toggleTheme;
window.toggleTheme = function () {
  if (typeof _origToggleTheme === 'function') _origToggleTheme();
  // Small delay lets CSS variables propagate before re-rendering
  setTimeout(() => {
    if (chartHistoryCache[exportChartGranularity]) {
      renderExportChart(chartHistoryCache[exportChartGranularity], exportChartGranularity);
    }
    if (chartHistoryCache[profitChartGranularity]) {
      renderProfitChart(chartHistoryCache[profitChartGranularity], profitChartGranularity);
    }
  }, 60);
};
