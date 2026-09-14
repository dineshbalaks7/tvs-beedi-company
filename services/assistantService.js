/**
 * TVS Beedi Company - Tamil / Tanglish / English Conversation Assistant
 * Natural Language Processing & Intent Handler for Internal Management
 */

const Production = require('../models/Production');
const Expense = require('../models/Expense');
const Settings = require('../models/Settings');
const { getStockSummary, addStock, recordStockUsage } = require('./stockService');
const { calculateProductionMetrics, calculateBags, calculateProfit, formatKg } = require('./calculationService');

// Pending action cache for conversation confirmations
// Key: session/user, Value: { type, payload, expiresAt }
const pendingActions = new Map();

/**
 * Detect language: 'ta' (Tamil script), 'tanglish' (Tamil in Latin script), or 'en'
 */
function detectLanguage(text) {
  const tamilRegex = /[\u0B80-\u0BFF]/;
  if (tamilRegex.test(text)) {
    return 'ta';
  }

  const lower = text.toLowerCase();
  const tanglishWords = [
    'innaiku', 'inraiku', 'iniku', 'evlo', 'ethana', 'ethanai', 'panna', 'pannirukom',
    'irukku', 'iruku', 'varum', 'thevai', 'pota', 'potta', 'la', 'kattu', 'beedi',
    'panam', 'selavu', 'sambalam', 'matham', 'intha', 'andha', 'solu', 'solunga',
    'pannu', 'add pannu', 'podu', 'kodu', 'aam', 'illai', 'aama'
  ];

  for (const word of tanglishWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lower)) {
      return 'tanglish';
    }
  }

  return 'en';
}

/**
 * Helper to get Start and End of Today in local time
 */
function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Helper to get Start and End of Current Month
 */
function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Format currency
 */
