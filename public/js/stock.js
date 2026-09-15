/**
 * TVS Beedi Company - Stock Specific JavaScript
 * Raw Material Stock, Consumption Reporting, Movements Ledger, Modals & Calculator
 */

let cachedStock = null;

async function loadStockData() {
  try {
    const res = await fetch('/api/stock');
    if (!res.ok) throw new Error('Failed to load stock data');
    const data = await res.json();
    cachedStock = data;
    renderStockUI(data);
  } catch (err) {
    console.error('Error loading stock data:', err);
    showToast('Failed to load stock data', 'error');
  }
}

function renderStockUI(data) {
  if (!data) return;
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  // Tobacco & Powder cards
  const elTobKg = document.getElementById('stockTobaccoKg');
  if (elTobKg) elTobKg.innerHTML = `${data.tobacco.kg} <span class="metric-unit">kg</span>`;
  const elTobGrams = document.getElementById('stockTobaccoGrams');
  if (elTobGrams) elTobGrams.textContent = `${formatNumber(data.tobacco.grams)} ${isEn ? 'Grams' : 'கிராம்'}`;

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
  if (elPowGrams) elPowGrams.textContent = `${formatNumber(data.powder.grams)} ${isEn ? 'Grams' : 'கிராம்'}`;

  const consumedTodayPowKg = data.consumption?.today?.powderKg ?? 0;
  const consumedTodayPowGrams = data.consumption?.today?.powderGrams ?? 0;
  const elPowConsumedSub = document.getElementById('stockPowderConsumedSub');
  if (elPowConsumedSub) {
    elPowConsumedSub.textContent = isEn
      ? `Today Consumed: ${consumedTodayPowKg} kg (${formatNumber(consumedTodayPowGrams)}g)`
      : `இன்று உற்பத்தி பயன்பாடு: ${consumedTodayPowKg} kg (${formatNumber(consumedTodayPowGrams)}g)`;
  }

  // Material Consumption Reporting Breakdown
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
    if (elRepTodayCuts) elRepTodayCuts.textContent = `${formatNumber(cToday.cuts || 0)} Cuts (${formatNumber(cToday.beedis || 0)} Pcs)`;

    const elRepWeekTob = document.getElementById('stockRepWeekTobacco');
    if (elRepWeekTob) elRepWeekTob.textContent = `${cWeek.tobaccoKg || 0} kg`;
    const elRepWeekPow = document.getElementById('stockRepWeekPowder');
    if (elRepWeekPow) elRepWeekPow.textContent = `${cWeek.powderKg || 0} kg`;
    const elRepWeekCuts = document.getElementById('stockRepWeekCuts');
    if (elRepWeekCuts) elRepWeekCuts.textContent = `${formatNumber(cWeek.cuts || 0)} Cuts (${formatNumber(cWeek.beedis || 0)} Pcs)`;

    const elRepMonthTob = document.getElementById('stockRepMonthTobacco');
    if (elRepMonthTob) elRepMonthTob.textContent = `${cMonth.tobaccoKg || 0} kg`;
    const elRepMonthPow = document.getElementById('stockRepMonthPowder');
    if (elRepMonthPow) elRepMonthPow.textContent = `${cMonth.powderKg || 0} kg`;
    const elRepMonthCuts = document.getElementById('stockRepMonthCuts');
    if (elRepMonthCuts) elRepMonthCuts.textContent = `${formatNumber(cMonth.cuts || 0)} Cuts (${formatNumber(cMonth.beedis || 0)} Pcs)`;

    const elRepTotalTob = document.getElementById('stockRepTotalTobacco');
    if (elRepTotalTob) elRepTotalTob.textContent = `${cTotal.tobaccoKg || 0} kg`;
    const elRepTotalPow = document.getElementById('stockRepTotalPowder');
    if (elRepTotalPow) elRepTotalPow.textContent = `${cTotal.powderKg || 0} kg`;
    const elRepTotalCuts = document.getElementById('stockRepTotalCuts');
    if (elRepTotalCuts) elRepTotalCuts.textContent = `${formatNumber(cTotal.cuts || 0)} Cuts (${formatNumber(cTotal.beedis || 0)} Pcs)`;
  }

  // Movements ledger table
  const tbody = document.getElementById('stockMovementsTableBody');
  if (tbody && data.movements) {
    if (data.movements.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-dim);">${isEn ? 'No movements recorded' : 'சரக்கு இயக்க பதிவுகள் இல்லை'}</td></tr>`;
    } else {
      const typeMapTa = {
        initial: 'ஆரம்ப இருப்பு',
        added: 'சரக்கு வரவு',
        production_usage: 'உற்பத்தி பயன்பாடு',
        adjustment: 'இருப்பு சரிசெய்தல்',
        wastage: 'சேதம் / கழிவு'
      };
      const typeMapEn = {
        initial: 'Initial Stock',
        added: 'Stock Added',
        production_usage: 'Production Usage',
        adjustment: 'Adjustment',
        wastage: 'Wastage'
      };
      const typeMap = isEn ? typeMapEn : typeMapTa;

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
            <td><span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.06);">${movementType}</span></td>
            <td style="color: ${qtyColor}; font-weight: 700;">${qtyText}</td>
            <td>${(m.balanceAfterGrams / 1000).toFixed(2)} kg</td>
            <td style="color: var(--text-muted); font-size: 12px;">${m.notes || '-'}</td>
            <td>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button class="btn-action-edit" onclick="openEditStockMovementModal('${m._id}')" title="Edit">✏️</button>
                <button class="btn-danger btn-table-action" onclick="deleteStockMovementAction('${m._id}')" title="Delete">✕</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}

