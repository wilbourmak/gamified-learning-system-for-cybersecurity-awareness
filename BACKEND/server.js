require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gameRoutes = require('./routes/games');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const urlScannerRoutes = require('./routes/urlscanner');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('dev'));

const { Achievement } = require('./models');

// Seed default achievements
async function seedAchievements() {
  const defaultAchievements = [
    {
      id: 'password_master',
      title: 'Password Master',
      description: 'Scored 80+ on Password Guardian!',
      icon: 'key',
      points: 100,
      requirements: { gameType: 'password', minScore: 80 },
      isActive: true
    },
    {
      id: 'phish_detector',
      title: 'Phish Detector',
      description: 'Scored 90+ on Phish Detective!',
      icon: 'fishing-hook',
      points: 200,
      requirements: { gameType: 'phishing', minScore: 90 },
      isActive: true
    },
    {
      id: 'cyber_guardian',
      title: 'Cyber Guardian',
      description: 'Reached 500 total points!',
      icon: 'shield-alt',
      points: 250,
      requirements: { totalScore: 500 },
      isActive: true
    },
    {
      id: 'cyber_expert',
      title: 'Cyber Expert',
      description: 'Reached 1000 total points!',
      icon: 'crown',
      points: 500,
      requirements: { totalScore: 1000 },
      isActive: true
    },
    {
      id: 'game_master',
      title: 'Game Master',
      description: 'Completed 5 games!',
      icon: 'gamepad',
      points: 300,
      requirements: { gamesCompleted: 5 },
      isActive: true
    }
  ];

  for (const achievement of defaultAchievements) {
    await Achievement.findOneAndUpdate(
      { id: achievement.id },
      achievement,
      { upsert: true, new: true }
    );
  }
  console.log('Achievements seeded');
}

// Database connection with seeding
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberguard')
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedAchievements();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/urlscanner', urlScannerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database stats - for verifying accounts are saved
app.get('/api/stats', async (req, res) => {
  try {
    const { User, Achievement, GameProgress } = require('./models');
    const userCount = await User.countDocuments();
    const achievementCount = await Achievement.countDocuments();
    const progressCount = await GameProgress.countDocuments();
    
    res.json({
      success: true,
      database: 'Connected',
      stats: {
        users: userCount,
        achievements: achievementCount,
        gameProgress: progressCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error', error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
