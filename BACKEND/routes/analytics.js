const express = require('express');
const { Analytics, GameProgress, User } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/analytics/track
// @desc    Track user event
// @access  Private
router.post('/track', auth, async (req, res) => {
  try {
    const { eventType, gameType, metadata, sessionId } = req.body;

    const analytics = await Analytics.create({
      user: req.user._id,
      eventType,
      gameType,
      metadata,
      sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });

    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/analytics/user
// @desc    Get current user's analytics/sessions
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const { days = 30, gameType } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const query = {
      user: req.user._id,
      timestamp: { $gte: startDate }
    };
    if (gameType) query.gameType = gameType;

    const events = await Analytics.find(query)
      .sort({ timestamp: -1 })
      .limit(100);

    // Aggregate stats
    const stats = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    const gameStats = await Analytics.aggregate([
      { $match: { ...query, gameType: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$gameType',
          sessions: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      events,
      stats: {
        eventTypes: stats,
        gamesPlayed: gameStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/analytics/progress
// @desc    Get user's learning progress over time
// @access  Private
router.get('/progress', auth, async (req, res) => {
  try {
    const { gameType } = req.query;
    
    const query = { user: req.user._id };
    if (gameType) query.gameType = gameType;

    const progress = await GameProgress.find(query)
      .select('gameType bestScore avgScore totalAttempts attempts.completedAt')
      .sort({ 'attempts.completedAt': -1 });

    // Calculate improvement over time
    const progressData = progress.map(p => {
      const attempts = p.attempts.sort((a, b) => a.completedAt - b.completedAt);
      return {
        gameType: p.gameType,
        currentBest: p.bestScore,
        currentAvg: Math.round(p.avgScore),
        totalAttempts: p.totalAttempts,
        progression: attempts.map((a, i) => ({
          attempt: i + 1,
          score: a.score,
          date: a.completedAt
        }))
      };
    });

    res.json({
      success: true,
      progress: progressData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/analytics/skills
// @desc    Get user's skill breakdown
// @access  Private
router.get('/skills', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('stats');
    const progress = await GameProgress.find({ user: req.user._id });

    const skills = {
      overall: {
        level: user.stats.skillLevel,
        totalScore: user.stats.totalScore,
        achievements: user.stats.achievements.length
      },
      byCategory: progress.map(p => ({
        category: p.gameType,
        level: calculateSkillLevel(p.avgScore),
        score: Math.round(p.avgScore),
        completed: p.completed,
        attempts: p.totalAttempts
      }))
    };

    res.json({ success: true, skills });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/analytics/activity
// @desc    Get user's activity heatmap data
// @access  Private
router.get('/activity', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const activity = await Analytics.aggregate([
      {
        $match: {
          user: req.user._id,
          timestamp: { $gte: startOfYear, $lte: endOfYear },
          eventType: { $in: ['game_start', 'game_complete'] }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          sessions: { $sum: 1 },
          gamesCompleted: {
            $sum: { $cond: [{ $eq: ['$eventType', 'game_complete'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      year: parseInt(year),
      activity: activity.map(a => ({
        date: a._id,
        sessions: a.sessions,
        gamesCompleted: a.gamesCompleted
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

function calculateSkillLevel(avgScore) {
  if (avgScore >= 90) return 'Expert';
  if (avgScore >= 75) return 'Advanced';
  if (avgScore >= 60) return 'Intermediate';
  return 'Beginner';
}

module.exports = router;
