// CyberGuard Academy - Interactive Cybersecurity Games

class GameManager {
    constructor() {
        this.currentGame = null;
        this.totalScore = parseInt(localStorage.getItem('totalScore')) || 0;
        this.gamesCompleted = parseInt(localStorage.getItem('gamesCompleted')) || 0;
        this.achievements = JSON.parse(localStorage.getItem('achievements')) || [];
        this.updateUI();
    }

    updateUI() {
        document.getElementById('totalScore').textContent = this.totalScore;
        document.getElementById('gamesCompleted').textContent = this.gamesCompleted;
        document.getElementById('achievements').textContent = this.achievements.length;
        
        // Update skill level based on score
        const skillLevel = this.getSkillLevel();
        document.getElementById('skillLevel').textContent = skillLevel;
    }

    getSkillLevel() {
        if (this.totalScore >= 1000) return 'Expert';
        if (this.totalScore >= 500) return 'Advanced';
        if (this.totalScore >= 200) return 'Intermediate';
        return 'Beginner';
    }

    addScore(points) {
        this.totalScore += points;
        localStorage.setItem('totalScore', this.totalScore);
        this.updateUI();
        this.animateScoreIncrease(points);
    }

    animateScoreIncrease(points) {
        const scoreElement = document.getElementById('totalScore');
        const notification = document.createElement('div');
        notification.className = 'score-notification';
        notification.textContent = `+${points}`;
        notification.style.cssText = `
            position: absolute;
            top: -30px;
            right: 0;
            color: #10b981;
            font-weight: bold;
            font-size: 1.2rem;
            animation: slideUp 2s ease-out forwards;
            pointer-events: none;
        `;
        
        scoreElement.parentElement.style.position = 'relative';
        scoreElement.parentElement.appendChild(notification);
        
        setTimeout(() => notification.remove(), 2000);
    }

    completeGame(gameType, score) {
        this.gamesCompleted++;
        this.addScore(score);
        localStorage.setItem('gamesCompleted', this.gamesCompleted);
        
        // Check for achievements
        this.checkAchievements(gameType, score);
        this.updateUI();
    }

    checkAchievements(gameType, score) {
        const newAchievements = [];
        
        if (gameType === 'password' && score >= 80 && !this.achievements.includes('password_master')) {
            newAchievements.push({
                id: 'password_master',
                title: 'Password Master',
                description: 'Created 5 strong passwords in a row!'
            });
        }
        
        if (gameType === 'phishing' && score >= 90 && !this.achievements.includes('phish_detector')) {
            newAchievements.push({
                id: 'phish_detector',
                title: 'Phish Detector',
                description: 'Identified all phishing attempts correctly!'
            });
        }
        
        if (this.totalScore >= 500 && !this.achievements.includes('cyber_guardian')) {
            newAchievements.push({
                id: 'cyber_guardian',
                title: 'Cyber Guardian',
                description: 'Reached 500 total points!'
            });
        }

        newAchievements.forEach(achievement => {
            this.achievements.push(achievement.id);
            this.showAchievement(achievement);
        });
        
        localStorage.setItem('achievements', JSON.stringify(this.achievements));
    }

    showAchievement(achievement) {
        const notification = document.getElementById('achievementNotification');
        document.getElementById('achievementTitle').textContent = achievement.title;
        document.getElementById('achievementDesc').textContent = achievement.description;
        
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 4000);
    }
}

