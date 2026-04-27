// CyberGuard Academy - API Service
// Handles all communication with the backend API

const API_BASE_URL = 'http://localhost:5003/api';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
    }

    // Token Management
    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    clearToken() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    }

    setUser(user) {
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
    }

    isAuthenticated() {
        return !!this.token;
    }

    // HTTP Request Helper
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication Endpoints
    async register(username, email, password) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: { username, email, password }
        });
        
        if (data.success) {
            this.setToken(data.token);
            this.setUser(data.user);
        }
        
        return data;
    }

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
        
        if (data.success) {
            this.setToken(data.token);
            this.setUser(data.user);
        }
        
        return data;
    }

    async logout() {
        this.clearToken();
        return { success: true };
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    async changePassword(currentPassword, newPassword) {
        return await this.request('/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword }
        });
    }

    async forgotPassword(email) {
        return await this.request('/auth/forgot-password', {
            method: 'POST',
            body: { email }
        });
    }

    async resetPassword(token, newPassword) {
        return await this.request('/auth/reset-password', {
            method: 'POST',
            body: { token, newPassword }
        });
    }

    // User Endpoints
    async getUserProfile() {
        return await this.request('/users/profile');
    }

    async updateProfile(profileData) {
        return await this.request('/users/profile', {
            method: 'PUT',
            body: profileData
        });
    }

    async getUserAchievements() {
        return await this.request('/users/achievements');
    }

    async getUserStats() {
        return await this.request('/users/stats');
    }

    async getGameProgress(gameType) {
        return await this.request(`/users/progress/${gameType}`);
    }

    // Game Endpoints
    async saveGameProgress(gameType, score, maxPossibleScore = 100, timeSpent = 0, details = {}) {
        return await this.request('/games/save-progress', {
            method: 'POST',
            body: { gameType, score, maxPossibleScore, timeSpent, details }
        });
    }

    async getAllProgress() {
        return await this.request('/games/progress');
    }

    async getAchievements() {
        return await this.request('/games/achievements');
    }

    async getGameContent(gameType) {
        return await this.request(`/games/${gameType}/questions`);
    }

    // Leaderboard Endpoints
    async getGlobalLeaderboard(page = 1, limit = 50) {
        return await this.request(`/leaderboard/global?page=${page}&limit=${limit}`);
    }

    async getGameLeaderboard(gameType, limit = 50) {
        return await this.request(`/leaderboard/game/${gameType}?limit=${limit}`);
    }

    async getNearbyRankings(userId, range = 5) {
        return await this.request(`/leaderboard/nearby?userId=${userId}&range=${range}`);
    }

    async getLeaderboardStats() {
        return await this.request('/leaderboard/stats');
    }

    // Analytics Endpoints
    async trackEvent(eventType, gameType = null, metadata = {}, sessionId = null) {
        return await this.request('/analytics/track', {
            method: 'POST',
            body: { eventType, gameType, metadata, sessionId }
        });
    }

    async getUserAnalytics(days = 30) {
        return await this.request(`/analytics/user?days=${days}`);
    }

    async getProgressAnalytics() {
        return await this.request('/analytics/progress');
    }

    async getSkillsAnalytics() {
        return await this.request('/analytics/skills');
    }

    async getActivityAnalytics(year = new Date().getFullYear()) {
        return await this.request(`/analytics/activity?year=${year}`);
    }

    async resetProgress() {
        return await this.request('/users/reset', {
            method: 'POST'
        });
    }

    // Admin Endpoints (require admin role)
    async getAllUsers(page = 1, limit = 20, search = '') {
        return await this.request(`/admin/users?page=${page}&limit=${limit}&search=${search}`);
    }

    async getUserDetails(userId) {
        return await this.request(`/admin/users/${userId}`);
    }

    async updateUser(userId, updates) {
        return await this.request(`/admin/users/${userId}`, {
            method: 'PUT',
            body: updates
        });
    }

    async deleteUser(userId) {
        return await this.request(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
    }

    async getAdminStats() {
        return await this.request('/admin/stats');
    }

    async getAllAchievements() {
        return await this.request('/admin/achievements');
    }

    async createAchievement(achievement) {
        return await this.request('/admin/achievements', {
            method: 'POST',
            body: achievement
        });
    }

    async updateAchievement(id, updates) {
        return await this.request(`/admin/achievements/${id}`, {
            method: 'PUT',
            body: updates
        });
    }

    async deleteAchievement(id) {
        return await this.request(`/admin/achievements/${id}`, {
            method: 'DELETE'
        });
    }

    // Achievements Endpoints
    async getAchievements() {
        return await this.request('/games/achievements');
    }

    async getUserAchievements() {
        return await this.request('/users/achievements');
    }

    // URL Scanner Endpoints
    async scanURL(url) {
        return await this.request('/urlscanner/scan', {
            method: 'POST',
            body: { url }
        });
    }

    async getScanHistory() {
        return await this.request('/urlscanner/history');
    }

    async getScanStats() {
        return await this.request('/urlscanner/stats');
    }

    // Report Generation Endpoints
    async getComprehensiveReport() {
        return await this.request('/reports/dashboard');
    }

    async getAdminReport() {
        return await this.request('/reports/comprehensive');
    }
}

// Create global instance
const api = new ApiService();
