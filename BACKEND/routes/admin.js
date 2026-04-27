const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, GameProgress, Achievement, Analytics } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin role
router.use(auth);
router.use(adminOnly);

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Admin
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sortBy = 'createdAt', order = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = search ? {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const sortOrder = order === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
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

// @route   GET /api/admin/users/:id
// @desc    Get single user details
// @access  Admin
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    const progress = await GameProgress.find({ user: req.params.id });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user,
      progress
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (admin can update role, status, etc.)
// @access  Admin
router.put('/users/:id', [
  body('role').optional().isIn(['user', 'admin']),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const updates = {};
    if (req.body.role) updates.role = req.body.role;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/users/:id', async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);
    await GameProgress.deleteMany({ user: req.params.id });
    await Analytics.deleteMany({ user: req.params.id });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/stats
// @desc    Get platform statistics
// @access  Admin
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, newUsersToday, totalGamesPlayed, activeAchievements] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      GameProgress.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAttempts' } } }
      ]),
      Achievement.countDocuments({ isActive: true })
    ]);

    const gameStats = await GameProgress.aggregate([
      {
        $group: {
          _id: '$gameType',
          totalPlays: { $sum: '$totalAttempts' },
          avgScore: { $avg: '$avgScore' },
          completions: { $sum: { $cond: ['$completed', 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        newUsersToday,
        totalGamesPlayed: totalGamesPlayed[0]?.total || 0,
        activeAchievements,
        gameBreakdown: gameStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/achievements
// @desc    Get all achievements
// @access  Admin
router.get('/achievements', async (req, res) => {
  try {
    const achievements = await Achievement.find().sort({ createdAt: -1 });
    res.json({ success: true, achievements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/achievements
// @desc    Create new achievement
// @access  Admin
router.post('/achievements', [
  body('id').trim().notEmpty(),
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('points').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const achievement = await Achievement.create(req.body);
    res.status(201).json({ success: true, achievement });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Achievement ID already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/achievements/:id
// @desc    Update achievement
// @access  Admin
router.put('/achievements/:id', async (req, res) => {
  try {
    const achievement = await Achievement.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!achievement) {
      return res.status(404).json({ success: false, message: 'Achievement not found' });
    }

    res.json({ success: true, achievement });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/admin/achievements/:id
// @desc    Delete achievement
// @access  Admin
router.delete('/achievements/:id', async (req, res) => {
  try {
    await Achievement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Achievement deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/analytics/summary
// @desc    Get analytics summary
// @access  Admin
router.get('/analytics/summary', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const analytics = await Analytics.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    const dailyStats = await Analytics.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          events: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      summary: analytics,
      dailyStats: dailyStats.map(d => ({
        date: d._id,
        events: d.events,
        uniqueUsers: d.uniqueUsers.length
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
