const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file path - portable, stored in project folder
const DB_PATH = path.join(__dirname, '..', 'cyberguard.db');

// Initialize database connection
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize tables
function initDatabase() {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            username TEXT,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `);

    // User stats table
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_score INTEGER DEFAULT 0,
            games_completed INTEGER DEFAULT 0,
            achievements TEXT DEFAULT '[]',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Achievements table
    db.exec(`
        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            achievement_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            points INTEGER DEFAULT 0,
            criteria TEXT
        )
    `);

    // User achievements
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            achievement_id TEXT NOT NULL,
            earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, achievement_id)
        )
    `);

    // Scanned URLs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS scanned_urls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            url TEXT NOT NULL,
            is_safe INTEGER DEFAULT 1,
            threat_type TEXT DEFAULT 'none',
            risk_score INTEGER DEFAULT 0,
            details TEXT,
            scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Game progress table
    db.exec(`
        CREATE TABLE IF NOT EXISTS game_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game_type TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            data TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Sessions table for tracking
    db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Seed default achievements
    seedAchievements();

    // Create default admin user
    dbHelpers.createDefaultAdminUser();

    console.log('✅ SQLite database initialized at:', DB_PATH);
}

// Seed default achievements
function seedAchievements() {
    const defaultAchievements = [
        { id: 'first_login', name: 'First Steps', description: 'Logged in for the first time', icon: '🎯', points: 10 },
        { id: 'password_master', name: 'Password Master', description: 'Completed the Password Vault game', icon: '🔐', points: 50 },
        { id: 'phish_detective', name: 'Phish Detective', description: 'Completed the Phishing Detective game', icon: '🕵️', points: 50 },
        { id: 'file_guardian', name: 'File Guardian', description: 'Completed the SecureShare game', icon: '📁', points: 50 },
        { id: 'url_guardian', name: 'URL Guardian', description: 'Scanned 5 URLs successfully', icon: '🌐', points: 30 },
        { id: 'score_100', name: 'Century', description: 'Reached 100 points', icon: '💯', points: 20 },
        { id: 'score_500', name: 'High Roller', description: 'Reached 500 points', icon: '🎰', points: 50 },
        { id: 'score_1000', name: 'Cyber Expert', description: 'Reached 1000 points', icon: '🏆', points: 100 }
    ];

    const stmt = db.prepare(`
        INSERT OR IGNORE INTO achievements (achievement_id, name, description, icon, points)
        VALUES (?, ?, ?, ?, ?)
    `);

    for (const ach of defaultAchievements) {
        stmt.run(ach.id, ach.name, ach.description, ach.icon, ach.points);
    }
}

// Database helper methods
const dbHelpers = {
    // Users
    createUser: (email, password, username) => {
        const stmt = db.prepare('INSERT INTO users (email, password, username) VALUES (?, ?, ?)');
        const result = stmt.run(email, password, username);
        
        // Create user stats record
        const statsStmt = db.prepare('INSERT INTO user_stats (user_id) VALUES (?)');
        statsStmt.run(result.lastInsertRowid);
        
        return result.lastInsertRowid;
    },

    getUserByEmail: (email) => {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        return stmt.get(email);
    },

    getUserById: (id) => {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(id);
    },

    updateLastLogin: (id) => {
        const stmt = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(id);
    },

    updateUserPassword: (id, hashedPassword) => {
        const stmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
        stmt.run(hashedPassword, id);
    },

    // User Stats
    getUserStats: (userId) => {
        const stmt = db.prepare('SELECT * FROM user_stats WHERE user_id = ?');
        return stmt.get(userId);
    },

    updateUserStats: (userId, totalScore, gamesCompleted) => {
        const stmt = db.prepare(`
            UPDATE user_stats 
            SET total_score = ?, games_completed = ? 
            WHERE user_id = ?
        `);
        stmt.run(totalScore, gamesCompleted, userId);
    },

    // Scanned URLs
    saveScannedURL: (userId, url, isSafe, threatType, riskScore, details) => {
        const stmt = db.prepare(`
            INSERT INTO scanned_urls (user_id, url, is_safe, threat_type, risk_score, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(userId, url, isSafe ? 1 : 0, threatType, riskScore, details);
    },

    getUserScannedURLs: (userId, limit = 50) => {
        const stmt = db.prepare(`
            SELECT * FROM scanned_urls 
            WHERE user_id = ? 
            ORDER BY scanned_at DESC 
            LIMIT ?
        `);
        return stmt.all(userId, limit);
    },

    getScanStats: (userId) => {
        const stmt = db.prepare(`
            SELECT 
                COUNT(*) as total_scans,
                SUM(CASE WHEN is_safe = 1 THEN 1 ELSE 0 END) as safe_urls,
                SUM(CASE WHEN is_safe = 0 THEN 1 ELSE 0 END) as malicious_urls
            FROM scanned_urls 
            WHERE user_id = ?
        `);
        return stmt.get(userId);
    },

    // Achievements
    getAllAchievements: () => {
        const stmt = db.prepare('SELECT * FROM achievements');
        return stmt.all();
    },

    getUserAchievements: (userId) => {
        const stmt = db.prepare(`
            SELECT a.*, ua.earned_at 
            FROM achievements a
            JOIN user_achievements ua ON a.achievement_id = ua.achievement_id
            WHERE ua.user_id = ?
        `);
        return stmt.all(userId);
    },

    addUserAchievement: (userId, achievementId) => {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO user_achievements (user_id, achievement_id)
            VALUES (?, ?)
        `);
        return stmt.run(userId, achievementId);
    },

    // Game Progress
    saveGameProgress: (userId, gameType, score, data = null) => {
        const stmt = db.prepare(`
            INSERT INTO game_progress (user_id, game_type, score, data)
            VALUES (?, ?, ?, ?)
        `);
        return stmt.run(userId, gameType, score, data ? JSON.stringify(data) : null);
    },

    getUserGameProgress: (userId) => {
        const stmt = db.prepare(`
            SELECT * FROM game_progress 
            WHERE user_id = ? 
            ORDER BY completed_at DESC
        `);
        return stmt.all(userId);
    },

    // Reports
    getDatabaseReport: () => {
        return {
            users: db.prepare('SELECT COUNT(*) as count FROM users').get(),
            scanned_urls: db.prepare('SELECT COUNT(*) as count FROM scanned_urls').get(),
            game_sessions: db.prepare('SELECT COUNT(*) as count FROM game_progress').get(),
            achievements_earned: db.prepare('SELECT COUNT(*) as count FROM user_achievements').get(),
            top_users: db.prepare(`
                SELECT u.email, u.username, s.total_score, s.games_completed
                FROM users u
                JOIN user_stats s ON u.id = s.user_id
                ORDER BY s.total_score DESC
                LIMIT 10
            `).all()
        };
    },

    // Comprehensive Report Generation
    generateComprehensiveReport: () => {
        const now = new Date().toISOString();
        
        // User statistics
        const userStats = {
            total_users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
            new_users_today: db.prepare(`
                SELECT COUNT(*) as count FROM users 
                WHERE DATE(created_at) = DATE('now')
            `).get().count,
            new_users_this_week: db.prepare(`
                SELECT COUNT(*) as count FROM users 
                WHERE created_at >= DATE('now', '-7 days')
            `).get().count,
            new_users_this_month: db.prepare(`
                SELECT COUNT(*) as count FROM users 
                WHERE created_at >= DATE('now', '-30 days')
            `).get().count,
            active_users_today: db.prepare(`
                SELECT COUNT(*) as count FROM users 
                WHERE DATE(last_login) = DATE('now')
            `).get().count,
            admin_count: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count
        };

        // Game statistics
        const gameStats = {
            total_games_played: db.prepare('SELECT COUNT(*) as count FROM game_progress').get().count,
            games_today: db.prepare(`
                SELECT COUNT(*) as count FROM game_progress 
                WHERE DATE(completed_at) = DATE('now')
            `).get().count,
            games_this_week: db.prepare(`
                SELECT COUNT(*) as count FROM game_progress 
                WHERE completed_at >= DATE('now', '-7 days')
            `).get().count,
            games_by_type: db.prepare(`
                SELECT game_type, COUNT(*) as count 
                FROM game_progress 
                GROUP BY game_type
            `).all(),
            average_score: db.prepare('SELECT AVG(score) as avg FROM game_progress').get().avg || 0,
            total_points_awarded: db.prepare('SELECT SUM(score) as total FROM game_progress').get().total || 0,
            top_games: db.prepare(`
                SELECT u.email, gp.game_type, gp.score, gp.completed_at
                FROM game_progress gp
                JOIN users u ON gp.user_id = u.id
                ORDER BY gp.score DESC
                LIMIT 10
            `).all()
        };

        // Achievement statistics
        const achievementStats = {
            total_achievements_earned: db.prepare('SELECT COUNT(*) as count FROM user_achievements').get().count,
            achievements_today: db.prepare(`
                SELECT COUNT(*) as count FROM user_achievements 
                WHERE DATE(earned_at) = DATE('now')
            `).get().count,
            achievements_this_week: db.prepare(`
                SELECT COUNT(*) as count FROM user_achievements 
                WHERE earned_at >= DATE('now', '-7 days')
            `).get().count,
            most_earned_achievements: db.prepare(`
                SELECT a.name, a.icon, COUNT(ua.id) as earned_count
                FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.achievement_id
                GROUP BY ua.achievement_id
                ORDER BY earned_count DESC
                LIMIT 10
            `).all(),
            users_with_most_achievements: db.prepare(`
                SELECT u.email, u.username, COUNT(ua.id) as achievement_count
                FROM user_achievements ua
                JOIN users u ON ua.user_id = u.id
                GROUP BY ua.user_id
                ORDER BY achievement_count DESC
                LIMIT 10
            `).all()
        };

        // Security scan statistics
        const scanStats = {
            total_scans: db.prepare('SELECT COUNT(*) as count FROM scanned_urls').get().count,
            scans_today: db.prepare(`
                SELECT COUNT(*) as count FROM scanned_urls 
                WHERE DATE(scanned_at) = DATE('now')
            `).get().count,
            scans_this_week: db.prepare(`
                SELECT COUNT(*) as count FROM scanned_urls 
                WHERE scanned_at >= DATE('now', '-7 days')
            `).get().count,
            safe_vs_malicious: {
                safe: db.prepare('SELECT COUNT(*) as count FROM scanned_urls WHERE is_safe = 1').get().count,
                malicious: db.prepare('SELECT COUNT(*) as count FROM scanned_urls WHERE is_safe = 0').get().count
            },
            threat_types: db.prepare(`
                SELECT threat_type, COUNT(*) as count 
                FROM scanned_urls 
                WHERE is_safe = 0 AND threat_type != 'none'
                GROUP BY threat_type
            `).all(),
            top_scanned_urls: db.prepare(`
                SELECT url, COUNT(*) as scan_count 
                FROM scanned_urls 
                GROUP BY url 
                ORDER BY scan_count DESC 
                LIMIT 10
            `).all()
        };

        // System health
        const dbSize = fs.statSync(DB_PATH).size;
        const systemHealth = {
            database_size_bytes: dbSize,
            database_size_mb: (dbSize / (1024 * 1024)).toFixed(2),
            report_generated_at: now,
            tables: {
                users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
                user_stats: db.prepare('SELECT COUNT(*) as count FROM user_stats').get().count,
                achievements: db.prepare('SELECT COUNT(*) as count FROM achievements').get().count,
                user_achievements: db.prepare('SELECT COUNT(*) as count FROM user_achievements').get().count,
                scanned_urls: db.prepare('SELECT COUNT(*) as count FROM scanned_urls').get().count,
                game_progress: db.prepare('SELECT COUNT(*) as count FROM game_progress').get().count,
                sessions: db.prepare('SELECT COUNT(*) as count FROM sessions').get().count
            }
        };

        return {
            report_title: 'CyberGuard Academy - Comprehensive Backend Report',
            generated_at: now,
            summary: {
                total_users: userStats.total_users,
                total_games_played: gameStats.total_games_played,
                total_achievements_earned: achievementStats.total_achievements_earned,
                total_security_scans: scanStats.total_scans,
                database_size_mb: systemHealth.database_size_mb
            },
            users: userStats,
            games: gameStats,
            achievements: achievementStats,
            security_scans: scanStats,
            system: systemHealth
        };
    },

    // Create default admin user
    createDefaultAdminUser: () => {
        const bcrypt = require('bcryptjs');
        const adminEmail = 'admin@cyberguard.com';
        const adminPassword = 'admin123';
        
        // Check if admin already exists
        const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
        if (existingAdmin) {
            console.log('Admin user already exists');
            return;
        }
        
        const hashedPassword = bcrypt.hashSync(adminPassword, 10);
        
        const stmt = db.prepare(`
            INSERT INTO users (email, password, username, role, created_at, last_login)
            VALUES (?, ?, ?, 'admin', datetime('now'), datetime('now'))
        `);
        
        const result = stmt.run(adminEmail, hashedPassword, 'Administrator');
        
        // Create user stats for admin
        const statsStmt = db.prepare(`
            INSERT INTO user_stats (user_id, total_score, games_completed)
            VALUES (?, 0, 0)
        `);
        statsStmt.run(result.lastInsertRowid);
        
        console.log('✅ Default admin user created:');
        console.log('   Email: admin@cyberguard.com');
        console.log('   Password: admin123');
    }
};

module.exports = { db, initDatabase, dbHelpers };
