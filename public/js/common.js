/**
 * TVS Beedi Company - Common Shared JavaScript
 * Utilities, Theme Toggle, Active Nav Highlight, Toasts, Default Dates, and Global Settings
 */

// Global Settings State
const defaultAppSettings = {
  beedisPerBox: 6000,
  cutsPerBox: 300,
  beedisPerCut: 20,
  tobaccoPer1000Grams: 550,
  powderPer1000Grams: 200,
  salaryPer1000: 320,
  ratePer1000: 340,
  commissionPercent: 0.10,
  avgWastageKg: 2,
  bagSizeGrams: 550,
  lowStockThresholdKg: 5,
  ratePerBox: 2040,
  salaryPerBox: 1920,
  profitPerBox: 120
};

let cachedLocalSettings = null;
try {
  const stored = localStorage.getItem('tvs_app_settings');
  if (stored) cachedLocalSettings = JSON.parse(stored);
} catch (e) {}

window.appSettings = {
  ...defaultAppSettings,
  ...(cachedLocalSettings || {})
};

function showConfirmDialog(message, title, confirmLabel, confirmClass = 'btn-danger') {
  return new Promise(resolve => {
    const existing = document.getElementById('appConfirmModal');
    if (existing) existing.remove();
    const isEn = typeof currentLanguage !== 'undefined' && currentLanguage === 'en';
    const modal = document.createElement('div');
    modal.id = 'appConfirmModal';
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal-dialog confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="appConfirmTitle">
        <div class="modal-header">
          <h3 id="appConfirmTitle">${title || (isEn ? 'Confirm Action' : 'செயலை உறுதிப்படுத்தவும்')}</h3>
          <button type="button" class="modal-close-btn" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body"><p>${message}</p></div>
        <div class="modal-actions-row">
          <button type="button" class="btn-secondary confirm-cancel">${isEn ? 'Cancel' : 'ரத்து'}</button>
          <button type="button" class="${confirmClass} confirm-delete">${confirmLabel || (isEn ? 'Delete' : 'நீக்கு')}</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = result => { modal.remove(); resolve(result); };
    modal.querySelector('.modal-close-btn').addEventListener('click', () => close(false));
    modal.querySelector('.confirm-cancel').addEventListener('click', () => close(false));
    modal.querySelector('.confirm-delete').addEventListener('click', () => close(true));
    modal.addEventListener('click', event => { if (event.target === modal) close(false); });
  });
}

function getLoadingScreen() {
  let screen = document.getElementById('appLoadingScreen');
  if (screen) return screen;

  screen = document.createElement('div');
  screen.id = 'appLoadingScreen';
  screen.className = 'app-loading-screen';
  screen.setAttribute('aria-live', 'polite');
  screen.setAttribute('aria-busy', 'false');
  screen.innerHTML = '<div class="app-loading-card" role="status"><div class="app-loading-spinner"></div><div class="app-loading-text">Loading...</div></div>';
  document.body.appendChild(screen);
  return screen;
}

function setAppLoading(isLoading, message = 'Loading...') {
  if (!document.body) return;
  const screen = getLoadingScreen();
  const text = screen.querySelector('.app-loading-text');
  if (text) text.textContent = message;
  if (isLoading) {
    screen.classList.add('active');
    screen.setAttribute('aria-busy', 'true');
  } else {
    screen.classList.remove('active');
    screen.setAttribute('aria-busy', 'false');
  }
}

window.setAppLoading = setAppLoading;

function showDataLoadError(tableBodyId, message = 'Unable to load records') {
  const tableBody = document.getElementById(tableBodyId);
  const cell = tableBody?.querySelector('td');
  if (!cell) return;
  cell.textContent = message;
  cell.style.color = 'var(--accent-red)';
}

window.showDataLoadError = showDataLoadError;

let redirectingToLogin = false;
const nativeFetch = window.fetch.bind(window);

// A page can remain open after its server-side session expires. Redirect it
// when the next protected request confirms that authentication is no longer valid.
let pendingRequests = 0;

