/**
 * TVS Beedi Company - Internationalization (i18n) Dictionary & Seamless Switcher
 * Comprehensive Tamil (Primary) & English translations with instant, smooth transition
 */

const translations = {
  ta: {
    // App Header & Meta
    pageTitle: 'TVS பீடி கம்பெனி - உள் நிர்வாக தளம்',
    companyName: 'TVS பீடி கம்பெனி',
    companyTagline: 'உள் நிர்வாக தளம்',
    switchLang: 'English',
    liveStatus: 'இயங்குகிறது',
    langSwitched: 'மொழி தமிழுக்கு மாற்றப்பட்டது',
    themeDark: '🌙 இரவு',
    themeLight: '☀️ பகல்',

    // Navigation Tabs
    navDashboard: 'முகப்பு',
    navProduction: 'உற்பத்தி',
    navStock: 'இருப்பு',
    navExpenses: 'செலவுகள்',
    navExport: 'ஏற்றுமதி',
    navReports: 'ஏற்றுமதி',
    navChat: 'AI உதவியாளர்',
    navSettings: 'அமைப்புகள்',

    // Dashboard Section
    todayTitle: 'இன்றைய நிலவரம்',
    todaySub: 'இன்றைய நேரடி உற்பத்தி & நிதி விவரங்கள்',
    todayBeedis: 'இன்று உற்பத்தி செய்த பீடிகள்',
    todayCuts: 'இன்று உற்பத்தி செய்த கட்டுகள்',
    todayTobacco: 'பயன்படுத்திய புகையிலை (Tobacco)',
    todayPowder: 'தூள் பயன்பாடு',
    todaySalary: 'இன்றைய சம்பளம் (Salary)',
    todayRate: 'இன்றைய Rate மதிப்பு',
    todayExpenses: 'இன்றைய செலவுகள்',
    todayProfit: 'இன்றைய நிகர லாபம் (Profit)',
    profitFormula: 'Rate மதிப்பு − சம்பளம் − செலவுகள் = லாபம்',
    monthlyOverviewTitle: 'இந்த மாத நிலவரம்',

    // Period Toggles & Graphs
    dashDayWise: 'இன்று (Day-wise)',
    dashWeekWise: 'இந்த வாரம் (Weekly)',
    dashMonthWise: 'இந்த மாதம் (Monthly)',
    chartProdTrendTitle: 'உற்பத்தி போக்கு (Production Trend)',
    chartFinanceTitle: 'நிதி & லாப ஒப்பீடு (Rate vs Salary vs Profit)',
    chartMaterialTitle: 'பொருட்கள் பயன்பாடு & இருப்பு (Material & Stock)',
    dashBreakdownTitle: 'காலக்கட்ட சுருக்க அறிக்கை (Period Summary Report)',
    dashBreakdownSub: 'தேதி வாரியான உற்பத்தி, Rate, கூலி, செலவு மற்றும் லாப நிலவரம்',
    chartCuts: 'கட்டுகள்',
    chartBeedis: 'பீடிகள்',
    chartRate: 'Rate மதிப்பு (₹)',
    chartSalary: 'தொழிலாளர் கூலி (₹)',
    chartNetProfit: 'நிகர லாபம் (₹)',
    chartTobaccoUsed: 'பயன்படுத்திய புகையிலை (kg)',
    chartPowderUsed: 'பயன்படுத்திய தூள் (kg)',
    chartTobaccoStock: 'மீதமுள்ள புகையிலை (kg)',
    chartPowderStock: 'மீதமுள்ள தூள் (kg)',

    // Comparative Analytics
    dashComparisonTitle: 'காலக்கட்ட ஒப்பீடு & வளர்ச்சி பகுப்பாய்வு',
    dashComparisonSub: 'முந்தைய காலக்கட்டத்துடன் நேரடி ஒப்பீடு (Previous Period Comparison)',
    compFilterDay: 'நாள் (நேற்று)',
    compFilterWeek: 'வாரம் (கடந்த வாரம்)',
    compFilterMonth: 'மாதம் (கடந்த மாதம்)',
    compTagDay: 'இன்று vs நேற்று (Today vs Yesterday)',
    compTagWeek: 'இந்த வாரம் vs கடந்த வாரம் (Week vs Prev Week)',
    compTagMonth: 'இந்த மாதம் vs கடந்த மாதம் (Month vs Prev Month)',
    compCurDay: 'இன்று (Today)',
    compPrevDay: 'நேற்று (Yesterday)',
    compCurWeek: 'இந்த வாரம் (This Week)',
    compPrevWeek: 'கடந்த வாரம் (Last Week)',
    compCurMonth: 'இந்த மாதம் (This Month)',
    compPrevMonth: 'கடந்த மாதம் (Last Month)',
    compSubDay: 'இன்றைய தினத்திற்கும் நேற்றைய தினத்திற்கும் நேரடி ஒப்பீடு (Today vs Yesterday Direct Comparison)',
    compSubWeek: 'இந்த வாரத்திற்கும் கடந்த வாரத்திற்கும் நேரடி ஒப்பீடு (This Week vs Previous Week Direct Comparison)',
    compSubMonth: 'இந்த மாதத்திற்கும் கடந்த மாதத்திற்கும் நேரடி ஒப்பீடு (This Month vs Previous Month Direct Comparison)',
    vsYesterday: 'vs நேற்று (Yesterday)',
    vsLastWeek: 'vs கடந்த வாரம் (Last Week)',
    vsLastMonth: 'vs கடந்த மாதம் (Last Month)',
    currentPeriodTitle: 'தற்போதைய காலம்',
    previousPeriodTitle: 'முந்தைய காலம்',
    growthRate: 'வளர்ச்சி விகிதம்',
    deltaChange: 'வித்தியாசம் (Delta)',
    compThisWeekCuts: 'இந்த வாரம் கட்டுகள்',
    compLastWeekCuts: 'கடந்த வாரம் கட்டுகள்',
    compThisWeekBeedis: 'இந்த வாரம் பீடிகள்',
    compLastWeekBeedis: 'கடந்த வாரம் பீடிகள்',
    compHigher: 'அதிகம்',
    compLower: 'குறைவு',
    compEqual: 'மாற்றமில்லை',

    // Stock Status & Consumption Reporting
    stockTitle: 'தற்போதைய இருப்பு நிலவரம் (Current Stock Status)',
    stockReportingNote: 'சரக்கு அளவு உற்பத்தி பயன்பாடு மற்றும் இருப்பு கண்காணிப்பிற்கு (Reporting) மட்டுமே. நிதி மற்றும் லாபக் கணக்கீடுகளுடன் கலக்கப்படவில்லை.',
    tobaccoStock: 'Tobacco கையிருப்பு',
    powderStock: 'தூள் கையிருப்பு',
    consumedReportTitle: 'மூலப்பொருள் பயன்பாட்டு அறிக்கை (Consumption Reporting)',
    consumedTodayLabel: 'இன்று பயன்படுத்திய அளவு',
    consumedWeekLabel: 'இந்த வாரம் பயன்படுத்திய அளவு',
    consumedMonthLabel: 'இந்த மாதம் பயன்படுத்திய அளவு',
    lowStockAlert: '⚠️ இருப்பு குறைவாக உள்ளது! உடனடியாக சரக்கு சேர்க்கவும்.',
    stockHealthy: '✅ இருப்பு போதுமான அளவில் உள்ளது.',

    // Weekly & Monthly Executive Summaries
    weeklyOverviewTitle: 'இந்த வார நிலவரம் (Weekly Wise Overview)',
    weeklyOverviewSub: 'கடந்த 7 நாட்கள் vs முந்தைய 7 நாட்கள் ஒப்பீடு',
    weekProduction: 'வார மொத்த பீடிகள்',
    weekCuts: 'வார மொத்த கட்டுகள்',
    weekSalary: 'வார சம்பளம்',
    weekRate: 'வார Rate மதிப்பு',
    weekExpenses: 'வார செலவுகள்',
    weekProfit: 'வார நிகர லாபம்',
    viewWeeklyDetails: 'வாராந்திர விவரம்',

    monthlyOverviewTitle: 'இந்த மாத நிலவரம் (Monthly Wise Overview)',
    monthlyOverviewSub: 'நடப்பு மாதம் vs முந்தைய மாதம் ஒப்பீடு',
    monthlyTitle: 'இந்த மாத நிலவரம்',
    monthProduction: 'மாத மொத்த உற்பத்தி',
    monthCuts: 'மாத கட்டுகள்',
    monthSalary: 'மாத சம்பளம்',
    monthRate: 'மாத Rate மதிப்பு',
    monthExpenses: 'மாத செலவுகள்',
    monthProfit: 'மாத நிகர லாபம்',
    viewMonthlyDetails: 'மாதாந்திர விவரம்',

    // Quick Actions & Buttons
    quickActions: 'விரைவு செயல்பாடுகள்',
    quickAddProd: 'உற்பத்தி சேர்',
    quickAddExp: 'செலவு சேர்',
    quickAddStock: 'சரக்கு சேர்',
    quickAddExport: 'ஏற்றுமதி சேர்',
    quickOpenChat: 'AI உதவியாளர்',
    detailsBtn: 'விவரம்',
    reportBtn: 'அறிக்கை',
    filterBtn: 'தேடு (Filter)',
    exportCSVBtn: '📥 CSV பதிவிறக்கம்',
    addTobaccoBtn: 'Tobacco சேர்க்க',
    addPowderBtn: 'தூள் சேர்க்க',
    saveBtn: 'சேமிக்கவும்',
    deleteBtn: 'நீக்கு',
    editBtn: 'திருத்து',
    cancelBtn: 'ரத்து',

    // Production Section
    prodTitle: 'உற்பத்தி பதிவு (Production Entry)',
    prodSub: 'கட்டை (Boxes) எண்ணிக்கை உள்ளிட்டவுடன் தானியங்கி கணக்கீடு செய்யப்படும்',
    boxesLabel: 'கட்டை எண்ணிக்கை (Number of Boxes)',
    boxesPlaceholder: 'எ.கா: 1',
    boxFormulaHint: '💡 1 கட்டை (Box) = 300 கட்டுகள் (Cuts) = 6,000 பீடிகள் (300 × 20)',
    cutsLabel: 'கட்டு எண்ணிக்கை (Number of Cuts)',
    dateLabel: 'தேதி (Date)',
    calcPreviewTitle: 'கணக்கீடு முன்னோட்டம் (Live Calculation):',
    boxesDisplay: 'கட்டை (Boxes)',
    cutsDisplay: 'கட்டுகள் (Cuts)',
    beedisDisplay: 'மொத்த பீடிகள்',
    tobaccoDisplay: 'தேவைப்படும் Tobacco',
    powderDisplay: 'தூள் தேவை',
    salaryDisplay: 'தொழிலாளர் சம்பளம்',
    rateDisplay: 'Rate மதிப்பு',
    grossMarginDisplay: 'மொத்த வித்தியாசம் (Rate − Salary)',
    saveProductionBtn: 'உற்பத்தியைச் சேர்க்கவும்',
    updateProductionBtn: 'உற்பத்தியை மாற்றியமைக்கவும் (Update)',
    cancelEditBtn: 'திருத்துவதை ரத்துசெய்',
    duplicateDateWarning: '⚠️ இந்த தேதியில் ஏற்கனவே உற்பத்தி பதிவு உள்ளது!',
    duplicateDatePrompt: 'ஒரே தேதியில் நகல் (Duplicate) பதிவு அனுமதிக்கப்படாது. ஏற்கனவே உள்ள பதிவைத் திருத்த விரும்புகிறீர்களா?',
    editExistingBtn: '✏️ இந்த பதிவைத் திருத்து (Edit)',
    editModeActive: '✏️ உற்பத்தி திருத்தம் செய்யப்படுகிறது (Edit Mode Active)',
    duplicateFoundRedirecting: 'இந்த தேதியில் ஏற்கனவே பதிவு உள்ளது! திருத்த முறைக்கு மாற்றப்படுகிறது...',
    duplicateErrorToast: 'இந்த தேதியில் ஏற்கனவே உற்பத்தி பதிவு உள்ளது. நகல் பதிவு அனுமதிக்கப்படாது!',
    successUpdated: 'உற்பத்தி பதிவு வெற்றிகரமாக மாற்றியமைக்கப்பட்டது!',
    recentProductionTitle: 'சமீபத்திய உற்பத்தி பதிவுகள்',
    todayBoxes: 'இன்று கட்டை (Boxes)',
    weekBoxes: 'இந்த வார கட்டை (Boxes)',
    monthBoxes: 'இந்த மாத கட்டை (Boxes)',
    unitBoxes: 'கட்டை',
    unitCuts: 'கட்டுகள்',
    ratioBeedisPerBox: '1 கட்டை = 6,000 பீடிகள் (300 கட்டுகள் × 20)',

    // Stock Section
    stockManagementTitle: 'சரக்கு மேலாண்மை',
    stockSub: 'புகையிலை மற்றும் தூள் இருப்புகளை பாதுகாப்பாக நிர்வகிக்கவும்',
    addStockBtn: 'சரக்கு சேர்க்க (Add Stock)',
    adjustStockBtn: 'இருப்பு திருத்தம்',
    stockReportingTitle: 'சரக்கு இருப்பு & பயன்பாட்டு அறிக்கை',
    stockReportingNote: 'சரக்கு என்பது கையிருப்பு மற்றும் உற்பத்தியில் பயன்படுத்தப்பட்ட அளவுகளை (Report) கண்காணிக்க மட்டுமே. இது Rate மதிப்பு, தொழிலாளர் கூலி, செலவு அல்லது நிகர லாபக் கணக்கீடுகளில் எந்தவிதத்திலும் சேர்க்கப்படாது.',
    consumedReportTitle: 'மூலப்பொருட்கள் பயன்பாட்டு அறிக்கை (Material Consumption Report)',
    consumedReportDesc: 'பீடி உற்பத்தியில் பயன்படுத்தப்பட்ட புகையிலை (Tobacco) மற்றும் தூள் அளவுகள் (அறிக்கைக்கு மட்டும்)',
    reportingOnlyBadge: 'அறிக்கைக்கு மட்டும் (Reporting Only)',
    consumedTodayLabel: 'இன்று பயன்பாடு',
    consumedWeekLabel: 'இந்த வாரம் பயன்பாடு',
    consumedMonthLabel: 'இந்த மாதம் பயன்பாடு',
    consumedTotalLabel: 'இதுவரை மொத்த பயன்பாடு',
    stockTobaccoConsumedSub: 'இன்று உற்பத்தி பயன்பாடு',
    stockPowderConsumedSub: 'இன்று உற்பத்தி பயன்பாடு',
    stockInHandLabel: 'கையிருப்பு அளவு',
    bagCalcTitle: 'Tobacco Bag கணக்கீட்டுக் கருவி',
    bagCalcDesc: '35 கிலோவில் 2 கிலோ கழிவு போக 600g கொண்ட 55 பைகள் கணக்கீடு',
    calcBagsBtn: 'பைகளைக் கணக்கிடு',
    totalTobaccoInput: 'Tobacco அளவு (கிலோ / kg)',
    wastageInput: 'சராசரி கழிவு (கிலோ / kg)',
    bagSizeInput: 'ஒரு Bag எடை (கிராம் / g)',
    calcResultUsable: 'பயன்பாட்டு அளவு:',
    calcResultBags: 'கிடைக்கும் மொத்த பைகள்:',
    movementsTitle: 'சரக்கு பரிவர்த்தனை வரலாறு (Movements Ledger)',
    cardTobaccoTitle: '🍃 Tobacco (புகையிலை)',
    cardPowderTitle: '✨ தூள் (Tobacco Powder)',

    // Expenses Section
    expensesTitle: 'செலவுகள் மேலாண்மை',
    expensesSub: 'மின்சாரம், போக்குவரத்து, கூலி மற்றும் இதர செலவுகள்',
    addExpenseBtn: 'செலவைச் சேர்க்கவும்',
    amountLabel: 'தொகை (Amount ₹)',
    categoryLabel: 'செலவு வகை (Category)',
    paymentMethodLabel: 'செலுத்தும் முறை (Payment Method)',
    descriptionLabel: 'விவரம் (Description)',
    allCategories: 'அனைத்து பிரிவுகள்',
    catElectricity: '⚡ மின்சாரம்',
    catTransport: '🚚 போக்குவரத்து',
    catLabour: '👷 கூலி',
    catRent: '🏢 வாடகை',
    catPackaging: '📦 பேக்கிங்',
    catMaintenance: '🛠️ பராமரிப்பு',
    catOther: '📝 இதர',
    payCash: 'ரொக்கம் (Cash)',
    payUPI: 'UPI / GPay / PhonePe',
    payBank: 'வங்கி பரிமாற்றம் (Bank)',
    payOther: 'மற்றவை (Other)',
    recentExpensesTitle: 'செலவு பதிவுகள்',

    // Export (Company Dispatch) Section
    exportTitle: 'கம்பெனி ஏற்றுமதி பதிவு (Company Export & Dispatch)',
    exportSub: 'கம்பெனிக்கு பேக்கிங் செய்து அனுப்பப்படும் கட்டை (Boxes) மற்றும் நிதி விவரங்கள்',
    exportBoxesLabel: 'ஏற்றுமதி கட்டை எண்ணிக்கை (Boxes Exported)',
    exportBoxesPlaceholder: 'எ.கா: 1',
    exportDateLabel: 'ஏற்றுமதி தேதி (Export Date)',
    companyNameLabel: 'கம்பெனி / கிளை பெயர் (Company / Depot)',
    vehicleNoLabel: 'வண்டி எண் (Vehicle No)',
    challanNoLabel: 'DC / சலான் எண் (Challan / DC No)',
    saveExportBtn: 'ஏற்றுமதியைப் பதிவு செய்',
    updateExportBtn: 'ஏற்றுமதியை மாற்றியமைக்கவும் (Update)',
    duplicateExportWarning: '⚠️ இந்த தேதியில் ஏற்கனவே ஏற்றுமதி பதிவு உள்ளது!',
    duplicateExportPrompt: 'ஒரே தேதியில் நகல் ஏற்றுமதி பதிவு அனுமதிக்கப்படாது. ஏற்கனவே உள்ள பதிவைத் திருத்த விரும்புகிறீர்களா?',
    editExportBtn: '✏️ இந்த பதிவைத் திருத்து (Edit)',
    editExportModeActive: '✏️ ஏற்றுமதி பதிவு திருத்தம் செய்யப்படுகிறது (Edit Mode Active)',
    successExportSaved: 'ஏற்றுமதி பதிவு வெற்றிகரமாக சேர்க்கப்பட்டது!',
    successExportUpdated: 'ஏற்றுமதி பதிவு வெற்றிகரமாக மாற்றியமைக்கப்பட்டது!',
    successExportDeleted: 'ஏற்றுமதி பதிவு நீக்கப்பட்டது!',
    totalExportBoxes: 'மொத்த ஏற்றுமதி கட்டை',
    totalExportCuts: 'மொத்த ஏற்றுமதி கட்டுகள்',
    totalExportBeedis: 'மொத்த ஏற்றுமதி பீடிகள்',
    totalExportRate: 'மொத்த ஏற்றுமதி மதிப்பு (Rate Value)',
    totalExportSalary: 'மொத்த சம்பள மதிப்பு (Salary Value)',
    totalExportProfit: 'மொத்த வித்தியாசம் (Margin)',
    todayExportBoxes: 'இன்றைய ஏற்றுமதி கட்டை',
    packedStockInHand: 'கையிருப்பு பேக்கிங் கட்டை (Packed Stock in Hand)',
    stockLimitBadge: 'கையிருப்பு',
    errorExcessExport: 'ஏற்றுமதி கட்டை எண்ணிக்கை கையிருப்பு பேக்கிங் கட்டை அளவை விட அதிகமாக இருக்கக்கூடாது!',
    recentExportsTitle: 'சமீபத்திய கம்பெனி ஏற்றுமதி பதிவுகள் (Recent Export Dispatches)',
    colCompany: 'கம்பெனி',
    colChallan: 'DC / வண்டி எண்',
    filterLabel: 'கால அளவு தேர்வு:',
    filterToday: 'இன்று',
    filterYesterday: 'நேற்று',
    filterWeek: 'இந்த வாரம்',
    filterMonth: 'இந்த மாதம்',
    filterAll: 'அனைத்தும்',
    totalRateLabel: 'மொத்த Rate மதிப்பு:',
    totalSalaryLabel: 'மொத்த சம்பளம்:',
    totalExpenseLabel: 'மொத்த செலவுகள்:',
    netProfitLabel: 'நிகர லாபம் (Net Profit):',
    repSelectedTitle: 'தேர்ந்தெடுக்கப்பட்ட காலக்கட்ட உற்பத்தி பதிவுகள்',

    // Chat Assistant Section
    chatTitle: 'தமிழ் உரையாடல் உதவியாளர்',
    chatSub: 'இயல்பான தமிழ் மற்றும் Tanglish உரையாடல் மூலம் கணக்கீடு செய்து நிர்வகிக்கவும்',
    chatPlaceholder: 'கேள்வி அல்லது கட்டளை தட்டச்சு செய்யவும்...',
    chatSendBtn: 'அனுப்பு',
    chatMicBtn: 'குரல் உள்ளீடு (Tamil Speech)',
    listeningText: 'கேட்கிறது... தமிழில் பேசவும்',
    quickPromptsTitle: 'உடனடி கேள்விகள் (Quick Suggestions):',
    chatGreetingHtml: 'வணக்கம்! நான் TVS பீடி கம்பெனியின் உள் நிர்வாக AI உதவியாளர். <br><br>நீங்கள் என்னிடம் தமிழ், Tanglish அல்லது English-ல் கேள்விகள் கேட்கலாம் மற்றும் கட்டளைகள் கொடுக்கலாம்.<br><br>💡 <em>எ.கா: "இன்று 100 கட்டு production add பண்ணு" அல்லது "இப்போ தூள் stock எவ்வளவு?"</em>',

    // Settings Section
    settingsTitle: 'கம்பெனி அமைப்புகள்',
    settingsSub: 'கட்டை, கட்டு விகிதங்கள், புகையிலை பயன்பாட்டு அளவுகள் மற்றும் கூலி மாற்றங்கள்',
    beedisPerBoxSetting: '1 கட்டைக்கு பீடிகள் (Beedis per Box)',
    cutsPerBoxSetting: '1 கட்டைக்கு கட்டுகள் (Cuts per Box)',
    beedisPerCutSetting: '1 கட்டுக்கு பீடிகள் (Beedis per Cut)',
    tobaccoPer1000Setting: '1,000 பீடிக்கு Tobacco (கிராம்கள் / Grams)',
    powderPer1000Setting: '1,000 பீடிக்கு தூள் (கிராம்கள் / Grams)',
    salaryPer1000Setting: '1,000 பீடிக்கு சம்பளம் (₹ Salary per 1,000)',
    ratePer1000Setting: '1,000 பீடிக்கு Rate மதிப்பு (₹ Rate per 1,000)',
    avgWastageSetting: 'சராசரி கழிவு (Average Wastage in kg)',
    bagSizeSetting: 'ஒரு Bag அளவு (Bag Size in Grams)',
    lowStockSetting: 'குறைந்த இருப்பு எச்சரிக்கை அளவு (Low Stock Alert in kg)',
    saveSettingsBtn: 'அமைப்புகளைச் சேமிக்கவும்',

    // Stock Modal
    modalAddTitle: 'சரக்கு சேர்க்க (Add Stock)',
    modalAdjustTitle: 'இருப்பு திருத்தம் (Adjust Balance)',
    editMovementTitle: 'சரக்கு பதிவு திருத்துதல்',
    quantityKgLabel: 'அளவு (கிலோ / kg)',
    modalItemLabel: 'பொருள் (Item)',
    modalKgLabelAdd: 'சேர்க்க வேண்டிய அளவு (கிலோ / kg)',
    modalKgLabelAdjust: 'புதிய மொத்த இருப்பு அளவு (கிலோ / kg)',
    modalNotesLabel: 'குறிப்புகள் / விவரம் (Notes / Details)',
    modalVarietyLabel: 'வகை / பிராண்டு (Type / Variety):',
    modalLeafTypeLabel: 'இலை வகை (Type of Leaves)',
    leafTypePlaceholder: 'எ.கா: SONA, A1',
    kgPlaceholder: 'எ.கா: 10',
    powderTypeLabel: 'தூள் வகை / விவரம் (Powder Variety)',
    powderTypePlaceholder: 'எ.கா: Grade A, Fine',
    vendorPlaceholder: 'எ.கா: SONA, A1',
    modalItemTobacco: 'Tobacco (புகையிலை)',
    modalItemPowder: 'தூள் (Tobacco Powder)',
    deleteMovementConfirm: 'இந்த சரக்கு பதிவை நீக்க உறுதி செய்கிறீர்களா? (இருப்பு அளவு தானாக மீட்டமைக்கப்படும்)',

    // Common Table & UI
    colDate: 'தேதி',
    colBoxes: 'கட்டை (Boxes)',
    colCuts: 'கட்டுகள்',
    colBeedis: 'பீடிகள்',
    colTobacco: 'Tobacco',
    colPowder: 'தூள்',
    colSalary: 'சம்பளம்',
    colRate: 'Rate',
    colNotes: 'இலை வகை / குறிப்பு',
    colActions: 'செயல்',
    colExpenses: 'செலவுகள்',
    colProfit: 'லாபம்',
    colAmount: 'தொகை',
    colCategory: 'வகை',
    colPayment: 'பணம் செலுத்துகை',
    colType: 'வகை',
    colQuantity: 'அளவு',
    colBalance: 'மீதமுள்ள இருப்பு',
    colItem: 'பொருள்',
    colDesc: 'விவரம்',
    noData: 'பதிவுகள் இல்லை',
    loading: 'ஏற்றப்படுகிறது...',
    deleteConfirm: 'இதை நீக்க உறுதி செய்கிறீர்களா?',
    successSaved: 'வெற்றிகரமாக சேமிக்கப்பட்டது!',
    successDeleted: 'வெற்றிகரமாக நீக்கப்பட்டது!',
    errorOccurred: 'பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',

    // Units & Ratios
    unitBeedis: 'பீடிகள்',
    unitCuts: 'கட்டுகள்',
    unitGrams: 'கிராம்',
    unitBags: 'பைகள்',
    expensesCount: 'செலவு பதிவுகள்',
    ratioTobacco: '600g / 1,000 பீடி',
    ratioPowder: '200g / 1,000 பீடி',
    ratioRate: '₹340 / 1,000 பீடி',
    ratioSalary: '₹320 / 1,000 பீடி',
    ratioBeedisPerCut: '1 கட்டு = 20 பீடிகள்',
    stockWastageInfo: 'கழிவு 2kg போக: 55 Bags (600g)',
    autoPowderDeduct: '1,000 பீடிக்கு 200g தானாகக் கழியும்',

    // Movement Types
    typeInitial: 'துவக்க இருப்பு',
    typeAdded: 'சரக்கு வரவு',
    typeProdUsage: 'உற்பத்தி பயன்பாடு',
    typeAdjustment: 'இருப்பு திருத்தம்',
    typeWastage: 'கழிவு',

    // Form & Common UI Keys
    chatInputPlaceholder: 'தமிழில் கேட்கவும் அல்லது உள்ளிடவும்...',
    selectCategoryLabel: 'செலவு வகை (Category)',
    catSalary: 'கூலி / சம்பளம்',
    catTea: 'டீ & உணவு',
    catCurrent: 'மின்சாரம்',
    prodDateLabel: 'தேதி (Date)',
    amountPlaceholder: 'எ.கா: 500',
    descLabel: 'விவரம் (Description)',
    descPlaceholder: 'விருப்பத்தேர்வு (Optional)',
    saveExpenseBtn: 'செலவைச் சேமிக்கவும்',
    expensesHistoryTitle: 'செலவு பதிவுகள் வரலாறு',
    colPaymentMethod: 'முறை',
    colDescription: 'விவரம்',

    // Export Page Keys
    exportMainTitle: 'கம்பெனி ஏற்றுமதி (Export & Dispatch)',
    todayExport: 'இன்றைய ஏற்றுமதி',
    totalExportBoxes: 'மொத்த ஏற்றுமதி கட்டை',
    totalExportRate: 'மொத்த Rate மதிப்பு',
    packedStockInHand: 'கையிருப்பிலுள்ள கட்டைகள்',
    newExportTitle: 'புதிய ஏற்றுமதி பதிவு (Dispatch Entry)',
    stockAvailableLabel: 'கையிருப்பு:',
    unitBoxes: 'Boxes',
    duplicateExportWarning: '⚠️ இந்த தேதியில் ஏற்கனவே ஏற்றுமதி பதிவு உள்ளது!',
    calcBoxes: 'கட்டை (Boxes)',
    calcCuts: 'கட்டுகள் (Cuts)',
    calcBeedis: 'பீடிகள் (Beedis)',
    calcRate: 'Rate மதிப்பு (₹2,040/Bx)',
    calcSalary: 'கூலி மதிப்பு (₹1,920/Bx)',
    calcMargin: 'வித்தியாசம் (₹120/Bx)',
    calcProfit: 'லாபம் (Rate − கூலி) (₹120/Bx)',
    colProfit: 'லாபம் (Profit)',
    exportHistoryTitle: 'ஏற்றுமதி பதிவுகள் வரலாறு (Dispatch Ledger)',

    // Dashboard & Production Keys
    expensesDisplay: 'செலவுகள்',
    netProfitDisplay: 'நிகர லாபம்',
    prodBoxesLabel: 'கட்டை எண்ணிக்கை (Boxes)',
    calcTobacco: 'Tobacco பயன்பாடு',
    calcPowder: 'தூள் பயன்பாடு',
    prodHistoryTitle: 'உற்பத்தி பதிவுகள் வரலாறு',

    // Settings Keys
    boxSettingsSection: 'கட்டை & கட்டு மாற்றங்கள் (Box Multipliers)',
    ratesSettingsSection: 'மூலப்பொருள் & கூலி விகிதங்கள் (1,000 பீடிக்கு)',
    thresholdsSettingsSection: 'கையிருப்பு & பை அளவு எச்சரிக்கைகள்',

    // Stock & Consumption Reporting Keys
    consumptionReportingTitle: 'பொருட்கள் பயன்பாடு அறிக்கை (Consumption Matrix)',
    consumptionReportingSub: 'உற்பத்திக்கு நுகரப்பட்ட மூலப்பொருட்களின் விரிவான அறிக்கை',
    reportToday: 'இன்று (Today)',
    reportWeek: 'இந்த வாரம் (This Week)',
    reportMonth: 'இந்த மாதம் (This Month)',
    reportTotal: 'மொத்த பயன்பாடு (All Time)',
    bagCalcSub: 'மொத்த புகையிலையிலிருந்து கழிவு கழித்து எத்தனை பைகள் பிரிக்கலாம் என்ற உடனடி கணக்கீடு',
    bagCalcTotalLabel: 'மொத்த எடை (Total Weight in kg)',
    bagCalcWastageLabel: 'சராசரி கழிவு (Average Wastage in kg)',
    bagCalcBagSizeLabel: 'ஒரு பை அளவு (Bag Size in Grams)',
    bagCalcResultTitle: 'பிரிக்கக்கூடிய பைகள்',
    colMovementType: 'வகை',
    colQty: 'அளவு',
    colBalanceAfter: 'மீதமிருந்த இருப்பு',
    labelPowder: 'தூள்:',
    labelProduction: 'உற்பத்தி:',

    // Monthly Stock Report Keys
    monthlyStockReportTitle: 'உள்வரும் சரக்கு அறிக்கை (Incoming Stock Report)',
    monthlyStockReportSub: 'பொருட்கள் வாரியாக (இலை / தூள்) மற்றும் தேதி வாரியாக உள்வரும் சரக்கு விவரங்கள் மற்றும் படம் (Image) பதிவிறக்கம்',
    reportMonthLabel: 'அறிக்கை மாதம் (Month):',
    reportFilterFromLabel: 'முதல் (From):',
    reportFilterToLabel: 'வரை (To):',
    filterMaterialLabel: 'பொருள் (Material):',
    filterAllMaterials: 'அனைத்தும் (All - Leaf & Powder)',
    filterLeafOnly: 'புகையிலை / Leaf (Tobacco)',
    filterPowderOnly: 'தூள் / Powder',
    snapFilterLabel: 'தேர்வு (Filter):',
    snapEntriesCountLabel: 'உள்வரும் பதிவுகள் (Entries):',
    snapTobaccoIncomingLabel: 'Leaf வரவு (Tobacco):',
    snapPowderIncomingLabel: 'Powder வரவு (தூள்):',
    snapTotalIncomingLabel: 'மொத்த வரவு (Total Incoming):',
    btnFilterReport: 'வடிகட்டு',
    presetThisMonth: 'இந்த மாதம்',
    presetLastMonth: 'கடந்த மாதம்',
    presetLast3Months: 'கடந்த 3 மாதங்கள்',
    presetThisYear: 'இந்த வருடம்',
    monthlyWiseSumTitle: 'மாதவாரியான சரக்கு கூட்டு விவரம் (Monthly-Wise Stock Sum)',
    followingMovementsTitle: 'சரக்கு இயக்க முழு விவரம் (Detailed Movements Ledger)',
    colMonthYear: 'மாதம் (Month)',
    colTobaccoOpening: 'துவக்கம்',
    colTobaccoAdded: 'வரவு (+)',
    colTobaccoUsed: 'பயன்பாடு (−)',
    colTobaccoClosing: 'கையிருப்பு',
    colPackableBags: '600g பைகள்',
    colPowderOpening: 'துவக்கம்',
    colPowderAdded: 'வரவு (+)',
    colPowderUsed: 'பயன்பாடு (−)',
    colPowderClosing: 'கையிருப்பு',
    colProducedBoxes: 'கட்டை (Boxes)',
    colTotalSum: 'மொத்தம் (Total / Period Sum)',
    downloadPdfBtn: 'படம் பதிவிறக்கு',
    downloadImageBtn: 'படம் பதிவிறக்கு',
    prodReportTitle: 'உற்பத்தி அறிக்கை & வடிகட்டி (Production Report & Filter)',
    prodReportSub: 'தேதி வரம்பின்படி வடிகட்டப்பட்ட உற்பத்தி பதிவுகள், மாதவாரியான கூட்டு மற்றும் PDF பதிவிறக்கம்',
    completeTotal: 'முழு மொத்தம் (Complete Total)',
    totalBoxesLabel: 'மொத்த கட்டை (Total Boxes)',
    totalCutsLabel: 'மொத்த கட்டுகள் (Total Cuts)',
    totalBeedisLabel: 'மொத்த பீடிகள் (Total Beedis)',
    dateOrderError: 'தொடக்க தேதி முடிவு தேதியை விட அதிகமாக இருக்கக்கூடாது (From Date cannot be later than To Date).',
    noProdRecordsFound: 'தேர்ந்தெடுக்கப்பட்ட காலக்கட்டத்தில் உற்பத்தி பதிவுகள் எதுவும் இல்லை.',
    previewReportBtn: 'முன்னோட்டம்',
    printReportBtn: 'அச்சிடு',
    reportGenerating: 'அறிக்கை படம் தயாராகிறது...',
    reportDownloaded: 'அறிக்கை படம் வெற்றிகரமாக பதிவிறக்கப்பட்டது!',
    chartDayFilter: 'நாள்',
    chartWeekFilter: 'வாரம்',
    chartMonthFilter: 'மாதம்',
    chartProdTrackingTitle: 'உற்பத்தி கண்காணிப்பு',
    chartProdTrackingSub: 'முந்தைய உற்பத்தி போக்கு & பகுப்பாய்வு',
    chartExportTrackingTitle: 'ஏற்றுமதி கண்காணிப்பு',
    chartExportTrackingSub: 'முந்தைய ஏற்றுமதி போக்கு & பகுப்பாய்வு',
    chartProfitTrackingTitle: 'நிதி & லாப கண்காணிப்பு',
    chartProfitTrackingSub: 'Rate vs சம்பளம் vs செலவுகள் vs நிகர லாபம்',
    chartBoxesLabel: 'கட்டை (Boxes)',
    chartCutsLabel: 'கட்டுகள் (Cuts)',
    chartBeedisLabel: 'பீடிகள்',
    chartRateLabel: 'Rate மதிப்பு (₹)',
    chartSalaryLabel: 'சம்பளம் (₹)',
    chartExpensesLabel: 'செலவுகள் (₹)',
    chartNetProfitLabel: 'நிகர லாபம் (₹)',
    chartExportBoxesLabel: 'ஏற்றுமதி கட்டை (Boxes)',
    chartExportMarginLabel: 'ஏற்றுமதி லாபம் (₹)'
  },

  en: {
    // App Header & Meta
    pageTitle: 'TVS Beedi Company - Management Portal',
    companyName: 'TVS Beedi Company',
    companyTagline: 'Internal Management Portal',
    switchLang: 'தமிழ்',
    liveStatus: 'Active',
    langSwitched: 'Language switched to English',
    themeDark: '🌙 Dark',
    themeLight: '☀️ Light',

    // Navigation Tabs
    navDashboard: 'Dashboard',
    navProduction: 'Production',
    navStock: 'Stock',
    navExpenses: 'Expenses',
    navExport: 'Export',
    navReports: 'Export',
    navChat: 'AI Assistant',
    navSettings: 'Settings',

    // Dashboard Section
    todayTitle: "Today's Status",
    todaySub: 'Live production, stock, and financial summary for today',
    todayBeedis: 'Beedis Produced Today',
    todayCuts: 'Cuts Produced Today',
    todayTobacco: 'Tobacco Used Today',
    todayPowder: 'Powder Used Today',
    todaySalary: "Today's Salary",
    todayRate: "Today's Rate Value",
    todayExpenses: "Today's Expenses",
    todayProfit: "Today's Net Profit",
    profitFormula: 'Rate Amount − Salary − Expenses = Profit',
    monthlyOverviewTitle: 'This Month Overview',

    // Period Toggles & Graphs
    dashDayWise: 'Today (Day-wise)',
    dashWeekWise: 'This Week (Weekly)',
    dashMonthWise: 'This Month (Monthly)',
    chartProdTrendTitle: 'Production & Output Trend',
    chartFinanceTitle: 'Financial Performance & Profit Margins',
    chartMaterialTitle: 'Material Usage & Stock Balance',
    dashBreakdownTitle: 'Period Performance Summary Report',
    dashBreakdownSub: 'Day-by-day production, rate, worker salary, expenses, and net profit',
    chartCuts: 'Cuts',
    chartBeedis: 'Total Beedis',
    chartRate: 'Rate Amount (₹)',
    chartSalary: 'Labor Salary (₹)',
    chartNetProfit: 'Net Profit (₹)',
    chartTobaccoUsed: 'Tobacco Used (kg)',
    chartPowderUsed: 'Powder Used (kg)',
    chartTobaccoStock: 'Available Tobacco (kg)',
    chartPowderStock: 'Available Powder (kg)',

    // Comparative Analytics
    dashComparisonTitle: 'Period Comparison & Growth Analytics',
    dashComparisonSub: 'Direct benchmark comparison against the previous period',
    compFilterDay: 'Day (vs Yesterday)',
    compFilterWeek: 'Week (vs Prev Week)',
    compFilterMonth: 'Month (vs Prev Month)',
    compTagDay: 'Today vs Yesterday',
    compTagWeek: 'This Week vs Previous Week',
    compTagMonth: 'This Month vs Previous Month',
    compCurDay: 'Today',
    compPrevDay: 'Yesterday',
    compCurWeek: 'This Week',
    compPrevWeek: 'Previous Week',
    compCurMonth: 'This Month',
    compPrevMonth: 'Previous Month',
    compSubDay: 'Direct benchmark comparison against yesterday',
    compSubWeek: 'Direct benchmark comparison against the previous week',
    compSubMonth: 'Direct benchmark comparison against the previous month',
    vsYesterday: 'vs Yesterday',
    vsLastWeek: 'vs Last Week',
    vsLastMonth: 'vs Last Month',
    currentPeriodTitle: 'Current Period',
    previousPeriodTitle: 'Previous Period',
    growthRate: 'Growth Rate',
    deltaChange: 'Net Difference',
    compThisWeekCuts: 'This Week Cuts',
    compLastWeekCuts: 'Last Week Cuts',
    compThisWeekBeedis: 'This Week Beedis',
    compLastWeekBeedis: 'Last Week Beedis',
    compHigher: 'higher',
    compLower: 'lower',
    compEqual: 'no change',

    // Stock Status & Consumption Reporting
    stockTitle: 'Current Stock Status',
    stockReportingNote: 'Stock is strictly for inventory tracking & consumption reporting. It does not overlap with financial or profit calculations.',
    tobaccoStock: 'Tobacco In Hand',
    powderStock: 'Tobacco Powder In Hand',
    consumedReportTitle: 'Material Consumption Reporting',
    consumedTodayLabel: 'Consumed Today',
    consumedWeekLabel: 'Consumed This Week',
    consumedMonthLabel: 'Consumed This Month',
    lowStockAlert: '⚠️ Stock is low! Please restock immediately.',
    stockHealthy: '✅ Stock levels are healthy.',

    // Weekly & Monthly Executive Summaries
    weeklyOverviewTitle: 'Weekly Wise Performance Overview',
    weeklyOverviewSub: 'Last 7 days vs prior 7 days comparison',
    weekProduction: 'Total Weekly Beedis',
    weekCuts: 'Weekly Cuts',
    weekSalary: 'Weekly Salary',
    weekRate: 'Weekly Rate Amount',
    weekExpenses: 'Weekly Expenses',
    weekProfit: 'Weekly Net Profit',
    viewWeeklyDetails: 'Weekly Details',

    monthlyOverviewTitle: 'Monthly Wise Performance Overview',
    monthlyOverviewSub: 'Current month vs previous month comparison',
    monthlyTitle: 'This Month Overview',
    monthProduction: 'Total Monthly Beedis',
    monthCuts: 'Monthly Cuts',
    monthSalary: 'Monthly Salary',
    monthRate: 'Monthly Rate Amount',
    monthExpenses: 'Monthly Expenses',
    monthProfit: 'Monthly Net Profit',
    viewMonthlyDetails: 'Monthly Details',

    // Quick Actions & Buttons
    quickActions: 'Quick Actions',
    quickAddProd: 'Add Production',
    quickAddExp: 'Add Expense',
    quickAddStock: 'Add Stock',
    quickAddExport: 'Add Export',
    quickOpenChat: 'AI Assistant',
    detailsBtn: 'Details',
    reportBtn: 'Reports',
    filterBtn: 'Filter',
    exportCSVBtn: '📥 Export CSV',
    addTobaccoBtn: 'Add Tobacco',
    addPowderBtn: 'Add Powder',
    saveBtn: 'Save',
    deleteBtn: 'Delete',
    editBtn: 'Edit',
    cancelBtn: 'Cancel',

    // Production Section
    prodTitle: 'Production Entry',
    prodSub: 'Enter number of boxes (கட்டை) for instant automatic calculation',
    boxesLabel: 'Number of Boxes (கட்டை)',
    boxesPlaceholder: 'e.g. 1',
    boxFormulaHint: '💡 1 Box (கட்டை) = 300 Cuts = 6,000 Beedis (300 × 20)',
    cutsLabel: 'Number of Cuts',
    dateLabel: 'Date',
    calcPreviewTitle: 'Live Calculation Breakdown:',
    boxesDisplay: 'Boxes (கட்டை)',
    cutsDisplay: 'Cuts',
    beedisDisplay: 'Total Beedis',
    tobaccoDisplay: 'Tobacco Required',
    powderDisplay: 'Powder Required',
    salaryDisplay: 'Labor Salary',
    rateDisplay: 'Rate Amount',
    grossMarginDisplay: 'Gross Margin (Rate − Salary)',
    saveProductionBtn: 'Save Production Entry',
    updateProductionBtn: 'Update Production',
    cancelEditBtn: 'Cancel Edit',
    duplicateDateWarning: '⚠️ A production entry already exists on this date!',
    duplicateDatePrompt: 'Duplicate entries on the same date are strictly disallowed. Would you like to edit the existing entry?',
    editExistingBtn: '✏️ Edit Existing Entry',
    editModeActive: '✏️ Editing Production Entry (Edit Mode Active)',
    duplicateFoundRedirecting: 'Entry exists for this date! Redirecting to edit mode...',
    duplicateErrorToast: 'A production record already exists for this date. Duplicates are strictly disallowed!',
    successUpdated: 'Production entry updated successfully!',
    recentProductionTitle: 'Recent Production Batches',
    todayBoxes: 'Today Boxes (கட்டை)',
    weekBoxes: 'This Week Boxes (கட்டை)',
    monthBoxes: 'This Month Boxes (கட்டை)',
    unitBoxes: 'Boxes',
    unitCuts: 'Cuts',
    ratioBeedisPerBox: '1 Box = 6,000 Beedis (300 Cuts × 20)',

    // Stock Section
    stockManagementTitle: 'Stock Management',
    stockSub: 'Accurately monitor and manage raw materials in grams and kilograms',
    addStockBtn: 'Add Stock',
    adjustStockBtn: 'Adjust Stock',
    stockReportingTitle: 'Stock Balance & Consumption Report',
    stockReportingNote: 'Stock is strictly for monitoring inventory balance and production consumption reporting. It is never overlapped into rate, salary, expense, or profit calculations.',
    consumedReportTitle: 'Raw Material Consumption Report',
    consumedReportDesc: 'Quantities of Tobacco and Powder consumed in beedi production batches (strictly for reporting)',
    reportingOnlyBadge: 'Reporting Only',
    consumedTodayLabel: 'Today Consumed',
    consumedWeekLabel: 'This Week Consumed',
    consumedMonthLabel: 'This Month Consumed',
    consumedTotalLabel: 'All-Time Consumed',
    stockTobaccoConsumedSub: 'Today Consumed',
    stockPowderConsumedSub: 'Today Consumed',
    stockInHandLabel: 'In Hand Balance',
    bagCalcTitle: 'Tobacco Bag Calculation Tool',
    bagCalcDesc: 'Calculate 600g bags from raw tobacco after deducting wastage',
    calcBagsBtn: 'Calculate Bags',
    totalTobaccoInput: 'Tobacco Quantity (kg)',
    wastageInput: 'Average Wastage (kg)',
    bagSizeInput: 'Bag Size (g)',
    calcResultUsable: 'Usable Tobacco:',
    calcResultBags: 'Total Usable Bags:',
    movementsTitle: 'Stock Movements Ledger',
    cardTobaccoTitle: '🍃 Tobacco (Raw Leaves)',
    cardPowderTitle: '✨ Tobacco Powder (தூள்)',

    // Expenses Section
    expensesTitle: 'Expense Tracking',
    expensesSub: 'Track electricity, transport, labor, packaging, and miscellaneous expenses',
    addExpenseBtn: 'Add Expense Entry',
    amountLabel: 'Amount (₹)',
    categoryLabel: 'Category',
    paymentMethodLabel: 'Payment Method',
    descriptionLabel: 'Description / Bill Ref',
    allCategories: 'All Categories',
    catElectricity: '⚡ Electricity',
    catTransport: '🚚 Transport',
    catLabour: '👷 Labour',
    catRent: '🏢 Rent',
    catPackaging: '📦 Packaging',
    catMaintenance: '🛠️ Maintenance',
    catOther: '📝 Other',
    payCash: 'Cash',
    payUPI: 'UPI / GPay / PhonePe',
    payBank: 'Bank Transfer',
    payOther: 'Other',
    recentExpensesTitle: 'Expense Records',

    // Export (Company Dispatch) Section
    exportTitle: 'Company Export & Dispatch',
    exportSub: 'Finished boxes packed and dispatched to company with billing and margin breakdown',
    exportBoxesLabel: 'Exported Boxes Count (கட்டை)',
    exportBoxesPlaceholder: 'e.g. 1',
    exportDateLabel: 'Export Date',
    companyNameLabel: 'Company / Depot Name',
    vehicleNoLabel: 'Vehicle No',
    challanNoLabel: 'Challan / DC No',
    saveExportBtn: 'Record Export Dispatch',
    updateExportBtn: 'Update Export Dispatch',
    duplicateExportWarning: '⚠️ An export dispatch entry already exists for this date!',
    duplicateExportPrompt: 'Duplicate export entries on the same date are strictly disallowed. Would you like to edit the existing entry?',
    editExportBtn: '✏️ Edit This Entry',
    editExportModeActive: '✏️ Editing Export Dispatch Entry (Edit Mode Active)',
    successExportSaved: 'Export dispatch recorded successfully!',
    successExportUpdated: 'Export dispatch updated successfully!',
    successExportDeleted: 'Export dispatch deleted successfully!',
    totalExportBoxes: 'Total Exported Boxes',
    totalExportCuts: 'Total Exported Cuts',
    totalExportBeedis: 'Total Exported Beedis',
    totalExportRate: 'Total Export Billing Value',
    totalExportSalary: 'Total Labor Salary Equivalent',
    totalExportProfit: 'Total Gross Margin',
    todayExportBoxes: "Today's Exported Boxes",
    packedStockInHand: 'Packed Stock in Hand',
    stockLimitBadge: 'Stock In Hand',
    errorExcessExport: 'Exported boxes cannot exceed packed stock in hand!',
    recentExportsTitle: 'Recent Company Export Dispatches',
    colCompany: 'Company',
    colChallan: 'DC / Vehicle',
    filterLabel: 'Select Date Range:',
    filterToday: 'Today',
    filterYesterday: 'Yesterday',
    filterWeek: 'This Week',
    filterMonth: 'This Month',
    filterAll: 'All Time',
    totalRateLabel: 'Total Rate Value:',
    totalSalaryLabel: 'Total Salary:',
    totalExpenseLabel: 'Total Expenses:',
    netProfitLabel: 'Net Profit:',
    repSelectedTitle: 'Production Records for Selected Period',

    // Chat Assistant Section
    chatTitle: 'Tamil & Tanglish AI Assistant',
    chatSub: 'Ask questions or issue commands in natural Tamil, Tanglish, or English',
    chatPlaceholder: 'Type a question or command in English or Tamil...',
    chatSendBtn: 'Send',
    chatMicBtn: 'Voice Input',
    listeningText: 'Listening... speak in English or Tamil',
    quickPromptsTitle: 'Quick Suggestions:',
    chatGreetingHtml: 'Hello! I am the TVS Beedi Company internal management AI assistant. <br><br>You can ask questions or give commands in English, Tamil, or Tanglish.<br><br>💡 <em>e.g.: "Add 100 cuts production today" or "How much powder stock is available?"</em>',

    // Settings Section
    settingsTitle: 'Company Settings',
    settingsSub: 'Configure business multipliers, box sizes, piece rates, and unit multipliers',
    beedisPerBoxSetting: 'Beedis per Box (1 கட்டைக்கு பீடிகள்)',
    cutsPerBoxSetting: 'Cuts per Box (1 கட்டைக்கு கட்டுகள்)',
    beedisPerCutSetting: 'Beedis per Cut',
    tobaccoPer1000Setting: 'Tobacco per 1,000 Beedis (Grams)',
    powderPer1000Setting: 'Powder per 1,000 Beedis (Grams)',
    salaryPer1000Setting: 'Salary per 1,000 Beedis (₹)',
    ratePer1000Setting: 'Rate per 1,000 Beedis (₹)',
    avgWastageSetting: 'Average Wastage (kg)',
    bagSizeSetting: 'Bag Size (Grams)',
    lowStockSetting: 'Low Stock Alert Threshold (kg)',
    saveSettingsBtn: 'Save Settings',

    // Stock Modal
    modalAddTitle: 'Add New Stock',
    modalAdjustTitle: 'Adjust Stock Balance',
    editMovementTitle: 'Edit Stock Movement',
    quantityKgLabel: 'Quantity (kg)',
    modalItemLabel: 'Item',
    modalKgLabelAdd: 'Quantity to Add (kg)',
    modalKgLabelAdjust: 'New Total Quantity (kg)',
    modalNotesLabel: 'Notes / Details (Optional)',
    modalVarietyLabel: 'Type / Variety / Brand:',
    modalLeafTypeLabel: 'Type of Leaves (Leaf Type)',
    leafTypePlaceholder: 'e.g. SONA, A1',
    kgPlaceholder: 'e.g. 10',
    powderTypeLabel: 'Powder Variety / Details',
    powderTypePlaceholder: 'e.g. Grade A, Fine',
    vendorPlaceholder: 'e.g. SONA, A1',
    modalItemTobacco: 'Tobacco (Raw Leaves)',
    modalItemPowder: 'Tobacco Powder (தூள்)',
    deleteMovementConfirm: 'Are you sure you want to delete this stock entry? (Stock balance will be automatically adjusted)',

    // Common Table & UI
    colDate: 'Date',
    colBoxes: 'Boxes (கட்டை)',
    colCuts: 'Cuts',
    colBeedis: 'Beedis',
    colTobacco: 'Tobacco',
    colPowder: 'Powder',
    colSalary: 'Salary',
    colRate: 'Rate',
    colNotes: 'Leaf Type / Notes',
    colActions: 'Action',
    colExpenses: 'Expenses',
    colProfit: 'Profit',
    colAmount: 'Amount',
    colCategory: 'Category',
    colPayment: 'Payment',
    colType: 'Type',
    colQuantity: 'Quantity',
    colBalance: 'Balance',
    colItem: 'Item',
    colDesc: 'Description',
    noData: 'No records found',
    loading: 'Loading...',
    deleteConfirm: 'Are you sure you want to delete this entry?',
    successSaved: 'Saved successfully!',
    successDeleted: 'Deleted successfully!',
    errorOccurred: 'An error occurred. Please try again.',

    // Units & Ratios
    unitBeedis: 'Beedis',
    unitCuts: 'Cuts',
    unitGrams: 'grams',
    unitBags: 'Bags',
    expensesCount: 'expenses',
    ratioTobacco: '600g / 1,000 Beedis',
    ratioPowder: '200g / 1,000 Beedis',
    ratioRate: '₹340 / 1,000 Beedis',
    ratioSalary: '₹320 / 1,000 Beedis',
    ratioBeedisPerCut: '1 Cut = 20 Beedis',
    stockWastageInfo: 'After 2kg wastage: 55 Bags (600g)',
    autoPowderDeduct: '200g auto-deducted per 1,000 beedis',

    // Movement Types
    typeInitial: 'Initial Setup',
    typeAdded: 'Stock Added',
    typeProdUsage: 'Production Usage',
    typeAdjustment: 'Stock Adjustment',
    typeWastage: 'Wastage',

    // Form & Common UI Keys
    chatInputPlaceholder: 'Type or ask in English or Tamil...',
    selectCategoryLabel: 'Expense Category',
    catSalary: 'Wages / Salary',
    catTea: 'Tea & Snacks',
    catCurrent: 'Electricity',
    prodDateLabel: 'Date',
    amountPlaceholder: 'e.g. 500',
    descLabel: 'Description',
    descPlaceholder: 'Optional description',
    saveExpenseBtn: 'Save Expense Record',
    expensesHistoryTitle: 'Expense Records History',
    colPaymentMethod: 'Payment Method',
    colDescription: 'Description',

    // Export Page Keys
    exportMainTitle: 'Company Export & Dispatch',
    todayExport: "Today's Export",
    totalExportBoxes: 'Total Exported Boxes',
    totalExportRate: 'Total Export Rate Value',
    packedStockInHand: 'Packed Stock in Hand',
    newExportTitle: 'New Export Dispatch Entry',
    stockAvailableLabel: 'Packed in Hand:',
    unitBoxes: 'Boxes',
    duplicateExportWarning: '⚠️ An export entry already exists for this date!',
    calcBoxes: 'Boxes',
    calcCuts: 'Cuts',
    calcBeedis: 'Beedis',
    calcRate: 'Rate Value (₹2,040/Bx)',
    calcSalary: 'Salary Value (₹1,920/Bx)',
    calcMargin: 'Margin Diff (₹120/Bx)',
    calcProfit: 'Profit (Rate − Salary) (₹120/Bx)',
    colProfit: 'Profit',
    exportHistoryTitle: 'Export Records History (Dispatch Ledger)',

    // Dashboard & Production Keys
    expensesDisplay: 'Expenses',
    netProfitDisplay: 'Net Profit',
    prodBoxesLabel: 'Box Quantity (Boxes)',
    calcTobacco: 'Tobacco Consumption',
    calcPowder: 'Powder Consumption',
    prodHistoryTitle: 'Production Records History',

    // Settings Keys
    boxSettingsSection: 'Box Multipliers & Ratios',
    ratesSettingsSection: 'Material & Labor Rates (per 1,000)',
    thresholdsSettingsSection: 'Inventory & Bagging Thresholds',

    // Stock & Consumption Reporting Keys
    consumptionReportingTitle: 'Raw Material Consumption Matrix',
    consumptionReportingSub: 'Detailed breakdown of raw materials consumed in production',
    reportToday: 'Today',
    reportWeek: 'This Week',
    reportMonth: 'This Month',
    reportTotal: 'All-Time Total',
    bagCalcSub: 'Calculate packable bags from tobacco stock after deducting wastage',
    bagCalcTotalLabel: 'Total Weight (kg)',
    bagCalcWastageLabel: 'Average Wastage (kg)',
    bagCalcBagSizeLabel: 'Bag Size (Grams)',
    bagCalcResultTitle: 'Packable Bags',
    colMovementType: 'Type',
    colQty: 'Quantity',
    colBalanceAfter: 'Balance Remaining',
    labelPowder: 'Powder:',
    labelProduction: 'Production:',

    // Monthly Stock Report Keys
    monthlyStockReportTitle: 'Incoming Stock Report',
    monthlyStockReportSub: 'Material-wise (Leaf / Powder) and date-wise incoming stock entries and Image export',
    reportMonthLabel: 'Report Month:',
    reportFilterFromLabel: 'From Date:',
    reportFilterToLabel: 'To Date:',
    filterMaterialLabel: 'Material:',
    filterAllMaterials: 'All (Leaf & Powder)',
    filterLeafOnly: 'Tobacco / Leaf Only',
    filterPowderOnly: 'Powder Only',
    snapFilterLabel: 'Filter:',
    snapEntriesCountLabel: 'Incoming Entries:',
    snapTobaccoIncomingLabel: 'Leaf Incoming (Tobacco):',
    snapPowderIncomingLabel: 'Powder Incoming:',
    snapTotalIncomingLabel: 'Total Incoming Kg:',
    btnFilterReport: 'Apply Filter',
    presetThisMonth: 'This Month',
    presetLastMonth: 'Last Month',
    presetLast3Months: 'Last 3 Months',
    presetThisYear: 'This Year',
    monthlyWiseSumTitle: 'Monthly-Wise Stock Sum & Consumption',
    followingMovementsTitle: 'Detailed Stock Movements Ledger',
    colMonthYear: 'Month',
    colTobaccoOpening: 'Opening',
    colTobaccoAdded: 'Added (+)',
    colTobaccoUsed: 'Consumed (−)',
    colTobaccoClosing: 'Closing',
    colPackableBags: '600g Bags',
    colPowderOpening: 'Opening',
    colPowderAdded: 'Added (+)',
    colPowderUsed: 'Consumed (−)',
    colPowderClosing: 'Closing',
    colProducedBoxes: 'Boxes',
    colTotalSum: 'Total / Period Sum',
    downloadPdfBtn: 'Download Image',
    downloadImageBtn: 'Download Image',
    prodReportTitle: 'Production Report & Filter',
    prodReportSub: 'Date-filtered production records, monthly totals, and PDF download',
    completeTotal: 'Complete Total',
    totalBoxesLabel: 'Total Boxes',
    totalCutsLabel: 'Total Cuts',
    totalBeedisLabel: 'Total Beedis',
    dateOrderError: 'From Date cannot be later than To Date.',
    noProdRecordsFound: 'No production records found for the selected date range.',
    previewReportBtn: 'Preview Report',
    printReportBtn: 'Print',
    reportGenerating: 'Generating report image...',
    reportDownloaded: 'Report image downloaded successfully!',
    chartDayFilter: 'Day',
    chartWeekFilter: 'Week',
    chartMonthFilter: 'Month',
    chartProdTrackingTitle: 'Production Tracking',
    chartProdTrackingSub: 'Historical Production Trends & Analysis',
    chartExportTrackingTitle: 'Export Tracking',
    chartExportTrackingSub: 'Historical Export Dispatches & Trends',
    chartProfitTrackingTitle: 'Financial & Profit Tracking',
    chartProfitTrackingSub: 'Rate vs Salary vs Expenses vs Net Profit',
    chartBoxesLabel: 'Boxes',
    chartCutsLabel: 'Cuts',
    chartBeedisLabel: 'Beedis',
    chartRateLabel: 'Rate Value (₹)',
    chartSalaryLabel: 'Salary (₹)',
    chartExpensesLabel: 'Expenses (₹)',
    chartNetProfitLabel: 'Net Profit (₹)',
    chartExportBoxesLabel: 'Exported Boxes',
    chartExportMarginLabel: 'Export Profit (₹)'
  }
};

