/**
 * TVS Beedi Company - Calculation Service
 * Central domain calculations for cuts, beedis, tobacco, powder, salary, rate, bags, and profit.
 */

function calculateProductionMetrics(input, settings = {}) {
  const beedisPerBox = settings.beedisPerBox || 6000;
  const cutsPerBox = settings.cutsPerBox || 300;
  const beedisPerCut = settings.beedisPerCut || (beedisPerBox / cutsPerBox); // 20 beedis per cut (300 * 20 = 6,000 beedis/box)
  const tobaccoPer1000 = settings.tobaccoPer1000Grams || 600;
  const powderPer1000 = settings.powderPer1000Grams || 200;
  const salaryPer1000 = settings.salaryPer1000 || 320;
  const ratePer1000 = settings.ratePer1000 || 340;

  let boxes = 0;
  let cuts = 0;
  let beedis = 0;

  if (typeof input === 'object' && input !== null) {
    if (input.boxes !== undefined && input.boxes !== null && input.boxes !== '') {
      boxes = Number(input.boxes) || 0;
      cuts = (input.cuts !== undefined && input.cuts !== null && input.cuts !== '')
        ? Number(input.cuts)
        : Math.round(boxes * cutsPerBox);
      beedis = Math.round(boxes * beedisPerBox);
    } else if (input.cuts !== undefined && input.cuts !== null && input.cuts !== '') {
      cuts = Number(input.cuts) || 0;
      boxes = Number((cuts / cutsPerBox).toFixed(2));
      beedis = Math.round(cuts * beedisPerCut);
    }
  } else {
    // If a number is passed directly:
    // If it's a typical cut number like 100 or 300 or small box number:
    // When called as calculateProductionMetrics(val, settings):
    const num = Number(input) || 0;
    // Check if called as box or cut: default to box if <= 50, otherwise cuts
    if (num <= 50) {
      boxes = num;
      cuts = Math.round(boxes * cutsPerBox);
      beedis = Math.round(boxes * beedisPerBox);
    } else {
      cuts = num;
      boxes = Number((cuts / cutsPerBox).toFixed(2));
      beedis = Math.round(cuts * beedisPerCut);
    }
  }

  const tobaccoUsedGrams = (beedis / 1000) * tobaccoPer1000;
  const powderUsedGrams = (beedis / 1000) * powderPer1000;
  const salary = (beedis / 1000) * salaryPer1000;
  const rate = (beedis / 1000) * ratePer1000;

  return {
    boxes,
    cuts,
    beedis,
    tobaccoUsedGrams,
    tobaccoUsedKg: Number((tobaccoUsedGrams / 1000).toFixed(2)),
    powderUsedGrams,
    powderUsedKg: Number((powderUsedGrams / 1000).toFixed(2)),
    salary: Math.round(salary * 100) / 100,
    rate: Math.round(rate * 100) / 100,
    grossMargin: Math.round((rate - salary) * 100) / 100,
    profit: Math.round((rate - salary) * 100) / 100
  };
}

function calculateBags(tobaccoKg, wastageKg = null, bagSizeGrams = null, settings = {}) {
  const wastage = wastageKg !== null ? Number(wastageKg) : (settings.avgWastageKg ?? 2);
  const bagSize = bagSizeGrams !== null ? Number(bagSizeGrams) : (settings.bagSizeGrams ?? 600);

  const initialGrams = tobaccoKg * 1000;
  const wastageGrams = wastage * 1000;
  const usableGrams = Math.max(0, initialGrams - wastageGrams);
  const usableKg = usableGrams / 1000;
  const bags = bagSize > 0 ? (usableGrams / bagSize) : 0;

  return {
    initialKg: tobaccoKg,
    initialGrams,
    wastageKg: wastage,
    wastageGrams,
    usableKg,
    usableGrams,
    bagSizeGrams: bagSize,
    totalBags: Math.floor(bags),
    exactBags: Number(bags.toFixed(2))
  };
}

function calculateProfit(totalRate, totalSalary, totalExpenses) {
  const rateAmount = Number(totalRate) || 0;
  const salaryAmount = Number(totalSalary) || 0;
  const expenseAmount = Number(totalExpenses) || 0;
  const rateSalaryDiff = Math.round((rateAmount - salaryAmount) * 100) / 100;
  const profit = rateAmount - salaryAmount - expenseAmount;
  const profitMarginPercent = rateAmount > 0 ? Number(((profit / rateAmount) * 100).toFixed(2)) : 0;

  return {
    totalRate: rateAmount,
    totalSalary: salaryAmount,
    totalExpenses: expenseAmount,
    rateSalaryDiff,
    grossProfit: rateSalaryDiff,
    netProfit: Math.round(profit * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    profitMarginPercent,
    isProfitable: profit >= 0
  };
}

function formatKg(grams) {
  const kg = grams / 1000;
  if (grams < 1000) {
    return `${grams} g`;
  }
  return `${Number(kg.toFixed(2))} kg`;
}

module.exports = {
  calculateProductionMetrics,
  calculateBags,
  calculateProfit,
  formatKg
};
