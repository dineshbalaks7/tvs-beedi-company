const http = require('http');
const fs = require('fs');
const path = require('path');

const routes = [
  { url: 'http://localhost:3000/', name: 'Dashboard', script: 'dashboard.js' },
  { url: 'http://localhost:3000/production', name: 'Production', script: 'production.js' },
  { url: 'http://localhost:3000/stock', name: 'Stock', script: 'stock.js' },
  { url: 'http://localhost:3000/expenses', name: 'Expenses', script: 'expenses.js' },
  { url: 'http://localhost:3000/export', name: 'Export', script: 'export.js' },
  { url: 'http://localhost:3000/chat', name: 'Chat', script: 'chat.js' },
  { url: 'http://localhost:3000/settings', name: 'Settings', script: 'settings.js' }
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Testing all 7 routes and language integration on running server...\n');
  
  for (const r of routes) {
    const res = await fetchUrl(r.url);
    console.log(`Route [${r.name}] -> Status: ${res.statusCode}`);
    if (res.statusCode !== 200) {
      throw new Error(`Failed to load ${r.name}: ${res.statusCode}`);
    }

    const body = res.body;

    // Verify lang switcher pill
    if (!body.includes('id="langSwitcher"') || !body.includes('id="langChipTa"') || !body.includes('id="langChipEn"')) {
      throw new Error(`Language switcher missing on ${r.name}`);
    }

    // Verify i18n.js and common.js
    if (!body.includes('/js/i18n.js') || !body.includes('/js/common.js')) {
      throw new Error(`i18n.js or common.js script tag missing on ${r.name}`);
    }

    // Verify page-specific script
    if (!body.includes(`/js/${r.script}`)) {
      throw new Error(`Page script ${r.script} missing on ${r.name}`);
    }

    // Verify toggleLanguage onclick
    if (!body.includes('onclick="toggleLanguage()"')) {
      throw new Error(`toggleLanguage click handler missing on ${r.name}`);
    }

    console.log(`  ✅ Passed: i18n scripts, switcher pill, and page script properly wired.`);
  }

  console.log('\nAll 7 pages verified successfully! 🎉');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
