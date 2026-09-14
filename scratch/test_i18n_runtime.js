const fs = require('fs');
const path = require('path');

// Read i18n and common code
const i18nCode = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');
const commonCode = fs.readFileSync(path.join(__dirname, '../public/js/common.js'), 'utf8');

// Build mock DOM environment
class MockElement {
  constructor(tagName, id = '', attrs = {}) {
    this.tagName = tagName;
    this.id = id;
    this.attributes = { ...attrs };
    const classes = new Set();
    this.classList = {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      has: (c) => classes.has(c)
    };
    this.children = [];
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
  }
  getAttribute(name) { return this.attributes[name] || null; }
  setAttribute(name, val) { this.attributes[name] = val; }
  appendChild(child) { this.children.push(child); }
}

const elementsById = {};
const elementsByAttr = [];

function registerElement(tag, id, attrs = {}, text = '') {
  const el = new MockElement(tag, id, attrs);
  el.textContent = text;
  if (id) elementsById[id] = el;
  elementsByAttr.push(el);
  return el;
}

// Populate sample elements matching index.html
const chipTa = registerElement('span', 'langChipTa', {}, 'தமிழ்');
chipTa.classList.add('active');
const chipEn = registerElement('span', 'langChipEn', {}, 'EN');
const langSwitcher = registerElement('div', 'langSwitcher', {}, '');
const themeBtn = registerElement('button', 'themeToggleBtn', {}, '🌙 இரவு');
const h1Title = registerElement('h1', '', { 'data-i18n': 'companyName' }, 'TVS பீடி கம்பெனி');
const expTitle = registerElement('span', '', { 'data-i18n': 'exportMainTitle' }, 'கம்பெனி ஏற்றுமதி');

const localStorageMock = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); }
};

const listeners = {};
const windowMock = {
  location: { pathname: '/index.html' },
  addEventListener(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  },
  dispatchEvent(customEvent) {
    if (listeners[customEvent.type]) {
      listeners[customEvent.type].forEach(fn => fn(customEvent));
    }
  }
};

const documentMock = {
  documentElement: {
    lang: 'ta',
    getAttribute: (attr) => (attr === 'data-theme' ? 'light' : null),
    setAttribute: (attr, val) => {}
  },
  body: {
    classList: {
      add: (cls) => {},
      remove: (cls) => {}
    }
  },
  title: '',
  getElementById: (id) => elementsById[id] || null,
  querySelectorAll: (selector) => {
    if (selector === '[data-i18n]') {
      return elementsByAttr.filter(el => el.attributes['data-i18n']);
    }
    if (selector === '[data-i18n-placeholder]') {
      return elementsByAttr.filter(el => el.attributes['data-i18n-placeholder']);
    }
    if (selector === '[data-i18n-title]') {
      return elementsByAttr.filter(el => el.attributes['data-i18n-title']);
    }
    return [];
  }
};

let languageChangedFired = 0;
let lastDetail = null;
windowMock.addEventListener('languageChanged', (e) => {
  languageChangedFired++;
  lastDetail = e.detail;
});

// Run i18n.js in sandbox
const fnI18n = new Function('window', 'document', 'localStorage', 'location', i18nCode);
fnI18n(windowMock, documentMock, localStorageMock, { pathname: '/index.html' });

console.log('--- TEST 1: Initial state ---');
console.log('windowMock.currentLanguage:', windowMock.currentLanguage);
console.log('localStorage tvs_beedi_lang:', localStorageMock.getItem('tvs_beedi_lang'));

console.log('\n--- TEST 2: toggleLanguage() from ta -> en ---');
windowMock.toggleLanguage();
console.log('New language:', windowMock.currentLanguage);
console.log('localStorage after toggle:', localStorageMock.getItem('tvs_beedi_lang'));
console.log('companyName translation:', h1Title.textContent);
console.log('exportMainTitle translation:', expTitle.textContent);
console.log('languageChanged event fired count:', languageChangedFired);
console.log('event detail:', lastDetail);
console.log('chipEn active?', chipEn.classList.has('active'));
console.log('chipTa active?', chipTa.classList.has('active'));

if (windowMock.currentLanguage !== 'en') throw new Error('Expected en after toggle');
if (h1Title.textContent !== 'TVS Beedi Company') throw new Error('Expected English company name');
if (expTitle.textContent !== 'Company Export & Dispatch') throw new Error('Expected English export title');

console.log('\n--- TEST 3: toggleLanguage() back from en -> ta ---');
windowMock.toggleLanguage();
console.log('New language:', windowMock.currentLanguage);
console.log('companyName translation:', h1Title.textContent);
console.log('chipTa active?', chipTa.classList.has('active'));
console.log('chipEn active?', chipEn.classList.has('active'));

if (windowMock.currentLanguage !== 'ta') throw new Error('Expected ta after second toggle');
if (h1Title.textContent !== 'TVS பீடி கம்பெனி') throw new Error('Expected Tamil company name');

console.log('\n--- TEST 4: Direct setLanguage with segment click ---');
windowMock.setLanguage('en', { notify: false });
console.log('Language after setLanguage(en):', windowMock.currentLanguage);
if (windowMock.currentLanguage !== 'en') throw new Error('Expected en after setLanguage');

windowMock.setLanguage('ta', { notify: false });
console.log('Language after setLanguage(ta):', windowMock.currentLanguage);
if (windowMock.currentLanguage !== 'ta') throw new Error('Expected ta after setLanguage');

console.log('\nALL 4 RUNTIME I18N TESTS PASSED SUCCESSFULLY! ✅');