function runBagCalculator() {
  const totalKg = Number(document.getElementById('bagCalcTotalKg')?.value) || 35;
  const wastageKg = Number(document.getElementById('bagCalcWastageKg')?.value) || 2;
  const bagSize = Number(document.getElementById('bagCalcBagSize')?.value) || 600;

  const usableGrams = Math.max(0, (totalKg - wastageKg) * 1000);
  const usableKg = usableGrams / 1000;
  const bags = bagSize > 0 ? Math.floor(usableGrams / bagSize) : 0;
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  const resBagsEl = document.getElementById('bagCalcResultBags');
  const resUsableEl = document.getElementById('bagCalcResultUsable');
  if (resBagsEl) resBagsEl.innerHTML = `${bags} <span class="metric-unit">${isEn ? 'Bags' : 'பைகள்'}</span>`;
  if (resUsableEl) resUsableEl.textContent = isEn
    ? `${usableKg} kg Usable (${formatNumber(usableGrams)}g ÷ ${bagSize}g)`
    : `${usableKg} kg பயனுள்ள புகையிலை (${formatNumber(usableGrams)}g ÷ ${bagSize}g)`;
}

function updateStockModalItemFields() {
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const itemSelect = document.getElementById('stockActionItem');
  const item = itemSelect ? itemSelect.value : 'tobacco';
  const notesGroup = document.getElementById('stockActionNotesGroup');
  const notesLabel = document.getElementById('stockActionNotesLabel');
  const notesInput = document.getElementById('stockActionNotes');
  const isPowder = item === 'powder';
  if (notesGroup) notesGroup.style.display = isPowder ? 'none' : '';
  if (notesInput) {
    notesInput.required = !isPowder;
    if (isPowder) notesInput.value = '';
  }
  if (notesLabel) {
    if (!isPowder) {
      notesLabel.textContent = isEn ? 'Leaf Type / Variety (e.g. SONA, A1):' : 'இலை வகை / பிராண்டு (Type of Leaf):';
    }
  }
  if (notesInput) {
    notesInput.placeholder = isEn ? 'e.g. SONA, A1, SUPER, Grade A...' : 'எ.கா: SONA, A1, SUPER, Grade A...';
  }
}