// Game Classes
class PasswordGame {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.currentLevel = 1;
        this.score = 0;
        this.maxLevel = 5;
        this.passwords = [
            { weak: 'password123', hint: 'Too common and predictable' },
            { weak: 'admin', hint: 'Too short and obvious' },
            { weak: 'qwerty', hint: 'Keyboard pattern' },
            { weak: '12345678', hint: 'Sequential numbers' },
            { weak: 'password', hint: 'Dictionary word' }
        ];
    }

    start() {
        this.renderGame();
        this.nextChallenge();
    }

    renderGame() {
        const gameArea = document.getElementById('gameArea');
        gameArea.innerHTML = `
            <div class="password-game">
                <h3 class="text-2xl mb-4 text-cyber-blue">Create a Strong Password</h3>
                <div class="challenge-info mb-6">
                    <p id="passwordChallenge" class="text-lg text-white/80"></p>
                </div>
                <input type="text" id="passwordInput" class="password-input" placeholder="Enter your password...">
                <div class="strength-meter" id="strengthMeter">
                    <div class="strength-bar"></div>
                    <div class="strength-bar"></div>
                    <div class="strength-bar"></div>
                    <div class="strength-bar"></div>
                    <div class="strength-bar"></div>
                </div>
                <div id="passwordFeedback" class="mt-4 text-lg"></div>
                <button id="submitPassword" class="play-btn mt-6" onclick="passwordGame.checkPassword()">
                    <i class="fas fa-check"></i> Submit Password
                </button>
            </div>
        `;

        document.getElementById('passwordInput').addEventListener('input', (e) => {
            this.updateStrengthMeter(e.target.value);
        });
    }

    nextChallenge() {
        if (this.currentLevel > this.maxLevel) {
            this.completeGame();
            return;
        }

        const challenges = [
            'Create a password with at least 8 characters, including uppercase, lowercase, numbers, and symbols',
            'Make a password that includes your favorite hobby but is still secure',
            'Create a memorable password using a passphrase technique',
            'Design a password for a banking website (extra security needed)',
            'Create the ultimate unbreakable password'
        ];

        document.getElementById('passwordChallenge').textContent = challenges[this.currentLevel - 1];
        document.getElementById('passwordInput').value = '';
        this.updateProgress();
    }

    updateStrengthMeter(password) {
        const strength = this.calculateStrength(password);
        const bars = document.querySelectorAll('.strength-bar');
        
        bars.forEach((bar, index) => {
            if (index < strength) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });

        this.updateFeedback(password, strength);
    }

    calculateStrength(password) {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    }

    updateFeedback(password, strength) {
        const feedback = document.getElementById('passwordFeedback');
        const messages = [
            { text: 'Very Weak - Add more characters and complexity', class: 'message error' },
            { text: 'Weak - Add uppercase letters and numbers', class: 'message error' },
            { text: 'Fair - Add special characters for better security', class: 'message info' },
            { text: 'Good - Almost there! Consider adding more length', class: 'message info' },
            { text: 'Excellent - This is a strong password!', class: 'message success' }
        ];

        if (strength > 0) {
            feedback.innerHTML = `<div class="${messages[strength - 1].class}">${messages[strength - 1].text}</div>`;
        } else {
            feedback.innerHTML = '';
        }
    }

    checkPassword() {
        const password = document.getElementById('passwordInput').value;
        const strength = this.calculateStrength(password);
        
        if (strength >= 4) {
            this.score += 20;
            this.currentLevel++;
            this.showMessage('Excellent password! Moving to next challenge...', 'success');
            setTimeout(() => this.nextChallenge(), 2000);
        } else {
            this.showMessage('Password needs improvement. Try again!', 'error');
        }
        
        this.updateGameScore();
    }

    updateProgress() {
        const progress = ((this.currentLevel - 1) / this.maxLevel) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${this.currentLevel - 1}/${this.maxLevel}`;
    }

    updateGameScore() {
        document.getElementById('gameScore').textContent = this.score;
    }

    showMessage(text, type) {
        const existing = document.querySelector('.temp-message');
        if (existing) existing.remove();

        const message = document.createElement('div');
        message.className = `message ${type} temp-message`;
        message.textContent = text;
        document.getElementById('passwordFeedback').appendChild(message);
    }

    completeGame() {
        this.gameManager.completeGame('password', this.score);
        document.getElementById('gameArea').innerHTML = `
            <div class="text-center">
                <div class="text-6xl mb-4">🏆</div>
                <h3 class="text-3xl mb-4 text-cyber-blue">Password Master!</h3>
                <p class="text-xl mb-6">You've completed all password challenges!</p>
                <div class="text-2xl text-cyber-green mb-4">Final Score: ${this.score} points</div>
                <button class="play-btn" onclick="closeGame()">Continue Learning</button>
            </div>
        `;
    }
}

class PhishingGame {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.currentLevel = 1;
        this.score = 0;
        this.maxLevel = 5;
        this.websites = [
            {
                url: 'https://secure-bank-login.com',
                content: 'Welcome to SecureBank - Login to your account',
                isPhishing: true,
                clues: ['Suspicious URL', 'No HTTPS lock icon', 'Urgent language']
            },
            {
                url: 'https://amazon.com',
                content: 'Amazon - Earth\'s Most Customer Centric Company',
                isPhishing: false,
                clues: ['Legitimate URL', 'Proper branding', 'HTTPS secure']
            },
            {
                url: 'https://paypal-security-update.net',
                content: 'PayPal Security Alert - Update Required Immediately!',
                isPhishing: true,
                clues: ['Wrong domain', 'Urgent language', 'Suspicious TLD']
            },
            {
                url: 'https://microsoft.com',
                content: 'Microsoft - Cloud, Computers, Apps & Gaming',
                isPhishing: false,
                clues: ['Official domain', 'Professional design', 'Consistent branding']
            },
            {
                url: 'https://google-verification.tk',
                content: 'Google Account Verification - Click here NOW!',
                isPhishing: true,
                clues: ['Fake domain', 'Pressure tactics', 'Unusual TLD']
            }
        ];
    }

    start() {
        this.renderGame();
        this.nextChallenge();
    }

    renderGame() {
        const gameArea = document.getElementById('gameArea');
        gameArea.innerHTML = `
            <div class="phishing-game">
                <h3 class="text-2xl mb-4 text-cyber-blue">Is this website safe?</h3>
                <div class="website-preview" id="websitePreview">
                    <div class="browser-bar mb-4 p-2 bg-gray-200 rounded">
                        <div class="url-bar bg-white p-2 rounded text-black" id="urlBar"></div>
                    </div>
                    <div class="website-content" id="websiteContent"></div>
                </div>
                <div class="choice-buttons">
                    <button class="choice-btn safe" onclick="phishingGame.makeChoice(false)">
                        <i class="fas fa-shield-check"></i> Safe Website
                    </button>
                    <button class="choice-btn danger" onclick="phishingGame.makeChoice(true)">
                        <i class="fas fa-exclamation-triangle"></i> Phishing Site
                    </button>
                </div>
                <div id="phishingFeedback" class="mt-4"></div>
            </div>
        `;
    }

    nextChallenge() {
        if (this.currentLevel > this.maxLevel) {
            this.completeGame();
            return;
        }

        const website = this.websites[this.currentLevel - 1];
        document.getElementById('urlBar').textContent = website.url;
        document.getElementById('websiteContent').innerHTML = `
            <h2 class="text-xl font-bold mb-2">${website.content}</h2>
            <p class="text-gray-600">Click below to determine if this is a legitimate website or a phishing attempt.</p>
        `;
        
        this.currentWebsite = website;
        this.updateProgress();
    }

    makeChoice(isPhishing) {
        const correct = this.currentWebsite.isPhishing === isPhishing;
        
        if (correct) {
            this.score += 20;
            this.showFeedback('Correct! Well spotted!', 'success', this.currentWebsite.clues);
        } else {
            this.showFeedback('Incorrect. Here\'s what to look for:', 'error', this.currentWebsite.clues);
        }
        
        this.currentLevel++;
        this.updateGameScore();
        setTimeout(() => this.nextChallenge(), 3000);
    }

    showFeedback(message, type, clues) {
        const feedback = document.getElementById('phishingFeedback');
        const cluesList = clues.map(clue => `<li>${clue}</li>`).join('');
        
        feedback.innerHTML = `
            <div class="message ${type}">
                <p class="font-bold mb-2">${message}</p>
                <ul class="text-left list-disc list-inside">
                    ${cluesList}
                </ul>
            </div>
        `;
    }

    updateProgress() {
        const progress = ((this.currentLevel - 1) / this.maxLevel) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${this.currentLevel - 1}/${this.maxLevel}`;
    }

    updateGameScore() {
        document.getElementById('gameScore').textContent = this.score;
    }

    completeGame() {
        this.gameManager.completeGame('phishing', this.score);
        document.getElementById('gameArea').innerHTML = `
            <div class="text-center">
                <div class="text-6xl mb-4">🕵️</div>
                <h3 class="text-3xl mb-4 text-cyber-blue">Phish Detective!</h3>
                <p class="text-xl mb-6">You've mastered phishing detection!</p>
                <div class="text-2xl text-cyber-green mb-4">Final Score: ${this.score} points</div>
                <button class="play-btn" onclick="closeGame()">Continue Learning</button>
            </div>
        `;
    }
}

