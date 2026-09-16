const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  beedisPerBox: {
    type: Number,
    default: 6000,
    required: true,
    min: 1
  },
  cutsPerBox: {
    type: Number,
    default: 300,
    required: true,
    min: 1
  },
  beedisPerCut: {
    type: Number,
    default: 20,
    required: true,
    min: 1
  },
  tobaccoPer1000Grams: {
    type: Number,
    default: 600,
    required: true,
    min: 1
  },
  powderPer1000Grams: {
    type: Number,
    default: 200,
    required: true,
    min: 1
  },
  salaryPer1000: {
    type: Number,
    default: 320,
    required: true,
    min: 0
  },
  ratePer1000: {
    type: Number,
    default: 340,
    required: true,
    min: 0
  },
  commissionPercent: {
    type: Number,
    default: 0.10,
    required: true,
    min: 0,
    max: 1
  },
  avgWastageKg: {
    type: Number,
    default: 2,
    required: true,
    min: 0
  },
  bagSizeGrams: {
    type: Number,
    default: 600,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: '₹'
  },
  language: {
    type: String,
    default: 'ta',
    enum: ['ta', 'en']
  },
  lowStockThresholdKg: {
    type: Number,
    default: 5
  },
  adminPasswordHash: {
    type: String,
    default: ''
  },
  adminPasswordSalt: {
    type: String,
    default: ''
  },
  authUsers: [{
    username: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['admin', 'staff'],
      default: 'staff'
    },
    passwordHash: {
      type: String,
      required: true
    },
    passwordSalt: {
      type: String,
      required: true
    }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Singleton helper: get or create default settings
SettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', SettingsSchema);