let currentLanguage = 'ta'; // Tamil as default

function toggleLanguage(targetLang) {
  let newLang;
  if (targetLang === 'ta' || targetLang === 'en') {
    newLang = targetLang;
  } else {
    newLang = (currentLanguage === 'ta') ? 'en' : 'ta';
  }
  setLanguage(newLang, { notify: true });
}

function setLanguage(lang, options = { notify: false }) {
  if (lang !== 'en' && lang !== 'ta') return;
  
  const oldLang = currentLanguage;
  currentLanguage = lang;
  window.currentLanguage = lang;
  localStorage.setItem('tvs_beedi_lang', lang);
  
  // Trigger silky smooth crossfade transition
  document.body.classList.add('lang-transitioning');
  applyTranslations();
  
  // Synchronize theme toggle button text if available
  if (typeof updateThemeButtonUI === 'function') {
    const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('tvs_theme') || 'light';
    updateThemeButtonUI(currentTheme);
  }

  // Dispatch custom event to notify active page scripts to re-render charts/tables/cards
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang, oldLang } }));

  setTimeout(() => {
    document.body.classList.remove('lang-transitioning');
  }, 220);

  if (typeof renderCachedAppData === 'function') {
    renderCachedAppData();
  }

  if (options.notify && typeof showToast === 'function') {
    showToast(getTranslation('langSwitched'), 'info');
  }
}

