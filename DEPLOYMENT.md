# CyberGuard Academy - Deployment Guide

## Recommended Hosting Options

### Option 1: Render (Recommended - Free)
Best for full-stack applications with Node.js backend.

**Steps:**
1. Go to https://render.com and sign up
2. Create a **Web Service** for the backend:
   - Connect your GitHub repo
   - Set root directory: `BACKEND`
   - Build Command: `npm install`
   - Start Command: `node server-sqlite.js`
   - Environment Variables:
     - `JWT_SECRET`: Generate a random string
     - `PORT`: 10000 (Render uses this)
     - `FRONTEND_URL`: Your frontend URL (from step 3)

3. Create a **Static Site** for the frontend:
   - Connect same repo
   - Set root directory: `FRONTEND`
   - Build Command: `echo "No build needed"`
   - Publish Directory: `./`

4. Update `FRONTEND/api.js`:
   ```javascript
   // Change from localhost to your backend URL
   this.baseURL = 'https://your-backend-name.onrender.com/api';
   ```

---

### Option 2: Railway (Free Tier Available)
Alternative to Render with easy deployment.

**Steps:**
1. Go to https://railway.app
2. Create new project from GitHub
3. Add environment variables
4. Deploy

---

### Option 3: Split Deployment (Vercel + Railway/Render)
- **Frontend**: Vercel (https://vercel.com) - Free, fast CDN
- **Backend**: Railway or Render - Free tier available

---

## Quick Setup with Render

### 1. Prepare Your Repository

Make sure your project is in a GitHub repository:

```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/cyberguard-academy.git
git push -u origin main
```

### 2. Backend Deployment (Render)

**Create `render.yaml` in your project root:**

```yaml
services:
  - type: web
    name: cyberguard-backend
    runtime: node
    rootDir: BACKEND
    buildCommand: npm install
    startCommand: node server-sqlite.js
    envVars:
      - key: JWT_SECRET
        generateValue: true
      - key: PORT
        value: 10000
      - key: FRONTEND_URL
        value: https://your-frontend-url.onrender.com
    disk:
      name: database
      mountPath: /opt/render/project/src/BACKEND
      sizeGB: 1
```

### 3. Frontend Deployment (Render Static)

**Create `render-static.yaml`:**

```yaml
services:
  - type: static
    name: cyberguard-frontend
    runtime: static
    rootDir: FRONTEND
    buildCommand: echo "No build"
    staticPublishPath: ./
    headers:
      - path: /*
        name: Access-Control-Allow-Origin
        value: *
```

### 4. Update API Configuration

**Edit `FRONTEND/api.js`:**

Find the `baseURL` and update it:

```javascript
constructor() {
    // For local development
    // this.baseURL = 'http://localhost:5003/api';
    
    // For production (Render)
    this.baseURL = 'https://cyberguard-backend.onrender.com/api';
    
    this.token = localStorage.getItem('authToken');
}
```

### 5. CORS Configuration

**Update `BACKEND/server-sqlite.js`:**

```javascript
app.use(cors({
    origin: [
        'http://localhost:8000',
        'https://your-frontend-url.onrender.com',
        'https://your-frontend-url.vercel.app'
    ],
    credentials: true
}));
```

---

## Alternative: Vercel for Frontend

### Deploy Frontend to Vercel:

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   cd FRONTEND
   vercel
   ```

3. Set environment variable for API URL:
   ```bash
   vercel env add API_URL
   # Enter: https://your-backend.onrender.com/api
   ```

---

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | `your-super-secret-key-here` |
| `PORT` | Port for backend server | `10000` (Render) or `5003` (local) |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-app.vercel.app` |

---

## Post-Deployment Checklist

- [ ] Backend API is accessible
- [ ] Frontend loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Admin login works
- [ ] Report generation works
- [ ] Games load and function correctly
- [ ] Database persists between restarts (use disk on Render)

---

## Troubleshooting

### CORS Errors
Update the CORS origin in `server-sqlite.js` to match your frontend URL exactly.

### Database Not Persisting
On Render, add a disk volume for the database file.

### 404 Errors
Ensure API baseURL is correct in `api.js`.

---

## Need Help?

- Render Docs: https://render.com/docs
- Railway Docs: https://docs.railway.app/
- Vercel Docs: https://vercel.com/docs
