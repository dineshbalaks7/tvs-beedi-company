/**
 * TVS Beedi Company - Server Entry Point
 * Mobile-friendly internal management application with Tamil language support.
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const crypto = require('crypto');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const apiRoutes = require('./routes/api');
const Settings = require('./models/Settings');
const Stock = require('./models/Stock');
const StockMovement = require('./models/StockMovement');
const Production = require('./models/Production');
const Expense = require('./models/Expense');
const { calculateProductionMetrics } = require('./services/calculationService');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tvs_beedi';
const MONGODB_LOG_TARGET = (() => {
  try {
    const url = new URL(MONGODB_URI);
    return `${url.protocol}//${url.hostname}${url.pathname}`;
  } catch {
    return 'configured MongoDB instance';
  }
})();
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-session-secret';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      resolve({ hash: derivedKey.toString('hex'), salt });
    });
  });
}

async function verifyPassword(password, hash, salt) {
  if (!hash || !salt) return false;
  const result = await hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(result.hash, 'hex'), Buffer.from(hash, 'hex'));
}

// Enable proxy trust for reverse proxies like Vercel (required for secure cookies)
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Store with error handling
const sessionStore = MongoStore.create({
  mongoUrl: MONGODB_URI,
  ttl: 8 * 60 * 60
});
sessionStore.on('error', (err) => {
  console.error('Session store error:', err.message || err);
});

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return res.redirect('/login.html');
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  try {
    const settings = await Settings.getSettings();
    const storedUser = (settings.authUsers || []).find(user => user.username === username);
    let passwordMatches = false;
    if (storedUser) {
      passwordMatches = await verifyPassword(password || '', storedUser.passwordHash, storedUser.passwordSalt);
    } else if (username === ADMIN_USERNAME) {
      passwordMatches = settings.adminPasswordHash
        ? await verifyPassword(password || '', settings.adminPasswordHash, settings.adminPasswordSalt)
        : password === ADMIN_PASSWORD;
    }
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (!storedUser && username === ADMIN_USERNAME && !settings.adminPasswordHash) {
      const hashed = await hashPassword(ADMIN_PASSWORD);
      settings.adminPasswordHash = hashed.hash;
      settings.adminPasswordSalt = hashed.salt;
      await settings.save();
    }
    req.session.authenticated = true;
    req.session.username = username;
    return res.json({ authenticated: true });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to sign in' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ authenticated: false }));
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { newPassword, confirmPassword } = req.body || {};
  if (!newPassword || newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Password fields are invalid' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const settings = await Settings.getSettings();
    const hashed = await hashPassword(newPassword);
    const storedUser = (settings.authUsers || []).find(user => user.username === req.session.username);
    if (storedUser) {
      storedUser.passwordHash = hashed.hash;
      storedUser.passwordSalt = hashed.salt;
    } else if (req.session.username === ADMIN_USERNAME) {
      settings.adminPasswordHash = hashed.hash;
      settings.adminPasswordSalt = hashed.salt;
    } else {
      return res.status(404).json({ error: 'User account not found' });
    }
    await settings.save();
    return res.json({ updated: true });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to change password' });
  }
});

app.use((req, res, next) => {
  const isPublicHtml = req.path === '/login.html' || req.path === '/login';
  if ((req.path === '/' || req.path.endsWith('.html')) && !isPublicHtml && (!req.session || !req.session.authenticated)) {
    return res.redirect('/login.html');
  }
  return next();
});

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

let databaseInitializationPromise = null;
async function ensureDatabaseInitialized() {
  if (mongoose.connection.readyState === 1) return;
  if (!databaseInitializationPromise) {
    databaseInitializationPromise = initializeDatabase().catch((err) => {
      databaseInitializationPromise = null;
      throw err;
    });
  }
  return databaseInitializationPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDatabaseInitialized();
    next();
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(503).json({
        error: 'Database connection unavailable. Please verify MONGODB_URI in Vercel settings and MongoDB Atlas network access.',
        details: error.message
      });
    }
    next(error);
  }
});

// API Routes
app.use('/api', requireAuth, apiRoutes);

// Page Routes (Multi-Page Architecture)
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/production', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'production.html')));
app.get('/stock', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'stock.html')));
app.get('/expenses', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'expenses.html')));
app.get('/export', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'export.html')));
app.get('/reports', requireAuth, (req, res) => res.redirect('/export'));
app.get('/chat', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'chat.html')));
app.get('/settings', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));

// Branded 404 response for unknown pages and assets
app.get('*', (req, res) => {
  if (!req.session || !req.session.authenticated) return res.redirect('/login.html');
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Database Connection & Initialization
async function initializeDatabase() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_LOG_TARGET}`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB successfully.');

    // 1. Ensure Settings exist
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        beedisPerBox: 6000,
        cutsPerBox: 300,
        beedisPerCut: 20,
        tobaccoPer1000Grams: 600,
        powderPer1000Grams: 200,
        salaryPer1000: 320,
        ratePer1000: 340,
        avgWastageKg: 2,
        bagSizeGrams: 600,
        currency: '₹',
        language: 'ta',
        lowStockThresholdKg: 5
      });
      console.log('✅ Default settings created (Tamil first, 1 Box = 300 cuts = 6,000 beedis, 20 beedis/cut, 600g tobacco, 200g powder, ₹320 salary, ₹340 rate).');
    } else if (settings.beedisPerBox !== 6000 || settings.cutsPerBox !== 300 || settings.beedisPerCut !== 20) {
      settings.beedisPerBox = 6000;
      settings.cutsPerBox = 300;
      settings.beedisPerCut = 20;
      await settings.save();
      console.log('✅ Migrated settings to Boxes (1 Box = 300 cuts = 6,000 beedis, 20 beedis/cut).');
    }

    // 2. Ensure Stock exists (35 kg Tobacco, 35 kg Powder)
    let tobaccoStock = await Stock.findOne({ item: 'tobacco' });
    if (!tobaccoStock) {
      tobaccoStock = await Stock.create({
        item: 'tobacco',
        quantityGrams: 35000 // 35 kg
      });
      await StockMovement.create({
        item: 'tobacco',
        type: 'initial',
        quantityGrams: 35000,
        balanceAfterGrams: 35000,
        notes: 'Initial stock setup: 35 kg'
      });
      console.log('✅ Initialized Tobacco stock: 35 kg.');
    }

    let powderStock = await Stock.findOne({ item: 'powder' });
    if (!powderStock) {
      powderStock = await Stock.create({
        item: 'powder',
        quantityGrams: 35000 // 35 kg
      });
      await StockMovement.create({
        item: 'powder',
        type: 'initial',
        quantityGrams: 35000,
        balanceAfterGrams: 35000,
        notes: 'Initial stock setup: 35 kg'
      });
      console.log('✅ Initialized Tobacco Powder stock: 35 kg.');
    }

    // 3. Seed initial starter production & expenses if database is clean
    const prodCount = await Production.countDocuments();
    if (prodCount === 0 && process.env.SEED_DEMO_DATA === 'true') {
      const today = new Date();
      const yesterday = new Date(Date.now() - 86400000);

      // Add sample 100 cuts entry
      const m1 = calculateProductionMetrics(100, settings);
      const p1 = await Production.create({
        date: yesterday,
        cuts: 100,
        beedis: m1.beedis,
        tobaccoUsedGrams: m1.tobaccoUsedGrams,
        powderUsedGrams: m1.powderUsedGrams,
        wastageGrams: 0,
        salary: m1.salary,
        rate: m1.rate,
        notes: 'நேற்றைய உற்பத்தி (Sample Batch A)'
      });

      // Sample expense
      await Expense.create({
        date: yesterday,
        category: 'மின்சாரம் (Electricity)',
        amount: 500,
        paymentMethod: 'UPI/GPay',
        description: 'மாதாந்திர மின் கட்டணம் (Monthly electricity bill)',
        notes: 'Office meter'
      });

      await Expense.create({
        date: today,
        category: 'போக்குவரத்து (Transport)',
        amount: 300,
        paymentMethod: 'Cash',
        description: 'சரக்கு போக்குவரத்து செலவு (Logistics freight)',
        notes: 'Local auto freight'
      });

      console.log('✅ Seeded demo production and expense transactions for immediate dashboard preview.');
    }
  } catch (err) {
    console.error('❌ MongoDB initialization error:', err.message);
    throw err;
  }
}

if (require.main === module) {
  const server = app.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`🚀 TVS Beedi Company Management Server running`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📱 Mobile & Desktop Internal Portal Ready`);
    console.log(`====================================================`);
    databaseInitializationPromise = initializeDatabase();
    await databaseInitializationPromise;
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use.`);
      console.error(`Please close any existing process running on port ${PORT} or run with a different port (e.g., $env:PORT=3001; npm start).\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

module.exports = app;

