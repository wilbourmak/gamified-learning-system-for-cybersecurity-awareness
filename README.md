# 🛡️ CyberGuard Academy

A gamified cybersecurity awareness training platform that educates users through interactive games, quizzes, and hands-on security simulations.

![CyberGuard Academy](https://img.shields.io/badge/CyberGuard-Academy-red)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-active-green)

## 🌟 Features

### 🎮 Interactive Games
- **Phishing Quiz** - Learn to identify phishing emails
- **Password Challenge** - Create strong, secure passwords
- **Security Trivia** - Test your cybersecurity knowledge
- **URL Scanner** - Practice identifying malicious URLs
- **Social Engineering** - Recognize manipulation tactics

### 📊 Admin Dashboard
- Comprehensive backend reports
- User management
- Security analytics
- System health monitoring

### 🏆 Gamification
- Points and scoring system
- Leaderboard rankings
- Achievement badges
- Progress tracking

### 🔐 Authentication
- Secure user registration and login
- JWT-based authentication
- Admin role management
- Session management

### 📈 Analytics & Reports
- User activity tracking
- Game performance metrics
- Security scan statistics
- Comprehensive backend reports

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/wilbourmak/gamified-learning-system-for-cybersecurity-awareness.git
   cd gamified-learning-system-for-cybersecurity-awareness
   ```

2. **Install Backend Dependencies**
   ```bash
   cd BACKEND
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../FRONTEND
   npm install
   ```

4. **Start the Application**
   
   **Windows:**
   ```bash
   # From project root
   start-app.bat
   ```
   
   **Manual:**
   ```bash
   # Terminal 1 - Backend
   cd BACKEND
   node server-sqlite.js
   
   # Terminal 2 - Frontend
   cd FRONTEND
   npx http-server -p 8000
   ```

5. **Access the Application**
   - Frontend: http://localhost:8000
   - Backend API: http://localhost:5003

### Default Admin Credentials
- **Email:** admin@cyberguard.com
- **Password:** admin123

## 📁 Project Structure

```
gamified-learning-system-for-cybersecurity-awareness/
├── BACKEND/
│   ├── database/
│   │   └── sqlite.js          # Database helpers & admin user creation
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── models/                # Data models
│   ├── routes/                # API routes
│   │   ├── auth.js            # Authentication endpoints
│   │   ├── games.js           # Game-related endpoints
│   │   ├── admin.js           # Admin dashboard endpoints
│   │   └── ...
│   ├── server-sqlite.js       # Main Express server
│   └── package.json
├── FRONTEND/
│   ├── index.html             # Main HTML page
│   ├── script.js              # Frontend logic
│   ├── styles.css             # Styling
│   ├── api.js                 # API service layer
│   └── package.json
├── start-app.bat              # Quick start script (Windows)
├── render.yaml                # Render deployment config
├── prepare-for-deploy.js     # Deployment preparation script
├── DEPLOYMENT.md              # Detailed deployment guide
└── README-DEPLOY.md           # Quick deployment guide
```

## 🎯 How to Use

### For Users
1. **Register** - Create a new account
2. **Play Games** - Learn through interactive games
3. **Earn Points** - Score points for correct answers
4. **Check Leaderboard** - See how you rank
5. **Unlock Achievements** - Earn badges for milestones

### For Admins
1. **Login** - Use admin credentials
2. **Access Dashboard** - Click "Admin" button in header
3. **Generate Reports** - View comprehensive backend statistics
4. **Monitor Users** - Track user activity and progress
5. **Security Analytics** - Review security scan results

## 🌐 Deployment

### Deploy to Render (Recommended)

1. **Prepare for deployment**
   ```bash
   node prepare-for-deploy.js
   ```

2. **Push to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

3. **Deploy on Render**
   - Go to https://render.com
   - Sign up with GitHub
   - Click "New +" → "Blueprint"
   - Select your repository
   - Click "Apply"

Render will automatically deploy both frontend and backend!

### Alternative Hosting Options
- **Railway** - Similar to Render
- **Vercel** - For frontend only
- **DigitalOcean App Platform** - Production-ready

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🔧 Configuration

### Backend Environment Variables
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Backend server port (default: 5003)
- `FRONTEND_URL` - Frontend URL for CORS

### Frontend Configuration
Update `FRONTEND/api.js` to set the API base URL:
```javascript
this.baseURL = 'https://your-backend-url.onrender.com/api';
```

## 🛠️ Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling
- **Vanilla JavaScript** - Logic
- **HTTP Server** - Development server

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Games
- `GET /api/games` - Get all games
- `POST /api/games/:id/play` - Submit game score
- `GET /api/games/leaderboard` - Get leaderboard

### Admin
- `GET /api/reports/comprehensive` - Generate comprehensive report
- `GET /api/admin/users` - Get all users
- `GET /api/admin/analytics` - Get analytics data

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 📧 Contact

- **Author:** Wilbour Mak
- **Email:** mbuviwilbour@gmail.com
- **GitHub:** [@wilbourmak](https://github.com/wilbourmak)

## 🙏 Acknowledgments

- Cybersecurity awareness resources
- Open-source community
- Educational game development community

---

**Made with ❤️ for cybersecurity education**
