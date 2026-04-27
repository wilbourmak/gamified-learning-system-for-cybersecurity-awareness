# 📤 Push to GitHub Guide

## Option 1: Using the Batch File (Easiest)

Double-click `push-to-github.bat` in your project folder and follow the prompts!

---

## Option 2: Manual Commands

### Step 1: Open Command Prompt in Project Folder
```
cd "C:\Users\Wilbour\OneDrive\Desktop\WIL PROJECT"
```

### Step 2: Initialize Git (if not done)
```bash
git init
```

### Step 3: Create .gitignore
Create a file named `.gitignore` with this content:
```
node_modules/
*.db
.env
.DS_Store
*.log
```

### Step 4: Add and Commit Files
```bash
git add .
git commit -m "Initial commit - CyberGuard Academy"
```

### Step 5: Create GitHub Repository

1. Go to https://github.com/new
2. **Repository name**: `cyberguard-academy` (or any name you prefer)
3. **Description**: `Cybersecurity awareness training platform with games`
4. Choose **Public** or **Private**
5. **DO NOT** initialize with README (we already have one)
6. Click **"Create repository"**

### Step 6: Connect and Push

Copy the commands from GitHub (they'll look like this):

```bash
git remote add origin https://github.com/YOUR_USERNAME/cyberguard-academy.git
git branch -M main
git push -u origin main
```

**Or if using master branch:**
```bash
git remote add origin https://github.com/YOUR_USERNAME/cyberguard-academy.git
git push -u origin master
```

---

## Step 7: Verify on GitHub

Go to `https://github.com/YOUR_USERNAME/cyberguard-academy`

You should see all your files uploaded!

---

## 🚀 Next Step: Deploy Online!

Now that your code is on GitHub, go to https://render.com to deploy it:

1. Sign up with GitHub
2. Click "New +" → "Blueprint" 
3. Select your `cyberguard-academy` repo
4. Click "Apply"
5. Done! 🎉

---

## Troubleshooting

**"fatal: not a git repository"**
→ Run `git init` first

**"fatal: remote origin already exists"**
→ Run `git remote remove origin` then add it again

**"Authentication failed"**
→ You need to log in to GitHub. Run `git config --global user.email "your@email.com"` and `git config --global user.name "Your Name"`

**"src refspec main does not match any"**
→ Use `master` instead of `main`: `git push -u origin master`

---

## 📞 Need Help?

If you get stuck:
1. Check the error message carefully
2. Try the manual commands above
3. Ask for help with the specific error
