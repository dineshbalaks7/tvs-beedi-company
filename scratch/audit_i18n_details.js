const fs = require('fs');
const path = require('path');

const i18nCode = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');
const fn = new Function('window', 'document', 'localStorage', i18nCode + '; return translations;');
const translations = fn({ addEventListener: () => {} }, { querySelectorAll: () => [], getElementById: () => null, documentElement: {} }, { getItem: () => null, setItem: () => {} });
const taKeys = new Set(Object.keys(translations.ta || {}));

const htmlFiles = fs.readdirSync(path.join(__dirname, '../public')).filter(f => f.endsWith('.html'));
const missingMap = {};

for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(__dirname, '../public', file), 'utf8');
  // Match tags with data-i18n
  const regex = /<([^>]+data-i18n=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/[a-zA-Z0-9]+>|<([^>]+data-i18n(?:-placeholder|-title)?=["']([^"']+)["'][^>]*)\/?>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[2] || match[5];
    if (!taKeys.has(key)) {
      if (!missingMap[key]) {
        let tagText = (match[3] || '').replace(/<[^>]+>/g, '').trim();
        let placeholder = '';
        const phMatch = (match[1] || match[4] || '').match(/placeholder=["']([^"']+)["']/);
        if (phMatch) placeholder = phMatch[1];
        missingMap[key] = {
          file,
          text: tagText || placeholder || '(empty)'
        };
      }
    }
  }
}

for (const [k, v] of Object.entries(missingMap)) {
  console.log(`KEY: "${k}" | FILE: ${v.file} | TEXT: "${v.text}"`);
}
