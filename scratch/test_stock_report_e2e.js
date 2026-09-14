const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
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

async function testE2E() {
  console.log('Testing Stock Report API endpoints...');

  // 1. Multi-month range test
  const rangeUrl = 'http://localhost:3000/api/stock/report?from=2026-08-01&to=2026-09-13';
  const rangeReport = await fetchJson(rangeUrl);

  console.log('\n--- Multi-Month Range (2026-08-01 to 2026-09-13) ---');
  console.log('From:', rangeReport.from, '| To:', rangeReport.to);
  console.log('Is Range:', rangeReport.isRange);
  console.log('Monthly Breakdown Count:', rangeReport.monthlyBreakdown?.length);
  rangeReport.monthlyBreakdown?.forEach(mb => {
    console.log(` -> Month ${mb.month} (${mb.labelEn}): Tobacco Closing: ${mb.tobacco.closingKg}kg, Powder Closing: ${mb.powder.closingKg}kg, Boxes: ${mb.production.boxes}`);
  });
  console.log('Movements Count:', rangeReport.movements?.length);
  console.log('Overall Tobacco Added:', rangeReport.tobacco.addedKg, 'kg | Closing:', rangeReport.tobacco.closingKg, 'kg');
  console.log('Overall Powder Added:', rangeReport.powder.addedKg, 'kg | Closing:', rangeReport.powder.closingKg, 'kg');
  console.log('Overall Production Boxes:', rangeReport.production.boxes);

  if (!rangeReport.monthlyBreakdown || rangeReport.monthlyBreakdown.length < 2) {
    throw new Error('Expected at least 2 months in monthly breakdown for Aug-Sep range');
  }
  if (!rangeReport.movements || rangeReport.movements.length === 0) {
    throw new Error('Expected movements array to contain records');
  }

  // 2. Single month test
  const singleMonthUrl = 'http://localhost:3000/api/stock/report?from=2026-09-01&to=2026-09-30';
  const singleReport = await fetchJson(singleMonthUrl);

  console.log('\n--- Single Month Range (2026-09-01 to 2026-09-30) ---');
  console.log('From:', singleReport.from, '| To:', singleReport.to);
  console.log('Monthly Breakdown Count:', singleReport.monthlyBreakdown?.length);
  console.log('Movements Count:', singleReport.movements?.length);

  if (singleReport.monthlyBreakdown?.length !== 1) {
    throw new Error('Expected 1 month in breakdown for Sep 2026');
  }

  // 3. Default range test (no params)
  const defaultUrl = 'http://localhost:3000/api/stock/report';
  const defaultReport = await fetchJson(defaultUrl);
  console.log('\n--- Default Range ---');
  console.log('From:', defaultReport.from, '| To:', defaultReport.to);
  console.log('Monthly Breakdown Count:', defaultReport.monthlyBreakdown?.length);

  console.log('\n✅ ALL API VALIDATIONS PASSED SUCCESSFULLY!');
}

testE2E().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
