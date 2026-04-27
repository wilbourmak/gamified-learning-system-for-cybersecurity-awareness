@echo off
echo ==========================================
echo   Update GitHub Repository
echo   wilbourmak/gamified-learning-system-for-cybersecurity-awareness
echo ==========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed!
    echo Please install Git from https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ✅ Git found
echo.

REM Initialize git if not already done
if not exist ".git" (
    echo 🔧 Initializing Git repository...
    git init
    echo.
)

REM Create .gitignore
echo 📝 Creating .gitignore file...
echo node_modules/ > .gitignore
echo *.db >> .gitignore
echo .env >> .gitignore
echo .DS_Store >> .gitignore
echo *.log >> .gitignore
echo .gitignore >> .gitignore
echo.

REM Configure remote repository
echo 🔗 Setting up remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/wilbourmak/gamified-learning-system-for-cybersecurity-awareness.git
echo ✅ Remote configured: https://github.com/wilbourmak/gamified-learning-system-for-cybersecurity-awareness.git
echo.

REM Check current branch
echo 📋 Checking Git status...
git status
echo.

REM Add all files
echo 📦 Adding all files to staging...
git add .
echo ✅ Files added
echo.

REM Commit
echo 📝 Committing changes...
git commit -m "Complete update: CyberGuard Academy with Backend API, Admin Dashboard, Reports, and Games"
if errorlevel 1 (
    echo ⚠️  Nothing new to commit or commit failed
echo.
)

REM Push to GitHub
echo.
echo 🚀 Pushing to GitHub...
echo This will update your repository at:
echo https://github.com/wilbourmak/gamified-learning-system-for-cybersecurity-awareness
echo.
git push -u origin main --force

if errorlevel 1 (
    echo.
    echo ⚠️  Push to 'main' failed. Trying 'master' branch...
    git branch -M master
    git push -u origin master --force
    
    if errorlevel 1 (
        echo.
        echo ❌ Push failed. Common issues:
        echo    1. Check your internet connection
        echo    2. Make sure you have permission to push to this repo
        echo    3. You may need to log in to GitHub:
        echo       git config --global user.email "your-email@example.com"
        echo       git config --global user.name "Your Name"
        echo    4. Then run: git push -u origin main
        pause
        exit /b 1
    )
)

echo.
echo ==========================================
echo   ✅ Repository Updated Successfully!
echo ==========================================
echo.
echo 📂 Repository: https://github.com/wilbourmak/gamified-learning-system-for-cybersecurity-awareness
echo.
echo 🆕 New structure:
echo    ├── BACKEND/           - Node.js API Server
echo    │   ├── server-sqlite.js
echo    │   ├── database/
echo    │   ├── middleware/
echo    │   └── routes/
echo    ├── FRONTEND/          - Web Application
echo    │   ├── index.html
echo    │   ├── script.js
echo    │   ├── styles.css
echo    │   └── api.js
echo    ├── start-app.bat      - Launch locally
echo    ├── render.yaml        - Deploy config
echo    └── README-DEPLOY.md   - Deployment guide
echo.
echo 🚀 Next step: Deploy to Render!
echo    1. Go to https://render.com
echo    2. Sign up with GitHub
echo    3. Click "New +" → "Blueprint"
echo    4. Select this repository
echo    5. Click "Apply"
echo.
pause
