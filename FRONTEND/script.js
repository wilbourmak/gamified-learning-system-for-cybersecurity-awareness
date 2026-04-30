// CyberGuard Academy - Interactive Cybersecurity Games

class GameManager {
    constructor() {
        this.currentGame = null;
        this.totalScore = 0;
        this.gamesCompleted = 0;
        this.achievements = [];
        this.user = null;
        this.isLoading = false;
        
        // Initialize from backend if authenticated
        this.init();
    }

    async init() {
        // Check if user is already authenticated
        if (api.isAuthenticated()) {
            await this.loadUserData();
        } else {
            // Fall back to local storage for guests
            this.loadFromLocalStorage();
        }
        this.updateUI();
    }

    loadFromLocalStorage() {
        this.totalScore = parseInt(localStorage.getItem('totalScore')) || 0;
        this.gamesCompleted = parseInt(localStorage.getItem('gamesCompleted')) || 0;
        this.achievements = JSON.parse(localStorage.getItem('achievements')) || [];
    }

    async loadUserData() {
        try {
            this.isLoading = true;
            const response = await api.getCurrentUser();
            
            if (response.success) {
                this.user = response.user;
                this.totalScore = response.user.stats.totalScore;
                this.gamesCompleted = response.user.stats.gamesCompleted;
                this.achievements = response.user.stats.achievements || [];
                
                // Also sync local data if exists
                this.syncLocalData();
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
            // Fall back to local storage
            this.loadFromLocalStorage();
        } finally {
            this.isLoading = false;
        }
    }

    async syncLocalData() {
        // If there was local data, sync it to the server
        const localScore = parseInt(localStorage.getItem('totalScore')) || 0;
        const localGames = parseInt(localStorage.getItem('gamesCompleted')) || 0;
        
        if (localScore > this.totalScore || localGames > this.gamesCompleted) {
            // Update user with higher values
            this.totalScore = Math.max(this.totalScore, localScore);
            this.gamesCompleted = Math.max(this.gamesCompleted, localGames);
            this.updateUI();
        }
    }

    async syncWithBackend() {
        if (!api.isAuthenticated()) return;
        
        try {
            await this.loadUserData();
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }

    onLogin(user, token) {
        this.user = user;
        this.totalScore = user.stats.totalScore;
        this.gamesCompleted = user.stats.gamesCompleted;
        this.achievements = user.stats.achievements || [];
        this.syncLocalData();
        this.updateUI();
        updateAuthUI();
        updateDashboardVisibility(); // Show games after login
        // Load achievements display
        loadAchievements();
    }

    onLogout() {
        this.user = null;
        // Reset scores to 0 on logout
        this.totalScore = 0;
        this.gamesCompleted = 0;
        this.achievements = [];
        this.updateUI();
        updateAuthUI();
        updateDashboardVisibility(); // Hide games after logout
        // Show auth modal after logout
        setTimeout(() => {
            showAuthModal();
        }, 500);
        // Clear achievements display
        const achievementsList = document.getElementById('achievementsList');
        if (achievementsList) {
            achievementsList.innerHTML = `
                <div class="achievement-card locked">
                    <div class="achievement-icon"><i class="fas fa-lock"></i></div>
                    <h4>Login to see your achievements</h4>
                    <p>Play games and unlock achievements!</p>
                    <span class="achievement-points">0 pts</span>
                </div>
            `;
        }
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

    async addScore(points) {
        this.totalScore += points;
        localStorage.setItem('totalScore', this.totalScore);
        this.updateUI();
        this.animateScoreIncrease(points);
        
        // Sync with backend if authenticated
        if (api.isAuthenticated() && this.user) {
            try {
                await api.trackEvent('score_earned', this.currentGame, { points });
            } catch (error) {
                console.error('Failed to track score:', error);
            }
        }
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

    async completeGame(gameType, score) {
        this.gamesCompleted++;
        await this.addScore(score);
        localStorage.setItem('gamesCompleted', this.gamesCompleted);
        
        // Check for achievements locally first
        this.checkAchievements(gameType, score);
        this.updateUI();
        
        // Sync with backend if authenticated
        if (api.isAuthenticated()) {
            try {
                const response = await api.saveGameProgress(gameType, score, 100);
                
                if (response.success && response.newAchievements?.length > 0) {
                    // Show new achievements from backend
                    response.newAchievements.forEach(achievement => {
                        if (!this.achievements.includes(achievement.id)) {
                            this.achievements.push(achievement.id);
                            this.showAchievement(achievement);
                        }
                    });
                    this.updateUI();
                }
            } catch (error) {
                console.error('Failed to sync game progress:', error);
            }
        }
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

class URLScannerGame {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.score = 0;
        this.scanHistory = [];
        this.maxScans = 5;
    }

    start() {
        this.renderGame();
        this.loadHistory();
    }

    renderGame() {
        const gameArea = document.getElementById('gameArea');
        gameArea.innerHTML = `
            <div class="url-scanner-game">
                <h3 class="text-2xl mb-4 text-cyber-blue">URL Guardian Scanner</h3>
                <p class="text-white/70 mb-4">Enter a website URL to check if it's safe or malicious. URLs are saved to your history.</p>
                
                <div class="url-input-container" style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <input type="text" id="urlInput" placeholder="Enter URL (e.g., google.com)" 
                           style="flex: 1; padding: 12px; border-radius: 8px; border: 1px solid var(--cyber-blue); background: rgba(0,0,0,0.5); color: white;">
                    <button class="play-btn" onclick="urlScannerGame.pasteURL()" title="Paste from clipboard">
                        <i class="fas fa-paste"></i>
                    </button>
                    <button class="play-btn" onclick="urlScannerGame.scanURL()">
                        <i class="fas fa-search"></i> Scan
                    </button>
                </div>
                
                <!-- Sample URLs to copy -->
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <p style="color: var(--cyber-blue); margin-bottom: 10px; font-size: 0.9rem;">
                        <i class="fas fa-link"></i> Click to copy sample URLs:
                    </p>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <button onclick="urlScannerGame.copyToInput('https://google.com')" 
                                style="padding: 6px 12px; font-size: 0.8rem; background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; border-radius: 4px; cursor: pointer;">
                            ✅ google.com
                        </button>
                        <button onclick="urlScannerGame.copyToInput('https://github.com')" 
                                style="padding: 6px 12px; font-size: 0.8rem; background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; border-radius: 4px; cursor: pointer;">
                            ✅ github.com
                        </button>
                        <button onclick="urlScannerGame.copyToInput('http://login-paypal-verify.xyz')" 
                                style="padding: 6px 12px; font-size: 0.8rem; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; border-radius: 4px; cursor: pointer;">
                            ⚠️ Phishing URL
                        </button>
                        <button onclick="urlScannerGame.copyToInput('bit.ly/suspicious-link')" 
                                style="padding: 6px 12px; font-size: 0.8rem; background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid #f59e0b; border-radius: 4px; cursor: pointer;">
                            ⚠️ Short URL
                        </button>
                        <button onclick="urlScannerGame.copyToInput('free-prize-winner.tk')" 
                                style="padding: 6px 12px; font-size: 0.8rem; background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid #f59e0b; border-radius: 4px; cursor: pointer;">
                            ⚠️ Spam URL
                        </button>
                    </div>
                </div>
                
                <div id="scanResult" class="mb-4"></div>
                <div id="scanHistory" class="scan-history"></div>
                
                <div class="mt-4 text-center">
                    <span id="scanCount" style="color: var(--cyber-blue);">Scans: 0/${this.maxScans}</span>
                </div>
            </div>
        `;
    }

    copyToInput(url) {
        const urlInput = document.getElementById('urlInput');
        if (urlInput) {
            urlInput.value = url;
            urlInput.focus();
            // Visual feedback
            urlInput.style.borderColor = '#10b981';
            setTimeout(() => {
                urlInput.style.borderColor = 'var(--cyber-blue)';
            }, 500);
        }
    }

    async pasteURL() {
        try {
            const text = await navigator.clipboard.readText();
            const urlInput = document.getElementById('urlInput');
            if (urlInput) {
                urlInput.value = text;
                urlInput.focus();
            }
        } catch (err) {
            showNotification('Unable to access clipboard. Please paste manually (Ctrl+V)', 'error');
        }
    }

    async scanURL() {
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.showResult('Please enter a URL', 'error');
            return;
        }

        // Show loading
        this.showResult('<i class="fas fa-spinner fa-spin"></i> Scanning...', 'info');

        try {
            // Call API to scan URL
            const response = await api.scanURL(url);
            
            if (response.success) {
                const result = response.result;
                this.scanHistory.unshift(result);
                
                // Add score based on correct identification
                let points = 10;
                if (result.isSafe) {
                    points = 15; // Bonus for identifying safe URLs
                }
                this.score += points;
                this.gameManager.addScore(points);
                
                // Display result
                const statusIcon = result.isSafe ? '✅' : '⚠️';
                const statusClass = result.isSafe ? 'success' : 'error';
                const statusText = result.isSafe ? 'SAFE' : 'SUSPICIOUS';
                
                this.showResult(`
                    <div class="scan-result ${statusClass}" style="padding: 15px; border-radius: 8px; background: ${result.isSafe ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border: 1px solid ${result.isSafe ? '#10b981' : '#ef4444'};">
                        <div style="font-size: 2rem; margin-bottom: 10px;">${statusIcon}</div>
                        <h4 style="color: ${result.isSafe ? '#10b981' : '#ef4444'}; margin-bottom: 5px;">${statusText}</h4>
                        <p style="color: rgba(255,255,255,0.8); margin-bottom: 10px;">${result.url}</p>
                        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.6);">${result.details}</p>
                        <div style="margin-top: 10px; font-size: 0.8rem;">
                            Risk Score: <span style="color: ${result.riskScore > 50 ? '#ef4444' : result.riskScore > 25 ? '#f59e0b' : '#10b981'}">${result.riskScore}/100</span>
                        </div>
                        <div style="margin-top: 5px; color: var(--cyber-green); font-weight: bold;">+${points} points!</div>
                    </div>
                `, statusClass);
                
                this.updateHistoryDisplay();
                this.updateScanCount();
                urlInput.value = '';
                
                // Check if game is complete
                if (this.scanHistory.length >= this.maxScans) {
                    setTimeout(() => this.completeGame(), 2000);
                }
            } else {
                this.showResult('Failed to scan URL. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Scan error:', error);
            this.showResult('Error scanning URL. Please try again.', 'error');
        }
    }

    async loadHistory() {
        try {
            const response = await api.getScanHistory();
            if (response.success && response.scans) {
                this.scanHistory = response.scans.slice(0, 10);
                this.updateHistoryDisplay();
                this.updateScanCount();
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }

    updateHistoryDisplay() {
        const historyDiv = document.getElementById('scanHistory');
        if (!historyDiv) return;

        if (this.scanHistory.length === 0) {
            historyDiv.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center;">No scans yet. Enter a URL above!</p>';
            return;
        }

        historyDiv.innerHTML = `
            <h4 style="margin-bottom: 10px; color: var(--cyber-blue);">Recent Scans</h4>
            ${this.scanHistory.map(scan => `
                <div class="history-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 8px; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid ${scan.isSafe ? '#10b981' : '#ef4444'};">
                    <div style="flex: 1; overflow: hidden;">
                        <div style="color: white; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${scan.url}</div>
                        <div style="color: rgba(255,255,255,0.5); font-size: 0.75rem;">${new Date(scan.scannedAt).toLocaleString()}</div>
                    </div>
                    <div style="margin-left: 10px;">
                        <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; background: ${scan.isSafe ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${scan.isSafe ? '#10b981' : '#ef4444'};">
                            ${scan.isSafe ? 'Safe' : scan.threatType}
                        </span>
                    </div>
                </div>
            `).join('')}
        `;
    }

    updateScanCount() {
        const countEl = document.getElementById('scanCount');
        if (countEl) {
            countEl.textContent = `Scans: ${this.scanHistory.length}/${this.maxScans}`;
        }
    }

    showResult(message, type) {
        const resultDiv = document.getElementById('scanResult');
        if (resultDiv) {
            resultDiv.innerHTML = `<div class="message ${type}">${message}</div>`;
        }
    }

    completeGame() {
        this.gameManager.completeGame('urlscanner', this.score);
        const gameArea = document.getElementById('gameArea');
        gameArea.innerHTML = `
            <div class="text-center">
                <div class="text-6xl mb-4">🌐</div>
                <h3 class="text-3xl mb-4 text-cyber-blue">URL Guardian!</h3>
                <p class="text-xl mb-6">You've scanned ${this.scanHistory.length} URLs!</p>
                <div class="text-2xl text-cyber-green mb-4">Final Score: ${this.score} points</div>
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="color: rgba(255,255,255,0.7);">All scanned URLs have been saved to your database history.</p>
                </div>
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
let urlScannerGame;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    gameManager = new GameManager();
    
    // Initialize auth UI after game manager loads
    setTimeout(() => {
        updateAuthUI();
        updateDashboardVisibility();
        loadAchievements(); // Load achievements on page load
        
        // Auto-show auth modal if not logged in
        if (!api.isAuthenticated()) {
            showAuthModal();
        }
    }, 100);
    
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

// Show/hide dashboard based on auth state
function updateDashboardVisibility() {
    const gamesSection = document.querySelector('.games-section');
    const leaderboardSection = document.querySelector('.leaderboard-section');
    const achievementsSection = document.querySelector('.achievements-section');
    const heroStats = document.querySelector('.hero-stats');
    
    if (api.isAuthenticated()) {
        // Show all content for logged in users
        if (gamesSection) {
            gamesSection.style.display = '';
            // Remove auth message if exists
            const authMsg = gamesSection.querySelector('.auth-required-wrapper');
            if (authMsg) authMsg.remove();
            // Show game cards
            const gameCards = gamesSection.querySelector('.games-grid');
            if (gameCards) gameCards.style.display = 'grid';
        }
        if (leaderboardSection) leaderboardSection.style.display = '';
        if (achievementsSection) achievementsSection.style.display = '';
        if (heroStats) heroStats.style.display = 'grid';
    } else {
        // Hide games section for guests, show message instead
        if (gamesSection) {
            // Hide game cards
            const gameCards = gamesSection.querySelector('.games-grid');
            if (gameCards) gameCards.style.display = 'none';
            
            // Add auth message if not exists
            let authMsg = gamesSection.querySelector('.auth-required-wrapper');
            if (!authMsg) {
                authMsg = document.createElement('div');
                authMsg.className = 'auth-required-wrapper';
                authMsg.innerHTML = `
                    <div class="container">
                        <div class="auth-required-message" style="text-align: center; padding: 4rem 2rem;">
                            <i class="fas fa-lock" style="font-size: 4rem; color: var(--cyber-blue); margin-bottom: 1.5rem; display: block;"></i>
                            <h2 style="margin-bottom: 1rem;">Join to Play Games</h2>
                            <p style="color: rgba(255,255,255,0.7); margin-bottom: 2rem; max-width: 500px; margin-left: auto; margin-right: auto;">
                                Create an account or sign in to access all cybersecurity games, track your progress, and compete on the leaderboard!
                            </p>
                            <button class="play-btn" onclick="showAuthModal()" style="font-size: 1.1rem; padding: 1rem 2rem;">
                                <i class="fas fa-user-plus"></i> Get Started
                            </button>
                        </div>
                    </div>
                `;
                gamesSection.appendChild(authMsg);
            }
            authMsg.style.display = 'block';
        }
        // Keep leaderboard and achievements visible but empty state
        if (heroStats) heroStats.style.display = 'none';
    }
}

// Game Management Functions
function startGame(gameType) {
    // Check if user is logged in
    if (!api.isAuthenticated()) {
        showNotification('Please login or register to play games!', 'error');
        showAuthModal();
        return;
    }
    
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
        case 'urlscanner':
            title.textContent = 'URL Guardian';
            urlScannerGame = new URLScannerGame(gameManager);
            urlScannerGame.start();
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
    urlScannerGame = null;
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

// ============================================
// AUTH & USER MANAGEMENT
// ============================================

function showAuthModal() {
    document.getElementById('authModal').classList.add('show');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('show');
    // Clear error messages
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
    document.getElementById('forgotError').textContent = '';
    document.getElementById('resetError').textContent = '';
    // Reset to register tab by default
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('forgotPasswordForm').classList.add('hidden');
    document.getElementById('resetPasswordForm').classList.add('hidden');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerTab').classList.add('active');
}

function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    try {
        const response = await api.login(email, password);
        if (response.success) {
            gameManager.onLogin(response.user, response.token);
            closeAuthModal();
            showNotification('Welcome back, ' + response.user.username + '!', 'success');
        }
    } catch (error) {
        errorEl.textContent = error.message || 'Login failed. Please try again.';
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');

    try {
        const response = await api.register(username, email, password);
        if (response.success) {
            gameManager.onLogin(response.user, response.token);
            closeAuthModal();
            showNotification('Welcome to CyberGuard Academy, ' + response.user.username + '!', 'success');
        }
    } catch (error) {
        errorEl.textContent = error.message || 'Registration failed. Please try again.';
    }
}

async function logout() {
    await api.logout();
    gameManager.onLogout();
    showNotification('Logged out successfully', 'info');
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');

    if (api.isAuthenticated() && gameManager.user) {
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');
        userName.textContent = gameManager.user.profile?.displayName || gameManager.user.username;
    } else {
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
}

// Forgot Password Functions
function showForgotPassword() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('forgotPasswordForm').classList.remove('hidden');
    document.getElementById('resetPasswordForm').classList.add('hidden');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerTab').classList.remove('active');
}

function backToLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('forgotPasswordForm').classList.add('hidden');
    document.getElementById('resetPasswordForm').classList.add('hidden');
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
    document.getElementById('forgotError').textContent = '';
    document.getElementById('resetError').textContent = '';
}

async function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    const errorEl = document.getElementById('forgotError');
    const successEl = document.getElementById('forgotSuccess');

    try {
        const response = await api.forgotPassword(email);
        if (response.success) {
            successEl.textContent = response.message || 'If the email exists, a new password will be sent to your email address.';
            errorEl.textContent = '';
            showNotification('Password recovery email sent!', 'success');
        }
    } catch (error) {
        errorEl.textContent = error.message || 'Failed to send password recovery. Please try again.';
        successEl.textContent = '';
    }
}

async function handleResetPassword(event) {
    event.preventDefault();
    const token = document.getElementById('resetToken').value;
    const newPassword = document.getElementById('newResetPassword').value;
    const errorEl = document.getElementById('resetError');

    try {
        const response = await api.resetPassword(token, newPassword);
        if (response.success) {
            backToLogin();
            showNotification('Password reset successful! Please login.', 'success');
        }
    } catch (error) {
        errorEl.textContent = error.message || 'Failed to reset password. Token may have expired.';
    }
}

// ============================================
// Learn More Modal Functions
function showLearnMoreModal(type) {
    const modal = document.getElementById('learnMoreModal');
    const title = document.getElementById('learnMoreTitle');
    const content = document.getElementById('learnMoreContent');
    
    if (!modal || !title || !content) return;
    
    const contentData = {
        tips: {
            title: '<i class="fas fa-shield-alt"></i> Cybersecurity Tips',
            body: `
                <div style="line-height: 1.8;">
                    <h3 style="color: var(--cyber-blue); margin-bottom: 1rem;">🔐 Essential Security Tips</h3>
                    
                    <div style="background: rgba(6, 182, 212, 0.1); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border-left: 4px solid var(--cyber-blue);">
                        <h4 style="margin-bottom: 0.5rem;">1. Use Strong, Unique Passwords</h4>
                        <p>Combine uppercase, lowercase, numbers, and special characters. Use a password manager to generate and store unique passwords for each account.</p>
                    </div>
                    
                    <div style="background: rgba(16, 185, 129, 0.1); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border-left: 4px solid var(--cyber-green);">
                        <h4 style="margin-bottom: 0.5rem;">2. Enable Two-Factor Authentication (2FA)</h4>
                        <p>Add an extra layer of security beyond passwords. Use authenticator apps or hardware keys when available.</p>
                    </div>
                    
                    <div style="background: rgba(249, 115, 22, 0.1); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border-left: 4px solid var(--cyber-orange);">
                        <h4 style="margin-bottom: 0.5rem;">3. Beware of Phishing Emails</h4>
                        <p>Don't click suspicious links. Verify sender addresses. Legitimate organizations won't ask for passwords via email.</p>
                    </div>
                    
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border-left: 4px solid #ef4444;">
                        <h4 style="margin-bottom: 0.5rem;">4. Keep Software Updated</h4>
                        <p>Regularly update your operating system, browsers, and applications. Enable automatic updates when possible.</p>
                    </div>
                    
                    <div style="background: rgba(139, 92, 246, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid #8b5cf6;">
                        <h4 style="margin-bottom: 0.5rem;">5. Use Secure Networks</h4>
                        <p>Avoid public Wi-Fi for sensitive transactions. Use a VPN when connecting to unsecured networks.</p>
                    </div>
                </div>
            `
        },
        practices: {
            title: '<i class="fas fa-user-shield"></i> Security Best Practices',
            body: `
                <div style="line-height: 1.8;">
                    <h3 style="color: var(--cyber-green); margin-bottom: 1rem;">🛡️ Daily Security Habits</h3>
                    
                    <div style="background: rgba(6, 182, 212, 0.1); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                        <h4 style="margin-bottom: 0.5rem; color: var(--cyber-blue);"><i class="fas fa-lock"></i> Password Management</h4>
                        <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                            <li>Change passwords every 3-6 months</li>
                            <li>Never reuse passwords across accounts</li>
                            <li>Use passphrases instead of simple words</li>
                            <li>Store passwords in encrypted password managers</li>
                        </ul>
                    </div>
                    
                    <div style="background: rgba(16, 185, 129, 0.1); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                        <h4 style="margin-bottom: 0.5rem; color: var(--cyber-green);"><i class="fas fa-envelope"></i> Email Security</h4>
                        <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                            <li>Don't open attachments from unknown senders</li>
                            <li>Hover over links to preview URLs</li>
                            <li>Use spam filters and email authentication</li>
                            <li>Report suspicious emails to your IT team</li>
                        </ul>
                    </div>
                    
                    <div style="background: rgba(249, 115, 22, 0.1); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                        <h4 style="margin-bottom: 0.5rem; color: var(--cyber-orange);"><i class="fas fa-shopping-cart"></i> Online Shopping</h4>
                        <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                            <li>Only shop on HTTPS websites (look for the padlock)</li>
                            <li>Use credit cards instead of debit cards</li>
                            <li>Monitor bank statements regularly</li>
                            <li>Be wary of deals that seem too good</li>
                        </ul>
                    </div>
                    
                    <div style="background: rgba(139, 92, 246, 0.1); padding: 1.5rem; border-radius: 12px;">
                        <h4 style="margin-bottom: 0.5rem; color: #8b5cf6;"><i class="fas fa-mobile-alt"></i> Mobile Device Security</h4>
                        <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                            <li>Use biometric locks or strong PINs</li>
                            <li>Install apps only from official stores</li>
                            <li>Review app permissions regularly</li>
                            <li>Enable remote wipe capabilities</li>
                        </ul>
                    </div>
                </div>
            `
        },
        resources: {
            title: '<i class="fas fa-external-link-alt"></i> Helpful Resources',
            body: `
                <div style="line-height: 1.8;">
                    <h3 style="color: var(--cyber-gold); margin-bottom: 1rem;">📚 Cybersecurity Resources</h3>
                    
                    <div style="background: rgba(6, 182, 212, 0.1); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                        <h4 style="margin-bottom: 0.5rem; color: var(--cyber-blue);"><i class="fas fa-graduation-cap"></i> Learning Platforms</h4>
                        <ul style="margin-left: 1.5rem; margin-top: 0.5rem; list-style: none;">
                            <li style="margin-bottom: 0.5rem;"><a href="https://www.coursera.org/browse/computer-science/cybersecurity" target="_blank" style="color: var(--cyber-blue);">Coursera Cybersecurity Courses</a></li>
                            <li style="margin-bottom: 0.5rem;"><a href="https://cybersecuritydegrees.org/" target="_blank" style="color: var(--cyber-blue);">CyberSecurityDegrees.org</a></li>
                            <li><a href="https://www.cybrary.it/" target="_blank" style="color: var(--cyber-blue);">Cybrary - Free Cybersecurity Training</a></li>
                        </ul>
                    </div>
                    
                    <div style="background: rgba(16, 185, 129, 0.1); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                        <h4 style="margin-bottom: 0.5rem; color: var(--cyber-green);"><i class="fas fa-tools"></i> Security Tools</h4>
                        <ul style="margin-left: 1.5rem; margin-top: 0.5rem; list-style: none;">
                            <li style="margin-bottom: 0.5rem;"><a href="https://haveibeenpwned.com/" target="_blank" style="color: var(--cyber-green);">Have I Been Pwned? - Check Breached Accounts</a></li>
                            <li style="margin-bottom: 0.5rem;"><a href="https://www.virustotal.com/" target="_blank" style="color: var(--cyber-green);">VirusTotal - File & URL Scanner</a></li>
                            <li><a href="https://bitwarden.com/" target="_blank" style="color: var(--cyber-green);">Bitwarden - Free Password Manager</a></li>
                        </ul>
                    </div>
                    
                    <div style="background: rgba(249, 115, 22, 0.1); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                        <h4 style="margin-bottom: 0.5rem; color: var(--cyber-orange);"><i class="fas fa-shield-alt"></i> Official Agencies</h4>
                        <ul style="margin-left: 1.5rem; margin-top: 0.5rem; list-style: none;">
                            <li style="margin-bottom: 0.5rem;"><a href="https://www.cisa.gov/" target="_blank" style="color: var(--cyber-orange);">CISA - Cybersecurity & Infrastructure</a></li>
                            <li style="margin-bottom: 0.5rem;"><a href="https://www.ncsc.gov.uk/" target="_blank" style="color: var(--cyber-orange);">UK National Cyber Security Centre</a></li>
                            <li><a href="https://staysafeonline.org/" target="_blank" style="color: var(--cyber-orange);">National Cyber Security Alliance</a></li>
                        </ul>
                    </div>
                    
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 1.5rem; border-radius: 12px;">
                        <h4 style="margin-bottom: 0.5rem; color: #ef4444;"><i class="fas fa-bug"></i> Reporting Cybercrime</h4>
                        <ul style="margin-left: 1.5rem; margin-top: 0.5rem; list-style: none;">
                            <li style="margin-bottom: 0.5rem;"><a href="https://www.ic3.gov/" target="_blank" style="color: #ef4444;">FBI Internet Crime Complaint Center (IC3)</a></li>
                            <li><a href="https://www.actionfraud.police.uk/" target="_blank" style="color: #ef4444;">Action Fraud (UK)</a></li>
                        </ul>
                    </div>
                </div>
            `
        }
    };
    
    const data = contentData[type] || contentData.tips;
    title.innerHTML = data.title;
    content.innerHTML = data.body;
    
    modal.classList.add('active');
}

function closeLearnMoreModal() {
    const modal = document.getElementById('learnMoreModal');
    if (modal) modal.classList.remove('active');
}

// ============================================
// Report Generation Functions
// ============================================
let currentReportData = null;

function showReportModal() {
    const modal = document.getElementById('reportModal');
    const content = document.getElementById('reportContent');
    const actions = document.getElementById('reportActions');
    
    if (!modal) return;
    
    modal.classList.add('active');
    
    // Show loading state
    content.innerHTML = `
        <div id="reportLoading" class="report-loading" style="text-align: center; padding: 3rem;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--cyber-blue); margin-bottom: 1rem; display: block;"></i>
            <p>Generating comprehensive report...</p>
        </div>
    `;
    actions.style.display = 'none';
    
    // Generate report
    generateReport();
}

function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) modal.classList.remove('active');
}

async function generateReport() {
    try {
        const response = await api.getComprehensiveReport();
        
        if (response.success && response.report) {
            currentReportData = response.report;
            renderReport(response.report);
        } else {
            showReportError('Failed to generate report');
        }
    } catch (error) {
        console.error('Report generation error:', error);
        showReportError('Error connecting to server');
    }
}

function showReportError(message) {
    const content = document.getElementById('reportContent');
    content.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #ef4444;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h3>${message}</h3>
            <p>Please try again later or check your connection.</p>
            <button class="btn btn-primary" onclick="generateReport()" style="margin-top: 1rem;">
                <i class="fas fa-sync-alt"></i> Retry
            </button>
        </div>
    `;
}

function renderReport(report) {
    const content = document.getElementById('reportContent');
    const actions = document.getElementById('reportActions');
    
    const generatedDate = new Date(report.generated_at).toLocaleString();
    
    let html = `
        <div class="report-container" style="font-family: inherit;">
            <!-- Report Header -->
            <div class="report-header" style="text-align: center; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 2px solid rgba(255,255,255,0.1);">
                <h2 style="color: var(--cyber-gold); margin-bottom: 0.5rem;">
                    <i class="fas fa-file-alt"></i> ${report.report_title}
                </h2>
                <p style="color: rgba(255,255,255,0.6);">Generated: ${generatedDate}</p>
            </div>
            
            <!-- Executive Summary -->
            <div class="report-section" style="margin-bottom: 2rem;">
                <h3 style="color: var(--cyber-blue); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-chart-pie"></i> Executive Summary
                </h3>
                <div class="summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div class="summary-card" style="background: rgba(6, 182, 212, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--cyber-blue);">
                        <div style="font-size: 2rem; font-weight: bold; color: var(--cyber-blue);">${report.summary.total_users}</div>
                        <div style="color: rgba(255,255,255,0.8);">Total Users</div>
                    </div>
                    <div class="summary-card" style="background: rgba(16, 185, 129, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--cyber-green);">
                        <div style="font-size: 2rem; font-weight: bold; color: var(--cyber-green);">${report.summary.total_games_played}</div>
                        <div style="color: rgba(255,255,255,0.8);">Games Played</div>
                    </div>
                    <div class="summary-card" style="background: rgba(249, 115, 22, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--cyber-orange);">
                        <div style="font-size: 2rem; font-weight: bold; color: var(--cyber-orange);">${report.summary.total_achievements_earned}</div>
                        <div style="color: rgba(255,255,255,0.8);">Achievements</div>
                    </div>
                    <div class="summary-card" style="background: rgba(139, 92, 246, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid #8b5cf6;">
                        <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">${report.summary.total_security_scans}</div>
                        <div style="color: rgba(255,255,255,0.8);">Security Scans</div>
                    </div>
                </div>
            </div>
            
            <!-- User Statistics -->
            <div class="report-section" style="margin-bottom: 2rem;">
                <h3 style="color: var(--cyber-blue); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-users"></i> User Statistics
                </h3>
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div class="stat-item" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--cyber-gold);">${report.users.total_users}</div>
                        <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">Total Users</div>
                    </div>
                    <div class="stat-item" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--cyber-gold);">${report.users.new_users_today}</div>
                        <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">New Today</div>
                    </div>
                    <div class="stat-item" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--cyber-gold);">${report.users.new_users_this_week}</div>
                        <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">New This Week</div>
                    </div>
                    <div class="stat-item" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--cyber-gold);">${report.users.active_users_today}</div>
                        <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">Active Today</div>
                    </div>
                    <div class="stat-item" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--cyber-gold);">${report.users.admin_count}</div>
                        <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">Admins</div>
                    </div>
                </div>
            </div>
            
            <!-- Game Statistics -->
            <div class="report-section" style="margin-bottom: 2rem;">
                <h3 style="color: var(--cyber-green); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-gamepad"></i> Game Statistics
                </h3>
                <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                        <div>
                            <strong style="color: var(--cyber-green);">Total Games:</strong> ${report.games.total_games_played}
                        </div>
                        <div>
                            <strong style="color: var(--cyber-green);">Today:</strong> ${report.games.games_today}
                        </div>
                        <div>
                            <strong style="color: var(--cyber-green);">This Week:</strong> ${report.games.games_this_week}
                        </div>
                        <div>
                            <strong style="color: var(--cyber-green);">Total Points:</strong> ${report.games.total_points_awarded}
                        </div>
                    </div>
                    <div style="margin-top: 1rem;">
                        <h4 style="color: rgba(255,255,255,0.8); margin-bottom: 0.5rem;">Games by Type:</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${report.games.games_by_type.map(g => `
                                <span style="background: rgba(16, 185, 129, 0.2); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem;">
                                    ${g.game_type}: ${g.count}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Security Scan Statistics -->
            <div class="report-section" style="margin-bottom: 2rem;">
                <h3 style="color: var(--cyber-orange); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-shield-alt"></i> Security Scan Statistics
                </h3>
                <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="stat-item" style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--cyber-blue);">${report.security_scans.total_scans}</div>
                            <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">Total Scans</div>
                        </div>
                        <div class="stat-item" style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">${report.security_scans.safe_vs_malicious.safe}</div>
                            <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">Safe URLs</div>
                        </div>
                        <div class="stat-item" style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #ef4444;">${report.security_scans.safe_vs_malicious.malicious}</div>
                            <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">Threats Found</div>
                        </div>
                    </div>
                    ${report.security_scans.threat_types.length > 0 ? `
                        <div style="margin-top: 1rem;">
                            <h4 style="color: rgba(255,255,255,0.8); margin-bottom: 0.5rem;">Threat Types Detected:</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${report.security_scans.threat_types.map(t => `
                                    <span style="background: rgba(239, 68, 68, 0.2); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem;">
                                        ${t.threat_type}: ${t.count}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Achievement Statistics -->
            <div class="report-section" style="margin-bottom: 2rem;">
                <h3 style="color: var(--cyber-gold); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-trophy"></i> Achievement Statistics
                </h3>
                <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 12px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="stat-item" style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--cyber-gold);">${report.achievements.total_achievements_earned}</div>
                            <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">Total Earned</div>
                        </div>
                        <div class="stat-item" style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--cyber-gold);">${report.achievements.achievements_today}</div>
                            <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">Today</div>
                        </div>
                        <div class="stat-item" style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--cyber-gold);">${report.achievements.achievements_this_week}</div>
                            <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">This Week</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- System Health -->
            <div class="report-section" style="margin-bottom: 2rem;">
                <h3 style="color: #8b5cf6; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-server"></i> System Health
                </h3>
                <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 12px;">
                    <div style="margin-bottom: 1rem;">
                        <strong>Database Size:</strong> ${report.system.database_size_mb} MB
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem;">
                        ${Object.entries(report.system.tables).map(([table, count]) => `
                            <div style="background: rgba(139, 92, 246, 0.1); padding: 0.75rem; border-radius: 8px; text-align: center;">
                                <div style="font-weight: bold; color: #8b5cf6;">${count}</div>
                                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">${table}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
    actions.style.display = 'flex';
}

function downloadReportAsJSON() {
    if (!currentReportData) return;
    
    const dataStr = JSON.stringify(currentReportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyberguard-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function printReport() {
    window.print();
}

// ============================================
// Admin Dashboard Functions
// ============================================
let isAdminLoggedIn = false;

function showAdminLoginModal() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) modal.classList.add('active');
}

function closeAdminLoginModal() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) modal.classList.remove('active');
    document.getElementById('adminLoginForm')?.reset();
    document.getElementById('adminLoginError').textContent = '';
}

async function handleAdminLogin(event) {
    event.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const errorEl = document.getElementById('adminLoginError');
    
    try {
        // Use regular login API but check for admin role
        const response = await api.login(email, password);
        console.log('Login response:', response);
        
        if (response.success && response.user?.role === 'admin') {
            console.log('Admin login successful');
            isAdminLoggedIn = true;
            closeAdminLoginModal();
            showAdminDashboard();
        } else if (response.success) {
            console.log('Login success but not admin. Role:', response.user?.role);
            errorEl.textContent = 'Access denied. Admin privileges required. Your role: ' + (response.user?.role || 'none');
            // Log out the non-admin user
            await api.logout();
        } else {
            errorEl.textContent = response.message || 'Invalid credentials';
        }
    } catch (error) {
        console.error('Admin login error:', error);
        errorEl.textContent = 'Login failed: ' + error.message;
    }
}

function showAdminDashboard() {
    document.body.classList.add('admin-logged-in');
    document.getElementById('adminDashboard').classList.remove('hidden');
    showAdminSection('overview');
}

function hideAdminDashboard() {
    document.body.classList.remove('admin-logged-in');
    document.getElementById('adminDashboard').classList.add('hidden');
}

async function adminLogout() {
    isAdminLoggedIn = false;
    hideAdminDashboard();
    await api.logout();
    showNotification('Admin logged out successfully', 'success');
}

function showAdminSection(section) {
    // Update active nav item
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event?.target?.classList.add('active');
    
    const content = document.getElementById('adminContent');
    
    switch(section) {
        case 'overview':
            renderAdminOverview(content);
            break;
        case 'reports':
            renderAdminReports(content);
            break;
        case 'users':
            renderAdminUsers(content);
            break;
        case 'security':
            renderAdminSecurity(content);
            break;
    }
}

function renderAdminOverview(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <i class="fas fa-shield-alt" style="font-size: 4rem; color: var(--cyber-red); margin-bottom: 1rem;"></i>
            <h2 style="color: white; margin-bottom: 1rem;">Welcome to Admin Dashboard</h2>
            <p style="color: rgba(255,255,255,0.6); max-width: 600px; margin: 0 auto;">
                Access comprehensive reports, manage users, and monitor security scans. 
                Use the sidebar to navigate between different administrative functions.
            </p>
            <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button class="btn-primary" onclick="showAdminSection('reports'); document.querySelector('[onclick=\"showAdminSection('reports')\"]').classList.add('active');">
                    <i class="fas fa-file-alt"></i> View Reports
                </button>
                <button class="btn-secondary" onclick="generateAdminReport()">
                    <i class="fas fa-sync-alt"></i> Generate Report
                </button>
            </div>
        </div>
    `;
}

async function generateAdminReport() {
    const container = document.getElementById('adminContent');
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--cyber-blue);"></i>
            <p style="margin-top: 1rem;">Generating comprehensive report...</p>
        </div>
    `;
    
    try {
        const response = await api.getComprehensiveReport();
        if (response.success) {
            renderAdminReportContent(container, response.report);
        } else {
            container.innerHTML = `<p style="color: #ef4444; text-align: center;">Failed to generate report</p>`;
        }
    } catch (error) {
        container.innerHTML = `<p style="color: #ef4444; text-align: center;">Error: ${error.message}</p>`;
    }
}

function renderAdminReportContent(container, report) {
    container.innerHTML = `
        <div style="max-width: 1200px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2 style="color: var(--cyber-gold);"><i class="fas fa-file-alt"></i> Comprehensive Report</h2>
                <div style="display: flex; gap: 1rem;">
                    <button class="btn-secondary" onclick="downloadReportAsJSON()">
                        <i class="fas fa-download"></i> Download JSON
                    </button>
                    <button class="btn-primary" onclick="printReport()">
                        <i class="fas fa-print"></i> Print
                    </button>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div style="background: rgba(6, 182, 212, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--cyber-blue);">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--cyber-blue);">${report.summary.total_users}</div>
                    <div style="color: rgba(255,255,255,0.8);">Total Users</div>
                </div>
                <div style="background: rgba(16, 185, 129, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--cyber-green);">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--cyber-green);">${report.summary.total_games_played}</div>
                    <div style="color: rgba(255,255,255,0.8);">Games Played</div>
                </div>
                <div style="background: rgba(249, 115, 22, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--cyber-orange);">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--cyber-orange);">${report.summary.total_achievements_earned}</div>
                    <div style="color: rgba(255,255,255,0.8);">Achievements</div>
                </div>
                <div style="background: rgba(139, 92, 246, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid #8b5cf6;">
                    <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">${report.summary.total_security_scans}</div>
                    <div style="color: rgba(255,255,255,0.8);">Security Scans</div>
                </div>
            </div>
            
            <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                <h3 style="color: var(--cyber-blue); margin-bottom: 1rem;">System Information</h3>
                <p><strong>Database Size:</strong> ${report.system.database_size_mb} MB</p>
                <p><strong>Generated:</strong> ${new Date(report.generated_at).toLocaleString()}</p>
            </div>
        </div>
    `;
    currentReportData = report;
}

function renderAdminReports(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <h2 style="color: var(--cyber-gold); margin-bottom: 1rem;"><i class="fas fa-file-alt"></i> Reports</h2>
            <p style="color: rgba(255,255,255,0.6); margin-bottom: 2rem;">Generate and download comprehensive backend reports</p>
            <button class="btn-primary" onclick="generateAdminReport()" style="padding: 1rem 2rem; font-size: 1.1rem;">
                <i class="fas fa-chart-line"></i> Generate Full Report
            </button>
        </div>
    `;
}

function renderAdminUsers(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <h2 style="color: var(--cyber-blue); margin-bottom: 1rem;"><i class="fas fa-users"></i> User Management</h2>
            <p style="color: rgba(255,255,255,0.6);">User management features coming soon...</p>
        </div>
    `;
}

function renderAdminSecurity(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <h2 style="color: var(--cyber-red); margin-bottom: 1rem;"><i class="fas fa-shield-alt"></i> Security</h2>
            <p style="color: rgba(255,255,255,0.6);">Security monitoring features coming soon...</p>
        </div>
    `;
}

// Reset Progress Functions
async function confirmResetProgress() {
    if (!confirm('⚠️ Are you sure you want to reset all progress?\n\nThis will permanently delete:\n• All your points\n• All achievements\n• All game history\n\nThis action cannot be undone!')) {
        return;
    }

    try {
        const response = await api.resetProgress();
        if (response.success) {
            // Reset local state
            gameManager.totalScore = 0;
            gameManager.gamesCompleted = 0;
            gameManager.achievements = [];
            localStorage.removeItem('totalScore');
            localStorage.removeItem('gamesCompleted');
            localStorage.removeItem('achievements');
            
            // Update UI
            gameManager.updateUI();
            loadAchievements();
            
            showNotification('🔄 Progress reset successfully! You can now start fresh.', 'success');
        } else {
            showNotification('❌ Failed to reset progress', 'error');
        }
    } catch (error) {
        console.error('Reset error:', error);
        showNotification('❌ Error resetting progress', 'error');
    }
}

// ACHIEVEMENTS
// ============================================

async function loadAchievements() {
    const container = document.getElementById('achievementsList');
    const countElement = document.getElementById('achievements');

    if (!container) return;

    // If not logged in, show login prompt
    if (!api.isAuthenticated()) {
        container.innerHTML = `
            <div class="achievement-card locked" style="grid-column: 1 / -1; text-align: center;">
                <div class="achievement-icon"><i class="fas fa-lock"></i></div>
                <h4>Login to See Your Achievements</h4>
                <p>Play games and unlock achievements to display them here!</p>
                <button class="btn btn-primary" onclick="showAuthModal()" style="margin-top: 1rem;">
                    <i class="fas fa-sign-in-alt"></i> Login
                </button>
            </div>
        `;
        if (countElement) countElement.textContent = '0';
        return;
    }

    try {
        // Get all achievements and user's earned achievements
        const [allResponse, userResponse] = await Promise.all([
            api.getAchievements(),
            api.getUserAchievements()
        ]);

        const allAchievements = allResponse.success ? allResponse.achievements : [];
        const userAchievements = userResponse.success ? userResponse.achievements : [];

        // Create a Set of earned achievement IDs for quick lookup
        const earnedIds = new Set(userAchievements.map(a => a.achievement_id || a.id));

        // Mark each achievement as earned or not
        const achievementsWithStatus = allAchievements.map(ach => ({
            ...ach,
            earned: earnedIds.has(ach.achievement_id || ach.id)
        }));

        // Update the count at the top (earned achievements only)
        if (countElement) {
            countElement.textContent = userAchievements.length;
        }

        renderAchievements(achievementsWithStatus);
    } catch (error) {
        console.error('Failed to load achievements:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #ef4444;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Failed to load achievements. Please try again later.</p>
            </div>
        `;
        if (countElement) countElement.textContent = '0';
    }
}

function renderAchievements(achievements) {
    const container = document.getElementById('achievementsList');
    if (!container) return;

    if (achievements.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fas fa-medal" style="font-size: 3rem; color: var(--cyber-gold); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">No Achievements Yet</h3>
                <p style="color: rgba(255,255,255,0.6);">Play games to unlock your first achievement!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = achievements.map(ach => {
        const isEarned = ach.earned;
        const cardStyle = isEarned
            ? `
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.05));
                border: 2px solid rgba(16, 185, 129, 0.4);
            `
            : `
                background: linear-gradient(135deg, rgba(107, 114, 128, 0.1), rgba(75, 85, 99, 0.05));
                border: 2px solid rgba(107, 114, 128, 0.3);
                opacity: 0.7;
            `;

        const iconStyle = isEarned
            ? `
                background: linear-gradient(135deg, var(--cyber-gold, #fbbf24), var(--cyber-orange));
                box-shadow: 0 4px 15px rgba(251, 191, 36, 0.3);
            `
            : `
                background: linear-gradient(135deg, #6b7280, #4b5563);
                box-shadow: 0 4px 15px rgba(107, 114, 128, 0.2);
            `;

        const titleStyle = isEarned ? 'color: var(--cyber-gold);' : 'color: #9ca3af;';
        const badge = isEarned
            ? `<span class="achievement-points" style="
                display: inline-block;
                background: linear-gradient(135deg, var(--cyber-gold), var(--cyber-orange));
                padding: 0.4rem 1rem;
                border-radius: 20px;
                font-size: 0.9rem;
                font-weight: 600;
                color: white;
            ">${ach.points || 0} pts</span>`
            : `<span style="
                display: inline-block;
                background: rgba(107, 114, 128, 0.3);
                padding: 0.4rem 1rem;
                border-radius: 20px;
                font-size: 0.9rem;
                color: #9ca3af;
            "><i class="fas fa-lock"></i> Locked</span>`;

        const earnedDate = isEarned && ach.earnedAt
            ? `<div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 0.75rem;">
                <i class="fas fa-calendar-check"></i> Earned ${new Date(ach.earnedAt).toLocaleDateString()}
            </div>`
            : '';

        return `
        <div class="achievement-card ${isEarned ? 'unlocked' : 'locked'}" style="
            ${cardStyle}
            border-radius: 16px;
            padding: 1.5rem;
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        " onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
            <div class="achievement-icon" style="
                width: 70px;
                height: 70px;
                ${iconStyle}
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1rem;
                font-size: 1.8rem;
            ">
                ${isEarned ? (ach.icon || '🏆') : '🔒'}
            </div>
            <h4 style="margin-bottom: 0.5rem; ${titleStyle}">${ach.name}</h4>
            <p style="font-size: 0.9rem; color: rgba(255,255,255,0.8); margin-bottom: 0.75rem;">${ach.description}</p>
            ${badge}
            ${earnedDate}
        </div>
    `}).join('');
}

// ============================================
// LEADERBOARD
// ============================================

let currentLeaderboardType = 'global';

function showLeaderboardModal() {
    document.getElementById('leaderboardModal').classList.add('show');
    loadLeaderboard('global');
}

function closeLeaderboardModal() {
    document.getElementById('leaderboardModal').classList.remove('show');
}

async function loadLeaderboard(type) {
    currentLeaderboardType = type;
    const content = document.getElementById('leaderboardContent');
    
    // Update tab styles
    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event?.target?.classList.add('active');

    content.innerHTML = '<div class="leaderboard-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    try {
        let response;
        if (type === 'global') {
            response = await api.getGlobalLeaderboard(1, 50);
        } else {
            response = await api.getGameLeaderboard(type, 50);
        }

        if (response.success) {
            renderLeaderboard(response.leaderboard, type);
        }
    } catch (error) {
        content.innerHTML = `<div class="message error">Failed to load leaderboard: ${error.message}</div>`;
    }
}

function renderLeaderboard(leaderboard, type) {
    const content = document.getElementById('leaderboardContent');
    const currentUserId = gameManager.user?._id;

    let html = `
        <div class="leaderboard-table">
            <div class="leaderboard-table-header">
                <span>Rank</span>
                <span>Player</span>
                <span>Score</span>
            </div>
    `;

    if (leaderboard.length === 0) {
        html += '<div class="leaderboard-row"><span colspan="3" style="text-align: center;">No data yet. Be the first to play!</span></div>';
    } else {
        leaderboard.forEach((entry, index) => {
            const isCurrentUser = currentUserId && entry._id === currentUserId;
            const rank = entry.rank || (index + 1);
            
            html += `
                <div class="leaderboard-row ${isCurrentUser ? 'current-user' : ''}">
                    <span class="leaderboard-rank ${rank <= 3 ? 'top-3' : ''}">
                        ${rank <= 3 ? '<i class="fas fa-crown"></i> ' : ''}${rank}
                    </span>
                    <span class="leaderboard-name">${entry.username || entry.name}</span>
                    <span class="leaderboard-score">${entry.totalScore || entry.bestScore || entry.score} pts</span>
                </div>
            `;
        });
    }

    html += '</div>';
    content.innerHTML = html;
}

// ============================================
// NOTIFICATIONS
// ============================================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `message ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 3000;
        min-width: 300px;
        animation: slideInUp 0.5s ease-out;
    `;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Close modals on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAuthModal();
        closeLeaderboardModal();
        closeGame();
    }
});

// Close modals on background click
document.getElementById('authModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAuthModal();
});

document.getElementById('leaderboardModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeLeaderboardModal();
});

document.getElementById('learnMoreModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeLearnMoreModal();
});

document.getElementById('reportModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeReportModal();
});

document.getElementById('adminLoginModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAdminLoginModal();
});
