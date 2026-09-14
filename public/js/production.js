/**
 * TVS Beedi Company - Production Specific JavaScript
 * Box & Cut Live Computations, Duplicate Date Check, Edit Mode & CRUD
 */

let cachedProduction = [];
let currentDuplicateRecord = null;

function handleBoxesInput(val) {
  const boxes = Number(val) || 0;
  const beedisPerBox = window.appSettings?.beedisPerBox || 6000;
  const cutsPerBox = window.appSettings?.cutsPerBox || 300;
  const tobaccoPer1000 = window.appSettings?.tobaccoPer1000Grams || 600;
  const powderPer1000 = window.appSettings?.powderPer1000Grams || 200;
  const salaryPer1000 = window.appSettings?.salaryPer1000 || 320;
  const ratePer1000 = window.appSettings?.ratePer1000 || 340;

  const cuts = Math.round(boxes * cutsPerBox);
  const beedis = Math.round(boxes * beedisPerBox);
  const tobaccoGrams = (beedis / 1000) * tobaccoPer1000;
  const powderGrams = (beedis / 1000) * powderPer1000;
  const salary = (beedis / 1000) * salaryPer1000;
  const rate = (beedis / 1000) * ratePer1000;
  const profit = rate - salary;

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
  const prevProfitEl = document.getElementById('prevProfit');
  if (prevProfitEl) prevProfitEl.textContent = formatINR(profit);
}

function handleCutsInput(val) {
  const cuts = Number(val) || 0;
  const cutsPerBox = window.appSettings?.cutsPerBox || 300;
  const boxes = cuts > 0 ? Number((cuts / cutsPerBox).toFixed(2)) : 0;
  handleBoxesInput(boxes);
}

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
    showToast('Record not found', 'error');
    return;
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
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  if (submitText) submitText.textContent = isEn ? 'Update Production Record' : 'உற்பத்தி பதிவை மாற்று';
  if (submitIcon) submitIcon.textContent = '✏️';
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  if (editBadge) {
    editBadge.style.display = 'flex';
    if (editModeText) {
      editModeText.textContent = isEn
        ? `✏️ Editing Record for ${formatDate(record.date)} (${boxes} Boxes)`
        : `✏️ ${formatDate(record.date)} தேதிக்கான பதிவு திருத்தம் செய்யப்படுகிறது (${boxes} கட்டை)`;
    }
  }

  hideDuplicateAlert();

  const formCard = document.getElementById('productionForm');
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  showToast(isEn ? 'Edit mode active' : 'திருத்தும் நிலை செயல்பாட்டில் உள்ளது', 'info');
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

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  if (submitText) submitText.textContent = isEn ? 'Save Production Entry' : 'உற்பத்தியைச் சேமிக்கவும்';
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
  const cutsPerBox = window.appSettings?.cutsPerBox || 300;

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
      const err = await res.json();
      showToast('A production record already exists for this date!', 'error');
      if (err.existingRecord && err.existingRecord._id) {
        currentDuplicateRecord = err.existingRecord;
        showDuplicateAlert(err.existingRecord);
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

    showToast(isEditing ? 'Record updated successfully' : 'Production saved successfully', 'success');
    cancelEditProduction();
    loadProductionData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderProductionUI(records) {
  const tbody = document.getElementById('productionTableBody');
  if (!tbody) return;

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color: var(--text-dim);">${isEn ? 'No production records found' : 'உற்பத்தி பதிவுகள் எதுவும் இல்லை'}</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(p => {
    const boxes = p.boxes !== undefined ? p.boxes : Number(((p.cuts || 0) / 300).toFixed(1));
    const profit = (p.rate || 0) - (p.salary || 0);
    return `
    <tr>
      <td><strong>${formatDate(p.date)}</strong></td>
      <td><span style="color: var(--accent-amber); font-weight: 700;">${formatNumber(boxes)}</span> ${isEn ? 'Boxes' : 'கட்டை'}</td>
      <td>${formatNumber(p.cuts)} ${isEn ? 'Cuts' : 'கட்டுகள்'}</td>
      <td>${formatNumber(p.beedis)}</td>
      <td>${(p.tobaccoUsedGrams / 1000).toFixed(2)} kg</td>
      <td>${(p.powderUsedGrams / 1000).toFixed(2)} kg</td>
      <td>${formatINR(p.salary)}</td>
      <td style="color: var(--accent-gold); font-weight: 700;">${formatINR(p.rate)}</td>
      <td style="color: var(--accent-green, #059669); font-weight: 700;">${formatINR(profit)}</td>
      <td>
        <div class="table-actions-cell">
          <button class="btn-secondary btn-table-action" onclick="startEditProduction('${p._id}')" title="Edit">✏️</button>
          <button class="btn-danger btn-table-action" onclick="deleteProduction('${p._id}')" title="Delete">✕</button>
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
    renderProductionBarChart(currentProdChartGranularity);
  } catch (err) {
    console.error('Error loading production records:', err);
  }
}

async function deleteProduction(id) {
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  if (!confirm(isEn ? 'Are you sure you want to delete this record?' : 'இந்த பதிவை நீக்க விரும்புகிறீர்களா?')) return;

  try {
    const res = await fetch(`/api/production/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    showToast(isEn ? 'Record deleted successfully' : 'பதிவு நீக்கப்பட்டது', 'success');
    loadProductionData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------
// Production Tracking Bar Chart (Day / Week / Month)
// ----------------------------------------------------
let currentProdChartGranularity = 'day';
let prodChartInstance = null;

function getProductionCalendarDate(value) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}

function switchProductionChartFilter(granularity) {
  currentProdChartGranularity = granularity;
  const filterBtns = document.querySelectorAll('#prodChartFilterGroup .chart-filter-btn');
  filterBtns.forEach(btn => btn.classList.remove('active'));

  if (granularity === 'day') {
    const btn = document.getElementById('prodFilterDay');
    if (btn) btn.classList.add('active');
  } else if (granularity === 'week') {
    const btn = document.getElementById('prodFilterWeek');
    if (btn) btn.classList.add('active');
  } else if (granularity === 'month') {
    const btn = document.getElementById('prodFilterMonth');
    if (btn) btn.classList.add('active');
  }

  renderProductionBarChart(granularity);
}

function aggregateProductionData(records, granularity) {
  if (!records || records.length === 0) {
    return { labels: [], boxes: [], cuts: [], beedis: [] };
  }

  const buckets = {};

  records.forEach(p => {
    if (!p.date) return;
    const d = getProductionCalendarDate(p.date);
    let key = '';
    let label = '';

    if (granularity === 'day') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } else if (granularity === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d);
      mon.setDate(diff);
      key = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
      label = `Week ${Math.ceil(mon.getDate() / 7)} ${mon.toLocaleDateString('en-GB', { month: 'short' })}`;
    } else if (granularity === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      label = d.toLocaleDateString('en-GB', { month: 'short' });
    }

    if (!buckets[key]) {
      buckets[key] = { key, label, boxes: 0, cuts: 0, beedis: 0 };
    }

    const bCount = (p.boxes !== undefined && p.boxes !== null && p.boxes > 0) ? p.boxes : ((p.cuts || 0) / 300);
    buckets[key].boxes += bCount;
    buckets[key].cuts += (p.cuts || 0);
    buckets[key].beedis += (p.beedis || 0);
  });

  const sortedKeys = Object.keys(buckets).sort();
  // Keep last 14 days, 10 weeks, or 12 months for clean visualization
  const limit = granularity === 'day' ? 14 : (granularity === 'week' ? 10 : 12);
  const activeKeys = sortedKeys.slice(-limit);

  return {
    labels: activeKeys.map(k => buckets[k].label),
    boxes: activeKeys.map(k => Number(buckets[k].boxes.toFixed(1))),
    cuts: activeKeys.map(k => buckets[k].cuts),
    beedis: activeKeys.map(k => buckets[k].beedis)
  };
}

