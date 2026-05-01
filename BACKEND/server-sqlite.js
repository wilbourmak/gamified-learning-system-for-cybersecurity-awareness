const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const { db, initDatabase, dbHelpers } = require('./database/sqlite');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const PORT = process.env.PORT || 5003;

const app = express();

// CORS
app.use(cors({
    origin: [
        'http://localhost:8000',
        'https://cyberguardg.netlify.app'
    ],
    credentials: true
}));

app.use(express.json());

// Health check endpoint (for deployment monitoring)
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'CyberGuard Academy API'
    });
});

// Initialize database
initDatabase();

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// Generate random password
const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};

// Auth middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Admin middleware - verifies user has admin role
const requireAdmin = async (req, res, next) => {
    try {
        const user = dbHelpers.getUserById(req.user.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        req.adminUser = user;
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ========== AUTH ROUTES ==========

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        // Check if user exists
        const existingUser = dbHelpers.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const userId = dbHelpers.createUser(email, hashedPassword, username || email.split('@')[0]);
        
        // Generate token
        const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: userId,
                email,
                username: username || email.split('@')[0],
                stats: { totalScore: 0, gamesCompleted: 0, achievements: [] }
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        console.log('Login attempt for:', email);

        // Find user
        const user = dbHelpers.getUserByEmail(email);
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        console.log('User found, role:', user.role);

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password mismatch for:', email);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Update last login
        dbHelpers.updateLastLogin(user.id);

        // Award first_login achievement if not already earned
        const userAchievements = dbHelpers.getUserAchievements(user.id);
        const hasFirstLogin = userAchievements.some(a => a.achievement_id === 'first_login');
        if (!hasFirstLogin) {
            dbHelpers.awardAchievement(user.id, 'first_login');
            console.log('Awarded first_login achievement to user:', user.id);
        }

        // Get stats
        const stats = dbHelpers.getUserStats(user.id) || { total_score: 0, games_completed: 0, achievements: '[]' };
        const achievements = dbHelpers.getUserAchievements(user.id);

        // Generate token
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        const loginResponse = {
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role || 'user',
                stats: {
                    totalScore: stats.total_score || 0,
                    gamesCompleted: stats.games_completed || 0,
                    achievements: achievements.map(a => a.achievement_id)
                }
            }
        };
        console.log('Sending login response:', JSON.stringify(loginResponse.user, null, 2));
        res.json(loginResponse);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// Password recovery request
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = dbHelpers.getUserByEmail(email);
        if (!user) {
            // Don't reveal if email exists for security
            return res.json({ success: true, message: 'If the email exists, a new password will be sent' });
        }

        // Generate new password
        const newPassword = generatePassword();
        const hashedPassword = bcrypt.hashSync(newPassword, 10);

        // Update password in database
        dbHelpers.updateUserPassword(user.id, hashedPassword);

        // Send email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'CyberGuard Academy - Password Recovery',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #00ff88;">CyberGuard Academy</h2>
                    <p>Hello ${user.username},</p>
                    <p>You requested a password recovery. Your new password is:</p>
                    <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="color: #00ff88; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${newPassword}</p>
                    </div>
                    <p>Please log in with this new password and change it immediately for security.</p>
                    <p>If you did not request this change, please ignore this email.</p>
                    <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply.</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Password recovery email sent to:', email);
        } catch (emailError) {
            console.error('Email send error:', emailError);
            // Still return success to avoid revealing email existence
        }

        res.json({ success: true, message: 'If the email exists, a new password will be sent' });
    } catch (error) {
        console.error('Password recovery error:', error);
        res.status(500).json({ success: false, message: 'Server error during password recovery' });
    }
});

