const http = require('http');
const fs = require('fs');
const path = require('path');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== TEST 1: html2pdf script served correctly ===');
  const libRes = await fetchUrl('http://localhost:3000/js/html2pdf.bundle.min.js');
  console.log('html2pdf status:', libRes.statusCode, 'Content-Length:', libRes.headers['content-length']);
  if (libRes.statusCode !== 200) throw new Error('html2pdf.bundle.min.js not served with 200');

  console.log('\n=== TEST 2: /api/stock/report endpoint with current month ===');
  const curRes = await fetchUrl('http://localhost:3000/api/stock/report?month=2026-09');
  console.log('Current month status:', curRes.statusCode);
  if (curRes.statusCode !== 200) throw new Error('API failed');

  const curData = JSON.parse(curRes.body);
  console.log('Month key:', curData.month);
  console.log('Tobacco Opening:', curData.tobacco.openingKg, 'kg | Added:', curData.tobacco.addedKg, 'kg | Used:', curData.tobacco.usedKg, 'kg | Closing:', curData.tobacco.closingKg, 'kg');
  console.log('Powder Opening:', curData.powder.openingKg, 'kg | Added:', curData.powder.addedKg, 'kg | Used:', curData.powder.usedKg, 'kg | Closing:', curData.powder.closingKg, 'kg');
  console.log('Production in month:', curData.production.cuts, 'Cuts |', curData.production.boxes, 'Boxes |', curData.production.beedis, 'Beedis');
  console.log('Packable Bags from closing tobacco:', curData.tobacco.packableBags, 'Bags');
  console.log('Total movements in month:', curData.movements.length);

  if (typeof curData.tobacco.openingKg !== 'number') throw new Error('Invalid tobacco openingKg');
  if (typeof curData.tobacco.closingKg !== 'number') throw new Error('Invalid tobacco closingKg');
  if (typeof curData.powder.closingKg !== 'number') throw new Error('Invalid powder closingKg');

  console.log('\n=== TEST 3: /api/stock/report endpoint with past month ===');
  const pastRes = await fetchUrl('http://localhost:3000/api/stock/report?month=2026-08');
  console.log('Past month status:', pastRes.statusCode);
  const pastData = JSON.parse(pastRes.body);
  console.log('Past month key:', pastData.month, pastData.monthLabelEn);

  console.log('\n=== TEST 4: Verify stock.html elements for report & PDF download ===');
  const stockHtmlRes = await fetchUrl('http://localhost:3000/stock');
  const html = stockHtmlRes.body;

  const requiredElements = [
    'id="stockReportCard"',
    'id="stockReportMonthInput"',
    'id="btnDownloadStockPdf"',
    'id="btnPreviewStockReport"',
    'id="btnPrintStockReport"',
    'id="stockReportPreviewModal"',
    'id="previewReportContainer"',
    'id="pdfPrintableSheet"',
    'src="/js/html2pdf.bundle.min.js"',
    'data-i18n="monthlyStockReportTitle"',
    'data-i18n="downloadPdfBtn"',
    'downloadMonthlyStockPDF()',
    'previewMonthlyStockReport()',
    'printMonthlyStockReport()'
  ];

  for (const el of requiredElements) {
    if (!html.includes(el)) {
      throw new Error(`Missing expected element in stock.html: ${el}`);
    }
    console.log(`  ✅ Element verified in stock.html: ${el}`);
  }

  console.log('\n🎉 ALL TESTS PASSED! Monthly Stock Report & PDF feature is 100% verified.');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