function openStockModal(item = 'tobacco', type = 'add') {
  const modal = document.getElementById('stockModal');
  const itemSelect = document.getElementById('stockActionItem');
  const actionType = document.getElementById('stockActionType');
  const title = document.getElementById('stockModalTitle');
  const kgLabel = document.getElementById('stockActionKgLabel');
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  if (itemSelect) itemSelect.value = item;
  if (actionType) actionType.value = type;

  if (type === 'adjust') {
    title.textContent = isEn ? 'Adjust Stock Balance' : 'சரக்கு இருப்பை சரிசெய்தல்';
    kgLabel.textContent = isEn ? 'New Actual Balance (kg)' : 'புதிய உண்மையான அளவு (கிலோ / kg)';
  } else {
    title.textContent = isEn ? 'Add Inward Stock' : 'சரக்கு சேர்க்க';
    kgLabel.textContent = isEn ? 'Quantity to Add (kg)' : 'அளவு (கிலோ / kg)';
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
  const notes = item === 'powder' ? '' : document.getElementById('stockActionNotes').value;

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

    showToast('Stock updated successfully', 'success');
    closeStockModal();
    document.getElementById('stockActionForm').reset();
    loadStockData();
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

    showToast('Stock movement updated successfully', 'success');
    closeEditStockMovementModal();
    loadStockData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteStockMovementAction(movementId) {
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  if (!confirm(isEn ? 'Are you sure you want to delete this movement record?' : 'இந்த சரக்கு பதிவை நீக்க விரும்புகிறீர்களா?')) return;

  try {
    const res = await fetch(`/api/stock/movement/${movementId}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Delete failed');
    }

    showToast(isEn ? 'Movement deleted successfully' : 'பதிவு நீக்கப்பட்டது', 'success');
    loadStockData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===================================================================
// ===================================================================
// Stock Audit Report & PDF Export System (Date Range & Monthly Breakdown)
// ===================================================================
let cachedMonthlyStockReport = null;
let currentStockReportRange = {
  from: '',
  to: '',
  item: 'all',
  preset: 'this-month'
};

function formatISODateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentYearMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function setStockReportPreset(preset) {
  const now = new Date();
  let fromDate, toDate;

  if (preset === 'this-month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (preset === 'last-month') {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    toDate = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (preset === '3-months') {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (preset === 'this-year') {
    fromDate = new Date(now.getFullYear(), 0, 1);
    toDate = new Date(now.getFullYear(), 11, 31);
  } else {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  const fromStr = formatISODateOnly(fromDate);
  const toStr = formatISODateOnly(toDate);

  const fromInput = document.getElementById('stockReportFromDate');
  const toInput = document.getElementById('stockReportToDate');
  const itemSelect = document.getElementById('stockReportMaterialFilter');
  const item = itemSelect ? itemSelect.value : 'all';

  if (fromInput) fromInput.value = fromStr;
  if (toInput) toInput.value = toStr;

  ['this-month', 'last-month', '3-months', 'this-year'].forEach(p => {
    const idMap = {
      'this-month': 'btnPresetThisMonth',
      'last-month': 'btnPresetLastMonth',
      '3-months': 'btnPreset3Months',
      'this-year': 'btnPresetThisYear'
    };
    const btn = document.getElementById(idMap[p]);
    if (btn) {
      if (p === preset) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  currentStockReportRange = { from: fromStr, to: toStr, item, preset };
  loadStockReportData(fromStr, toStr, item);
}

function onStockReportDateChange() {
  const fromInput = document.getElementById('stockReportFromDate');
  const toInput = document.getElementById('stockReportToDate');
  const itemSelect = document.getElementById('stockReportMaterialFilter');

  const from = fromInput ? fromInput.value : '';
  const to = toInput ? toInput.value : '';
  const item = itemSelect ? itemSelect.value : 'all';

  ['btnPresetThisMonth', 'btnPresetLastMonth', 'btnPreset3Months', 'btnPresetThisYear'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });

  if (from && to) {
    currentStockReportRange = { from, to, item, preset: 'custom' };
    loadStockReportData(from, to, item);
  }
}

function onStockReportFilterChange() {
  const fromInput = document.getElementById('stockReportFromDate');
  const toInput = document.getElementById('stockReportToDate');
  const itemSelect = document.getElementById('stockReportMaterialFilter');

  const from = fromInput ? fromInput.value : '';
  const to = toInput ? toInput.value : '';
  const item = itemSelect ? itemSelect.value : 'all';

  currentStockReportRange.item = item;
  loadStockReportData(from, to, item);
}

// Alias for material filter
const onStockReportItemFilterChange = onStockReportFilterChange;

async function loadStockReportData(from, to, item) {
  try {
    const itemSelect = document.getElementById('stockReportMaterialFilter');
    const selectedItem = item || (itemSelect ? itemSelect.value : 'all');
    let url = `/api/stock/report?item=${encodeURIComponent(selectedItem)}`;
    if (from && to) {
      url += `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load stock report data');
    const data = await res.json();
    cachedMonthlyStockReport = data;
    renderStockReportSnapshot(data);
    return data;
  } catch (err) {
    console.error('Error loading stock report data:', err);
    showToast('Failed to load stock report data', 'error');
    return null;
  }
}

// Backwards compatibility alias
const loadMonthlyStockReportData = loadStockReportData;
const onStockReportMonthChange = onStockReportDateChange;

function renderStockReportSnapshot(data) {
  if (!data) return;
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const badge = document.getElementById('stockReportActiveMonthBadge');
  if (badge) {
    badge.textContent = `${data.from} ~ ${data.to}`;
  }

  const snapFilter = document.getElementById('snapMaterialFilter');
  const snapEntries = document.getElementById('snapEntriesCount');
  const snapTobacco = document.getElementById('snapTobaccoIncoming');
  const snapPowder = document.getElementById('snapPowderIncoming');
  const snapTotal = document.getElementById('snapTotalIncoming');

  if (snapFilter) {
    if (data.itemFilter === 'tobacco') {
      snapFilter.textContent = isEn ? 'Tobacco / Leaf (All)' : 'புகையிலை (Leaf All)';
    } else if (data.itemFilter === 'sona') {
      snapFilter.textContent = 'SONA (Leaf)';
    } else if (data.itemFilter === 'a1') {
      snapFilter.textContent = 'A1 (Leaf)';
    } else if (data.itemFilter === 'super') {
      snapFilter.textContent = 'SUPER (Leaf)';
    } else if (data.itemFilter === 'powder') {
      snapFilter.textContent = isEn ? 'Powder Only' : 'தூள் (Powder)';
    } else {
      snapFilter.textContent = isEn ? 'All (Leaf & Powder)' : 'அனைத்தும் (Leaf & Powder)';
    }
  }

  if (snapEntries) snapEntries.textContent = data.totalEntries !== undefined ? data.totalEntries : 0;
  if (snapTobacco) snapTobacco.textContent = `+${data.totalTobaccoKg !== undefined ? data.totalTobaccoKg : 0} kg`;
  if (snapPowder) snapPowder.textContent = `+${data.totalPowderKg !== undefined ? data.totalPowderKg : 0} kg`;
  if (snapTotal) snapTotal.textContent = `${data.grandTotalKg !== undefined ? data.grandTotalKg : 0} kg`;
}

function initStockReportControls() {
  const fromInput = document.getElementById('stockReportFromDate');
  const toInput = document.getElementById('stockReportToDate');
  const itemSelect = document.getElementById('stockReportMaterialFilter');

  if (fromInput && toInput) {
    if (!fromInput.value || !toInput.value) {
      setStockReportPreset('this-month');
    } else {
      const item = itemSelect ? itemSelect.value : 'all';
      loadStockReportData(fromInput.value, toInput.value, item);
    }
  } else {
    // Fallback if elements not yet mounted
    setStockReportPreset('this-month');
  }
}

function generateStockReportHTML(data) {
  if (!data) return '';

  const months = data.months || [];
  const grandTotal = (data.grandTotalKg !== undefined) ? data.grandTotalKg : 0;
  const finalTotalLine = data.finalTotalLine || `Total Kg (மொத்த கிலோ) = ${grandTotal}`;

  if (months.length === 0) {
    return `
      <div class="tvs-pdf-container" id="tvsStockReportDoc">
        <div class="tvs-pdf-header">
          <h1 class="tvs-brand-title">TVS</h1>
        </div>
        <div style="text-align: center; padding: 40px 20px; color: #475569; font-size: 15px;">
          <p style="margin-bottom: 6px; font-weight: 600;">தேர்ந்தெடுக்கப்பட்ட காலக்கட்டத்தில் உள்வரும் சரக்கு விவரங்கள் எதுவும் இல்லை.</p>
          <p style="font-size: 13px; color: #64748b;">No incoming stock entries found for ${data.from || ''} to ${data.to || ''}.</p>
        </div>
      </div>
    `;
  }

  // Generate each month block strictly matching user's requested layout:
  // TVS
  //
  // September (செப்டம்பர்)
  //
  // Date (தேதி)    Material (பொருள்)    Type (வகை)    Kg (கிலோ)
  // 01-09-2026     Tobacco       35
  // ...
  // Total Kg in September (செப்டம்பர் மாத மொத்த கிலோ) = 61
  const monthBlocksHTML = months.map(m => {
    const tableRows = m.entries.map(e => `
      <tr>
        <td class="col-date">${e.dateFormatted}</td>
        <td class="col-material">${e.item === 'powder' ? 'Powder (தூள்)' : 'Tobacco (இலை)'}</td>
        <td class="col-type">${e.typeLabel}</td>
        <td class="col-kg">${e.kg}</td>
      </tr>
    `).join('');

    return `
      <div class="tvs-month-block">
        <div class="tvs-month-title">${m.monthHeading}</div>
        <table class="tvs-table">
          <thead>
            <tr>
              <th class="col-date">Date (தேதி)</th>
              <th class="col-material">Material (பொருள்)</th>
              <th class="col-type">Type (வகை)</th>
              <th class="col-kg">Kg (கிலோ)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="tvs-month-total-line">
          ${m.monthTotalLine}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="tvs-pdf-container" id="tvsStockReportDoc">
      <div class="tvs-pdf-header">
        <h1 class="tvs-brand-title">TVS</h1>
      </div>

      ${monthBlocksHTML}

      <div class="tvs-final-total-line">
        ${finalTotalLine}
      </div>
    </div>
  `;
}

async function downloadStockImage() {
  const fromInput = document.getElementById('stockReportFromDate');
  const toInput = document.getElementById('stockReportToDate');
  const itemSelect = document.getElementById('stockReportMaterialFilter');
  const from = fromInput ? fromInput.value : '';
  const to = toInput ? toInput.value : '';
  const item = itemSelect ? itemSelect.value : 'all';

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  showToast(isEn ? 'Generating report image...' : 'அறிக்கை படம் தயாராகிறது...', 'info');

  let data = cachedMonthlyStockReport;
  const normalizedItem = (item === 'leaf' ? 'tobacco' : item);
  if (!data || data.from !== from || data.to !== to || data.itemFilter !== normalizedItem) {
    data = await loadStockReportData(from, to, item);
  }

  if (!data) {
    showToast(isEn ? 'Could not load report data' : 'அறிக்கை விவரங்களை ஏற்ற முடியவில்லை', 'error');
    return;
  }

  const html = generateStockReportHTML(data);
  const container = document.getElementById('pdfPrintableSheet');
  if (!container) return;
  container.innerHTML = html;

  // Allow DOM layout and fonts to settle cleanly
  await new Promise(resolve => setTimeout(resolve, 80));

  const element = container.querySelector('#tvsStockReportDoc') || container;

  const matTag = (data.itemFilter === 'tobacco' ? 'Leaf' : (data.itemFilter === 'powder' ? 'Powder' : (data.itemFilter === 'sona' ? 'SONA' : (data.itemFilter === 'a1' ? 'A1' : (data.itemFilter === 'super' ? 'SUPER' : 'All')))));
  const filename = `TVS_Stock_${matTag}_${data.from}_to_${data.to}.png`;

  const triggerDownload = (dataUrl) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isEn ? 'Report image downloaded successfully!' : 'அறிக்கை படம் வெற்றிகரமாக பதிவிறக்கப்பட்டது!', 'success');
  };

  if (typeof html2canvas !== 'undefined') {
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        triggerDownload(dataUrl);
        return;
      }
    } catch (canvasErr) {
      console.warn('html2canvas direct export warning:', canvasErr);
    }
  }

  if (typeof html2pdf !== 'undefined') {
    const opt = {
      margin: 0,
      image: { type: 'png', quality: 1.0 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: false,
        backgroundColor: '#ffffff'
      }
    };

    try {
      const dataUrl = await html2pdf().set(opt).from(element).outputImg('datauristring');
      if (dataUrl) {
        triggerDownload(dataUrl);
        return;
      }
      throw new Error('outputImg returned empty data');
    } catch (err) {
      console.warn('outputImg attempt error, trying toCanvas fallback:', err);
      try {
        const worker = html2pdf().set(opt).from(element);
        await worker.toCanvas();
        if (worker.prop && worker.prop.canvas) {
          const fallbackDataUrl = worker.prop.canvas.toDataURL('image/png');
          triggerDownload(fallbackDataUrl);
          return;
        }
        throw new Error('No canvas generated in worker.prop');
      } catch (err2) {
        console.error('Image export fallback error:', err2);
        showToast(isEn ? 'Image export error, opening preview instead' : 'படம் பதிவிறக்குவதில் பிழை, முன்னோட்டம் திறக்கப்படுகிறது', 'warning');
        previewMonthlyStockReport();
      }
    }
  } else {
    previewMonthlyStockReport();
    showToast(isEn ? 'Opening report preview...' : 'அறிக்கை முன்னோட்டம் திறக்கப்படுகிறது...', 'info');
  }
}

async function downloadStockPDF() {
  const fromInput = document.getElementById('stockReportFromDate');
  const toInput = document.getElementById('stockReportToDate');
  const itemSelect = document.getElementById('stockReportMaterialFilter');

  const from = fromInput ? fromInput.value : '';
  const to = toInput ? toInput.value : '';
  const item = itemSelect ? itemSelect.value : 'all';

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  showToast(isEn ? 'Generating PDF...' : 'PDF தயாராகிறது...', 'info');

  // --- LOAD REPORT DATA ---
  let data = cachedMonthlyStockReport;
  const normalizedItem = (item === 'leaf' ? 'tobacco' : item);
  if (!data || data.from !== from || data.to !== to || data.itemFilter !== normalizedItem) {
    data = await loadStockReportData(from, to, item);
  }
  if (!data) {
    showToast(isEn ? 'Could not load report data' : 'அறிக்கை விவரங்களை ஏற்ற முடியவில்லை', 'error');
    return;
  }

  // --- CHECK html2canvas ---
  if (typeof html2canvas === 'undefined') {
    showToast(isEn ? 'Canvas library not loaded.' : 'Canvas நூலகம் ஏற்றப்படவில்லை.', 'error');
    console.error('html2canvas library is not loaded.');
    return;
  }

  // --- CHECK jsPDF ---
  let jsPDFClass = null;
  if (window.jspdf && window.jspdf.jsPDF) {
    jsPDFClass = window.jspdf.jsPDF;
  }
  if (!jsPDFClass) {
    showToast(isEn ? 'PDF library not loaded.' : 'PDF நூலகம் ஏற்றப்படவில்லை.', 'error');
    console.error('jsPDF library is not loaded.');
    return;
  }

  const btn = document.getElementById('btnDownloadStockPDF');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; }

  // --- CREATE TEMPORARY VISIBLE ELEMENT ---
  const tempWrap = document.createElement('div');
  tempWrap.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 780px;
    background: #ffffff;
    z-index: 999999;
    pointer-events: none;
    visibility: visible;
    opacity: 1;
    overflow: visible;
  `;
  tempWrap.innerHTML = generateStockReportHTML(data);
  document.body.appendChild(tempWrap);

  // Give browser time to render Tamil fonts, tables and layout
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const element = tempWrap.querySelector('#tvsStockReportDoc') || tempWrap;
    if (!element) throw new Error('Report element was not created.');

    // --- RENDER AS CANVAS ---
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 780,
      foreignObjectRendering: false
    });
    if (!canvas || !canvas.width || !canvas.height) throw new Error('Report canvas is empty.');

    // --- CREATE A4 PDF ---
    const pdf = new jsPDFClass({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 5;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const canvasRatio = canvas.width / canvas.height;
    const imageWidth = usableWidth;
    const imageHeight = imageWidth / canvasRatio;

    // --- MULTI-PAGE SLICING ---
    let sourceY = 0;
    let remainingHeight = canvas.height;
    const pageCanvasHeight = Math.floor(canvas.height * (usableHeight / imageHeight));
    let firstPage = true;

    while (remainingHeight > 0) {
      const currentSliceHeight = Math.min(pageCanvasHeight, remainingHeight);

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = currentSliceHeight;
      const ctx = sliceCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, sourceY, canvas.width, currentSliceHeight, 0, 0, canvas.width, currentSliceHeight);

      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.98);
      if (!firstPage) pdf.addPage();

      const sliceHeightMM = (currentSliceHeight / canvas.width) * imageWidth;
      pdf.addImage(sliceData, 'JPEG', margin, margin, imageWidth, sliceHeightMM, undefined, 'FAST');

      sourceY += currentSliceHeight;
      remainingHeight -= currentSliceHeight;
      firstPage = false;
    }

    // --- FILE NAME & DOWNLOAD ---
    const matTag =
      data.itemFilter === 'tobacco' ? 'Leaf'
      : data.itemFilter === 'powder' ? 'Powder'
      : data.itemFilter === 'sona' ? 'SONA'
      : data.itemFilter === 'a1' ? 'A1'
      : data.itemFilter === 'super' ? 'SUPER'
      : 'All';
    const filename = `TVS_Stock_${matTag}_${data.from}_to_${data.to}.pdf`;

    pdf.save(filename);
    showToast(isEn ? 'PDF downloaded successfully!' : 'PDF வெற்றிகரமாக பதிவிறக்கப்பட்டது!', 'success');

  } catch (err) {
    console.error('PDF export error:', err);
    showToast(isEn ? 'PDF export failed. Please try again.' : 'PDF ஏற்றுமதி தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.', 'error');
  } finally {
    if (tempWrap && tempWrap.parentNode) tempWrap.parentNode.removeChild(tempWrap);
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }
}

async function previewMonthlyStockReport() {
  const fromInput = document.getElementById('stockReportFromDate');
  const toInput = document.getElementById('stockReportToDate');
  const itemSelect = document.getElementById('stockReportMaterialFilter');
  const from = fromInput ? fromInput.value : '';
  const to = toInput ? toInput.value : '';
  const item = itemSelect ? itemSelect.value : 'all';

  let data = cachedMonthlyStockReport;
  const normalizedItem = (item === 'leaf' ? 'tobacco' : item);
  if (!data || data.from !== from || data.to !== to || data.itemFilter !== normalizedItem) {
    data = await loadStockReportData(from, to, item);
  }

  if (!data) return;

  const container = document.getElementById('previewReportContainer');
  if (container) {
    container.innerHTML = generateStockReportHTML(data);
  }

  const modal = document.getElementById('stockReportPreviewModal');
  if (modal) modal.classList.add('active');
}

function closeStockReportPreviewModal() {
  const modal = document.getElementById('stockReportPreviewModal');
  if (modal) modal.classList.remove('active');
}

function printMonthlyStockReport() {
  const container = document.getElementById('previewReportContainer');
  if (!container || !container.innerHTML.trim()) {
    previewMonthlyStockReport().then(() => {
      setTimeout(() => window.print(), 300);
    });
  } else {
    window.print();
  }
}

// Aliases for template and backwards compatibility
const downloadMonthlyStockPDF = downloadStockPDF;
const downloadStockReportPDF = downloadStockPDF;
const downloadMonthlyStockImage = downloadStockImage;
const downloadStockImageBtn = downloadStockImage;

window.addEventListener('languageChanged', () => {
  if (cachedStock) renderStockUI(cachedStock);
  runBagCalculator();
  if (cachedMonthlyStockReport) {
    renderStockReportSnapshot(cachedMonthlyStockReport);
    const container = document.getElementById('previewReportContainer');
    const modal = document.getElementById('stockReportPreviewModal');
    if (modal && modal.classList.contains('active') && container) {
      container.innerHTML = generateStockReportHTML(cachedMonthlyStockReport);
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadStockData();
  runBagCalculator();
  initStockReportControls();
});
