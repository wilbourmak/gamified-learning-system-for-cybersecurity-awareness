const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, GameProgress } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile with stats
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const progress = await GameProgress.find({ user: req.user._id });
    
    res.json({
      success: true,
      user,
      progress
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('displayName').optional().trim().isLength({ max: 50 }),
  body('bio').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { displayName, bio, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (displayName !== undefined) user.profile.displayName = displayName;
    if (bio !== undefined) user.profile.bio = bio;
    if (avatar !== undefined) user.profile.avatar = avatar;

    await user.save();
    res.json({ success: true, user: user.toObject({ transform: (doc, ret) => { delete ret.password; return ret; } }) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/achievements
// @desc    Get user achievements
// @access  Private
router.get('/achievements', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('stats.achievements');
    res.json({
      success: true,
      achievements: user.stats.achievements
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/stats
// @desc    Get detailed user statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('stats');
    const progress = await GameProgress.find({ user: req.user._id });
    
    const gameStats = progress.map(p => ({
      gameType: p.gameType,
      bestScore: p.bestScore,
      avgScore: p.avgScore,
      totalAttempts: p.totalAttempts,
      totalTimeSpent: p.totalTimeSpent,
      completed: p.completed
    }));

    res.json({
      success: true,
      stats: {
        overall: user.stats,
        byGame: gameStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/progress/:gameType
// @desc    Get progress for specific game
// @access  Private
router.get('/progress/:gameType', auth, async (req, res) => {
  try {
    const { gameType } = req.params;
    const progress = await GameProgress.findOne({ 
      user: req.user._id, 
      gameType 
    });

    if (!progress) {
      return res.json({ 
        success: true, 
        progress: null,
        message: 'No progress found for this game'
      });
    }

    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
