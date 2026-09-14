const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function generateStockReportHTML(data) {
  if (!data) return '';

  const months = data.months || [];
  const grandTotal = (data.grandTotalKg !== undefined) ? data.grandTotalKg : 0;
  const finalTotalLine = data.finalTotalLine || `Total Kg (மொத்த கிலோ) = ${grandTotal}`;

  if (months.length === 0) {
    return `
      <div class="tvs-pdf-container" id="tvsStockReportDoc">
        <div class="tvs-pdf-header">
          <h1 class="tvs-brand-title">TVS</h1>
        </div>
        <div style="text-align: center; padding: 40px 20px; color: #475569; font-size: 15px;">
          <p style="margin-bottom: 6px; font-weight: 600;">தேர்ந்தெடுக்கப்பட்ட காலக்கட்டத்தில் உள்வரும் சரக்கு விவரங்கள் எதுவும் இல்லை.</p>
          <p style="font-size: 13px; color: #64748b;">No incoming stock entries found for ${data.from || ''} to ${data.to || ''}.</p>
        </div>
      </div>
    `;
  }

  const monthBlocksHTML = months.map(m => {
    const tableRows = m.entries.map(e => `
      <tr>
        <td class="col-date">${e.dateFormatted}</td>
        <td class="col-type">${e.typeLabel}</td>
        <td class="col-kg">${e.kg}</td>
      </tr>
    `).join('');

    return `
      <div class="tvs-month-block">
        <div class="tvs-month-title">${m.monthHeading}</div>
        <table class="tvs-table">
          <thead>
            <tr>
              <th class="col-date">Date (தேதி)</th>
              <th class="col-type">Type (வகை)</th>
              <th class="col-kg">Kg (கிலோ)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="tvs-month-total-line">
          ${m.monthTotalLine}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="tvs-pdf-container" id="tvsStockReportDoc">
      <div class="tvs-pdf-header">
        <h1 class="tvs-brand-title">TVS</h1>
      </div>

      ${monthBlocksHTML}

      <div class="tvs-final-total-line">
        ${finalTotalLine}
      </div>
    </div>
  `;
}

async function run() {
  console.log('=== TEST 1: All Incoming Movements ===');
  const allData = await fetchJson('http://localhost:3000/api/stock/report?from=2026-09-01&to=2026-09-30&item=all');
  console.log('Months count:', allData.months.length);
  const m = allData.months[0];
  console.log('Month heading:', m.monthHeading);
  console.log('\nActual Rows rendered in Type column:');
  m.entries.forEach(e => {
    console.log(`  ${e.dateFormatted} | Type: ${e.typeLabel.padEnd(8)} | ${e.kg} kg`);
    // Ensure it's not generic 'Tobacco' but actual variety like SONA, A1, SUPER, Grade A
    if (e.typeLabel === 'Tobacco') {
      throw new Error(`Unexpected generic 'Tobacco' in row: ${JSON.stringify(e)}`);
    }
  });

  console.log('\n=== TEST 2: Leaf Filter (Tobacco) ===');
  const leafData = await fetchJson('http://localhost:3000/api/stock/report?from=2026-09-01&to=2026-09-30&item=tobacco');
  console.log('Leaf entries:', leafData.totalEntries, 'Total:', leafData.grandTotalKg, 'kg');
  leafData.months[0].entries.forEach(e => {
    console.log(`  ${e.dateFormatted} | Type: ${e.typeLabel.padEnd(8)} | ${e.kg} kg`);
  });

  console.log('\n=== TEST 3: Specific SONA Filter ===');
  const sonaData = await fetchJson('http://localhost:3000/api/stock/report?from=2026-09-01&to=2026-09-30&item=sona');
  console.log('SONA entries:', sonaData.totalEntries, 'Total:', sonaData.grandTotalKg, 'kg');
  sonaData.months[0].entries.forEach(e => {
    console.log(`  ${e.dateFormatted} | Type: ${e.typeLabel.padEnd(8)} | ${e.kg} kg`);
    if (e.typeLabel !== 'SONA') throw new Error(`Non-SONA entry in SONA filter: ${e.typeLabel}`);
  });

  console.log('\n=== TEST 4: Specific A1 Filter ===');
  const a1Data = await fetchJson('http://localhost:3000/api/stock/report?from=2026-09-01&to=2026-09-30&item=a1');
  console.log('A1 entries:', a1Data.totalEntries, 'Total:', a1Data.grandTotalKg, 'kg');
  a1Data.months[0].entries.forEach(e => {
    console.log(`  ${e.dateFormatted} | Type: ${e.typeLabel.padEnd(8)} | ${e.kg} kg`);
    if (e.typeLabel !== 'A1') throw new Error(`Non-A1 entry in A1 filter: ${e.typeLabel}`);
  });

  console.log('\n=== TEST 5: Complete HTML Output Check ===');
  const html = generateStockReportHTML(leafData);
  console.log(html.substring(0, 750));
  console.log('...');
  console.log(html.substring(html.length - 250));

  if (!html.includes('SONA') || !html.includes('A1')) {
    throw new Error('HTML must contain SONA and A1 in the Type column!');
  }

  console.log('\n🎉 ALL VARIETY TESTS PASSED WITH 100% SUCCESS!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
