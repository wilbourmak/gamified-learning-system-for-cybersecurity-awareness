# CyberGuard Backend API

Node.js/Express backend for CyberGuard Academy - Cybersecurity education platform.

## Features

- **Authentication**: JWT-based auth with login/signup
- **User Management**: Profiles, stats, achievements
- **Game Progress**: Track scores, attempts, completion status
- **Leaderboard**: Global rankings by game type
- **Admin Panel**: User management, achievement management, analytics
- **Analytics**: Activity tracking, progress reports, skill analysis

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs for password hashing

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start server
npm start

# Development mode with auto-reload
npm run dev
```

## Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cyberguard
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/achievements` - Get achievements
- `GET /api/users/stats` - Get detailed stats
- `GET /api/users/progress/:gameType` - Get game progress

### Games
- `POST /api/games/save-progress` - Save game attempt
- `GET /api/games/progress` - Get all progress
- `GET /api/games/achievements` - List achievements
- `GET /api/games/:gameType/questions` - Get game content

### Leaderboard
- `GET /api/leaderboard/global` - Global rankings
- `GET /api/leaderboard/game/:gameType` - Game-specific rankings
- `GET /api/leaderboard/nearby` - Users near your rank
- `GET /api/leaderboard/stats` - Platform statistics

### Admin (requires admin role)
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/stats` - Platform stats
- `GET /api/admin/achievements` - List achievements
- `POST /api/admin/achievements` - Create achievement
- `PUT /api/admin/achievements/:id` - Update achievement
- `DELETE /api/admin/achievements/:id` - Delete achievement

### Analytics
- `POST /api/analytics/track` - Track event
- `GET /api/analytics/user` - User activity
- `GET /api/analytics/progress` - Learning progress
- `GET /api/analytics/skills` - Skill breakdown
- `GET /api/analytics/activity` - Activity heatmap

## Data Models

### User
- username, email, password, role
- profile (avatar, displayName, bio)
- stats (totalScore, gamesCompleted, achievements, skillLevel, streak)

### GameProgress
- user, gameType
- attempts[], bestScore, avgScore, totalAttempts
- completed, completedAt

### Achievement
- id, title, description, icon, points
- requirements (gameType, minScore, etc.)

### Analytics
- user, eventType, gameType, metadata
- sessionId, ipAddress, timestamp

## MongoDB Setup

Make sure MongoDB is running locally or provide a connection string:

```bash
# Local MongoDB
mongodb://localhost:27017/cyberguard

# MongoDB Atlas
mongodb+srv://username:password@cluster.mongodb.net/cyberguard
```
