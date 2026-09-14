const fs = require('fs');
const path = require('path');

// Evaluate i18n.js to get translations object directly
const i18nCode = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');

// Sandbox eval
const sandbox = {};
const fn = new Function('window', 'document', 'localStorage', i18nCode + '; return translations;');
const translations = fn({ addEventListener: () => {} }, { querySelectorAll: () => [], getElementById: () => null, documentElement: {} }, { getItem: () => null, setItem: () => {} });

const taKeys = new Set(Object.keys(translations.ta || {}));
const enKeys = new Set(Object.keys(translations.en || {}));

console.log('Total Tamil keys in i18n.js:', taKeys.size);
console.log('Total English keys in i18n.js:', enKeys.size);

const htmlFiles = fs.readdirSync(path.join(__dirname, '../public')).filter(f => f.endsWith('.html'));
const htmlKeys = new Set();
const keyUsage = {};

for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(__dirname, '../public', file), 'utf8');
  const regex = /data-i18n(?:-placeholder|-title)?=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const k = match[1];
    htmlKeys.add(k);
    if (!keyUsage[k]) keyUsage[k] = [];
    keyUsage[k].push(file);
  }
}

console.log('Total distinct keys used across HTML files:', htmlKeys.size);

const missingInTa = [];
const missingInEn = [];

for (const k of htmlKeys) {
  if (!taKeys.has(k)) missingInTa.push(k);
  if (!enKeys.has(k)) missingInEn.push(k);
}

console.log('\n--- Missing in Tamil (' + missingInTa.length + ') ---');
console.log(missingInTa);

console.log('\n--- Missing in English (' + missingInEn.length + ') ---');
console.log(missingInEn);
