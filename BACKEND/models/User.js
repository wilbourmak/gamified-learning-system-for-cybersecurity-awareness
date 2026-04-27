const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  profile: {
    avatar: { type: String, default: null },
    displayName: { type: String, default: null },
    bio: { type: String, maxlength: 500, default: '' }
  },
  stats: {
    totalScore: { type: Number, default: 0 },
    gamesCompleted: { type: Number, default: 0 },
    achievements: [{ type: String }],
    skillLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Beginner'
    },
    streak: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
  },
  preferences: {
    notifications: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateSkillLevel = function() {
  const score = this.stats.totalScore;
  if (score >= 1000) this.stats.skillLevel = 'Expert';
  else if (score >= 500) this.stats.skillLevel = 'Advanced';
  else if (score >= 200) this.stats.skillLevel = 'Intermediate';
  else this.stats.skillLevel = 'Beginner';
};

module.exports = mongoose.model('User', userSchema);
