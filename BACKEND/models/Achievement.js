const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'trophy'
  },
  points: {
    type: Number,
    default: 50
  },
  requirements: {
    gameType: { type: String, default: null },
    minScore: { type: Number, default: null },
    totalScore: { type: Number, default: null },
    gamesCompleted: { type: Number, default: null }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Achievement', achievementSchema);
