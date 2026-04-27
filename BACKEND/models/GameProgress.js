const mongoose = require('mongoose');

const gameProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  gameType: {
    type: String,
    required: true,
    enum: ['password', 'phishing', 'malware', 'social', 'encryption', 'network'],
    index: true
  },
  attempts: [{
    score: { type: Number, required: true },
    maxPossibleScore: { type: Number, default: 100 },
    completedAt: { type: Date, default: Date.now },
    timeSpent: { type: Number, default: 0 }, // in seconds
    details: { type: mongoose.Schema.Types.Mixed, default: {} }
  }],
  bestScore: {
    type: Number,
    default: 0
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  avgScore: {
    type: Number,
    default: 0
  },
  totalTimeSpent: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

gameProgressSchema.pre('save', function(next) {
  if (this.attempts.length > 0) {
    const scores = this.attempts.map(a => a.score);
    this.bestScore = Math.max(...scores);
    this.avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    this.totalAttempts = this.attempts.length;
    this.totalTimeSpent = this.attempts.reduce((a, b) => a + (b.timeSpent || 0), 0);
  }
  next();
});

gameProgressSchema.index({ user: 1, gameType: 1 }, { unique: true });

module.exports = mongoose.model('GameProgress', gameProgressSchema);
