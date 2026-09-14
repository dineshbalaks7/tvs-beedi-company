const fs = require('fs');
const path = require('path');

function testHtml() {
  const stockHtml = fs.readFileSync(path.join(__dirname, '../public/stock.html'), 'utf8');

  // Verify key IDs exist
  const expectedIds = [
    'stockReportCard',
    'stockReportFromDate',
    'stockReportToDate',
    'stockReportMaterialFilter',
    'btnPresetThisMonth',
    'btnPresetLastMonth',
    'btnPreset3Months',
    'btnPresetThisYear',
    'btnDownloadStockPdf',
    'btnPreviewStockReport',
    'btnPrintStockReport',
    'stockReportActiveMonthBadge',
    'snapMaterialFilter',
    'snapEntriesCount',
    'snapTobaccoIncoming',
    'snapPowderIncoming',
    'snapTotalIncoming',
    'stockReportPreviewModal',
    'previewReportContainer',
    'pdfPrintableSheet'
  ];

  expectedIds.forEach(id => {
    if (!stockHtml.includes(`id="${id}"`)) {
      throw new Error(`Missing expected element ID in stock.html: ${id}`);
    }
  });
  console.log('✅ All expected DOM IDs exist in public/stock.html');

  // Verify material filter options
  if (!stockHtml.includes('value="all"') || !stockHtml.includes('value="tobacco"') || !stockHtml.includes('value="powder"')) {
    throw new Error('Missing material filter options in stock.html');
  }
  console.log('✅ All material options (all, tobacco, powder) exist in stock.html');

  // Verify JS functions exist in stock.js
  const stockJs = fs.readFileSync(path.join(__dirname, '../public/js/stock.js'), 'utf8');
  const expectedFns = [
    'onStockReportFilterChange',
    'setStockReportPreset',
    'onStockReportDateChange',
    'loadStockReportData',
    'renderStockReportSnapshot',
    'generateStockReportHTML',
    'downloadMonthlyStockPDF',
    'previewMonthlyStockReport',
    'printMonthlyStockReport'
  ];

  expectedFns.forEach(fn => {
    if (!stockJs.includes(fn)) {
      throw new Error(`Missing function in stock.js: ${fn}`);
    }
  });
  console.log('✅ All expected functions present in public/js/stock.js');

  // Verify CSS classes exist in stock.css
  const stockCss = fs.readFileSync(path.join(__dirname, '../public/css/stock.css'), 'utf8');
  const expectedCss = [
    '.stock-material-select',
    '.tvs-pdf-container',
    '.tvs-pdf-header',
    '.tvs-brand-title',
    '.tvs-month-block',
    '.tvs-month-title',
    '.tvs-table',
    '.tvs-month-total-line',
    '.tvs-final-total-line'
  ];

  expectedCss.forEach(cls => {
    if (!stockCss.includes(cls)) {
      throw new Error(`Missing CSS class in stock.css: ${cls}`);
    }
  });
  console.log('✅ All required TVS minimal PDF styling rules present in public/css/stock.css');

  console.log('\n🎉 FRONTEND CODE STRUCTURE VALIDATED SUCCESSFULLY!');
}

testHtml();