// Get current user
app.get('/api/auth/me', authenticate, (req, res) => {
    try {
        const user = dbHelpers.getUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const stats = dbHelpers.getUserStats(user.id) || { total_score: 0, games_completed: 0 };
        const achievements = dbHelpers.getUserAchievements(user.id);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                stats: {
                    totalScore: stats.total_score || 0,
                    gamesCompleted: stats.games_completed || 0,
                    achievements: achievements.map(a => ({
                        id: a.achievement_id,
                        name: a.name,
                        description: a.description,
                        icon: a.icon,
                        earnedAt: a.earned_at
                    }))
                }
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Analyze URL
function analyzeURL(url) {
    const maliciousPatterns = [
        { pattern: /bit\.ly|tinyurl|t\.co|ow\.ly/i, type: 'suspicious', reason: 'URL shortener detected' },
        { pattern: /login|signin|verify|secure|account|update/i, type: 'phishing', reason: 'Phishing keywords detected' },
        { pattern: /\.xyz|\.tk|\.ml|\.ga|\.cf/i, type: 'suspicious', reason: 'Suspicious TLD detected' },
        { pattern: /paypal.*\.com|amazon.*\.com|bank.*\.com/i, type: 'phishing', reason: 'Brand impersonation detected' },
        { pattern: /download|exe|zip|dmg|apk/i, type: 'malware', reason: 'Potential malware download' },
        { pattern: /free|prize|winner|lottery|click.*here/i, type: 'spam', reason: 'Spam keywords detected' }
    ];

    let riskScore = 0;
    let threats = [];

    if (url.startsWith('http://') && !url.includes('localhost')) {
        riskScore += 20;
        threats.push('Unsecured HTTP connection');
    }

    for (const check of maliciousPatterns) {
        if (check.pattern.test(url)) {
            riskScore += 25;
            threats.push(check.reason);
        }
    }

    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
        riskScore += 30;
        threats.push('IP address instead of domain name');
    }

    riskScore = Math.min(riskScore, 100);

    let threatType = 'none';
    if (riskScore > 40) {
        threatType = threats.some(t => t.includes('Phishing')) ? 'phishing' :
                     threats.some(t => t.includes('malware')) ? 'malware' :
                     threats.some(t => t.includes('Spam')) ? 'spam' : 'suspicious';
    }

    return {
        isSafe: riskScore < 40,
        threatType,
        riskScore,
        details: threats.length > 0 ? threats.join('. ') : 'No obvious threats detected'
    };
}

// Scan URL
app.post('/api/urlscanner/scan', authenticate, (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, message: 'URL is required' });
        }

        let validatedUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            validatedUrl = 'https://' + url;
        }

        const analysis = analyzeURL(validatedUrl);

        // Save to database
        dbHelpers.saveScannedURL(
            req.user.userId,
            validatedUrl,
            analysis.isSafe,
            analysis.threatType,
            analysis.riskScore,
            analysis.details
        );

        res.json({
            success: true,
            result: {
                url: validatedUrl,
                isSafe: analysis.isSafe,
                threatType: analysis.threatType,
                riskScore: analysis.riskScore,
                details: analysis.details,
                scannedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ success: false, message: 'Failed to scan URL' });
    }
});

// Get scan history
app.get('/api/urlscanner/history', authenticate, (req, res) => {
    try {
        const scans = dbHelpers.getUserScannedURLs(req.user.userId, 50);
        res.json({
            success: true,
            scans: scans.map(s => ({
                id: s.id,
                url: s.url,
                isSafe: s.is_safe === 1,
                threatType: s.threat_type,
                riskScore: s.risk_score,
                details: s.details,
                scannedAt: s.scanned_at
            }))
        });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ success: false, message: 'Failed to get history' });
    }
});

// Save game progress
app.post('/api/games/progress', authenticate, (req, res) => {
    try {
        const { gameType, score, data } = req.body;
        
        dbHelpers.saveGameProgress(req.user.userId, gameType, score, data);
        
        // Update user stats
        const stats = dbHelpers.getUserStats(req.user.userId);
        const newTotalScore = (stats?.total_score || 0) + score;
        const newGamesCompleted = (stats?.games_completed || 0) + 1;
        
        dbHelpers.updateUserStats(req.user.userId, newTotalScore, newGamesCompleted);

        // Check and award achievements
        const newAchievements = [];
        const userAchievements = dbHelpers.getUserAchievements(req.user.userId);
        const earnedIds = new Set(userAchievements.map(a => a.achievement_id));
        const allAchievements = dbHelpers.getAllAchievements();

        // Achievement: First Game (id: 1)
        if (!earnedIds.has(1) && newGamesCompleted >= 1) {
            dbHelpers.addUserAchievement(req.user.userId, 1);
            const ach = allAchievements.find(a => a.achievement_id === 1);
            if (ach) newAchievements.push(ach);
        }

        // Achievement: Score 100 (id: 2)
        if (!earnedIds.has(2) && newTotalScore >= 100) {
            dbHelpers.addUserAchievement(req.user.userId, 2);
            const ach = allAchievements.find(a => a.achievement_id === 2);
            if (ach) newAchievements.push(ach);
        }

        // Achievement: Score 500 (id: 3)
        if (!earnedIds.has(3) && newTotalScore >= 500) {
            dbHelpers.addUserAchievement(req.user.userId, 3);
            const ach = allAchievements.find(a => a.achievement_id === 3);
            if (ach) newAchievements.push(ach);
        }

        // Achievement: Play 5 Games (id: 4)
        if (!earnedIds.has(4) && newGamesCompleted >= 5) {
            dbHelpers.addUserAchievement(req.user.userId, 4);
            const ach = allAchievements.find(a => a.achievement_id === 4);
            if (ach) newAchievements.push(ach);
        }

        // Achievement: URL Scanner Expert (id: 5)
        if (!earnedIds.has(5) && gameType === 'urlscanner' && score >= 50) {
            dbHelpers.addUserAchievement(req.user.userId, 5);
            const ach = allAchievements.find(a => a.achievement_id === 5);
            if (ach) newAchievements.push(ach);
        }

        res.json({
            success: true,
            newScore: newTotalScore,
            newAchievements: newAchievements.map(a => ({
                id: a.achievement_id,
                name: a.name,
                description: a.description,
                icon: a.icon,
                points: a.points
            }))
        });
    } catch (error) {
        console.error('Save progress error:', error);
        res.status(500).json({ success: false, message: 'Failed to save progress' });
    }
});

