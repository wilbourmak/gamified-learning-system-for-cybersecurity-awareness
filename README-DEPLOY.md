# 🌐 Deploy CyberGuard Academy Online

## Quick Deploy (Render - Free)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial deployment"
git remote add origin https://github.com/YOUR_USERNAME/cyberguard-academy.git
git push -u origin main
```

### Step 2: Run Preparation Script
```bash
node prepare-for-deploy.js
```
This will ask for your URLs and update the configuration files.

### Step 3: Deploy to Render

1. Go to https://render.com
2. Sign up with GitHub
3. Click **"New +"** → **"Blueprint"**
4. Connect your GitHub repo
5. Click **"Apply"**
6. Render will deploy both frontend and backend!

---

## Alternative: Manual Configuration

### Deploy Backend to Render

1. Create New **Web Service**
2. Select your GitHub repo
3. Settings:
   - **Name**: `cyberguard-backend`
   - **Root Directory**: `BACKEND`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server-sqlite.js`
   - **Plan**: Free

4. **Add Environment Variables**:
   - `JWT_SECRET`: Click "Generate" to create random string
   - `FRONTEND_URL`: Your frontend URL (after you deploy it)

5. **Add Disk** (for database persistence):
   - Name: `database`
   - Mount Path: `/opt/render/project/src/BACKEND`
   - Size: 1 GB

6. Click **"Create Web Service"**

### Deploy Frontend to Render

1. Create New **Static Site**
2. Select same GitHub repo
3. Settings:
   - **Name**: `cyberguard-frontend`
   - **Root Directory**: `FRONTEND`
   - **Build Command**: `echo "No build"`
   - **Publish Directory**: `./`
   - **Plan**: Free

4. Click **"Create Static Site"**

---

## Other Hosting Options

### Railway (Free Tier)
- Similar process to Render
- Go to https://railway.app

### Vercel + Railway/Render
- **Frontend**: Deploy to Vercel (https://vercel.com)
- **Backend**: Deploy to Railway or Render

### DigitalOcean App Platform
- Go to https://www.digitalocean.com/products/app-platform

---

## 🎉 After Deployment

Your app will be live at:
- **Frontend**: `https://cyberguard-frontend.onrender.com`
- **Backend API**: `https://cyberguard-backend.onrender.com/api`

Default admin credentials:
- Email: `admin@cyberguard.com`
- Password: `admin123`

---

## Troubleshooting

**CORS Errors?**
- Update `FRONTEND_URL` in backend environment variables
- Restart backend service

**Database resets on restart?**
- Make sure you added the Disk in Render settings

**API not connecting?**
- Check that `api.js` has the correct backend URL
- Check browser console for errors

---

## Need Help?

- 📧 Check `DEPLOYMENT.md` for detailed instructions
- 🐛 Open an issue on GitHub
- 📖 Render Docs: https://render.com/docs
