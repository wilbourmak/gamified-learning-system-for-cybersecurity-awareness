const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['game_start', 'game_complete', 'achievement_unlock', 'login', 'logout', 'page_view', 'error']
  },
  gameType: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  sessionId: {
    type: String,
    index: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

analyticsSchema.index({ user: 1, timestamp: -1 });
analyticsSchema.index({ eventType: 1, timestamp: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
