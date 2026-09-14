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
  const data = await fetchJson('http://localhost:3000/api/stock/report?from=2026-09-01&to=2026-09-30&item=all');
  const html = generateStockReportHTML(data);

  console.log('--- GENERATED HTML SNIPPET ---');
  console.log(html.substring(0, 800));
  console.log('...');
  console.log(html.substring(html.length - 400));

  // Assertions
  if (!html.includes('<h1 class="tvs-brand-title">TVS</h1>')) {
    throw new Error('Missing TVS Header');
  }
  if (!html.includes('September (செப்டம்பர்)')) {
    throw new Error('Missing Month Header');
  }
  if (!html.includes('Date (தேதி)') || !html.includes('Type (வகை)') || !html.includes('Kg (கிலோ)')) {
    throw new Error('Missing Column Headers');
  }
  if (!html.includes('Total Kg in September (செப்டம்பர் மாத மொத்த கிலோ) = 287')) {
    throw new Error('Missing Month Total Line');
  }
  if (!html.includes('Total Kg (மொத்த கிலோ) = 287')) {
    throw new Error('Missing Final Grand Total Line');
  }

  console.log('\n✅ ALL HTML TEMPLATE ASSERTIONS PASSED!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
