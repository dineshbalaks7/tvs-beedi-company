const mongoose = require('mongoose');

const ChatHistorySchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'ta'
  },
  intent: {
    type: String,
    default: null
  },
  actionPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  actionStatus: {
    type: String,
    enum: ['none', 'pending_confirmation', 'confirmed', 'cancelled'],
    default: 'none'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ChatHistory', ChatHistorySchema);