// Get all achievements (public)
app.get('/api/games/achievements', (req, res) => {
    try {
        const achievements = dbHelpers.getAllAchievements();
        res.json({
            success: true,
            achievements: achievements.map(a => ({
                id: a.achievement_id,
                name: a.name,
                description: a.description,
                icon: a.icon,
                points: a.points
            }))
        });
    } catch (error) {
        console.error('Achievements error:', error);
        res.status(500).json({ success: false, message: 'Failed to get achievements' });
    }
});

// Get user's earned achievements
app.get('/api/users/achievements', authenticate, (req, res) => {
    try {
        const achievements = dbHelpers.getUserAchievements(req.user.userId);
        res.json({
            success: true,
            achievements: achievements.map(a => ({
                id: a.achievement_id,
                name: a.name,
                description: a.description,
                icon: a.icon,
                points: a.points,
                earnedAt: a.earned_at
            }))
        });
    } catch (error) {
        console.error('User achievements error:', error);
        res.status(500).json({ success: false, message: 'Failed to get user achievements' });
    }
});

// Database report (admin only)
app.get('/api/admin/db-report', authenticate, requireAdmin, (req, res) => {
    try {
        const report = dbHelpers.getDatabaseReport();
        res.json({
            success: true,
            database: 'SQLite (cyberguard.db)',
            location: 'BACKEND/cyberguard.db',
            report: {
                totalUsers: report.users.count,
                totalScannedURLs: report.scanned_urls.count,
                totalGameSessions: report.game_sessions.count,
                topUsers: report.top_users
            }
        });
    } catch (error) {
        console.error('Report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
});

// Reset user progress (for restart feature)
app.post('/api/users/reset', authenticate, (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Reset user stats
        dbHelpers.updateUserStats(userId, 0, 0);
        
        // Clear user achievements
        const stmt = db.prepare('DELETE FROM user_achievements WHERE user_id = ?');
        stmt.run(userId);
        
        // Clear game progress history
        const stmt2 = db.prepare('DELETE FROM game_progress WHERE user_id = ?');
        stmt2.run(userId);
        
        res.json({
            success: true,
            message: 'Progress reset successfully'
        });
    } catch (error) {
        console.error('Reset progress error:', error);
        res.status(500).json({ success: false, message: 'Failed to reset progress' });
    }
});

// Generate comprehensive backend report (admin only)
app.get('/api/reports/comprehensive', authenticate, requireAdmin, (req, res) => {
    try {
        const report = dbHelpers.generateComprehensiveReport();

        res.json({
            success: true,
            report: report
        });
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
});

// Generate dashboard report (admin only)
app.get('/api/reports/dashboard', authenticate, requireAdmin, (req, res) => {
    try {
        const report = dbHelpers.generateComprehensiveReport();

        res.json({
            success: true,
            report: report
        });
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
});

const PORT = 5003;
app.listen(PORT, () => {
    console.log(`✅ SQLite Server running on port ${PORT}`);
    console.log(`📊 Database: cyberguard.db (file-based, portable)`);
    console.log(`🔗 Report endpoint: http://localhost:${PORT}/api/admin/db-report`);
});

module.exports = app;
