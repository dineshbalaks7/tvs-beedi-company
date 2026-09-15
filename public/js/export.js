/**
 * TVS Beedi Company - Export Specific JavaScript
 * Packed Stock In Hand Validation, Duplicate Export Check, Edit Mode & Dispatch Ledger
 */

let cachedExports = null;
let exportFilterMode = 'all';
let currentDuplicateExportRecord = null;

function setExportFilter(mode, btn) {
  exportFilterMode = mode;
  document.querySelectorAll('.category-pills .cat-pill').forEach(p => p.classList.remove('active'));
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
  const beedisPerBox = window.appSettings?.beedisPerBox || 6000;
  const cutsPerBox = window.appSettings?.cutsPerBox || 300;
  const salaryPer1000 = window.appSettings?.salaryPer1000 || 320;
  const ratePer1000 = window.appSettings?.ratePer1000 || 340;

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
    showToast('Record not found', 'error');
    return;
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

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  if (submitText) submitText.textContent = isEn ? 'Update Export Record' : 'ஏற்றுமதி பதிவை மாற்று';
  if (submitIcon) submitIcon.textContent = '✏️';
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

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

  showToast(isEn ? 'Edit mode active' : 'திருத்தும் நிலை செயல்பாட்டில் உள்ளது', 'info');
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

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  if (submitText) submitText.textContent = isEn ? 'Save Export Record' : 'ஏற்றுமதியைச் சேமிக்கவும்';
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
  const cutsPerBox = window.appSettings?.cutsPerBox || 300;
  const boxes = Number(boxesInput.value) || 0;
  const cuts = Math.round(boxes * cutsPerBox);

  if (boxes <= 0) {
    showToast('Please enter valid boxes count', 'error');
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
      showToast('An export record already exists for this date!', 'error');
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

    showToast(isEditing ? 'Export updated successfully' : 'Export saved successfully', 'success');
    cancelEditExport();
    loadExportData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderExportUI(data) {
  if (!data || !data.totals) return;
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  // Metric Cards
  const expTodayBoxesEl = document.getElementById('expTodayBoxes');
  if (expTodayBoxesEl) {
    expTodayBoxesEl.innerHTML = `${formatNumber(data.totals.todayBoxes || 0)} <span class="metric-unit">${isEn ? 'Boxes' : 'கட்டை'}</span>`;
  }
  const expTodayBeedisEl = document.getElementById('expTodayBeedis');
  if (expTodayBeedisEl) {
    const todayBeedis = (data.totals.todayBoxes || 0) * (window.appSettings?.beedisPerBox || 6000);
    expTodayBeedisEl.textContent = `${formatNumber(todayBeedis)} ${isEn ? 'Beedis' : 'பீடிகள்'}`;
  }

  const expTotalBoxesEl = document.getElementById('expTotalBoxes');
  if (expTotalBoxesEl) {
    expTotalBoxesEl.innerHTML = `${formatNumber(data.totals.boxes)} <span class="metric-unit">${isEn ? 'Boxes' : 'கட்டை'}</span>`;
  }
  const expTotalCutsEl = document.getElementById('expTotalCuts');
  if (expTotalCutsEl) {
    expTotalCutsEl.textContent = `${formatNumber(data.totals.cuts)} ${isEn ? 'Cuts (300/Box)' : 'கட்டுகள் (300/Box)'}`;
  }

  const expTotalRateEl = document.getElementById('expTotalRate');
  if (expTotalRateEl) expTotalRateEl.textContent = formatINR(data.totals.rate);

  const expTotalProfitEl = document.getElementById('expTotalProfit');
  if (expTotalProfitEl) expTotalProfitEl.textContent = `${isEn ? 'Margin' : 'வித்தியாசம்'}: ${formatINR(data.totals.profit)}`;

  const expPackedStockEl = document.getElementById('expPackedStock');
  if (expPackedStockEl) {
    expPackedStockEl.innerHTML = `${formatNumber(data.totals.packedStockInHand || 0)} <span class="metric-unit">${isEn ? 'Boxes' : 'கட்டை'}</span>`;
  }
  const expStockSubEl = document.getElementById('expStockSub');
  if (expStockSubEl) {
    expStockSubEl.textContent = isEn
      ? `Produced: ${formatNumber(data.totals.totalProducedBoxes || 0)} Bx | Exported: ${formatNumber(data.totals.boxes || 0)} Bx`
      : `உற்பத்தி: ${formatNumber(data.totals.totalProducedBoxes || 0)} Bx | ஏற்றுமதி: ${formatNumber(data.totals.boxes || 0)} Bx`;
  }

  const expAvailBadgeVal = document.getElementById('expAvailableStockVal');
  if (expAvailBadgeVal) {
    expAvailBadgeVal.textContent = formatNumber(getAvailableStockForExport());
  }

  // History Table
  const tbody = document.getElementById('exportTableBody');
  if (tbody && data.exports) {
    if (data.exports.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-dim);">${isEn ? 'No export records found' : 'ஏற்றுமதி பதிவுகள் எதுவும் இல்லை'}</td></tr>`;
      return;
    }

    tbody.innerHTML = data.exports.map(p => {
      const boxes = p.boxes !== undefined ? p.boxes : Number(((p.cuts || 0) / 300).toFixed(1));
      return `
        <tr>
          <td><strong>${formatDate(p.date)}</strong></td>
          <td><span style="color: var(--accent-amber); font-weight: 700;">${formatNumber(boxes)}</span> ${isEn ? 'Boxes' : 'கட்டை'}</td>
          <td>${formatNumber(p.cuts)} ${isEn ? 'Cuts' : 'கட்டுகள்'}</td>
          <td>${formatNumber(p.beedis)}</td>
          <td style="color: var(--accent-gold); font-weight: 700;">${formatINR(p.rate)}</td>
          <td><span style="color: var(--text-main); font-weight: 500;">${p.companyName || 'TVS Beedi Company'}</span></td>
          <td>
            <div class="table-actions-cell">
              <button class="btn-secondary btn-table-action" onclick="startEditExport('${p._id}')" title="Edit">✏️</button>
              <button class="btn-danger btn-table-action" onclick="deleteExport('${p._id}')" title="Delete">✕</button>
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
    renderExportBarChart(currentExportChartGranularity);
  } catch (err) {
    console.error('Error loading export data:', err);
  }
}

async function deleteExport(id) {
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  if (!confirm(isEn ? 'Are you sure you want to delete this export record?' : 'இந்த ஏற்றுமதி பதிவை நீக்க விரும்புகிறீர்களா?')) return;

  try {
    const res = await fetch(`/api/export/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    showToast(isEn ? 'Export deleted successfully' : 'ஏற்றுமதி பதிவு நீக்கப்பட்டது', 'success');
    loadExportData();
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

// ----------------------------------------------------
// Export PDF Download (TVS Design with Date, Boxes, Cuts, Beedis)
// ----------------------------------------------------

function getExportRecordISODate(dateVal) {
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

function getExportMonthNames(monthKey) {
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

function groupExportRecordsByMonth(records, from, to) {
  const cutsPerBox = window.appSettings?.cutsPerBox || 300;
  const beedisPerBox = window.appSettings?.beedisPerBox || 6000;

  const monthGroups = {};
  let completeTotalBoxes = 0;
  let completeTotalCuts = 0;
  let completeTotalBeedis = 0;
  let completeTotalRate = 0;

  records.forEach(p => {
    const dateStr = getExportRecordISODate(p.date);
    const monthKey = dateStr.substring(0, 7);

    if (!monthGroups[monthKey]) {
      monthGroups[monthKey] = {
        key: monthKey,
        records: [],
        totalBoxes: 0,
        totalCuts: 0,
        totalBeedis: 0,
        totalRate: 0
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

    const rate = (p.rate !== undefined && p.rate !== null && p.rate > 0)
      ? Number(p.rate)
      : Math.round(boxes * beedisPerBox);

    monthGroups[monthKey].records.push({
      ...p,
      dateStr,
      boxes,
      cuts,
      beedis,
      rate
    });

    monthGroups[monthKey].totalBoxes += boxes;
    monthGroups[monthKey].totalCuts += cuts;
    monthGroups[monthKey].totalBeedis += beedis;
    monthGroups[monthKey].totalRate += rate;
  });

  const sortedMonthKeys = Object.keys(monthGroups).sort();
  sortedMonthKeys.forEach(k => {
    const g = monthGroups[k];
    g.totalBoxes = Math.round(g.totalBoxes * 10) / 10;
    completeTotalBoxes += g.totalBoxes;
    completeTotalCuts += g.totalCuts;
    completeTotalBeedis += g.totalBeedis;
    completeTotalRate += g.totalRate;
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
      beedis: completeTotalBeedis,
      rate: completeTotalRate
    }
  };
}

function generateExportPDFHTML(data) {
  if (!data) return '';

  const fromDisp = data.from ? formatDisplayDate(data.from) : (data.records[0] ? formatDisplayDate(data.records[0].dateStr) : '-');
  const toDisp = data.to ? formatDisplayDate(data.to) : (data.records[data.records.length - 1] ? formatDisplayDate(data.records[data.records.length - 1].dateStr) : '-');

  if (!data.records || data.records.length === 0) {
    return `
      <div class="tvs-pdf-container" id="tvsExportReportDoc">
        <div class="tvs-pdf-header">
          <h1 class="tvs-brand-title">TVS</h1>
          <div class="tvs-pdf-subtitle">EXPORT REPORT (ஏற்றுமதி அறிக்கை)</div>
          <div class="tvs-pdf-daterange">Date Range: ${fromDisp} to ${toDisp}</div>
        </div>
        <div style="text-align: center; padding: 40px 20px; color: #475569; font-size: 15px;">
          <p style="margin-bottom: 6px; font-weight: 700;">தேர்ந்தெடுக்கப்பட்ட காலக்கட்டத்தில் ஏற்றுமதி பதிவுகள் எதுவும் இல்லை.</p>
          <p style="font-size: 13px; color: #64748b;">No export records found for ${fromDisp} to ${toDisp}.</p>
        </div>
      </div>
    `;
  }

  const monthBlocksHTML = data.sortedMonthKeys.map(mKey => {
    const group = data.monthGroups[mKey];
    const { y, monthNameTa, monthNameEn } = getExportMonthNames(mKey);

    const rows = group.records.map(p => `
      <tr>
        <td class="col-date">${formatDisplayDate(p.dateStr)}</td>
        <td class="col-boxes">${formatNumber(p.boxes)}</td>
        <td class="col-cuts">${formatNumber(p.cuts)}</td>
        <td class="col-beedis">${formatNumber(p.beedis)}</td>
        <td class="col-rate">${formatNumber(p.rate)}</td>
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
              <th class="col-rate">Rate(மதிப்பு) (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="tvs-month-total-line">
          ${monthNameEn} Total (${monthNameTa} மாத மொத்தம்) = ${formatNumber(group.totalBoxes)} Boxes | ${formatNumber(group.totalCuts)} Cuts | ${formatNumber(group.totalBeedis)} Beedies | ${formatNumber(group.totalRate)} Rate (₹)
        </div>
      </div>
    `;
  }).join('');

  const ct = data.completeTotal;

  return `
    <div class="tvs-pdf-container" id="tvsExportReportDoc">
      <div class="tvs-pdf-header">
        <h1 class="tvs-brand-title">TVS</h1>
        <div class="tvs-pdf-subtitle">EXPORT REPORT (ஏற்றுமதி அறிக்கை)</div>
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
              <th style="text-align: right; width: 33.33%;">Total Rate(மொத்த மதிப்பு) (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="col-boxes" style="font-size: 16px; font-weight: 800; color: #0f172a; text-align: right;">${formatNumber(ct.boxes)}</td>
              <td class="col-cuts" style="font-size: 16px; font-weight: 800; color: #0f172a; text-align: right;">${formatNumber(ct.cuts)}</td>
              <td class="col-beedis" style="font-size: 16px; font-weight: 800; color: #0f172a; text-align: right;">${formatNumber(ct.beedis)}</td>
              <td class="col-rate" style="font-size: 16px; font-weight: 800; color: #0f172a; text-align: right;">${formatNumber(ct.rate)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function downloadExportPDF() {
  const fromInput = document.getElementById('exportFromDate');
  const toInput = document.getElementById('exportToDate');
  const from = fromInput ? fromInput.value : '';
  const to = toInput ? toInput.value : '';

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  if (from && to && from > to) {
    showToast(isEn ? 'From Date cannot be later than To Date.' : 'தொடக்க தேதி முடிவு தேதியை விட அதிகமாக இருக்கக்கூடாது.', 'error');
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

  const btn = document.getElementById('btnDownloadExportPDF');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; }

  showToast(isEn ? 'Generating Export PDF...' : 'ஏற்றுமதி PDF தயாராகிறது...', 'info');

  try {
    let url = '/api/export';
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (params.toString()) url += '?' + params.toString();

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch export records');
    const data = await res.json();
    const records = (data && data.exports) ? data.exports : [];

    // Filter in-memory if dates provided
    const filtered = records.filter(p => {
      const d = getExportRecordISODate(p.date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });

    if (filtered.length === 0) {
      showToast(isEn ? 'No export records found for the selected date range.' : 'தேர்ந்தெடுக்கப்பட்ட காலக்கட்டத்தில் ஏற்றுமதி பதிவுகள் எதுவும் இல்லை.', 'warning');
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
      return;
    }

    // Sort Oldest -> Newest
    filtered.sort((a, b) => getExportRecordISODate(a.date).localeCompare(getExportRecordISODate(b.date)));

    const effectiveFrom = from || getExportRecordISODate(filtered[0].date);
    const effectiveTo = to || getExportRecordISODate(filtered[filtered.length - 1].date);
    const groupedData = groupExportRecordsByMonth(filtered, effectiveFrom, effectiveTo);

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
    tempWrap.innerHTML = generateExportPDFHTML(groupedData);
    document.body.appendChild(tempWrap);

    // Allow browser layout & fonts to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    const element = tempWrap.querySelector('#tvsExportReportDoc') || tempWrap;
    if (!element) throw new Error('Export report element was not created.');

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
      throw new Error('Export report canvas is empty.');
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

    const filename = `TVS_Export_Report_${formatDisplayDate(effectiveFrom)}_to_${formatDisplayDate(effectiveTo)}.pdf`;
    pdf.save(filename);
    showToast(isEn ? 'Export PDF downloaded successfully!' : 'ஏற்றுமதி PDF வெற்றிகரமாக பதிவிறக்கப்பட்டது!', 'success');

  } catch (err) {
    console.error('Export PDF export error:', err);
    showToast(isEn ? 'Export PDF generation failed. Please try again.' : 'ஏற்றுமதி PDF தயாரிப்பில் பிழை ஏற்பட்டது.', 'error');
  } finally {
    const tempWrap = document.querySelector('body > div[style*="-9999px"]');
    if (tempWrap && tempWrap.parentNode) tempWrap.parentNode.removeChild(tempWrap);
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }
}

// ----------------------------------------------------
// Export Tracking Bar Chart (Day / Week / Month)
// ----------------------------------------------------
let currentExportChartGranularity = 'day';
let exportChartInstance = null;

function switchExportChartFilter(granularity) {
  currentExportChartGranularity = granularity;
  const filterBtns = document.querySelectorAll('#exportChartFilterGroup .chart-filter-btn');
  filterBtns.forEach(btn => btn.classList.remove('active'));

  if (granularity === 'day') {
    const btn = document.getElementById('exportFilterDay');
    if (btn) btn.classList.add('active');
  } else if (granularity === 'week') {
    const btn = document.getElementById('exportFilterWeek');
    if (btn) btn.classList.add('active');
  } else if (granularity === 'month') {
    const btn = document.getElementById('exportFilterMonth');
    if (btn) btn.classList.add('active');
  }

  renderExportBarChart(granularity);
}

function aggregateExportData(exportsList, granularity) {
  if (!exportsList || exportsList.length === 0) {
    return { labels: [], boxes: [], cuts: [], beedis: [], rate: [], margin: [] };
  }

  const buckets = {};

  exportsList.forEach(e => {
    if (!e.date) return;
    const d = new Date(e.date);
    let key = '';
    let label = '';

    if (granularity === 'day') {
      key = d.toISOString().split('T')[0];
      label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } else if (granularity === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d);
      mon.setDate(diff);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      key = mon.toISOString().split('T')[0];
      label = `${mon.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${sun.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
    } else if (granularity === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    }

    if (!buckets[key]) {
      buckets[key] = { key, label, boxes: 0, cuts: 0, beedis: 0, rate: 0, margin: 0 };
    }

    const bCount = (e.boxes !== undefined && e.boxes !== null && e.boxes > 0) ? e.boxes : ((e.cuts || 0) / 300);
    buckets[key].boxes += bCount;
    buckets[key].cuts += (e.cuts || 0);
    buckets[key].beedis += (e.beedis || 0);
    buckets[key].rate += (e.rate || 0);
    buckets[key].margin += (e.margin !== undefined ? e.margin : ((e.rate || 0) - (e.salary || 0)));
  });

  const sortedKeys = Object.keys(buckets).sort();
  const limit = granularity === 'day' ? 14 : (granularity === 'week' ? 10 : 12);
  const activeKeys = sortedKeys.slice(-limit);

  return {
    labels: activeKeys.map(k => buckets[k].label),
    boxes: activeKeys.map(k => Number(buckets[k].boxes.toFixed(1))),
    cuts: activeKeys.map(k => buckets[k].cuts),
    beedis: activeKeys.map(k => buckets[k].beedis),
    rate: activeKeys.map(k => buckets[k].rate),
    margin: activeKeys.map(k => buckets[k].margin)
  };
}

function renderExportBarChart(granularity = currentExportChartGranularity) {
  const canvas = document.getElementById('exportBarChart');
  if (!canvas || typeof Chart === 'undefined') return;

  currentExportChartGranularity = granularity;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
  const fontFam = "'Outfit', 'Mukta Malar', sans-serif";
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  const exportsList = (cachedExports && cachedExports.exports) ? cachedExports.exports : [];
  const agg = aggregateExportData(exportsList, granularity);

  if (exportChartInstance) exportChartInstance.destroy();

  exportChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: agg.labels,
      datasets: [
        {
          label: isEn ? 'Exported Boxes' : 'ஏற்றுமதி கட்டை (Boxes)',
          data: agg.boxes,
          backgroundColor: 'rgba(37, 99, 235, 0.85)',
          hoverBackgroundColor: '#2563eb',
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          label: isEn ? 'Export Value (₹)' : 'ஏற்றுமதி மதிப்பு (₹)',
          data: agg.rate,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          hoverBackgroundColor: '#10b981',
          borderRadius: 6,
          yAxisID: 'y1'
        },
        {
          label: isEn ? 'Margin Profit (₹)' : 'ஏற்றுமதி லாபம் (₹)',
          data: agg.margin,
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
            label: function (ctx) {
              const label = ctx.dataset.label || '';
              const val = ctx.raw;
              if (ctx.dataset.yAxisID === 'y1') {
                return `${label}: ₹${Number(val).toLocaleString('en-IN')}`;
              }
              const idx = ctx.dataIndex;
              const beedis = agg.beedis[idx] || 0;
              return `${label}: ${val} Boxes (${beedis.toLocaleString('en-IN')} beedis)`;
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

window.addEventListener('languageChanged', () => {
  if (cachedExports) renderExportUI(cachedExports);
  const boxesInput = document.getElementById('expBoxes');
  if (boxesInput && boxesInput.value) {
    handleExportBoxesInput(boxesInput.value);
  }
  renderExportBarChart(currentExportChartGranularity);
});

document.addEventListener('DOMContentLoaded', () => {
  loadExportData();
});

