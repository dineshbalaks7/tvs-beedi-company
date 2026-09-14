/**
 * TVS Beedi Company - Settings Specific JavaScript
 * Business Multipliers, Box Ratios, Material Rates & Thresholds
 */

async function loadSettingsData() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    const data = await res.json();
    if (!data) return;

    window.appSettings = data;

    const setBeedisPerBoxEl = document.getElementById('setBeedisPerBox');
    if (setBeedisPerBoxEl) setBeedisPerBoxEl.value = data.beedisPerBox || 6000;
    const setCutsPerBoxEl = document.getElementById('setCutsPerBox');
    if (setCutsPerBoxEl) setCutsPerBoxEl.value = data.cutsPerBox || 300;

    const setBeedisPerCutEl = document.getElementById('setBeedisPerCut');
    if (setBeedisPerCutEl) setBeedisPerCutEl.value = data.beedisPerCut || 20;

    const setTobaccoPer1000El = document.getElementById('setTobaccoPer1000');
    if (setTobaccoPer1000El) setTobaccoPer1000El.value = data.tobaccoPer1000Grams || 600;

    const setPowderPer1000El = document.getElementById('setPowderPer1000');
    if (setPowderPer1000El) setPowderPer1000El.value = data.powderPer1000Grams || 200;

    const setSalaryPer1000El = document.getElementById('setSalaryPer1000');
    if (setSalaryPer1000El) setSalaryPer1000El.value = data.salaryPer1000 || 320;

    const setRatePer1000El = document.getElementById('setRatePer1000');
    if (setRatePer1000El) setRatePer1000El.value = data.ratePer1000 || 340;

    const setAvgWastageEl = document.getElementById('setAvgWastage');
    if (setAvgWastageEl) setAvgWastageEl.value = data.avgWastageKg ?? 2;

    const setBagSizeEl = document.getElementById('setBagSize');
    if (setBagSizeEl) setBagSizeEl.value = data.bagSizeGrams || 600;

    const setLowStockEl = document.getElementById('setLowStock');
    if (setLowStockEl) setLowStockEl.value = data.lowStockThresholdKg || 5;
  } catch (err) {
    console.error('Error loading settings:', err);
    showToast('Failed to load settings', 'error');
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
    const updated = await res.json();
    window.appSettings = updated;
    showToast('Settings saved successfully', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleChangePassword(event) {
  event.preventDefault();
  const form = event.target;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword, confirmPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to change password');
    form.reset();
    showToast('Password reset successfully', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input || !btn) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
  btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  btn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');

  const eyeIcon = btn.querySelector('.eye-icon');
  const eyeOffIcon = btn.querySelector('.eye-off-icon');
  if (eyeIcon && eyeOffIcon) {
    eyeIcon.style.display = isPassword ? 'none' : 'block';
    eyeOffIcon.style.display = isPassword ? 'block' : 'none';
  }
  input.focus();
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettingsData();
});
