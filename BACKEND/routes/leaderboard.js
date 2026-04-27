const express = require('express');
const { User, GameProgress } = require('../models');

const router = express.Router();

// @route   GET /api/leaderboard/global
// @desc    Get global leaderboard by total score
// @access  Public
router.get('/global', async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find()
      .select('username profile.displayName stats.totalScore stats.skillLevel stats.gamesCompleted')
      .sort({ 'stats.totalScore': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments();

    // Add rank to each user
    const rankedUsers = users.map((user, index) => ({
      rank: skip + index + 1,
      username: user.profile.displayName || user.username,
      totalScore: user.stats.totalScore,
      skillLevel: user.stats.skillLevel,
      gamesCompleted: user.stats.gamesCompleted
    }));

    res.json({
      success: true,
      leaderboard: rankedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/leaderboard/game/:gameType
// @desc    Get leaderboard for specific game
// @access  Public
router.get('/game/:gameType', async (req, res) => {
  try {
    const { gameType } = req.params;
    const { limit = 50 } = req.query;

    const progress = await GameProgress.find({ gameType })
      .populate('user', 'username profile.displayName')
      .sort({ bestScore: -1 })
      .limit(parseInt(limit));

    const leaderboard = progress.map((p, index) => ({
      rank: index + 1,
      username: p.user.profile?.displayName || p.user.username,
      bestScore: p.bestScore,
      avgScore: Math.round(p.avgScore),
      totalAttempts: p.totalAttempts,
      completed: p.completed
    }));

    res.json({
      success: true,
      gameType,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/leaderboard/nearby
// @desc    Get users near current user's rank
// @access  Private
router.get('/nearby', async (req, res) => {
  try {
    // This would require auth middleware - simplified version
    const { userId, range = 5 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    // Get user's rank
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userScore = user.stats.totalScore;
    const higherCount = await User.countDocuments({ 'stats.totalScore': { $gt: userScore } });
    const userRank = higherCount + 1;

    // Get users around this rank
    const nearbyUsers = await User.find()
      .select('username profile.displayName stats.totalScore stats.skillLevel')
      .sort({ 'stats.totalScore': -1 })
      .skip(Math.max(0, userRank - parseInt(range) - 1))
      .limit(parseInt(range) * 2 + 1);

    const leaderboard = nearbyUsers.map((u, index) => ({
      rank: Math.max(0, userRank - parseInt(range) - 1) + index + 1,
      username: u.profile?.displayName || u.username,
      totalScore: u.stats.totalScore,
      skillLevel: u.stats.skillLevel,
      isCurrentUser: u._id.toString() === userId
    }));

    res.json({
      success: true,
      userRank,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/leaderboard/stats
// @desc    Get leaderboard statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalPlayers: { $sum: 1 },
          avgScore: { $avg: '$stats.totalScore' },
          maxScore: { $max: '$stats.totalScore' },
          totalGamesCompleted: { $sum: '$stats.gamesCompleted' }
        }
      }
    ]);

    const skillDistribution = await User.aggregate([
      {
        $group: {
          _id: '$stats.skillLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {},
      skillDistribution
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
