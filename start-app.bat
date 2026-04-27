@echo off
chcp 65001 >nul
echo ==========================================
echo   CyberGuard Academy - Startup Script
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version
echo.

REM Install backend dependencies if needed
if not exist "BACKEND\node_modules" (
    echo 📦 Installing backend dependencies...
    cd BACKEND
    call npm install
    cd ..
) else (
    echo ✅ Backend dependencies already installed
)

REM Install frontend dependencies if needed
if not exist "FRONTEND\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd FRONTEND
    call npm install
    cd ..
) else (
    echo ✅ Frontend dependencies already installed
)

echo.
echo ==========================================
echo   Starting Servers...
echo ==========================================
echo.

REM Start Backend Server
echo 🚀 Starting Backend Server on port 5003...
start "Backend Server" cmd /k "cd BACKEND && node server-sqlite.js"

REM Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

REM Start Frontend Server
echo 🌐 Starting Frontend Server on port 8000...
start "Frontend Server" cmd /k "cd FRONTEND && npx serve -p 8000"

echo.
echo ==========================================
echo   Servers Started Successfully!
echo ==========================================
echo.
echo 📊 Backend API: http://localhost:5003
echo 🌐 Frontend App: http://localhost:8000
echo.
echo Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:8000

echo.
echo ==========================================
echo   Deployment Options
echo ==========================================
echo.
echo To deploy online:
echo 1. Run: node prepare-for-deploy.js
echo 2. Push code to GitHub
echo 3. Go to https://render.com
echo 4. Connect your GitHub repo
echo.
echo See README-DEPLOY.md for detailed instructions
echo.
echo Press any key to exit this window (servers will keep running)
pause >nul