function renderProductionBarChart(granularity = currentProdChartGranularity) {
  const canvas = document.getElementById('productionBarChart');
  if (!canvas || typeof Chart === 'undefined') return;

  currentProdChartGranularity = granularity;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
  const fontFam = "'Outfit', 'Mukta Malar', sans-serif";
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  const agg = aggregateProductionData(cachedProduction, granularity);
  if (prodChartInstance) prodChartInstance.destroy();

  prodChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: agg.labels,
      datasets: [
        {
          label: isEn ? 'Boxes (கட்டை)' : 'கட்டை (Boxes)',
          data: agg.boxes,
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
              const label = ctx.dataset.label || '';
              const val = ctx.raw;
              const idx = ctx.dataIndex;
              const cuts = agg.cuts[idx] || 0;
              const beedis = agg.beedis[idx] || 0;
              return `${label}: ${val} (${cuts} cuts, ${beedis.toLocaleString('en-IN')} beedis)`;
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

// Check URL query param for editId on page load
function checkUrlEditParam() {
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('editId');
  if (editId) {
    startEditProduction(editId);
  }
}

window.addEventListener('languageChanged', () => {
  if (cachedProduction.length > 0) renderProductionUI(cachedProduction);
  const boxesInput = document.getElementById('prodBoxes');
  if (boxesInput && boxesInput.value) {
    handleBoxesInput(boxesInput.value);
  }
  renderProductionBarChart(currentProdChartGranularity);
});

document.addEventListener('DOMContentLoaded', () => {
  loadProductionData().then(checkUrlEditParam);
});