function formatRupees(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

/**
 * Process incoming chat query
 */
async function processChatMessage(queryText, sessionId = 'default') {
  const text = queryText.trim();
  const lower = text.toLowerCase();
  const lang = detectLanguage(text);
  const settings = await Settings.getSettings();

  // 1. Check if user is confirming or cancelling an existing pending action
  const pending = pendingActions.get(sessionId);
  if (pending) {
    const isConfirm = /^(ஆம்|ஆம், சேமிக்கவும்|ஆமாம்|சரி|சேமி|yes|confirm|save|ok|aam|aama)$/i.test(text) ||
                      lower.includes('save') || lower.includes('சேமி') || lower.includes('confirm');
    const isCancel = /^(இல்லை|வேண்டாம்|ரத்து|no|cancel|illai|vendam)$/i.test(text) ||
                     lower.includes('cancel') || lower.includes('ரத்து');

    if (isConfirm) {
      const result = await executePendingAction(pending);
      pendingActions.delete(sessionId);
      return {
        reply: result.reply,
        language: lang,
        actionStatus: 'confirmed',
        data: result.data
      };
    } else if (isCancel) {
      pendingActions.delete(sessionId);
      const cancelReply = (lang === 'en')
        ? "Action cancelled. No changes were saved."
        : "செயல் ரத்து செய்யப்பட்டது. எந்த மாற்றமும் சேமிக்கப்படவில்லை.";
      return {
        reply: cancelReply,
        language: lang,
        actionStatus: 'cancelled'
      };
    }
  }

  // 2. Intent: Add Production Command
  // e.g.: "இன்று 1 கட்டை production add பண்ணு", "இன்று 100 கட்டு production add பண்ணு", "add 1 box production"
  const addBoxMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:கட்டை|box|boxes)/i);
  const addCutMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:கட்டு|cut|cuts)/i) ||
                      text.match(/production\s*add.*?(\d+(?:\.\d+)?)/i) ||
                      text.match(/add.*?(\d+(?:\.\d+)?).*?(cut|கட்டு|production|box|கட்டை)/i);

  if ((lower.includes('add') || lower.includes('சேர்') || lower.includes('போடு') || lower.includes('பதிவு')) &&
      (lower.includes('production') || lower.includes('உற்பத்தி') || lower.includes('கட்டு') || lower.includes('cut') || lower.includes('box') || lower.includes('கட்டை')) &&
      (addBoxMatch || addCutMatch)) {
    const cutsPerBox = settings.cutsPerBox || 300;
    let boxes = 0;
    let cuts = 0;

    if (addBoxMatch) {
      boxes = parseFloat(addBoxMatch[1]);
      cuts = Math.round(boxes * cutsPerBox);
    } else if (addCutMatch) {
      cuts = parseFloat(addCutMatch[1]);
      boxes = cuts > 0 ? Number((cuts / cutsPerBox).toFixed(2)) : 0;
    }

    if (boxes > 0 || cuts > 0) {
      const metrics = calculateProductionMetrics({ boxes, cuts }, settings);
      const actionPayload = {
        type: 'add_production',
        boxes: metrics.boxes,
        cuts: metrics.cuts,
        beedis: metrics.beedis,
        tobaccoUsedGrams: metrics.tobaccoUsedGrams,
        powderUsedGrams: metrics.powderUsedGrams,
        salary: metrics.salary,
        rate: metrics.rate,
        date: new Date()
      };

      pendingActions.set(sessionId, {
        type: 'add_production',
        payload: actionPayload,
        expiresAt: Date.now() + 5 * 60 * 1000
      });

      const replyTa = `**உற்பத்தி விவரம்**\n\n` +
        `• கட்டை (Boxes): **${metrics.boxes} Boxes**\n` +
        `• கட்டு (Cuts): **${metrics.cuts} Cuts**\n` +
        `• பீடி (Beedis): **${metrics.beedis.toLocaleString('en-IN')} பீடிகள்**\n` +
        `• Tobacco தேவை: **${metrics.tobaccoUsedKg} kg** (${metrics.tobaccoUsedGrams} g)\n` +
        `• Powder (தூள்) தேவை: **${metrics.powderUsedKg} kg** (${metrics.powderUsedGrams} g)\n` +
        `• Salary (சம்பளம்): **${formatRupees(metrics.salary)}**\n` +
        `• Rate மதிப்பு: **${formatRupees(metrics.rate)}**\n\n` +
        `**இதை சேமிக்கவா?**`;

      const replyEn = `**Production Details**\n\n` +
        `• Boxes: **${metrics.boxes} Boxes**\n` +
        `• Cuts: **${metrics.cuts} Cuts**\n` +
        `• Beedis: **${metrics.beedis.toLocaleString('en-IN')}**\n` +
        `• Tobacco Required: **${metrics.tobaccoUsedKg} kg**\n` +
        `• Powder Required: **${metrics.powderUsedKg} kg**\n` +
        `• Salary: **${formatRupees(metrics.salary)}**\n` +
        `• Rate: **${formatRupees(metrics.rate)}**\n\n` +
        `**Do you want to save this?**`;

      return {
        reply: (lang === 'en') ? replyEn : replyTa,
        language: lang,
        actionRequired: true,
        actionType: 'add_production',
        actionPayload,
        confirmationPrompt: (lang === 'en') ? "Save this production?" : "இதை சேமிக்கவா?",
        confirmButtonText: (lang === 'en') ? "Yes, Save" : "ஆம், சேமிக்கவும்",
        cancelButtonText: (lang === 'en') ? "No" : "இல்லை"
      };
    }
  }

  // 3. Intent: Add Expense Command
  // e.g.: "இன்று ₹500 expense add பண்ணு", "add 300 rs transport expense"
  const addExpenseMatch = text.match(/(?:₹|rs\.?|ரூபாய்)?\s*(\d+(?:\.\d+)?)\s*(?:₹|rs\.?|ரூபாய்|செலவு|expense)/i) ||
                          text.match(/expense.*?(\d+(?:\.\d+)?)/i) ||
                          text.match(/add.*?(\d+(?:\.\d+)?).*?expense/i);

  if ((lower.includes('add') || lower.includes('சேர்') || lower.includes('போடு')) &&
      (lower.includes('expense') || lower.includes('செலவு') || lower.includes('ரூபாய்') || lower.includes('bill') || lower.includes('பில்')) &&
      addExpenseMatch) {
    const amount = parseFloat(addExpenseMatch[1]);
    if (amount > 0) {
      // detect category
      let category = 'இதர (Other)';
      if (lower.includes('கரண்ட்') || lower.includes('current') || lower.includes('electric') || lower.includes('மின்சாரம்')) {
        category = 'Electricity (மின்சாரம்)';
      } else if (lower.includes('transport') || lower.includes('வண்டி') || lower.includes('போக்குவரத்து')) {
        category = 'Transport (போக்குவரத்து)';
      } else if (lower.includes('கூலி') || lower.includes('wage') || lower.includes('labour') || lower.includes('salary')) {
        category = 'Labor (கூலி)';
      } else if (lower.includes('வாடகை') || lower.includes('rent')) {
        category = 'Rent (வாடகை)';
      } else if (lower.includes('பேக்கிங்') || lower.includes('pack')) {
        category = 'Packaging (பேக்கிங்)';
      }

      const actionPayload = {
        type: 'add_expense',
        amount,
        category,
        paymentMethod: 'Cash',
        description: text,
        date: new Date()
      };

      pendingActions.set(sessionId, {
        type: 'add_expense',
        payload: actionPayload,
        expiresAt: Date.now() + 5 * 60 * 1000
      });

      const replyTa = `**செலவு விவரம்**\n\n` +
        `• வகை: **${category}**\n` +
        `• தொகை: **${formatRupees(amount)}**\n` +
        `• செலுத்தும் முறை: **ரொக்கம் (Cash)**\n\n` +
        `**இதை சேமிக்கவா?**`;

      const replyEn = `**Expense Details**\n\n` +
        `• Category: **${category}**\n` +
        `• Amount: **${formatRupees(amount)}**\n` +
        `• Payment: **Cash**\n\n` +
        `**Do you want to save this expense?**`;

      return {
        reply: (lang === 'en') ? replyEn : replyTa,
        language: lang,
        actionRequired: true,
        actionType: 'add_expense',
        actionPayload,
        confirmationPrompt: (lang === 'en') ? "Save this expense?" : "இதை சேமிக்கவா?",
        confirmButtonText: (lang === 'en') ? "Yes, Save" : "ஆம், சேமிக்கவும்",
        cancelButtonText: (lang === 'en') ? "No" : "இல்லை"
      };
    }
  }

  // 4. Intent: Tobacco Bag Calculation Query
  // e.g.: "35 kg tobacco-ல எத்தனை 600g bag வரும்?" / "How many 600g bags in 35kg tobacco?"
  const bagMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|கிலோ).*?(\d+)?\s*(?:g|கிராம்)?\s*(?:bag|பை)/i) ||
                   (lower.includes('bag') && (lower.includes('tobacco') || lower.includes('கிலோ') || lower.includes('kg')));

  if (bagMatch || (lower.includes('bag') && lower.includes('வரும்'))) {
    let tobaccoKg = 35;
    let bagSize = settings.bagSizeGrams || 600;
    const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|கிலோ)/i);
    if (kgMatch) tobaccoKg = parseFloat(kgMatch[1]);
    const sizeMatch = text.match(/(\d+)\s*(?:g|கிராம்)/i);
    if (sizeMatch) bagSize = parseInt(sizeMatch[1], 10);

    const bagResult = calculateBags(tobaccoKg, settings.avgWastageKg, bagSize, settings);

    const replyTa = `**Tobacco Bag கணக்கீடு:**\n\n` +
      `• மொத்த Tobacco: **${tobaccoKg} கிலோ**\n` +
      `• கழிவு (Wastage): **− ${bagResult.wastageKg} கிலோ**\n` +
      `• பயன்பாட்டு Tobacco: **= ${bagResult.usableKg} கிலோ** (${bagResult.usableGrams.toLocaleString('en-IN')} g)\n` +
      `• ஒரு Bag அளவு: **${bagSize} g**\n\n` +
      `👉 கணக்கீடு: **${bagResult.usableGrams.toLocaleString('en-IN')} ÷ ${bagSize} = ${bagResult.totalBags} Bags**\n` +
      `(${tobaccoKg} kg tobacco-வில் ${bagResult.wastageKg} kg கழிவு போக **${bagResult.totalBags} பைகள்** கிடைக்கும்).`;

    const replyEn = `**Tobacco Bag Calculation:**\n\n` +
      `• Total Tobacco: **${tobaccoKg} kg**\n` +
      `• Wastage: **- ${bagResult.wastageKg} kg**\n` +
      `• Usable Tobacco: **= ${bagResult.usableKg} kg** (${bagResult.usableGrams.toLocaleString('en-IN')} g)\n` +
      `• Bag Size: **${bagSize} g**\n\n` +
      `👉 Calculation: **${bagResult.usableGrams.toLocaleString('en-IN')} ÷ ${bagSize} = ${bagResult.totalBags} Bags**`;

    return { reply: (lang === 'en') ? replyEn : replyTa, language: lang };
  }

  // 5. Intent: Requirement calculation for boxes or cuts
  // e.g.: "1 கட்டை போட்டா எவ்வளவு tobacco தேவை?" / "100 cut போட்டா எவ்வளவு tobacco தேவை?" / "Requirements for 1 box"
  const boxReqMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:box|boxes|கட்டை)/i);
  const cutReqMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:cut|cuts|கட்டு)/i);

  if ((boxReqMatch || cutReqMatch) && (lower.includes('thevai') || lower.includes('தேவை') || lower.includes('need') || lower.includes('how much') || lower.includes('எவ்வளவு') || lower.includes('evlo'))) {
    let boxes = 0;
    let cuts = 0;
    const cutsPerBox = settings.cutsPerBox || 300;

    if (boxReqMatch) {
      boxes = parseFloat(boxReqMatch[1]);
      cuts = Math.round(boxes * cutsPerBox);
    } else {
      cuts = parseFloat(cutReqMatch[1]);
      boxes = cuts > 0 ? Number((cuts / cutsPerBox).toFixed(2)) : 0;
    }

    const metrics = calculateProductionMetrics({ boxes, cuts }, settings);

    const unitLabelTa = boxReqMatch ? `${boxes} கட்டை (Boxes)` : `${cuts} கட்டு (Cuts)`;
    const unitLabelEn = boxReqMatch ? `${boxes} Boxes` : `${cuts} Cuts`;

    const replyTa = `**${unitLabelTa} உற்பத்தி தேவைகள்:**\n\n` +
      `• கட்டை / கட்டுகள்: **${metrics.boxes} கட்டை = ${metrics.cuts} கட்டுகள்**\n` +
      `• பீடிகள் எண்ணிக்கை: **${metrics.beedis.toLocaleString('en-IN')} பீடிகள்**\n` +
      `• தேவைப்படும் Tobacco: **${metrics.tobaccoUsedKg} kg** (${metrics.tobaccoUsedGrams} g)\n` +
      `• தேவைப்படும் Powder (தூள்): **${metrics.powderUsedKg} kg** (${metrics.powderUsedGrams} g)\n` +
      `• கூலி / Salary: **${formatRupees(metrics.salary)}**\n` +
      `• Rate மதிப்பு: **${formatRupees(metrics.rate)}**\n` +
      `• லாபம் (Rate − கூலி): **${formatRupees(metrics.profit)}** (${formatRupees(settings.marginPerBox || 120)}/கட்டை)`;

    const replyEn = `**Requirements for ${unitLabelEn}:**\n\n` +
      `• Boxes / Cuts: **${metrics.boxes} Boxes = ${metrics.cuts} Cuts**\n` +
      `• Beedis: **${metrics.beedis.toLocaleString('en-IN')}**\n` +
      `• Tobacco Required: **${metrics.tobaccoUsedKg} kg** (${metrics.tobaccoUsedGrams} g)\n` +
      `• Powder Required: **${metrics.powderUsedKg} kg** (${metrics.powderUsedGrams} g)\n` +
      `• Salary: **${formatRupees(metrics.salary)}**\n` +
      `• Rate: **${formatRupees(metrics.rate)}**\n` +
      `• Profit (Rate − Salary): **${formatRupees(metrics.profit)}** (${formatRupees(settings.marginPerBox || 120)}/Box)`;

    return { reply: (lang === 'en') ? replyEn : replyTa, language: lang };
  }

  // 5b. Intent: Difference between Rate and Salary for Profit
  // e.g.: "diff between rate and salary for profit", "rate salary difference", "profit per box"
  if ((lower.includes('rate') && (lower.includes('salary') || lower.includes('கூலி') || lower.includes('sambalam'))) ||
      ((lower.includes('profit') || lower.includes('லாபம்') || lower.includes('diff') || lower.includes('வித்தியாசம்')) && (lower.includes('rate') || lower.includes('salary') || lower.includes('box') || lower.includes('கட்டை')))) {
    const ratePer1000 = settings.ratePer1000 || 340;
    const salaryPer1000 = settings.salaryPer1000 || 320;
    const beedisPerBox = settings.beedisPerBox || 6000;
    const ratePerBox = (beedisPerBox / 1000) * ratePer1000;
    const salaryPerBox = (beedisPerBox / 1000) * salaryPer1000;
    const diffProfit = ratePerBox - salaryPerBox;

    const replyTa = `**Rate மற்றும் கூலி இடையேயான லாப வித்தியாசம் (Profit per Box):**\n\n` +
      `• **Rate மதிப்பு (கம்பெனி வரவு):** ${formatRupees(ratePerBox)} / கட்டை (1,000-க்கு ₹${ratePer1000})\n` +
      `• **தொழிலாளர் கூலி (Salary):** ${formatRupees(salaryPerBox)} / கட்டை (1,000-க்கு ₹${salaryPer1000})\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 **லாபம் (Rate − கூலி):** **${formatRupees(diffProfit)} / கட்டை** (1,000-க்கு ₹${ratePer1000 - salaryPer1000})\n\n` +
      `*கணக்கீடு: ${formatRupees(ratePerBox)} − ${formatRupees(salaryPerBox)} = ${formatRupees(diffProfit)} லாபம்*`;

    const replyEn = `**Difference between Rate and Salary for Profit:**\n\n` +
      `• **Rate Value:** ${formatRupees(ratePerBox)} / Box (₹${ratePer1000} per 1,000 beedis)\n` +
      `• **Labor Salary:** ${formatRupees(salaryPerBox)} / Box (₹${salaryPer1000} per 1,000 beedis)\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 **Profit (Rate − Salary):** **${formatRupees(diffProfit)} / Box** (₹${ratePer1000 - salaryPer1000} per 1,000 beedis)\n\n` +
      `*Calculation: ${formatRupees(ratePerBox)} − ${formatRupees(salaryPerBox)} = ${formatRupees(diffProfit)} Profit*`;

    return { reply: (lang === 'en') ? replyEn : replyTa, language: lang };
  }

  // 6. Intent: Today's Production Query
  // e.g.: "இன்னைக்கு எத்தனை பீடி உற்பத்தி பண்ணிருக்கோம்?", "Innaiku evlo beedi production?", "today production"
  if (lower.includes('production') || lower.includes('உற்பத்தி') || lower.includes('பீடி') || lower.includes('beedi')) {
    if (lower.includes('இன்னைக்கு') || lower.includes('இன்று') || lower.includes('today') || lower.includes('innaiku') || lower.includes('iniku') || lower.includes('inraiku')) {
      const { start, end } = getTodayRange();
      const records = await Production.find({ date: { $gte: start, $lte: end } });
      const totalBoxes = records.reduce((sum, r) => sum + (r.boxes !== undefined ? r.boxes : Number(((r.cuts || 0) / 300).toFixed(1))), 0);
      const totalCuts = records.reduce((sum, r) => sum + (r.cuts || 0), 0);
      const totalBeedis = records.reduce((sum, r) => sum + (r.beedis || 0), 0);
      const totalTobacco = records.reduce((sum, r) => sum + (r.tobaccoUsedGrams || 0), 0);
      const totalPowder = records.reduce((sum, r) => sum + (r.powderUsedGrams || 0), 0);

      const replyTa = `**இன்றைய உற்பத்தி நிலவரம்:**\n\n` +
        `• உற்பத்தி செய்த கட்டை: **${totalBoxes.toLocaleString('en-IN')} Boxes**\n` +
        `• உற்பத்தி செய்த கட்டுகள்: **${totalCuts.toLocaleString('en-IN')} Cuts**\n` +
        `• உற்பத்தி செய்த பீடிகள்: **${totalBeedis.toLocaleString('en-IN')} Beedis**\n` +
        `• பயன்படுத்திய Tobacco: **${formatKg(totalTobacco)}**\n` +
        `• பயன்படுத்திய Powder (தூள்): **${formatKg(totalPowder)}**\n` +
        `• பதிவுகள் எண்ணிக்கை: ${records.length}`;

      const replyEn = `**Today's Production Status:**\n\n` +
        `• Total Boxes: **${totalBoxes.toLocaleString('en-IN')} Boxes**\n` +
        `• Total Cuts: **${totalCuts.toLocaleString('en-IN')} Cuts**\n` +
        `• Total Beedis: **${totalBeedis.toLocaleString('en-IN')} Beedis**\n` +
        `• Tobacco Used: **${formatKg(totalTobacco)}**\n` +
        `• Powder Used: **${formatKg(totalPowder)}**\n` +
        `• Entries: ${records.length}`;

      return { reply: (lang === 'en') ? replyEn : replyTa, language: lang };
    }
  }

  // 7. Intent: Stock Queries & Consumption Reporting
  // e.g.: "இப்போ எவ்வளவு tobacco stock இருக்கு?", "tobacco stock evlo?", "தூள் stock", "பயன்பாடு எவ்வளவு?"
  if (lower.includes('stock') || lower.includes('இருப்பு') || lower.includes('பயன்பாடு') || lower.includes('consumed')) {
    const stockSummary = await getStockSummary();
    const cToday = stockSummary.consumption?.today || {};

    if (lower.includes('powder') || lower.includes('பவுடர்') || lower.includes('தூள்') || lower.includes('thool') || lower.includes('dhool')) {
      const replyTa = `**தூள் (Tobacco Powder) இருப்பு & பயன்பாடு:**\n\n` +
        `• தற்போதைய கையிருப்பு: **${stockSummary.powder.kg} kg** (${stockSummary.powder.grams.toLocaleString('en-IN')} g)\n` +
        `• இன்று உற்பத்தி பயன்பாடு: **${cToday.powderKg || 0} kg**\n\n` +
        (stockSummary.powder.isLow ? `⚠️ **எச்சரிக்கை: தூள் இருப்பு குறைவாக உள்ளது! (Low Stock)**` : `✅ தூள் இருப்பு போதுமானது.`);
      const replyEn = `**Tobacco Powder (தூள்) Stock & Consumption:**\n\n` +
        `• Balance in Hand: **${stockSummary.powder.kg} kg** (${stockSummary.powder.grams.toLocaleString('en-IN')} g)\n` +
        `• Consumed Today: **${cToday.powderKg || 0} kg**\n\n` +
        (stockSummary.powder.isLow ? `⚠️ **Warning: Powder stock is low!**` : `✅ Powder stock is healthy.`);
      return { reply: (lang === 'en') ? replyEn : replyTa, language: lang };
    }

    if (lower.includes('tobacco') || lower.includes('புகையிலை') || lower.includes('இலை')) {
      const replyTa = `**Tobacco (புகையிலை) இருப்பு & பயன்பாடு:**\n\n` +
        `• தற்போதைய கையிருப்பு: **${stockSummary.tobacco.kg} kg** (${stockSummary.tobacco.grams.toLocaleString('en-IN')} g)\n` +
        `• இன்று உற்பத்தி பயன்பாடு: **${cToday.tobaccoKg || 0} kg**\n\n` +
        (stockSummary.tobacco.isLow ? `⚠️ **எச்சரிக்கை: Tobacco இருப்பு குறைவாக உள்ளது! (Low Stock)**` : `✅ Tobacco இருப்பு போதுமானது.`);
      const replyEn = `**Tobacco Stock & Consumption:**\n\n` +
        `• Balance in Hand: **${stockSummary.tobacco.kg} kg** (${stockSummary.tobacco.grams.toLocaleString('en-IN')} g)\n` +
        `• Consumed Today: **${cToday.tobaccoKg || 0} kg**\n\n` +
        (stockSummary.tobacco.isLow ? `⚠️ **Warning: Tobacco stock is low!**` : `✅ Tobacco stock is healthy.`);
      return { reply: (lang === 'en') ? replyEn : replyTa, language: lang };
    }

    // Both stocks and consumption reporting
    const replyTa = `**சரக்கு இருப்பு & பயன்பாட்டு அறிக்கை (Stock & Consumed):**\n\n` +
      `📦 **Tobacco கையிருப்பு:** **${stockSummary.tobacco.kg} kg** (${stockSummary.tobacco.grams.toLocaleString('en-IN')} g)\n` +
      `📦 **தூள் கையிருப்பு:** **${stockSummary.powder.kg} kg** (${stockSummary.powder.grams.toLocaleString('en-IN')} g)\n\n` +
      `📊 **இன்றைய பயன்பாடு:**\n` +
      `• Tobacco: **${cToday.tobaccoKg || 0} kg** | தூள்: **${cToday.powderKg || 0} kg**\n\n` +
      ((stockSummary.tobacco.isLow || stockSummary.powder.isLow) ? `⚠️ *சில மூலப்பொருட்கள் குறைந்த இருப்பில் உள்ளன.*` : `✅ மூலப்பொருள் இருப்பு போதுமான அளவில் உள்ளது.`);

    const replyEn = `**Stock Balance & Consumed Report:**\n\n` +
      `📦 **Tobacco in Hand:** **${stockSummary.tobacco.kg} kg** (${stockSummary.tobacco.grams.toLocaleString('en-IN')} g)\n` +
      `📦 **Powder in Hand:** **${stockSummary.powder.kg} kg** (${stockSummary.powder.grams.toLocaleString('en-IN')} g)\n\n` +
      `📊 **Consumed Today:**\n` +
      `• Tobacco: **${cToday.tobaccoKg || 0} kg** | Powder: **${cToday.powderKg || 0} kg**\n\n` +
      ((stockSummary.tobacco.isLow || stockSummary.powder.isLow) ? `⚠️ *Low stock warning active.*` : `✅ Stock levels are healthy.`);

    return { reply: (lang === 'en') ? replyEn : replyTa, language: lang };
  }

  // 8. Intent: Salary Queries
  // e.g.: "இன்று எவ்வளவு salary?", "today salary evlo?", "iniku sambalam evlo?"
  if (lower.includes('salary') || lower.includes('கூலி') || lower.includes('சம்பளம்') || lower.includes('sambalam')) {
    const isMonth = lower.includes('மாதம்') || lower.includes('month') || lower.includes('matham');
    const range = isMonth ? getMonthRange() : getTodayRange();
    const records = await Production.find({ date: { $gte: range.start, $lte: range.end } });
    const totalSalary = records.reduce((sum, r) => sum + (r.salary || 0), 0);
    const totalBeedis = records.reduce((sum, r) => sum + (r.beedis || 0), 0);

    const periodLabelTa = isMonth ? 'இந்த மாத' : 'இன்றைய';
    const periodLabelEn = isMonth ? 'This Month' : 'Today';

    const replyTa = `**${periodLabelTa} மொத்த சம்பளம் (Salary):**\n\n` +
      `• சம்பளத் தொகை: **${formatRupees(totalSalary)}**\n` +
      `• உற்பத்தி செய்த பீடிகள்: ${totalBeedis.toLocaleString('en-IN')}\n` +
      `• விகிதம் (Rate): 1,000 பீடிக்கு ${formatRupees(settings.salaryPer1000)}`;

    const replyEn = `**${periodLabelEn} Total Salary:**\n\n` +
      `• Total Salary: **${formatRupees(totalSalary)}**\n` +
      `• Total Beedis: ${totalBeedis.toLocaleString('en-IN')}\n` +
      `• Rate: ${formatRupees(settings.salaryPer1000)} per 1,000 beedis`;

    return { reply: (lang === 'en') ? replyEn : replyTa, language: lang };
  }

  // 9. Intent: Expenses Queries
  // e.g.: "இன்று எவ்வளவு செலவு?", "iniku evlo selavu?", "today expenses"
  if (lower.includes('expense') || lower.includes('செலவு') || lower.includes('selavu') || lower.includes('செலவுகள்')) {
    const isMonth = lower.includes('மாதம்') || lower.includes('month') || lower.includes('matham');
    const range = isMonth ? getMonthRange() : getTodayRange();
    const expenses = await Expense.find({ date: { $gte: range.start, $lte: range.end } });
    const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const periodLabelTa = isMonth ? 'இந்த மாத' : 'இன்றைய';
    const periodLabelEn = isMonth ? 'This Month' : 'Today';

    let categoryBreakdown = '';
    const catMap = {};
    expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
    for (const [c, a] of Object.entries(catMap)) {
      categoryBreakdown += `  • ${c}: ${formatRupees(a)}\n`;
    }

    const replyTa = `**${periodLabelTa} மொத்த செலவுகள்:**\n\n` +
      `• மொத்த செலவு: **${formatRupees(totalAmount)}**\n` +
      (categoryBreakdown ? `\nபிரிவுகள்:\n${categoryBreakdown}` : '');

    const replyEn = `**${periodLabelEn} Total Expenses:**\n\n` +
      `• Total Expense: **${formatRupees(totalAmount)}**\n` +
      (categoryBreakdown ? `\nCategories:\n${categoryBreakdown}` : '');

    return { reply: (lang === 'en') ? replyEn : replyTa, language: lang };
  }

  // 10. Intent: Profit Queries
  // e.g.: "இந்த மாதம் எவ்வளவு profit?", "iniku profit evlo?", "today profit"
  if (lower.includes('profit') || lower.includes('லாபம்') || lower.includes('labam')) {
    const isToday = lower.includes('இன்னைக்கு') || lower.includes('இன்று') || lower.includes('today') || lower.includes('iniku');
    const range = isToday ? getTodayRange() : getMonthRange();
    const periodLabelTa = isToday ? 'இன்றைய' : 'இந்த மாத';
    const periodLabelEn = isToday ? 'Today\'s' : 'This Month\'s';

    const productions = await Production.find({ date: { $gte: range.start, $lte: range.end } });
    const expenses = await Expense.find({ date: { $gte: range.start, $lte: range.end } });

    const totalRate = productions.reduce((sum, p) => sum + (p.rate || 0), 0);
    const totalSalary = productions.reduce((sum, p) => sum + (p.salary || 0), 0);
    const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const profitData = calculateProfit(totalRate, totalSalary, totalExpense);

    const replyTa = `**${periodLabelTa} லாப கணக்கீடு (Profit Calculation):**\n\n` +
      `• மொத்த Rate மதிப்பு: **+ ${formatRupees(profitData.totalRate)}**\n` +
      `• மொத்த Salary கழிவு: **− ${formatRupees(profitData.totalSalary)}**\n` +
      `• இதர செலவுகள் (Expenses): **− ${formatRupees(profitData.totalExpenses)}**\n` +
      `─────────────────────────\n` +
      `💰 **நிகர லாபம் (Net Profit): = ${formatRupees(profitData.profit)}**\n` +
      `• லாப விகிதம் (Margin): **${profitData.profitMarginPercent}%**`;

    const replyEn = `**${periodLabelEn} Profit Breakdown:**\n\n` +
      `• Total Rate Amount: **+ ${formatRupees(profitData.totalRate)}**\n` +
      `• Total Salary: **− ${formatRupees(profitData.totalSalary)}**\n` +
      `• Other Expenses: **− ${formatRupees(profitData.totalExpenses)}**\n` +
      `─────────────────────────\n` +
      `💰 **Net Profit: = ${formatRupees(profitData.profit)}**\n` +
      `• Profit Margin: **${profitData.profitMarginPercent}%**`;

    return { reply: (lang === 'en') ? replyEn : replyTa, language: lang };
  }

  // 11. Intent: Powder / தூள் usage query
  // e.g.: "இன்று எவ்வளவு தூள் use ஆயிருக்கு?", "today powder used"
  if ((lower.includes('powder') || lower.includes('பவுடர்') || lower.includes('தூள்') || lower.includes('thool') || lower.includes('dhool')) && (lower.includes('use') || lower.includes('பயன்படுத்திய') || lower.includes('ஆயிருக்கு') || lower.includes('எவ்வளவு') || lower.includes('evlo'))) {
    const { start, end } = getTodayRange();
    const records = await Production.find({ date: { $gte: start, $lte: end } });
    const totalPowder = records.reduce((sum, r) => sum + (r.powderUsedGrams || 0), 0);

    const replyTa = `**இன்று பயன்படுத்திய தூள் (Tobacco Powder):**\n\n` +
      `• மொத்த பயன்பாடு: **${formatKg(totalPowder)}** (${totalPowder} கிராம்)\n` +
      `• உற்பத்தி பதிவுகள்: ${records.length}`;
    const replyEn = `**Tobacco Powder (தூள்) used today:**\n\n` +
      `• Total used: **${formatKg(totalPowder)}** (${totalPowder} g)\n` +
      `• Production batches: ${records.length}`;

    return { reply: (lang === 'en') ? replyEn : replyTa, language: lang };
  }

  // 12. Default Fallback with Helpful Tips
  const fallbackTa = `வணக்கம்! நான் TVS பீடி கம்பெனியின் உரையாடல் உதவியாளர்.\n\n` +
    `நீங்கள் என்னிடம் கேட்கலாம்:\n` +
    `• *"இன்னைக்கு எத்தனை பீடி உற்பத்தி பண்ணிருக்கோம்?"*\n` +
    `• *"இப்போ எவ்வளவு tobacco stock இருக்கு?"*\n` +
    `• *"35 kg tobacco-ல எத்தனை 600g bag வரும்?"*\n` +
    `• *"100 cut போட்டா எவ்வளவு tobacco தேவை?"*\n` +
    `• *"இந்த மாதம் எவ்வளவு profit?"*\n` +
    `• *"இன்று 100 கட்டு production add பண்ணு"*\n` +
    `• *"இன்று ₹500 கரண்ட் பில் expense add பண்ணு"*`;

  const fallbackEn = `Hello! I am TVS Beedi Company's conversation assistant.\n\n` +
    `You can ask me questions such as:\n` +
    `• *"Today's beedi production?"*\n` +
    `• *"Current tobacco stock?"*\n` +
    `• *"How many 600g bags in 35kg tobacco?"*\n` +
    `• *"Requirements for 100 cuts?"*\n` +
    `• *"This month's profit?"*\n` +
    `• *"Add 100 cuts production today"*\n` +
    `• *"Add ₹500 electricity expense"*`;

  return { reply: (lang === 'en') ? fallbackEn : fallbackTa, language: lang };
}

