# 🚀 Deployment Guide - British Auction RFQ System

## Quick Deployment (5 minutes)

### Prerequisites
- GitHub account (you have this ✅)
- Vercel account (free at vercel.com)
- Railway account (free at railway.app)

---

## Step 1: Push to GitHub (If Not Already Done)

```bash
# Initialize git (if needed)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Gocomet British Auction RFQ System"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/gocomet-auction.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Railway

### Option A: Deploy via Railroad CLI (Recommended)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. In your project directory, initialize Railway
railway init

# 4. Select "Create a new project"

# 5. Configure environment
railway variables add NODE_ENV=production
railway variables add PORT=5000
railway variables add CORS_ORIGIN='*'

# 6. Deploy
railway up
```

### Option B: Deploy via Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `gocomet-auction` repository
6. Railway will auto-detect the Dockerfile
7. Add environment variables in Railway dashboard:
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `CORS_ORIGIN` = `*`

**After deployment, Railway provides your backend URL like:**
```
https://gocomet-backend-prod.railway.app
```

📝 **Save this URL** - you'll need it for frontend deployment!

---

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Select "Import Git Repository"
4. Choose your `gocomet-auction` repository
5. **Project Settings:**
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

6. **Environment Variables:** Click "Environment Variables"
   - Add variable: `VITE_API_BASE`
   - Value: `https://YOUR-RAILWAY-BACKEND-URL/api`
   - Example: `https://gocomet-backend-prod.railway.app/api`

7. Click "Deploy"

**After deployment, Vercel provides your frontend URL like:**
```
https://gocomet-auction.vercel.app
```

---

## Step 4: Update CORS (If Needed)

If you get CORS errors, update the backend `.env.production`:

```bash
# In Railway dashboard, update variable:
CORS_ORIGIN = https://gocomet-auction.vercel.app
```

---

## Final Links

Once deployed, you'll have:

- **Frontend:** `https://YOUR-FRONTEND.vercel.app` ✅
- **Backend API:** `https://YOUR-BACKEND.railway.app/api` ✅
- **Live Demo:** Ready to share! 🎉

---

## Troubleshooting

### Frontend shows "Cannot reach API"
- Verify `VITE_API_BASE` environment variable in Vercel
- Check backend is running (visit `/api/health` endpoint)
- Verify CORS settings in Railway backend

### Database not persisting
- Railway provides persistent volumes automatically
- Your SQLite database will be stored in `/app/rfq.db`

### Backend won't start
- Check logs in Railway dashboard
- Verify `Node_ENV=production` is set
- Ensure PORT=5000

---

## Redeployment

### After code changes:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Both Vercel and Railway auto-redeploy on push to `main` branch! 🚀

---

## Support
- Vercel: https://vercel.com/docs
- Railway: https://railway.app/docs
