/**
 * TVS Beedi Company - Expenses Specific JavaScript
 * Category Selection, Form Submit, Ledger Rendering & Delete
 */

let cachedExpenses = [];

function selectExpenseCat(btn, category) {
  document.querySelectorAll('.category-pills .cat-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const catInput = document.getElementById('expCategory');
  if (catInput) catInput.value = category;
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

    showToast('Expense recorded successfully', 'success');
    document.getElementById('expenseForm').reset();
    if (dateEl) dateEl.value = getTodayISODate();

    loadExpensesData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderExpensesUI(records) {
  const tbody = document.getElementById('expenseTableBody');
  if (!tbody) return;

  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-dim);">${isEn ? 'No expense records found' : 'செலவு பதிவுகள் எதுவும் இல்லை'}</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(e => `
    <tr>
      <td><strong>${formatDate(e.date)}</strong></td>
      <td><span style="color: var(--accent-gold); font-weight: 600;">${e.category}</span></td>
      <td class="expense-amount-highlight">${formatINR(e.amount)}</td>
      <td>${e.paymentMethod}</td>
      <td style="color: var(--text-muted);">${e.description || '-'}</td>
      <td>
        <button class="btn-danger btn-table-action" onclick="deleteExpense('${e._id}')" title="Delete">✕</button>
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
  const isEn = (typeof currentLanguage !== 'undefined' && currentLanguage === 'en');
  if (!await showConfirmDialog(isEn ? 'Are you sure you want to delete this expense?' : 'இந்த செலவு பதிவை நீக்க விரும்புகிறீர்களா?')) return;

  try {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    showToast(isEn ? 'Expense deleted successfully' : 'செலவு பதிவு நீக்கப்பட்டது', 'success');
    loadExpensesData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.addEventListener('languageChanged', () => {
  if (cachedExpenses.length > 0) renderExpensesUI(cachedExpenses);
});

document.addEventListener('DOMContentLoaded', () => {
  loadExpensesData();
});
