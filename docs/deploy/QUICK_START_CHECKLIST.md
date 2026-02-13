# Production Deployment Quick Start Checklist

Complete this checklist step-by-step to get your Luxselle Dashboard production-ready.

---

## Phase 1: Firebase Setup (15 minutes)

### Step 1: Create/Configure Firebase Project

- [ ] Go to [Firebase Console](https://console.firebase.google.com)
- [ ] Select or create project `luxselle-dashboard`
- [ ] Enable **Firestore Database** (production mode, choose region)
- [ ] Enable **Firebase Storage** (production mode, same region)
- [ ] Note your bucket name: `luxselle-dashboard.firebasestorage.app`

### Step 2: Download Service Account

- [ ] Firebase Console → ⚙️ Project Settings → **Service accounts** tab
- [ ] Click **Generate new private key**
- [ ] Download JSON file (keep secure, DON'T commit to git!)
- [ ] Save as `serviceAccount.json` in a safe location

### Step 3: Deploy Firebase Rules

```bash
firebase login
firebase use luxselle-dashboard
firebase deploy --only firestore
firebase deploy --only storage
```

- [ ] Rules deployed successfully

### Step 4: Configure Storage CORS

Create `cors.json`:
```json
[{
  "origin": ["https://*.vercel.app"],
  "method": ["GET", "HEAD"],
  "maxAgeSeconds": 3600
}]
```

Apply CORS:
```bash
gsutil cors set cors.json gs://luxselle-dashboard.firebasestorage.app
```

- [ ] CORS configured

---

## Phase 2: Railway Backend (15 minutes)

### Step 5: Create Railway Project

- [ ] Go to [railway.app](https://railway.app)
- [ ] Sign in with GitHub
- [ ] Click **New Project** → **Deploy from GitHub repo**
- [ ] Select `luxselle-dashboard` repository
- [ ] Wait for initial deployment (may fail - that's OK)

### Step 6: Set Railway Environment Variables

Go to Railway → **Variables** tab and add:

**Firebase:**
```bash
FIREBASE_USE_EMULATOR=false
FIREBASE_PROJECT_ID=luxselle-dashboard
FIREBASE_STORAGE_BUCKET=luxselle-dashboard.firebasestorage.app
```

**Service Account (copy entire JSON file contents):**
```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

**App Config:**
```bash
NODE_ENV=production
PORT=3001
BASE_CURRENCY=EUR
TARGET_MARGIN_PCT=35
```

**AI Provider (optional - start with mock):**
```bash
AI_PROVIDER=mock
```

- [ ] All variables set in Railway

### Step 7: Deploy Backend

- [ ] Push code to GitHub (triggers Railway deploy)
- [ ] Wait for deployment to complete (~2-3 minutes)
- [ ] Railway → **Settings** → **Networking** → **Generate Domain**
- [ ] Note your Railway URL: `https://your-backend-production.up.railway.app`
- [ ] Test health endpoint:
  ```bash
  curl https://your-backend.railway.app/api/health
  ```
- [ ] Should return: `{"status":"ok",...}`

---

## Phase 3: Vercel Frontend (10 minutes)

### Step 8: Create Vercel Project

- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign in with GitHub
- [ ] Click **Add New** → **Project**
- [ ] Import `luxselle-dashboard` repository
- [ ] **Root Directory**: Leave empty (or set to `app` if using subfolder)
- [ ] Vercel auto-detects Vite - click **Deploy**
- [ ] Wait for first deployment (may have issues - that's OK)

### Step 9: Set Vercel Environment Variables

Go to Vercel → **Settings** → **Environment Variables**

Add these **Production** variables:

```bash
VITE_FIREBASE_PROJECT_ID=luxselle-dashboard
VITE_FIREBASE_STORAGE_BUCKET=luxselle-dashboard.firebasestorage.app
VITE_API_BASE=https://your-backend-production.up.railway.app
```

⚠️ **IMPORTANT**: Use your actual Railway URL for `VITE_API_BASE` (no trailing slash)

- [ ] All variables set in Vercel

### Step 10: Redeploy Frontend

- [ ] Vercel → **Deployments** → Click **...** → **Redeploy**
- [ ] Wait for deployment (~2 minutes)
- [ ] Note your Vercel URL: `https://your-app.vercel.app`

---

## Phase 4: Testing (10 minutes)

### Step 11: Test Frontend

- [ ] Visit your Vercel URL
- [ ] **No** "Backend not configured" banner should appear
- [ ] Open browser DevTools → Console → No errors
- [ ] Dashboard page loads (may be empty - that's OK)

### Step 12: Test Backend API

```bash
# Health check
curl https://your-backend.railway.app/api/health

# Products endpoint
curl https://your-backend.railway.app/api/products
```

- [ ] Health endpoint returns `200 OK`
- [ ] Products endpoint returns `[]` or products list

### Step 13: Test Full Flow

- [ ] Navigate to **Inventory** page
- [ ] Click **Add Product**
- [ ] Fill in product details and upload image
- [ ] Click **Save**
- [ ] Product appears in inventory list
- [ ] Image loads correctly

### Step 14: Verify Firebase Data

- [ ] Go to [Firebase Console](https://console.firebase.google.com)
- [ ] Select `luxselle-dashboard` project
- [ ] **Firestore** → Should see `products` collection with documents
- [ ] **Storage** → Should see uploaded images

---

## Phase 5: API Keys (Optional - 5 minutes)

### Step 15: Add OpenAI or Gemini (for AI features)

**For OpenAI:**
- [ ] Go to [platform.openai.com](https://platform.openai.com)
- [ ] Create API key (starts with `sk-proj-...`)
- [ ] In Railway → **Variables**:
  ```bash
  AI_PROVIDER=openai
  OPENAI_API_KEY=sk-proj-your-key
  ```
- [ ] Railway will auto-redeploy

**For Gemini:**
- [ ] Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
- [ ] Create API key
- [ ] In Railway → **Variables**:
  ```bash
  AI_PROVIDER=gemini
  GEMINI_API_KEY=your-key
  ```
- [ ] Railway will auto-redeploy

**Skip AI for now:**
- [ ] Keep `AI_PROVIDER=mock` (no API key needed)

---

## Phase 6: Final Checks (5 minutes)

### Step 16: Security Review

- [ ] Service account JSON is NOT in your git repository
- [ ] `.gitignore` includes `serviceAccount.json`
- [ ] Firestore rules are deployed (not wide open)
- [ ] Storage rules are deployed

### Step 17: Update CORS with Actual Vercel URL

Update `cors.json`:
```json
[{
  "origin": ["https://your-actual-app.vercel.app"],
  "method": ["GET", "HEAD"],
  "maxAgeSeconds": 3600
}]
```

```bash
gsutil cors set cors.json gs://luxselle-dashboard.firebasestorage.app
```

- [ ] CORS updated with actual domain

### Step 18: Monitor Logs

**Railway Logs:**
- [ ] Railway → **Deployments** → **View Logs**
- [ ] No errors or warnings

**Vercel Logs:**
- [ ] Vercel → **Deployments** → Latest → **Logs**
- [ ] Build completed successfully

**Browser Console:**
- [ ] Visit your Vercel app
- [ ] Open DevTools → Console
- [ ] No red errors

---

## ✅ Production Checklist Complete!

Your app is now live:
- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-backend.railway.app
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage

---

## What's Next?

### Add Custom Domain (Optional)

**Vercel:**
1. Vercel → **Settings** → **Domains**
2. Add your domain (e.g., `app.yourdomain.com`)
3. Add DNS records as instructed

**Railway:**
1. Railway → **Settings** → **Networking**
2. Add custom domain (e.g., `api.yourdomain.com`)
3. Add CNAME record to DNS

### Set Up Monitoring

- [ ] Enable Firebase Analytics
- [ ] Enable Vercel Analytics
- [ ] Set up error tracking (e.g., Sentry)

### Staging Environment (Optional)

Create a staging environment:
1. Duplicate Firebase project → `luxselle-dashboard-staging`
2. Create Railway project from `develop` branch
3. Create Vercel preview environment

---

## Troubleshooting

### "Backend not configured" banner

- Check `VITE_API_BASE` is set in Vercel
- Redeploy Vercel frontend
- Verify Railway URL is correct

### Images not loading (CORS error)

- Check Storage CORS configuration
- Verify bucket names match in all configs
- Update CORS origin with actual Vercel URL

### API returns HTML instead of JSON

- Check Railway deployment succeeded
- Test Railway health endpoint directly
- Verify `VITE_API_BASE` doesn't have typos

### Firebase "permission denied" errors

- Redeploy Firestore rules: `firebase deploy --only firestore:rules`
- Check service account has correct permissions
- Verify `FIREBASE_PROJECT_ID` matches in all places

---

## Need Help?

1. **Detailed guides**:
   - [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) - Complete guide
   - [RAILWAY.md](./RAILWAY.md) - Railway-specific guide
   - [VERCEL.md](./VERCEL.md) - Vercel-specific guide

2. **Documentation**:
   - [Firebase Setup](../firebase/FIREBASE_SETUP.md)
   - [Architecture](../design/ARCHITECTURE.md)

3. **Check logs**:
   - Railway: Deployments → View Logs
   - Vercel: Deployments → Build Logs
   - Browser: DevTools → Console

---

**Estimated total time**: ~60 minutes for complete setup ⏱️