class FileShareGame {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.currentLevel = 1;
        this.score = 0;
        this.maxLevel = 4;
        this.scenarios = [
            {
                file: 'company_budget.xlsx',
                type: 'confidential',
                correctPermissions: ['read-only', 'internal-only'],
                description: 'Company financial data that needs protection'
            },
            {
                file: 'team_photo.jpg',
                type: 'public',
                correctPermissions: ['public', 'download'],
                description: 'Team photo for the company website'
            },
            {
                file: 'client_contracts.pdf',
                type: 'restricted',
                correctPermissions: ['read-only', 'password-protected', 'internal-only'],
                description: 'Sensitive legal documents'
            },
            {
                file: 'marketing_ideas.docx',
                type: 'internal',
                correctPermissions: ['edit', 'internal-only', 'version-control'],
                description: 'Collaborative document for team members'
            }
        ];
    }

    start() {
        this.renderGame();
        this.nextChallenge();
    }

    renderGame() {
        const gameArea = document.getElementById('gameArea');
        gameArea.innerHTML = `
            <div class="file-share-game">
                <h3 class="text-2xl mb-4 text-cyber-blue">Configure File Permissions</h3>
                <div id="fileScenario" class="mb-6"></div>
                <div id="permissionControls" class="permission-controls flex-wrap justify-center"></div>
                <div id="fileShareFeedback" class="mt-4"></div>
                <button id="submitPermissions" class="play-btn mt-6" onclick="fileShareGame.checkPermissions()">
                    <i class="fas fa-check"></i> Apply Permissions
                </button>
            </div>
        `;
    }

    nextChallenge() {
        if (this.currentLevel > this.maxLevel) {
            this.completeGame();
            return;
        }

        const scenario = this.scenarios[this.currentLevel - 1];
        this.currentScenario = scenario;
        
        document.getElementById('fileScenario').innerHTML = `
            <div class="file-item">
                <div class="file-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div class="file-info">
                    <h4 class="text-xl font-bold text-white">${scenario.file}</h4>
                    <p class="text-white/70">${scenario.description}</p>
                    <span class="inline-block mt-2 px-3 py-1 bg-cyber-purple/20 rounded-full text-sm">
                        Type: ${scenario.type}
                    </span>
                </div>
            </div>
        `;

        this.renderPermissionControls();
        this.updateProgress();
    }

    renderPermissionControls() {
        const controls = document.getElementById('permissionControls');
        const permissions = [
            'public', 'internal-only', 'read-only', 'edit', 
            'download', 'password-protected', 'version-control', 'time-limited'
        ];

        controls.innerHTML = permissions.map(permission => `
            <button class="permission-btn" data-permission="${permission}" onclick="fileShareGame.togglePermission('${permission}')">
                ${permission.replace('-', ' ')}
            </button>
        `).join('');
    }

    togglePermission(permission) {
        const btn = document.querySelector(`[data-permission="${permission}"]`);
        btn.classList.toggle('active');
    }

    checkPermissions() {
        const selectedPermissions = Array.from(document.querySelectorAll('.permission-btn.active'))
            .map(btn => btn.dataset.permission);
        
        const correctPermissions = this.currentScenario.correctPermissions;
        const isCorrect = this.arraysEqual(selectedPermissions.sort(), correctPermissions.sort());
        
        if (isCorrect) {
            this.score += 25;
            this.showFeedback('Perfect! You\'ve configured the permissions correctly.', 'success');
        } else {
            this.showFeedback(`Incorrect. The correct permissions were: ${correctPermissions.join(', ')}`, 'error');
        }
        
        this.currentLevel++;
        this.updateGameScore();
        setTimeout(() => this.nextChallenge(), 3000);
    }

    arraysEqual(a, b) {
        return a.length === b.length && a.every(val => b.includes(val));
    }

    showFeedback(message, type) {
        const feedback = document.getElementById('fileShareFeedback');
        feedback.innerHTML = `<div class="message ${type}">${message}</div>`;
    }

    updateProgress() {
        const progress = ((this.currentLevel - 1) / this.maxLevel) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${this.currentLevel - 1}/${this.maxLevel}`;
    }

    updateGameScore() {
        document.getElementById('gameScore').textContent = this.score;
    }

    completeGame() {
        this.gameManager.completeGame('fileshare', this.score);
        document.getElementById('gameArea').innerHTML = `
            <div class="text-center">
                <div class="text-6xl mb-4">🔒</div>
                <h3 class="text-3xl mb-4 text-cyber-blue">SecureShare Master!</h3>
                <p class="text-xl mb-6">You've mastered secure file sharing!</p>
                <div class="text-2xl text-cyber-green mb-4">Final Score: ${this.score} points</div>
                <button class="play-btn" onclick="closeGame()">Continue Learning</button>
            </div>
        `;
    }
}

// Global game instances
let gameManager;
let passwordGame;
let phishingGame;
let fileShareGame;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    gameManager = new GameManager();
    
    // Add 3D hover effects to game cards
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'rotateY(10deg) rotateX(10deg) translateZ(30px) scale(1.05)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'rotateY(0deg) rotateX(0deg) translateZ(0px) scale(1)';
        });
    });

    // Add floating animation delays
    document.querySelectorAll('.floating-shape').forEach((shape, index) => {
        shape.style.animationDelay = `${index * 2}s`;
    });
});

// Game Management Functions
function startGame(gameType) {
    const modal = document.getElementById('gameModal');
    const title = document.getElementById('gameTitle');
    
    modal.classList.add('active');
    
    switch(gameType) {
        case 'password':
            title.textContent = 'Password Guardian';
            passwordGame = new PasswordGame(gameManager);
            passwordGame.start();
            break;
        case 'phishing':
            title.textContent = 'Phish Detective';
            phishingGame = new PhishingGame(gameManager);
            phishingGame.start();
            break;
        case 'fileshare':
            title.textContent = 'SecureShare Master';
            fileShareGame = new FileShareGame(gameManager);
            fileShareGame.start();
            break;
    }
}

function closeGame() {
    const modal = document.getElementById('gameModal');
    modal.classList.remove('active');
    
    // Reset game instances
    passwordGame = null;
    phishingGame = null;
    fileShareGame = null;
}

// Add CSS animation for score increase
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        0% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-50px); opacity: 0; }
    }
    
    .score-notification {
        animation: slideUp 2s ease-out forwards;
    }
`;
document.head.appendChild(style);
