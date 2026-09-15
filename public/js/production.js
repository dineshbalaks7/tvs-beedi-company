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

// ----------------------------------------------------
// Date Filtering, Monthly Grouping & TVS PDF Export
// ----------------------------------------------------
let activeProdPreset = 'this-month';
let currentFilteredData = null;

function getRecordISODate(dateVal) {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(isoDateStr) {
  if (!isoDateStr) return '-';
  const parts = String(isoDateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoDateStr;
}

function getThisMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${d}`
  };
}

function getLastMonthRange() {
  const now = new Date();
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const fromY = firstDayLastMonth.getFullYear();
  const fromM = String(firstDayLastMonth.getMonth() + 1).padStart(2, '0');
  const fromD = '01';

  const toY = lastDayLastMonth.getFullYear();
  const toM = String(lastDayLastMonth.getMonth() + 1).padStart(2, '0');
  const toD = String(lastDayLastMonth.getDate()).padStart(2, '0');

  return {
    from: `${fromY}-${fromM}-${fromD}`,
    to: `${toY}-${toM}-${toD}`
  };
}

function getLast3MonthsRange() {
  const now = new Date();
  const firstDay3MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const fromY = firstDay3MonthsAgo.getFullYear();
  const fromM = String(firstDay3MonthsAgo.getMonth() + 1).padStart(2, '0');
  const fromD = '01';

  const toY = now.getFullYear();
  const toM = String(now.getMonth() + 1).padStart(2, '0');
  const toD = String(now.getDate()).padStart(2, '0');

  return {
    from: `${fromY}-${fromM}-${fromD}`,
    to: `${toY}-${toM}-${toD}`
  };
}

function getThisYearRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    from: `${y}-01-01`,
    to: `${y}-${m}-${d}`
  };
}

function updatePresetButtonsUI(activePreset) {
  activeProdPreset = activePreset || null;
  const presets = [
    { id: 'btnProdPresetThisMonth', key: 'this-month' },
    { id: 'btnProdPresetLastMonth', key: 'last-month' },
    { id: 'btnProdPreset3Months', key: '3-months' },
    { id: 'btnProdPresetThisYear', key: 'this-year' }
  ];
  presets.forEach(p => {
    const el = document.getElementById(p.id);
    if (el) {
      if (p.key === activePreset) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  });
}

function setProductionDatePreset(presetType) {
  let range;
  if (presetType === 'last-month') {
    range = getLastMonthRange();
  } else if (presetType === '3-months') {
    range = getLast3MonthsRange();
  } else if (presetType === 'this-year') {
    range = getThisYearRange();
  } else {
    presetType = 'this-month';
    range = getThisMonthRange();
  }

  const fromInput = document.getElementById('prodFilterFromDate');
  const toInput = document.getElementById('prodFilterToDate');
  if (fromInput) fromInput.value = range.from;
  if (toInput) toInput.value = range.to;

  hideDateValidationError();
  updatePresetButtonsUI(presetType);
  applyProductionDateFilter();
}

function hideDateValidationError() {
  const alertEl = document.getElementById('prodDateValidationError');
  if (alertEl) alertEl.style.display = 'none';

  const btnTop = document.getElementById('btnDownloadProdPDF');
  const btnBottom = document.getElementById('btnDownloadProdPDFBottom');
  if (btnTop) btnTop.disabled = false;
  if (btnBottom) btnBottom.disabled = false;
}

function showDateValidationError(msg) {
  const alertEl = document.getElementById('prodDateValidationError');
  const textEl = document.getElementById('prodDateValidationText');
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const errorMsg = msg || (isEn ? 'From Date cannot be later than To Date.' : 'தொடக்க தேதி முடிவு தேதியை விட அதிகமாக இருக்கக்கூடாது.');

  if (textEl) textEl.textContent = errorMsg;
  if (alertEl) alertEl.style.display = 'flex';

  const btnTop = document.getElementById('btnDownloadProdPDF');
  const btnBottom = document.getElementById('btnDownloadProdPDFBottom');
  if (btnTop) btnTop.disabled = true;
  if (btnBottom) btnBottom.disabled = true;

  showToast(errorMsg, 'error');
}

function onProdDateFilterChange() {
  const fromInput = document.getElementById('prodFilterFromDate');
  const toInput = document.getElementById('prodFilterToDate');
  const from = fromInput ? fromInput.value : '';
  const to = toInput ? toInput.value : '';

  if (from && to && from > to) {
    showDateValidationError();
    const container = document.getElementById('prodFilteredRecordsContainer');
    const totalContainer = document.getElementById('prodCompleteTotalContainer');
    const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
    if (container) {
      container.innerHTML = `
        <div class="prod-empty-state">
          <div class="prod-empty-icon">⚠️</div>
          <div class="prod-empty-text" style="color: #dc2626;">
            ${isEn ? 'From Date cannot be later than To Date.' : 'தொடக்க தேதி முடிவு தேதியை விட அதிகமாக இருக்கக்கூடாது.'}
          </div>
        </div>
      `;
    }
    if (totalContainer) totalContainer.innerHTML = '';
    updatePresetButtonsUI(null);
    return;
  }

  hideDateValidationError();

  // Check if manually selected date matches one of our presets
  const tm = getThisMonthRange();
  const lm = getLastMonthRange();
  const l3 = getLast3MonthsRange();
  const ty = getThisYearRange();

  if (from === tm.from && to === tm.to) {
    updatePresetButtonsUI('this-month');
  } else if (from === lm.from && to === lm.to) {
    updatePresetButtonsUI('last-month');
  } else if (from === l3.from && to === l3.to) {
    updatePresetButtonsUI('3-months');
  } else if (from === ty.from && to === ty.to) {
    updatePresetButtonsUI('this-year');
  } else {
    updatePresetButtonsUI(null);
  }

  applyProductionDateFilter();
}

async function applyProductionDateFilter() {
  const fromInput = document.getElementById('prodFilterFromDate');
  const toInput = document.getElementById('prodFilterToDate');

  let from = fromInput ? fromInput.value : '';
  let to = toInput ? toInput.value : '';

  if (!from || !to) {
    const defaultRange = getThisMonthRange();
    from = from || defaultRange.from;
    to = to || defaultRange.to;
    if (fromInput) fromInput.value = from;
    if (toInput) toInput.value = to;
  }

  if (from > to) {
    showDateValidationError();
    return;
  }

  // Update badge
  const badge = document.getElementById('prodReportActiveRangeBadge');
  if (badge) {
    badge.textContent = `${formatDisplayDate(from)} ~ ${formatDisplayDate(to)}`;
  }

  try {
    const res = await fetch(`/api/production?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=2000`);
    if (!res.ok) throw new Error('Failed to fetch production records for range');
    const records = await res.json();

    // In-memory exact calendar filter & Oldest -> Newest sort
    const filtered = records.filter(p => {
      const d = getRecordISODate(p.date);
      return d >= from && d <= to;
    });

    filtered.sort((a, b) => getRecordISODate(a.date).localeCompare(getRecordISODate(b.date)));

    const groupedData = groupProductionRecordsByMonth(filtered, from, to);
    currentFilteredData = groupedData;

    renderFilteredProductionUI(groupedData);

  } catch (err) {
    console.error('Error applying date filter:', err);
    showToast('Failed to load filtered production records', 'error');
  }
}

function groupProductionRecordsByMonth(records, from, to) {
  const cutsPerBox = window.appSettings?.cutsPerBox || 300;
  const beedisPerBox = window.appSettings?.beedisPerBox || 6000;

  const monthGroups = {};
  let completeTotalBoxes = 0;
  let completeTotalCuts = 0;
  let completeTotalBeedis = 0;

  records.forEach(p => {
    const dateStr = getRecordISODate(p.date);
    const monthKey = dateStr.substring(0, 7); // e.g. '2026-09'

    if (!monthGroups[monthKey]) {
      monthGroups[monthKey] = {
        key: monthKey,
        records: [],
        totalBoxes: 0,
        totalCuts: 0,
        totalBeedis: 0
      };
    }

    const cuts = Number(p.cuts) || 0;
    let boxes = (p.boxes !== undefined && p.boxes !== null && p.boxes > 0)
      ? Number(p.boxes)
      : Number((cuts / cutsPerBox).toFixed(2));
    boxes = Math.round(boxes * 10) / 10;

    const beedis = (p.beedis !== undefined && p.beedis !== null && p.beedis > 0)
      ? Number(p.beedis)
      : Math.round(boxes * beedisPerBox);

    monthGroups[monthKey].records.push({
      ...p,
      dateStr,
      boxes,
      cuts,
      beedis
    });

    // Pure numeric summing of quantities
    monthGroups[monthKey].totalBoxes += boxes;
    monthGroups[monthKey].totalCuts += cuts;
    monthGroups[monthKey].totalBeedis += beedis;
  });

  const sortedMonthKeys = Object.keys(monthGroups).sort();
  sortedMonthKeys.forEach(k => {
    const g = monthGroups[k];
    g.totalBoxes = Math.round(g.totalBoxes * 10) / 10;
    completeTotalBoxes += g.totalBoxes;
    completeTotalCuts += g.totalCuts;
    completeTotalBeedis += g.totalBeedis;
  });

  completeTotalBoxes = Math.round(completeTotalBoxes * 10) / 10;

  return {
    from,
    to,
    records,
    sortedMonthKeys,
    monthGroups,
    completeTotal: {
      boxes: completeTotalBoxes,
      cuts: completeTotalCuts,
      beedis: completeTotalBeedis
    }
  };
}

function getMonthNames(monthKey) {
  const parts = monthKey.split('-');
  const y = parts[0];
  const m = Number(parts[1]);
  const dateObj = new Date(Number(y), m - 1, 1);

  const tamilMonths = [
    'ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்',
    'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'
  ];

  const monthNameTa = tamilMonths[m - 1] || '';
  const monthNameEn = dateObj.toLocaleDateString('en-US', { month: 'long' });

  return { y, m, monthNameTa, monthNameEn };
}

function renderFilteredProductionUI(data) {
  const container = document.getElementById('prodFilteredRecordsContainer');
  const totalContainer = document.getElementById('prodCompleteTotalContainer');
  const bottomActionRow = document.getElementById('prodBottomActionRow');
  if (!container) return;

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  if (!data || !data.records || data.records.length === 0) {
    container.innerHTML = `
      <div class="prod-empty-state">
        <div class="prod-empty-icon">📭</div>
        <div class="prod-empty-text">
          ${isEn ? 'No production records found for the selected date range.' : 'தேர்ந்தெடுக்கப்பட்ட காலக்கட்டத்தில் உற்பத்தி பதிவுகள் எதுவும் இல்லை.'}
        </div>
        <div style="font-size: 12.5px; color: var(--text-dim); margin-top: 4px;">
          (${formatDisplayDate(data.from)} ~ ${formatDisplayDate(data.to)})
        </div>
      </div>
    `;
    if (totalContainer) totalContainer.innerHTML = '';
    if (bottomActionRow) bottomActionRow.style.display = 'none';
    return;
  }

  if (bottomActionRow) bottomActionRow.style.display = 'flex';

  // Render each month block
  let monthsHTML = '';
  data.sortedMonthKeys.forEach(mKey => {
    const group = data.monthGroups[mKey];
    const { y, monthNameTa, monthNameEn } = getMonthNames(mKey);

    const rowsHTML = group.records.map(p => {
      return `
        <tr>
          <td><strong>${formatDisplayDate(p.dateStr)}</strong></td>
          <td style="text-align: right;"><span style="color: var(--accent-amber); font-weight: 700;">${formatNumber(p.boxes)}</span></td>
          <td style="text-align: right;">${formatNumber(p.cuts)}</td>
          <td style="text-align: right;">${formatNumber(p.beedis)}</td>
          <td style="text-align: center;">
            <div class="table-actions-cell" style="justify-content: center;">
              <button class="btn-secondary btn-table-action" onclick="startEditProduction('${p._id}')" title="Edit">✏️</button>
              <button class="btn-danger btn-table-action" onclick="deleteProduction('${p._id}')" title="Delete">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const monthHeading = isEn ? `${monthNameEn} ${y}` : `${monthNameTa} ${y} (${monthNameEn})`;
    const monthTotalLabel = isEn ? `${monthNameEn} Total` : `${monthNameTa} மாத மொத்தம் (${monthNameEn} Total)`;

    monthsHTML += `
      <div class="prod-month-section">
        <div class="prod-month-header">
          <span>📅 ${monthHeading}</span>
          <span style="font-size: 13px; font-weight: 600; color: var(--text-muted);">${group.records.length} ${isEn ? 'entries' : 'பதிவுகள்'}</span>
        </div>
        <div class="table-responsive" style="margin: 0; border: none; border-radius: 0;">
          <table class="data-table" style="margin: 0;">
            <thead>
              <tr>
                <th style="width: 25%;" data-i18n="colDate">தேதி (Date)</th>
                <th style="width: 20%; text-align: right;" data-i18n="colBoxes">கட்டை (Boxes)</th>
                <th style="width: 20%; text-align: right;" data-i18n="colCuts">கட்டுகள் (Cuts)</th>
                <th style="width: 20%; text-align: right;" data-i18n="colBeedis">பீடிகள் (Beedis)</th>
                <th style="width: 15%; text-align: center;" data-i18n="colActions">செயல்கள்</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
        </div>
        <div class="prod-month-total-bar">
          <div class="prod-month-total-title">
            ${monthTotalLabel}
          </div>
          <div class="prod-month-total-metrics">
            <span>${isEn ? 'Boxes' : 'கட்டை'}: <strong style="color: var(--accent-amber);">${formatNumber(group.totalBoxes)}</strong></span>
            <span>${isEn ? 'Cuts' : 'கட்டுகள்'}: <strong>${formatNumber(group.totalCuts)}</strong></span>
            <span>${isEn ? 'Beedies' : 'பீடிகள்'}: <strong>${formatNumber(group.totalBeedis)}</strong></span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = monthsHTML;

  // Render Complete Total Card
  if (totalContainer) {
    const ct = data.completeTotal;
    totalContainer.innerHTML = `
      <div class="complete-total-card">
        <div class="complete-total-header">
          <span>🏆</span>
          <span>${isEn ? 'COMPLETE TOTAL' : 'முழு மொத்தம் (COMPLETE TOTAL)'}</span>
        </div>
        <div class="complete-total-grid">
          <div class="complete-total-box">
            <span class="complete-total-box-label">${isEn ? 'TOTAL BOXES' : 'மொத்த கட்டை (Total Boxes)'}</span>
            <span class="complete-total-box-value highlight-orange">${formatNumber(ct.boxes)}</span>
          </div>
          <div class="complete-total-box">
            <span class="complete-total-box-label">${isEn ? 'TOTAL CUTS' : 'மொத்த கட்டுகள் (Total Cuts)'}</span>
            <span class="complete-total-box-value">${formatNumber(ct.cuts)}</span>
          </div>
          <div class="complete-total-box">
            <span class="complete-total-box-label">${isEn ? 'TOTAL BEEDIES' : 'மொத்த பீடிகள் (Total Beedies)'}</span>
            <span class="complete-total-box-value">${formatNumber(ct.beedis)}</span>
          </div>
        </div>
      </div>
    `;
  }
}

// ----------------------------------------------------
// PDF Generation strictly following Stock PDF Design
// ----------------------------------------------------

function generateProductionPDFHTML(data) {
  if (!data) return '';

  const fromDisp = formatDisplayDate(data.from);
  const toDisp = formatDisplayDate(data.to);

  if (!data.records || data.records.length === 0) {
    return `
      <div class="tvs-pdf-container" id="tvsProductionReportDoc">
        <div class="tvs-pdf-header">
          <h1 class="tvs-brand-title">TVS</h1>
          <div class="tvs-pdf-subtitle">PRODUCTION REPORT</div>
          <div class="tvs-pdf-daterange">Date Range: ${fromDisp} to ${toDisp}</div>
        </div>
        <div style="text-align: center; padding: 40px 20px; color: #475569; font-size: 15px;">
          <p style="margin-bottom: 6px; font-weight: 700;">தேர்ந்தெடுக்கப்பட்ட காலக்கட்டத்தில் உற்பத்தி பதிவுகள் எதுவும் இல்லை.</p>
          <p style="font-size: 13px; color: #64748b;">No production records found for ${fromDisp} to ${toDisp}.</p>
        </div>
      </div>
    `;
  }

  const monthBlocksHTML = data.sortedMonthKeys.map(mKey => {
    const group = data.monthGroups[mKey];
    const { y, monthNameTa, monthNameEn } = getMonthNames(mKey);

    const rows = group.records.map(p => `
      <tr>
        <td class="col-date">${formatDisplayDate(p.dateStr)}</td>
        <td class="col-boxes">${formatNumber(p.boxes)}</td>
        <td class="col-cuts">${formatNumber(p.cuts)}</td>
        <td class="col-beedis">${formatNumber(p.beedis)}</td>
      </tr>
    `).join('');

    return `
      <div class="tvs-month-block">
        <div class="tvs-month-title">${monthNameEn} ${y} (${monthNameTa})</div>
        <table class="tvs-table">
          <thead>
            <tr>
              <th class="col-date">Date (தேதி)</th>
              <th class="col-boxes">Boxes (கட்டை)</th>
              <th class="col-cuts">Cuts (கட்டுகள்)</th>
              <th class="col-beedis">Beedies (பீடிகள்)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="tvs-month-total-line">
          ${monthNameEn} Total (${monthNameTa} மாத மொத்தம்) = ${formatNumber(group.totalBoxes)} Boxes | ${formatNumber(group.totalCuts)} Cuts | ${formatNumber(group.totalBeedis)} Beedies
        </div>
      </div>
    `;
  }).join('');

  const ct = data.completeTotal;

  return `
    <div class="tvs-pdf-container" id="tvsProductionReportDoc">
      <div class="tvs-pdf-header">
        <h1 class="tvs-brand-title">TVS</h1>
        <div class="tvs-pdf-subtitle">PRODUCTION REPORT</div>
        <div class="tvs-pdf-daterange">
          Date Range: <strong>${fromDisp} to ${toDisp}</strong>
        </div>
      </div>

      ${monthBlocksHTML}

      <div class="tvs-final-total-line">
        <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 8px; text-transform: uppercase;">
          COMPLETE TOTAL (முழு மொத்தம்)
        </div>
        <table class="tvs-table" style="margin-bottom: 0;">
          <thead>
            <tr>
              <th style="text-align: right; width: 33.33%;">Total Boxes (மொத்த கட்டை)</th>
              <th style="text-align: right; width: 33.33%;">Total Cuts (மொத்த கட்டுகள்)</th>
              <th style="text-align: right; width: 33.33%;">Total Beedies (மொத்த பீடிகள்)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="col-boxes" style="font-size: 16px; font-weight: 800; color: #0f172a; text-align: right;">${formatNumber(ct.boxes)}</td>
              <td class="col-cuts" style="font-size: 16px; font-weight: 800; color: #0f172a; text-align: right;">${formatNumber(ct.cuts)}</td>
              <td class="col-beedis" style="font-size: 16px; font-weight: 800; color: #0f172a; text-align: right;">${formatNumber(ct.beedis)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function downloadProductionPDF() {
  const fromInput = document.getElementById('prodFilterFromDate');
  const toInput = document.getElementById('prodFilterToDate');
  const from = fromInput ? fromInput.value : '';
  const to = toInput ? toInput.value : '';

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  if (from && to && from > to) {
    showDateValidationError();
    return;
  }

  // Check libraries
  if (typeof html2canvas === 'undefined') {
    showToast(isEn ? 'Canvas library not loaded.' : 'Canvas நூலகம் ஏற்றப்படவில்லை.', 'error');
    console.error('html2canvas library is not loaded.');
    return;
  }

  let jsPDFClass = null;
  if (window.jspdf && window.jspdf.jsPDF) {
    jsPDFClass = window.jspdf.jsPDF;
  }
  if (!jsPDFClass) {
    showToast(isEn ? 'PDF library not loaded.' : 'PDF நூலகம் ஏற்றப்படவில்லை.', 'error');
    console.error('jsPDF library is not loaded.');
    return;
  }

  const btnTop = document.getElementById('btnDownloadProdPDF');
  const btnBottom = document.getElementById('btnDownloadProdPDFBottom');
  if (btnTop) { btnTop.disabled = true; btnTop.style.opacity = '0.7'; }
  if (btnBottom) { btnBottom.disabled = true; btnBottom.style.opacity = '0.7'; }

  showToast(isEn ? 'Generating PDF...' : 'PDF தயாராகிறது...', 'info');

  // Ensure current data is up to date
  let data = currentFilteredData;
  if (!data || data.from !== from || data.to !== to) {
    await applyProductionDateFilter();
    data = currentFilteredData;
  }

  if (!data || !data.records || data.records.length === 0) {
    showToast(isEn ? 'No production records found for the selected date range.' : 'தேர்ந்தெடுக்கப்பட்ட காலக்கட்டத்தில் உற்பத்தி பதிவுகள் எதுவும் இல்லை.', 'warning');
    if (btnTop) { btnTop.disabled = false; btnTop.style.opacity = '1'; }
    if (btnBottom) { btnBottom.disabled = false; btnBottom.style.opacity = '1'; }
    return;
  }

  // Create temporary offscreen container
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
  tempWrap.innerHTML = generateProductionPDFHTML(data);
  document.body.appendChild(tempWrap);

  // Allow browser time to render Tamil fonts, tables and layout
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const element = tempWrap.querySelector('#tvsProductionReportDoc') || tempWrap;
    if (!element) throw new Error('Report element was not created.');

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

    if (!canvas || !canvas.width || !canvas.height) {
      throw new Error('Report canvas is empty.');
    }

    // Create A4 PDF (portrait, unit: mm)
    const pdf = new jsPDFClass({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 5;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const canvasRatio = canvas.width / canvas.height;
    const imageWidth = usableWidth;
    const imageHeight = imageWidth / canvasRatio;

    // Multi-page slicing
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

    const filename = `TVS_Production_Report_${formatDisplayDate(data.from)}_to_${formatDisplayDate(data.to)}.pdf`;
    pdf.save(filename);
    showToast(isEn ? 'PDF downloaded successfully!' : 'PDF வெற்றிகரமாக பதிவிறக்கப்பட்டது!', 'success');

  } catch (err) {
    console.error('Production PDF export error:', err);
    showToast(isEn ? 'PDF export failed. Please try again.' : 'PDF ஏற்றுமதி தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.', 'error');
  } finally {
    if (tempWrap && tempWrap.parentNode) tempWrap.parentNode.removeChild(tempWrap);
    if (btnTop) { btnTop.disabled = false; btnTop.style.opacity = '1'; }
    if (btnBottom) { btnBottom.disabled = false; btnBottom.style.opacity = '1'; }
  }
}

async function loadProductionData() {
  try {
    const res = await fetch('/api/production');
    const records = await res.json();
    cachedProduction = records;
    renderProductionDashboardSummary(records);
    renderProductionUI(records);
    renderProductionBarChart(currentProdChartGranularity);
    renderProductionConsumptionChart(currentProdChartGranularity);
    await applyProductionDateFilter();
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
let prodConsumptionChartInstance = null;

function renderProductionDashboardSummary(records) {
  const today = getTodayISODate();
  const todayDate = new Date(`${today}T00:00:00`);
  const weekStart = new Date(todayDate);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const totals = { today: { boxes: 0, beedis: 0 }, week: { boxes: 0, beedis: 0 }, month: { boxes: 0, beedis: 0 } };
  const weekDays = new Set();

  (records || []).forEach(record => {
    const dateKey = getRecordISODate(record.date);
    const date = new Date(`${dateKey}T00:00:00`);
    const boxes = Number(record.boxes ?? ((record.cuts || 0) / 300)) || 0;
    const beedis = Number(record.beedis) || 0;
    if (dateKey === today) {
      totals.today.boxes += boxes;
      totals.today.beedis += beedis;
    }
    if (date >= weekStart && date <= todayDate) {
      totals.week.boxes += boxes;
      totals.week.beedis += beedis;
      weekDays.add(dateKey);
    }
    if (date >= monthStart && date <= todayDate) {
      totals.month.boxes += boxes;
      totals.month.beedis += beedis;
    }
  });

  const average = weekDays.size ? totals.week.boxes / weekDays.size : 0;
  const trendText = weekDays.size > 1
    ? `${weekDays.size} active days | ${average.toFixed(1)} boxes/day`
    : 'Waiting for production data';
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  setText('prodDashTodayBoxes', `${totals.today.boxes.toFixed(1)} Boxes`);
  setText('prodDashTodaySub', `${formatNumber(totals.today.beedis)} Beedis`);
  setText('prodDashWeekBoxes', `${totals.week.boxes.toFixed(1)} Boxes`);
  setText('prodDashWeekSub', `${weekDays.size} production days`);
  setText('prodDashMonthBoxes', `${totals.month.boxes.toFixed(1)} Boxes`);
  setText('prodDashMonthSub', `${formatNumber(totals.month.beedis)} Beedis`);
  setText('prodDashAverageBoxes', `${average.toFixed(1)} Boxes`);
  setText('prodDashTrend', trendText);
}

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
  renderProductionConsumptionChart(granularity);
}

function aggregateProductionData(records, granularity) {
  if (!records || records.length === 0) {
    return { labels: [], boxes: [], cuts: [], beedis: [], tobaccoKg: [], powderKg: [] };
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
      buckets[key] = { key, label, boxes: 0, cuts: 0, beedis: 0, tobaccoKg: 0, powderKg: 0 };
    }

    const bCount = (p.boxes !== undefined && p.boxes !== null && p.boxes > 0) ? p.boxes : ((p.cuts || 0) / 300);
    buckets[key].boxes += bCount;
    buckets[key].cuts += (p.cuts || 0);
    buckets[key].beedis += (p.beedis || 0);
    buckets[key].tobaccoKg += (p.tobaccoUsedGrams || 0) / 1000;
    buckets[key].powderKg += (p.powderUsedGrams || 0) / 1000;
  });

  const sortedKeys = Object.keys(buckets).sort();
  // Keep last 14 days, 10 weeks, or 12 months for clean visualization
  const limit = granularity === 'day' ? 14 : (granularity === 'week' ? 10 : 12);
  const activeKeys = sortedKeys.slice(-limit);

  return {
    labels: activeKeys.map(k => buckets[k].label),
    boxes: activeKeys.map(k => Number(buckets[k].boxes.toFixed(1))),
    cuts: activeKeys.map(k => buckets[k].cuts),
    beedis: activeKeys.map(k => buckets[k].beedis),
    tobaccoKg: activeKeys.map(k => Number(buckets[k].tobaccoKg.toFixed(2))),
    powderKg: activeKeys.map(k => Number(buckets[k].powderKg.toFixed(2)))
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

function renderProductionConsumptionChart(granularity = currentProdChartGranularity) {
  const canvas = document.getElementById('productionConsumptionChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
  const fontFam = "'Outfit', 'Mukta Malar', sans-serif";
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  const agg = aggregateProductionData(cachedProduction, granularity);
  const status = document.getElementById('productionConsumptionChartStatus');

  if (status) {
    status.textContent = isEn ? 'No production data available for this period.' : 'இந்த காலக்கட்டத்தில் உற்பத்தி தரவு இல்லை.';
    status.hidden = agg.labels.length > 0;
  }
  if (prodConsumptionChartInstance) prodConsumptionChartInstance.destroy();

  prodConsumptionChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: agg.labels,
      datasets: [
        {
          label: isEn ? 'Tobacco (kg)' : 'Tobacco (கிலோ)',
          data: agg.tobaccoKg,
          borderColor: '#d97706',
          backgroundColor: 'rgba(217, 119, 6, 0.12)',
          pointBackgroundColor: '#d97706',
          pointRadius: 3,
          tension: 0.3,
          fill: true
        },
        {
          label: isEn ? 'Powder (kg)' : 'தூள் (கிலோ)',
          data: agg.powderKg,
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.08)',
          pointBackgroundColor: '#059669',
          pointRadius: 3,
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { color: textColor, font: { family: fontFam, size: 11, weight: 'bold' } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)} kg` } }
      },
      scales: {
        x: { ticks: { color: textColor, font: { family: fontFam, size: 11 } }, grid: { color: gridColor } },
        y: {
          beginAtZero: true,
          title: { display: true, text: isEn ? 'Kilograms' : 'கிலோ', color: textColor, font: { family: fontFam, size: 11 } },
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
  if (cachedProduction.length > 0) renderProductionDashboardSummary(cachedProduction);
  if (currentFilteredData) renderFilteredProductionUI(currentFilteredData);
  const boxesInput = document.getElementById('prodBoxes');
  if (boxesInput && boxesInput.value) {
    handleBoxesInput(boxesInput.value);
  }
  renderProductionBarChart(currentProdChartGranularity);
  renderProductionConsumptionChart(currentProdChartGranularity);
});

document.addEventListener('DOMContentLoaded', () => {
  const tm = getThisMonthRange();
  const fromInput = document.getElementById('prodFilterFromDate');
  const toInput = document.getElementById('prodFilterToDate');
  if (fromInput) fromInput.value = tm.from;
  if (toInput) toInput.value = tm.to;
  updatePresetButtonsUI('this-month');
  loadProductionData().then(checkUrlEditParam);
});