window.fetch = async function(...args) {
  const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
  const isChatRequest = requestUrl.includes('/api/chat');

  // Chat has its own inline typing indicator instead of covering the conversation.
  if (!isChatRequest) {
    pendingRequests++;
    setAppLoading(true, 'Loading...');
  }
  try {
    const response = await nativeFetch(...args);
    // Handle session expiration
    if (response.status === 401 && !redirectingToLogin && window.location.pathname !== '/login') {
      redirectingToLogin = true;
      window.location.replace('/login?expired=1');
    }
    return response;
  } finally {
    // Decrement counter and hide overlay only when all requests complete
    if (!isChatRequest) {
      pendingRequests--;
      if (pendingRequests <= 0) {
        setAppLoading(false);
      }
    }
  }
};

// 1. Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('tvs_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButtonUI(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('tvs_theme', newTheme);
  updateThemeButtonUI(newTheme);
}

function updateThemeButtonUI(theme) {
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    const isTa = (localStorage.getItem('tvs_beedi_lang') || (typeof currentLanguage !== 'undefined' ? currentLanguage : 'ta')) === 'ta';
    const isDark = theme === 'dark';
    themeBtn.setAttribute('aria-pressed', String(isDark));
    themeBtn.innerHTML = `<span class="theme-toggle-control ${isDark ? 'is-dark' : ''}" aria-hidden="true"><span class="theme-toggle-thumb">${isDark ? '☀' : '☾'}</span></span><span>${isDark ? (isTa ? 'பகல்' : 'Light') : (isTa ? 'இரவு' : 'Dark')}</span>`;
  }
}

function showLogoutConfirmationModal() {
  return new Promise((resolve) => {
    const existing = document.getElementById('appLogoutModal');
    if (existing) existing.remove();

    const isEn = (localStorage.getItem('tvs_beedi_lang') || (typeof currentLanguage !== 'undefined' ? currentLanguage : 'ta')) === 'en';

    const modal = document.createElement('div');
    modal.id = 'appLogoutModal';
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '9999';

    modal.innerHTML = `
      <div class="modal-dialog confirm-dialog logout-validation-dialog" role="dialog" aria-modal="true" aria-labelledby="logoutModalTitle" style="max-width: 440px; text-align: center; padding: 28px 24px; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.28); animation: modalPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="width: 60px; height: 60px; margin: 0 auto 16px; border-radius: 50%; background: rgba(239, 68, 68, 0.12); display: flex; align-items: center; justify-content: center; font-size: 28px; border: 1.5px solid rgba(239, 68, 68, 0.3); box-shadow: 0 0 24px rgba(239, 68, 68, 0.15);">
          🚪
        </div>
        <h3 id="logoutModalTitle" style="font-size: 19px; font-weight: 800; margin-bottom: 8px; color: var(--text-primary);">
          ${isEn ? 'Confirm Sign Out' : 'வெளியேறுவதை உறுதிப்படுத்தவும்'}
        </h3>
        <p style="font-size: 14px; line-height: 1.55; color: var(--text-muted); margin-bottom: 14px;">
          ${isEn 
            ? 'Are you sure you want to log out of TVS Beedi Company system?' 
            : 'TVS பீடி கம்பெனி உள் நிர்வாக தளத்திலிருந்து நிச்சயமாக வெளியேற விரும்புகிறீர்களா?'}
        </p>
        <div style="background: rgba(239, 68, 68, 0.06); border: 1px dashed rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 10px 14px; font-size: 12.5px; color: var(--accent-red, #ef4444); margin-bottom: 22px; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span>🔒</span>
          <span>${isEn ? 'You will need your login password to sign in again.' : 'மீண்டும் அணுக உள்நுழைவு கடவுச்சொல் (Password) தேவைப்படும்.'}</span>
        </div>
        <div class="modal-actions-row" style="display: flex; gap: 12px; justify-content: center;">
          <button type="button" class="btn-secondary logout-cancel-btn" style="flex: 1; min-height: 44px; font-size: 14px; font-weight: 600; border-radius: 10px; cursor: pointer;">
            ${isEn ? 'Cancel' : 'ரத்து செய்'}
          </button>
          <button type="button" class="btn-danger logout-confirm-btn" style="flex: 1; min-height: 44px; font-size: 14px; font-weight: 700; border-radius: 10px; cursor: pointer; background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35);">
            ${isEn ? 'Yes, Log Out' : 'ஆம், வெளியேறு'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = (confirmed) => {
      document.removeEventListener('keydown', onKey);
      modal.remove();
      resolve(confirmed);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };
    document.addEventListener('keydown', onKey);

    modal.querySelector('.logout-cancel-btn').addEventListener('click', () => close(false));
    modal.querySelector('.logout-confirm-btn').addEventListener('click', () => close(true));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close(false);
    });

    // Auto-focus cancel button for safe keyboard interaction
    setTimeout(() => {
      const cancelBtn = modal.querySelector('.logout-cancel-btn');
      if (cancelBtn) cancelBtn.focus();
    }, 40);
  });
}

async function logout() {
  const confirmed = await showLogoutConfirmationModal();
  if (!confirmed) return;

  const button = document.getElementById('logoutBtn');
  if (button) {
    button.disabled = true;
    const isEn = (localStorage.getItem('tvs_beedi_lang') || (typeof currentLanguage !== 'undefined' ? currentLanguage : 'ta')) === 'en';
    button.textContent = isEn ? 'Logging out...' : 'வெளியேறுகிறது...';
  }

  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = '/login';
  }
}

window.showLogoutConfirmationModal = showLogoutConfirmationModal;
window.logout = logout;

// Attach globally
window.updateThemeButtonUI = updateThemeButtonUI;
window.toggleTheme = toggleTheme;

// Safe fallback for toggleLanguage
if (typeof window.toggleLanguage !== 'function') {
  window.toggleLanguage = function(targetLang) {
    if (typeof toggleLanguage === 'function') {
      toggleLanguage(targetLang);
    } else if (typeof setLanguage === 'function') {
      const cur = localStorage.getItem('tvs_beedi_lang') || 'ta';
      const next = (targetLang === 'ta' || targetLang === 'en') ? targetLang : (cur === 'ta' ? 'en' : 'ta');
      setLanguage(next, { notify: true });
    }
  };
}

// 2. Active Navigation Highlighting
function highlightActiveNav() {
  const path = window.location.pathname.toLowerCase();
  const navLinks = document.querySelectorAll('.bottom-nav a.nav-item, .bottom-nav button.nav-item, nav a.nav-item');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (!href) return;
    
    const isDashboard = (path === '/' || path === '/dashboard' || path.endsWith('/index.html')) && (href === '/' || href === '/dashboard');
    const isExact = path === href || path.endsWith(href);

    if (isDashboard || isExact) {
      link.classList.add('active');
    }
  });
}

// 3. Default Date to Today
function setDefaultDatesToToday() {
  const today = getTodayISODate();
  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) {
      input.value = today;
    }
  });
}

function getTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 4. Formatting Utilities
function formatNumber(val, decimals = 0) {
  const num = Number(val) || 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatINR(val, includeSymbol = true) {
  const num = Number(val) || 0;
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  return includeSymbol ? `₹${formatted}` : formatted;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

// 5. Toast Notification System
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${message}</span>`;

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.classList.add('toast-fadeout');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  }, duration);
}

