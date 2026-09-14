const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('--- TEST 1: Endpoint /api/stock/report?item=all ---');
  const allRes = await fetchJson('http://localhost:3000/api/stock/report?from=2026-09-01&to=2026-09-30&item=all');
  console.log('From:', allRes.from, 'To:', allRes.to, 'Item:', allRes.itemFilter);
  console.log('Total entries:', allRes.totalEntries);
  console.log('Grand total kg:', allRes.grandTotalKg);
  console.log('Final Total line:', allRes.finalTotalLine);
  console.log('Months count:', allRes.months.length);

  if (allRes.months.length > 0) {
    const m = allRes.months[0];
    console.log('First month heading:', m.monthHeading);
    console.log('First month total line:', m.monthTotalLine);
    console.log('First 3 entries:');
    m.entries.slice(0, 3).forEach(e => {
      console.log(`  ${e.dateFormatted} | ${e.typeLabel} | ${e.kg}`);
      // Validate date format DD-MM-YYYY
      if (!/^\d{2}-\d{2}-\d{4}$/.test(e.dateFormatted)) {
        throw new Error(`Invalid date format: ${e.dateFormatted}`);
      }
    });
  }

  console.log('\n--- TEST 2: Endpoint /api/stock/report?item=tobacco (Leaf only) ---');
  const leafRes = await fetchJson('http://localhost:3000/api/stock/report?from=2026-09-01&to=2026-09-30&item=tobacco');
  console.log('Leaf entries count:', leafRes.totalEntries);
  console.log('Leaf grand total kg:', leafRes.grandTotalKg);
  leafRes.months.forEach(m => {
    console.log(`  ${m.monthHeading} -> Total: ${m.totalKg} kg`);
    m.entries.forEach(e => {
      if (e.item !== 'tobacco') throw new Error(`Non-tobacco item found in leaf filter: ${e.item}`);
    });
  });

  console.log('\n--- TEST 3: Endpoint /api/stock/report?item=powder (Powder only) ---');
  const powderRes = await fetchJson('http://localhost:3000/api/stock/report?from=2026-09-01&to=2026-09-30&item=powder');
  console.log('Powder entries count:', powderRes.totalEntries);
  console.log('Powder grand total kg:', powderRes.grandTotalKg);
  powderRes.months.forEach(m => {
    console.log(`  ${m.monthHeading} -> Total: ${m.totalKg} kg`);
    m.entries.forEach(e => {
      if (e.item !== 'powder') throw new Error(`Non-powder item found in powder filter: ${e.item}`);
    });
  });

  // Verify Leaf Total + Powder Total == All Total
  if (leafRes.grandTotalKg + powderRes.grandTotalKg !== allRes.grandTotalKg) {
    throw new Error(`Sum mismatch: Leaf (${leafRes.grandTotalKg}) + Powder (${powderRes.grandTotalKg}) !== All (${allRes.grandTotalKg})`);
  }
  console.log(`\n✅ Mathematical Check Passed: ${leafRes.grandTotalKg} (Leaf) + ${powderRes.grandTotalKg} (Powder) = ${allRes.grandTotalKg} (All)`);

  console.log('\n--- TEST 4: Non-existent dates / Empty month check ---');
  const emptyRes = await fetchJson('http://localhost:3000/api/stock/report?from=2025-01-01&to=2025-01-31&item=all');
  console.log('Empty range months count:', emptyRes.months.length, '(Expected: 0)');
  if (emptyRes.months.length !== 0) throw new Error('Empty months should not be created!');
  console.log('✅ Empty months skipped properly without auto-generating dummy dates.');

  console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

verify().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
