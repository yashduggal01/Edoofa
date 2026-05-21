# ✅ Deployment Checklist

## Pre-Deployment

- [ ] You have a GitHub account
- [ ] You have a Vercel account (free at vercel.com)
- [ ] You have a Railway account (free at railway.app)

## Step 1: Push Code to GitHub

```bash
# From your project root
git init
git add .
git commit -m "Initial commit - British Auction RFQ System"
git remote add origin https://github.com/YOUR_USERNAME/gocomet-auction.git
git branch -M main
git push -u origin main
```

After this, verify your repository on GitHub with these files:
- [ ] `DEPLOYMENT_GUIDE.md`
- [ ] `Dockerfile`
- [ ] `railway.json`
- [ ] `vercel.json`
- [ ] `backend/.env.production`
- [ ] `.gitignore`

## Step 2: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize GitHub and select `gocomet-auction`
5. Railway auto-detects the Dockerfile - **Deploy**
6. Wait for build to complete (~2-3 minutes)
7. **Copy the public URL** (e.g., `https://gocomet-backend-prod.railway.app`)

**Set Environment Variables in Railway:**
- Add: `NODE_ENV` = `production`
- Add: `CORS_ORIGIN` = `*` (or your Vercel URL later)

✅ Backend Status: Check `/api/health` endpoint on your Railway URL

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Select "Import Git Repository"
4. Authorize GitHub and select `gocomet-auction`
5. **Configure:**
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

6. **Add Environment Variable:**
   - `VITE_API_BASE` = `https://YOUR-RAILWAY-BACKEND-URL/api`
   - (Paste your Railway backend URL from Step 2)

7. Click "Deploy"
8. Wait for build to complete (~2-3 minutes)
9. **Copy the frontend URL** (e.g., `https://gocomet-auction.vercel.app`)

## Step 4: Update CORS in Railway

1. Go back to Railway dashboard
2. Find your backend project
3. Go to "Variables"
4. Update `CORS_ORIGIN` to your Vercel URL:
   - `https://gocomet-auction.vercel.app`
5. Click redeploy

## 🎉 Final Links

Your live deployment:

- **Frontend:** `https://YOUR-FRONTEND.vercel.app`
- **Backend API:** `https://YOUR-BACKEND.railway.app/api`
- **Health Check:** `https://YOUR-BACKEND.railway.app/api/health`

## Testing

1. Open your Vercel frontend URL
2. Create a test RFQ
3. Submit a test bid
4. Verify data persists

## ✨ Share Your Demo

Once deployed and tested, share:

```
🎯 Live Demo: https://YOUR-FRONTEND.vercel.app
API: https://YOUR-BACKEND.railway.app/api
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot reach API" | Verify `VITE_API_BASE` in Vercel matches Railway URL |
| CORS errors | Update `CORS_ORIGIN` in Railway to your Vercel URL |
| Database not saving | Check Railway logs - ensure db write permissions |
| Build fails | Check logs in Vercel/Railway - usually missing dependencies |