function getTranslation(key) {
  return (translations[currentLanguage] && translations[currentLanguage][key]) ||
         (translations.ta && translations.ta[key]) || key;
}

function applyTranslations() {
  const dict = translations[currentLanguage] || translations.ta;

  // 1. Text content elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  // Preserve edit mode button text if editing
  const editIdInput = document.getElementById('prodEditId');
  const submitText = document.getElementById('prodSubmitText');
  if (editIdInput && editIdInput.value && submitText) {
    submitText.textContent = dict.updateProductionBtn || 'Update Production';
  }

  // 2. Placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.setAttribute('placeholder', dict[key]);
    }
  });

  // 3. Title / Tooltip attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key]) {
      el.setAttribute('title', dict[key]);
    }
  });

  // 4. Update segmented language switcher UI
  const chipTa = document.getElementById('langChipTa');
  const chipEn = document.getElementById('langChipEn');
  if (chipTa && chipEn) {
    if (currentLanguage === 'ta') {
      chipTa.classList.add('active');
      chipEn.classList.remove('active');
    } else {
      chipTa.classList.remove('active');
      chipEn.classList.add('active');
    }
  }

  // Fallback support for single toggle button if present
  const langToggleBtn = document.getElementById('langToggleBtn');
  if (langToggleBtn) {
    langToggleBtn.textContent = (currentLanguage === 'ta') ? 'English' : 'தமிழ்';
  }

  // 5. Update Theme button text dynamically
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    if (currentTheme === 'dark') {
      themeBtn.textContent = dict.themeLight || '☀️ Light';
    } else {
      themeBtn.textContent = dict.themeDark || '🌙 Dark';
    }
  }

  // 6. Update HTML lang attribute and document title
  document.documentElement.lang = currentLanguage;
  const path = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
  let pageName = dict.navDashboard;
  if (path.includes('production')) pageName = dict.navProduction;
  else if (path.includes('stock')) pageName = dict.navStock;
  else if (path.includes('expenses')) pageName = dict.navExpenses;
  else if (path.includes('export')) pageName = dict.navExport;
  else if (path.includes('chat')) pageName = dict.navChat;
  else if (path.includes('settings')) pageName = dict.navSettings;
  document.title = `${dict.companyName} - ${pageName}`;

  // 7. Update Chat Assistant Greeting if chat has not started
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages && chatMessages.children.length <= 1) {
    const firstBubble = chatMessages.querySelector('.chat-bubble.assistant');
    if (firstBubble) {
      firstBubble.innerHTML = dict.chatGreetingHtml;
    }
  }

  // 8. Update Chat suggestion chips
  updateChatChipsForLanguage();
}