/**
 * Execute pending confirmed action
 */
async function executePendingAction(pending) {
  const { type, payload } = pending;

  if (type === 'add_production') {
    const todayRange = getTodayRange();
    const existing = await Production.findOne({ date: { $gte: todayRange.start, $lte: todayRange.end } });
    const boxesVal = payload.boxes !== undefined ? payload.boxes : (payload.cuts ? Number((payload.cuts / 300).toFixed(1)) : 0);

    if (existing) {
      // Delta adjustment for stock
      const oldTobacco = existing.tobaccoUsedGrams || 0;
      const oldPowder = existing.powderUsedGrams || 0;
      const deltaTobacco = payload.tobaccoUsedGrams - oldTobacco;
      const deltaPowder = payload.powderUsedGrams - oldPowder;

      const Stock = require('../models/Stock');
      const StockMovement = require('../models/StockMovement');

      if (deltaTobacco !== 0) {
        const tobaccoStock = await Stock.getStock('tobacco');
        tobaccoStock.quantityGrams -= deltaTobacco;
        await tobaccoStock.save();
        await StockMovement.create({
          item: 'tobacco',
          type: 'adjustment',
          quantityGrams: -deltaTobacco,
          balanceAfterGrams: tobaccoStock.quantityGrams,
          notes: `Assistant update #${existing._id}: delta ${deltaTobacco > 0 ? 'consumed' : 'restored'} ${Math.abs(deltaTobacco)}g`
        });
      }

      if (deltaPowder !== 0) {
        const powderStock = await Stock.getStock('powder');
        powderStock.quantityGrams -= deltaPowder;
        await powderStock.save();
        await StockMovement.create({
          item: 'powder',
          type: 'adjustment',
          quantityGrams: -deltaPowder,
          balanceAfterGrams: powderStock.quantityGrams,
          notes: `Assistant update #${existing._id}: delta ${deltaPowder > 0 ? 'consumed' : 'restored'} ${Math.abs(deltaPowder)}g`
        });
      }

      existing.boxes = boxesVal;
      existing.cuts = payload.cuts;
      existing.beedis = payload.beedis;
      existing.tobaccoUsedGrams = payload.tobaccoUsedGrams;
      existing.powderUsedGrams = payload.powderUsedGrams;
      existing.salary = payload.salary;
      existing.rate = payload.rate;
      existing.notes = 'Updated via Conversation Assistant';
      await existing.save();

      const reply = `✏️ **இன்றைய உற்பத்தி ஏற்கனவே இருந்தது! வெற்றிகரமாக மாற்றியமைக்கப்பட்டது (Updated):**\n\n` +
        `• பதிவு எண்: #${existing._id.toString().slice(-6)}\n` +
        `• புதிய கட்டை: **${boxesVal} Boxes** (${payload.cuts} Cuts)\n` +
        `• புதிய பீடி: **${payload.beedis.toLocaleString('en-IN')} Beedis**\n` +
        `• Stock கழிவு: Tobacco ${payload.tobaccoUsedGrams}g, தூள் ${payload.powderUsedGrams}g.\n` +
        `• சம்பளம்: ${formatRupees(payload.salary)} | Rate: ${formatRupees(payload.rate)}`;

      return { reply, data: existing };
    }

    const production = await Production.create({
      date: payload.date || new Date(),
      boxes: boxesVal,
      cuts: payload.cuts,
      beedis: payload.beedis,
      tobaccoUsedGrams: payload.tobaccoUsedGrams,
      powderUsedGrams: payload.powderUsedGrams,
      wastageGrams: 0,
      salary: payload.salary,
      rate: payload.rate,
      notes: 'Added via Conversation Assistant'
    });

    // Deduct stock automatically
    await recordStockUsage(
      payload.tobaccoUsedGrams,
      payload.powderUsedGrams,
      production._id,
      `Conversation assistant entry: ${boxesVal} boxes (${payload.cuts} cuts)`
    );

    const reply = `✅ **உற்பத்தி வெற்றிகரமாக சேமிக்கப்பட்டது!**\n\n` +
      `• பதிவு எண்: #${production._id.toString().slice(-6)}\n` +
      `• கட்டை: **${boxesVal} Boxes** (${payload.cuts} Cuts)\n` +
      `• பீடி: **${payload.beedis.toLocaleString('en-IN')} Beedis**\n` +
      `• Stock கழிவு: Tobacco ${payload.tobaccoUsedGrams}g, தூள் ${payload.powderUsedGrams}g.\n` +
      `• சம்பளம்: ${formatRupees(payload.salary)} | Rate: ${formatRupees(payload.rate)}`;

    return { reply, data: production };
  }


  if (type === 'add_expense') {
    const expense = await Expense.create({
      date: payload.date || new Date(),
      category: payload.category,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod || 'Cash',
      description: payload.description || 'Added via Conversation Assistant',
      notes: 'Conversation assistant'
    });

    const reply = `✅ **செலவு வெற்றிகரமாக சேமிக்கப்பட்டது!**\n\n` +
      `• வகை: **${expense.category}**\n` +
      `• தொகை: **${formatRupees(expense.amount)}**\n` +
      `• தேதி: ${new Date(expense.date).toLocaleDateString('ta-IN')}`;

    return { reply, data: expense };
  }

  return { reply: "செயல் முடிவடைந்தது.", data: null };
}

module.exports = {
  processChatMessage,
  executePendingAction,
  detectLanguage
};