// 6. Fetch Global Settings
async function fetchAppSettings() {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      const s = (data && data.settings) ? data.settings : data;
      if (s && typeof s === 'object') {
        window.appSettings = {
          ...window.appSettings,
          ...s
        };
        try {
          localStorage.setItem('tvs_app_settings', JSON.stringify(window.appSettings));
        } catch (e) {}
        if (typeof applyTranslations === 'function') {
          applyTranslations();
        }
        if (typeof updateProductionPreviewLabels === 'function') {
          updateProductionPreviewLabels();
        }
        // Trigger event so individual page scripts can respond immediately
        window.dispatchEvent(new CustomEvent('settingsLoaded', { detail: window.appSettings }));
      }
    }
  } catch (err) {
    console.warn('Could not load settings from server, using current settings:', err);
  }
}

// Storage sync across tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'tvs_app_settings' && event.newValue) {
    try {
      const updated = JSON.parse(event.newValue);
      window.appSettings = { ...window.appSettings, ...updated };
      if (typeof applyTranslations === 'function') applyTranslations();
      if (typeof updateProductionPreviewLabels === 'function') updateProductionPreviewLabels();
      window.dispatchEvent(new CustomEvent('settingsLoaded', { detail: window.appSettings }));
    } catch (e) {}
  }
});

// 7. Initialize Global Listeners on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  highlightActiveNav();
  setDefaultDatesToToday();
  fetchAppSettings();
});
