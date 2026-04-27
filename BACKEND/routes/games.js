const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, GameProgress, Achievement } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/games/save-progress
// @desc    Save game progress
// @access  Private
router.post('/save-progress', auth, [
  body('gameType').isIn(['password', 'phishing', 'malware', 'social', 'encryption', 'network']),
  body('score').isNumeric(),
  body('maxPossibleScore').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { gameType, score, maxPossibleScore = 100, timeSpent = 0, details = {} } = req.body;
    const userId = req.user._id;

    // Find or create progress
    let progress = await GameProgress.findOne({ user: userId, gameType });
    
    if (!progress) {
      progress = new GameProgress({
        user: userId,
        gameType,
        attempts: []
      });
    }

    // Add new attempt
    progress.attempts.push({
      score,
      maxPossibleScore,
      timeSpent,
      details,
      completedAt: new Date()
    });

    // Check if completed (score >= 60%)
    if (score >= maxPossibleScore * 0.6) {
      progress.completed = true;
      progress.completedAt = new Date();
    }

    await progress.save();

    // Update user stats
    const user = await User.findById(userId);
    user.stats.totalScore += score;
    
    // Check if this is first completion of this game type
    const previousAttempts = progress.attempts.length;
    if (progress.completed && previousAttempts === 1) {
      user.stats.gamesCompleted += 1;
    }

    user.updateSkillLevel();
    await user.save();

    // Check for new achievements
    const newAchievements = await checkAchievements(user, gameType, score);

    res.json({
      success: true,
      progress: {
        bestScore: progress.bestScore,
        avgScore: progress.avgScore,
        totalAttempts: progress.totalAttempts,
        completed: progress.completed
      },
      userStats: user.stats,
      newAchievements
    });
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/games/progress
// @desc    Get all game progress for user
// @access  Private
router.get('/progress', auth, async (req, res) => {
  try {
    const progress = await GameProgress.find({ user: req.user._id });
    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/games/achievements
// @desc    Get all available achievements
// @access  Public
router.get('/achievements', async (req, res) => {
  try {
    const achievements = await Achievement.find({ isActive: true });
    res.json({ success: true, achievements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/games/:gameType/questions
// @desc    Get game questions/content
// @access  Public
router.get('/:gameType/questions', async (req, res) => {
  try {
    const { gameType } = req.params;
    
    // Return game content based on type
    const gameContent = getGameContent(gameType);
    
    res.json({
      success: true,
      gameType,
      content: gameContent
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Helper function to check achievements
async function checkAchievements(user, gameType, score) {
  const newAchievements = [];
  const allAchievements = await Achievement.find({ isActive: true });

  for (const achievement of allAchievements) {
    if (user.stats.achievements.includes(achievement.id)) continue;

    let unlocked = false;
    const req = achievement.requirements;

    if (req.gameType && req.gameType === gameType) {
      if (req.minScore && score >= req.minScore) unlocked = true;
    }
    if (req.totalScore && user.stats.totalScore >= req.totalScore) unlocked = true;
    if (req.gamesCompleted && user.stats.gamesCompleted >= req.gamesCompleted) unlocked = true;

    if (unlocked) {
      user.stats.achievements.push(achievement.id);
      newAchievements.push(achievement);
    }
  }

  if (newAchievements.length > 0) {
    await user.save();
  }

  return newAchievements;
}

// Helper function to get game content
function getGameContent(gameType) {
  const content = {
    password: {
      title: 'Password Guardian',
      description: 'Learn to create unbreakable passwords',
      levels: [
        { weak: 'password123', hint: 'Too common and predictable' },
        { weak: 'admin', hint: 'Too short and obvious' },
        { weak: 'qwerty', hint: 'Keyboard pattern' },
        { weak: '12345678', hint: 'Sequential numbers' },
        { weak: 'password', hint: 'Dictionary word' }
      ]
    },
    phishing: {
      title: 'Phish Detective',
      description: 'Identify malicious websites and emails',
      scenarios: [
        {
          type: 'email',
          from: 'security@amaz0n.com',
          subject: 'Urgent: Your account has been compromised',
          body: 'Click here immediately to secure your account...',
          isPhishing: true,
          redFlags: ['Misspelled domain', 'Urgency tactics', 'Suspicious link']
        },
        {
          type: 'website',
          url: 'https://www.paypa1-security.com',
          content: 'Verify your account information now',
          isPhishing: true,
          redFlags: ['Misspelled domain name', 'Generic security warning']
        }
      ]
    }
  };

  return content[gameType] || { title: gameType, description: 'Game content' };
}

module.exports = router;
