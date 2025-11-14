# Quick Vercel Deployment Steps

## Architecture
- **Frontend**: Deploy to Vercel
- **Backend**: Already deployed on Render at `https://sbpi-2.onrender.com`

## Prerequisites
- ✅ Code pushed to GitHub/GitLab/Bitbucket
- ✅ Vercel account (sign up at vercel.com)
- ✅ Backend running on Render

## Quick Steps

### 1. Install Vercel CLI (Optional - can use dashboard instead)
```bash
npm install -g vercel
vercel login
```

### 2. Set Environment Variables in Vercel Dashboard

Go to your project → Settings → Environment Variables and add:

**Frontend:**
- `REACT_APP_API_URL` = `https://sbpi-2.onrender.com` (your Render backend URL)

### 3. Deploy Frontend

**Option A: Via Dashboard**
1. Go to vercel.com
2. Click "Add New Project"
3. Import your Git repository
4. Configure:
   - **Root Directory**: Leave empty (DO NOT set to `frontend`)
   - **Build Command**: Will be auto-detected from `vercel.json` (or set to `cd frontend && npm install && npm run build`)
   - **Output Directory**: Will be auto-detected from `vercel.json` (or set to `frontend/build`)
   - **Install Command**: Leave default
5. Add environment variable: `REACT_APP_API_URL` = `https://sbpi-2.onrender.com`
6. Click "Deploy"

**Option B: Via CLI**
```bash
vercel          # First deployment (preview)
vercel --prod   # Production deployment
```

### 4. Update Backend CORS Settings

After Vercel deployment, update your backend CORS in `Backend/server.js` (on Render):

1. Go to your Render dashboard
2. Update the environment variable or code in `Backend/server.js` line 28:
```javascript
origin: [
  'https://sbpi-2.onrender.com',        // Your Render backend
  'https://your-app.vercel.app',        // Your Vercel frontend (add after first deploy)
  'http://localhost:3000',
  'http://localhost:3001'
]
```

3. Redeploy your backend on Render

### 5. Verify Deployment

1. Visit your Vercel deployment URL
2. Check browser console for any API errors
3. Test login functionality
4. Verify API calls are going to `https://sbpi-2.onrender.com`

## Files Created/Modified

- ✅ `vercel.json` - Vercel configuration (frontend only)
- ✅ `VERCEL_QUICK_START.md` - This guide

## Important Notes

- **Backend is on Render**: No need to deploy backend to Vercel
- **API URL**: Frontend will call `https://sbpi-2.onrender.com/api/*`
- **CORS**: Make sure Render backend allows your Vercel frontend URL
- **Environment Variables**: Only `REACT_APP_API_URL` is needed in Vercel

## Troubleshooting

- **Build fails?** Check build logs in Vercel dashboard
- **API not working?** 
  - Verify `REACT_APP_API_URL` is set correctly in Vercel
  - Check browser console for CORS errors
  - Verify backend is running on Render
- **CORS errors?** Update CORS origins in `Backend/server.js` on Render
- **404 errors?** Make sure `vercel.json` rewrites are configured correctly

