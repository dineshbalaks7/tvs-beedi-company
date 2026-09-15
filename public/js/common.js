/**
 * TVS Beedi Company - Common Shared JavaScript
 * Utilities, Theme Toggle, Active Nav Highlight, Toasts, Default Dates, and Global Settings
 */

// Global Settings State
window.appSettings = {
  beedisPerBox: 6000,
  cutsPerBox: 300,
  beedisPerCut: 20,
  tobaccoPer1000Grams: 600,
  powderRatioPercent: 1.0,
  ratePerBox: 2040,
  salaryPerBox: 1920,
  profitPerBox: 120
};

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

let redirectingToLogin = false;
const nativeFetch = window.fetch.bind(window);

// A page can remain open after its server-side session expires. Redirect it
// when the next protected request confirms that authentication is no longer valid.
let pendingRequests = 0;

window.fetch = async function(...args) {
  // Increment pending counter and show loading overlay
  pendingRequests++;
  setAppLoading(true, 'Loading...');
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
    pendingRequests--;
    if (pendingRequests <= 0) {
      setAppLoading(false);
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

async function logout() {
  const button = document.getElementById('logoutBtn');
  if (button) button.disabled = true;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = '/login';
  }
}

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
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
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
      if (data && data.settings) {
        window.appSettings = {
          ...window.appSettings,
          ...data.settings
        };
        // Trigger event so individual page scripts can respond if needed
        window.dispatchEvent(new CustomEvent('settingsLoaded', { detail: window.appSettings }));
      }
    }
  } catch (err) {
    console.warn('Could not load settings from server, using defaults:', err);
  }
}

// 7. Initialize Global Listeners on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  highlightActiveNav();
  setDefaultDatesToToday();
  fetchAppSettings();
});
