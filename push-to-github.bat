@echo off
echo ==========================================
echo   Push CyberGuard to GitHub
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

REM Check if already initialized
if exist ".git" (
    echo 📁 Git repository already initialized
echo.
    goto ADD_FILES
)

REM Initialize git repository
echo 🔧 Initializing Git repository...
git init
echo.

REM Create .gitignore
echo 📝 Creating .gitignore file...
echo node_modules/ > .gitignore
echo *.db >> .gitignore
echo .env >> .gitignore
echo .DS_Store >> .gitignore
echo *.log >> .gitignore
echo.

:ADD_FILES
echo 📦 Adding files to staging...
git add .
echo.

echo 📝 Enter a commit message:
set /p COMMIT_MSG=

if "!COMMIT_MSG!"=="" (
    set COMMIT_MSG=Update: Ready for deployment
)

git commit -m "!COMMIT_MSG!"
echo.

REM Check if remote origin exists
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo 🔗 No remote repository set
echo.
    echo 📋 Create a GitHub repository first:
echo    1. Go to https://github.com/new
echo    2. Repository name: cyberguard-academy
echo    3. Set to Public or Private
echo    4. Click "Create repository"
echo    5. Copy the repository URL (https://github.com/YOUR_USERNAME/cyberguard-academy.git)
echo.
    set /p REPO_URL="🔗 Paste your GitHub repository URL here: "
    
    if "!REPO_URL!"=="" (
        echo ❌ No URL provided. Exiting...
        pause
        exit /b 1
    )
    
    git remote add origin !REPO_URL!
    echo ✅ Remote added
echo.
) else (
    echo ✅ Remote repository already configured
echo.
)

echo 🚀 Pushing to GitHub...
git push -u origin main

if errorlevel 1 (
    echo.
    echo ⚠️  Push failed. Trying 'master' branch instead...
    git push -u origin master
)

echo.
echo ==========================================
echo   ✅ Push Complete!
echo ==========================================
echo.
echo Your code is now on GitHub!
echo Next step: Go to https://render.com to deploy
echo.
pause