function updateChatChipsForLanguage() {
  const quickChipsContainer = document.getElementById('quickChips');
  if (!quickChipsContainer) return;

  const chipsTa = [
    { label: 'இன்று உற்பத்தி?', prompt: 'இன்னைக்கு எத்தனை பீடி உற்பத்தி பண்ணிருக்கோம்?' },
    { label: 'Tobacco Stock?', prompt: 'இப்போ எவ்வளவு tobacco stock இருக்கு?' },
    { label: 'தூள் Stock?', prompt: 'இப்போ எவ்வளவு தூள் stock இருக்கு?' },
    { label: 'பயன்பாடு அறிக்கை?', prompt: 'இன்று எவ்வளவு tobacco மற்றும் தூள் பயன்பாடு?' },
    { label: '100 Cut தேவைகள்?', prompt: '100 cut போட்டா எவ்வளவு tobacco தேவை?' },
    { label: 'மாத லாபம்?', prompt: 'இந்த மாதம் எவ்வளவு profit?' },
    { label: '+100 Cut பதிவு செய்', prompt: 'இன்று 100 கட்டு production add பண்ணு' },
    { label: '+₹500 செலவு சேர்', prompt: 'இன்று ₹500 கரண்ட் பில் expense add பண்ணு' }
  ];

  const chipsEn = [
    { label: "Today's Production?", prompt: 'How many beedis produced today?' },
    { label: 'Tobacco Stock?', prompt: 'How much tobacco stock is available?' },
    { label: 'Powder Stock?', prompt: 'How much powder stock is available?' },
    { label: 'Consumption Report?', prompt: 'How much tobacco and powder consumed today?' },
    { label: '100 Cuts Requirements?', prompt: 'What raw materials needed for 100 cuts?' },
    { label: 'Monthly Profit?', prompt: 'What is our profit this month?' },
    { label: '+Record 100 Cuts', prompt: 'Add 100 cuts production today' },
    { label: '+Add ₹500 Expense', prompt: 'Add 500 electricity expense today' }
  ];

  const activeChips = (currentLanguage === 'en') ? chipsEn : chipsTa;
  quickChipsContainer.innerHTML = activeChips.map(c => `
    <button class="chip-btn" onclick="sendQuickPrompt('${c.prompt}')">
      ${c.label}
    </button>
  `).join('');
}

// Setup click handlers for segmented language pill
function setupLanguageSwitcher() {
  const chipTa = document.getElementById('langChipTa');
  const chipEn = document.getElementById('langChipEn');
  const pill = document.getElementById('langSwitcher');

  if (chipTa) {
    chipTa.onclick = function(e) {
      e.stopPropagation();
      setLanguage('ta', { notify: true });
    };
  }

  if (chipEn) {
    chipEn.onclick = function(e) {
      e.stopPropagation();
      setLanguage('en', { notify: true });
    };
  }

  if (pill) {
    pill.onclick = function() {
      toggleLanguage();
    };
  }
}

// Export explicitly on window object
window.currentLanguage = currentLanguage;
window.setLanguage = setLanguage;
window.toggleLanguage = toggleLanguage;
window.getTranslation = getTranslation;
window.applyTranslations = applyTranslations;
window.setupLanguageSwitcher = setupLanguageSwitcher;

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('tvs_beedi_lang');
  if (savedLang === 'en' || savedLang === 'ta') {
    currentLanguage = savedLang;
    window.currentLanguage = savedLang;
  }
  applyTranslations();
  setupLanguageSwitcher();
});
