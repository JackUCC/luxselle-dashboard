# Production Deployment Guide

Complete step-by-step guide to deploy Luxselle Dashboard to production using Vercel (frontend), Railway (backend), and Firebase (database/storage).

## Table of Contents
1. [Firebase Production Setup](#1-firebase-production-setup)
2. [Backend Deployment (Railway)](#2-backend-deployment-railway)
3. [Frontend Deployment (Vercel)](#3-frontend-deployment-vercel)
4. [API Keys & Configuration](#4-api-keys--configuration)
5. [Testing Your Production Deployment](#5-testing-your-production-deployment)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Firebase Production Setup

### 1.1 Create Firebase Project (if not already created)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or select existing project `luxselle-dashboard`
3. Enable Google Analytics (optional)

### 1.2 Enable Firestore Database

1. In Firebase Console → **Build** → **Firestore Database**
2. Click "Create database"
3. Choose **Production mode** (we'll deploy security rules next)
4. Select a region close to your users (e.g., `europe-west1` for Europe)
5. Wait for database to provision

### 1.3 Enable Firebase Storage

1. In Firebase Console → **Build** → **Storage**
2. Click "Get started"
3. Choose **Production mode**
4. Use same region as Firestore
5. Note your bucket name: `luxselle-dashboard.appspot.com`

### 1.4 Deploy Firestore Rules & Indexes

```bash
# Login to Firebase (if not already)
firebase login

# Verify your project
firebase use luxselle-dashboard

# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Storage rules
firebase deploy --only storage
```

### 1.5 Configure Storage CORS

Create a `cors.json` file in your project root:

```json
[
  {
    "origin": ["https://your-app.vercel.app", "https://*.vercel.app"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS configuration:

```bash
# Install Google Cloud SDK if needed
# https://cloud.google.com/sdk/docs/install

# Apply CORS
gsutil cors set cors.json gs://luxselle-dashboard.appspot.com
```

### 1.6 Generate Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com) → Project Settings (gear icon)
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Download the JSON file (keep it **secure** - do NOT commit to Git!)
5. You'll use this for Railway backend

---

## 2. Backend Deployment (Railway)

### 2.1 Create Railway Project

1. Go to [Railway](https://railway.app)
2. Sign in with GitHub
3. Click **New Project** → **Deploy from GitHub repo**
4. Select your `luxselle-dashboard` repository
5. Railway will detect it as a Node.js project

### 2.2 Configure Railway Build Settings

Railway should auto-detect, but verify:

1. In Railway project → **Settings**:
   - **Root Directory**: `/packages/server` (or leave empty and set build command)
   - **Build Command**: `npm install && npm run build --workspace=@luxselle/server`
   - **Start Command**: `npm run start --workspace=@luxselle/server`
   - **Node Version**: 18 or 20 (matches your `.nvmrc`)

### 2.3 Set Environment Variables in Railway

Go to Railway project → **Variables** tab and add:

#### Required Variables

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=luxselle-dashboard
FIREBASE_STORAGE_BUCKET=luxselle-dashboard.appspot.com
FIREBASE_USE_EMULATOR=false

# Firebase Service Account
# Paste the ENTIRE contents of your service account JSON file
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"luxselle-dashboard",...}

# OR upload the file and set path (Railway supports file uploads)
# GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/serviceAccount.json

# Application Settings
BASE_CURRENCY=EUR
TARGET_MARGIN_PCT=35
PORT=3001
NODE_ENV=production

# AI Provider (choose one)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...

# OR use Gemini
# AI_PROVIDER=gemini
# GEMINI_API_KEY=...

# OR disable AI features for now
# AI_PROVIDER=mock
```

#### How to Set Service Account in Railway

**Option A: JSON String (Easier)**
1. Copy entire contents of service account JSON
2. In Railway Variables, add `GOOGLE_APPLICATION_CREDENTIALS_JSON` with the full JSON

**Option B: File Upload**
1. Railway → **Variables** → **Add Variable**
2. Upload the service account JSON file
3. Set variable name as `GOOGLE_APPLICATION_CREDENTIALS`
4. Railway will store the file and provide a path

### 2.4 Update Backend Code for Railway (if needed)

Verify `packages/server/src/config/firebase.ts` handles JSON credentials:

```typescript
const serviceAccountJSON = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
if (serviceAccountJSON) {
  const serviceAccount = JSON.parse(serviceAccountJSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}
```

If not present, you may need to update the Firebase initialization code.

### 2.5 Deploy Backend

1. Push your code to GitHub (Railway auto-deploys)
2. Or manually trigger deploy in Railway dashboard
3. Check Railway logs for any errors
4. Note your Railway URL (e.g., `https://your-backend.up.railway.app`)

---

## 3. Frontend Deployment (Vercel)

### 3.1 Connect GitHub to Vercel

1. Go to [Vercel](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your `luxselle-dashboard` repository
4. Vercel will auto-detect it as a Vite project

### 3.2 Configure Vercel Project Settings

**Root Directory**: Leave empty (uses repo root) or set to `app` if using app subfolder

**Build Settings**:
- **Framework Preset**: Vite
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `dist` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### 3.3 Set Environment Variables in Vercel

Go to Vercel project → **Settings** → **Environment Variables**

Add these **Production** variables:

```bash
# Firebase Configuration (must match backend!)
VITE_FIREBASE_PROJECT_ID=luxselle-dashboard
VITE_FIREBASE_STORAGE_BUCKET=luxselle-dashboard.appspot.com

# Backend API URL (CRITICAL - use your Railway URL)
VITE_API_BASE=https://your-backend.up.railway.app
```

**Important Notes**:
- `VITE_API_BASE` must be your Railway backend URL (no trailing slash)
- These are **build-time** variables (baked into client bundle)
- Do **NOT** set `VITE_FIREBASE_USE_EMULATOR` in production
- Do **NOT** add backend secrets (service account, API keys) here

### 3.4 Deploy Frontend

1. Click **Deploy** in Vercel
2. Vercel will build and deploy your frontend
3. You'll get a URL like `https://your-app.vercel.app`
4. Test the deployment

### 3.5 Update Storage CORS (if needed)

Update your `cors.json` with the actual Vercel URL:

```json
[
  {
    "origin": ["https://your-app.vercel.app"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

Apply again:
```bash
gsutil cors set cors.json gs://luxselle-dashboard.appspot.com
```

---

## 4. API Keys & Configuration

### 4.1 OpenAI API Key (for AI features)

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign in → **API Keys**
3. Click **Create new secret key**
4. Copy the key (starts with `sk-proj-...`)
5. Add to Railway as `OPENAI_API_KEY`
6. Set `AI_PROVIDER=openai` in Railway

### 4.2 Google Gemini API Key (alternative to OpenAI)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **Get API Key**
3. Create or select a Google Cloud project
4. Copy the API key
5. Add to Railway as `GEMINI_API_KEY`
6. Set `AI_PROVIDER=gemini` in Railway

### 4.3 Mock AI Provider (for testing without API costs)

Set in Railway:
```bash
AI_PROVIDER=mock
```
This uses fake AI responses for testing - no API key needed.

---

## 5. Testing Your Production Deployment

### 5.1 Test Frontend

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Check browser console for errors
3. Verify no "Backend not configured" banner

### 5.2 Test Backend API

```bash
# Test health endpoint
curl https://your-backend.up.railway.app/api/health

# Expected response:
{"status":"ok","timestamp":"..."}
```

### 5.3 Test Full Flow

1. **Dashboard**: Should load KPIs and charts
2. **Inventory**: Should show products list
3. **Add Product**: Upload a product with image
4. **Buy Box**: Test the evaluator
5. **Check Firebase Console**: Verify data is being saved

### 5.4 Check Logs

**Railway Logs**:
- Railway dashboard → **Deployments** → Click latest deployment → **View Logs**

**Vercel Logs**:
- Vercel dashboard → **Deployments** → Click latest deployment → **Logs**

**Firebase Logs**:
- Firebase Console → **Firestore** → Check for new documents
- Firebase Console → **Storage** → Check for uploaded images

---

## 6. Troubleshooting

### Issue: "Backend not configured" banner

**Cause**: `VITE_API_BASE` not set in Vercel

**Fix**:
1. Vercel → Settings → Environment Variables
2. Add `VITE_API_BASE=https://your-backend.up.railway.app`
3. Redeploy: Vercel → Deployments → Click "..." → Redeploy

### Issue: API calls return HTML instead of JSON

**Cause**: Wrong API URL or CORS issue

**Fix**:
1. Verify `VITE_API_BASE` has correct Railway URL
2. Check Railway logs for errors
3. Test API directly: `curl https://your-backend.up.railway.app/api/health`

### Issue: Images not loading (CORS error)

**Cause**: Storage CORS not configured

**Fix**:
```bash
# Create cors.json with your Vercel URL
gsutil cors set cors.json gs://luxselle-dashboard.appspot.com
```

### Issue: Firebase permission denied

**Cause**: Firestore rules blocking requests

**Fix**:
```bash
# Redeploy Firestore rules
firebase deploy --only firestore:rules
```

Check `firestore.rules` - make sure rules allow the operations you need.

### Issue: Railway build fails

**Cause**: Missing dependencies or wrong Node version

**Fix**:
1. Check Railway logs for specific error
2. Verify `package.json` has all dependencies
3. Check Node version matches `.nvmrc` (18 or 20)
4. Try rebuilding: Railway → Deployments → Click "..." → Redeploy

### Issue: Service account authentication fails

**Cause**: Invalid JSON or wrong credentials

**Fix**:
1. Re-download service account JSON from Firebase Console
2. Verify JSON is valid (use a JSON validator)
3. In Railway, check if variable is set correctly
4. Make sure `FIREBASE_PROJECT_ID` matches service account

### Issue: AI features not working

**Cause**: Invalid API key or wrong provider

**Fix**:
1. Verify API key is correct and active
2. Check `AI_PROVIDER` matches the key you set (`openai` or `gemini`)
3. Test API key directly (OpenAI playground or Gemini AI Studio)
4. Use `AI_PROVIDER=mock` temporarily to bypass

---

## Quick Checklist

- [ ] Firebase project created and enabled
- [ ] Firestore and Storage enabled
- [ ] Firestore rules and indexes deployed
- [ ] Storage CORS configured
- [ ] Service account JSON downloaded
- [ ] Railway project created
- [ ] Railway environment variables set (including service account)
- [ ] Backend deployed and accessible
- [ ] Vercel project created
- [ ] Vercel environment variables set (including `VITE_API_BASE`)
- [ ] Frontend deployed and accessible
- [ ] OpenAI/Gemini API key obtained and set
- [ ] Tested full user flow
- [ ] No errors in browser console
- [ ] No errors in Railway logs
- [ ] Data appears in Firebase Console

---

## Next Steps

1. **Custom Domain** (optional):
   - Vercel: Settings → Domains → Add custom domain
   - Railway: Settings → Domains → Add custom domain

2. **Environment Management**:
   - Use Vercel's environment groups (Production, Preview, Development)
   - Set up staging environment with separate Firebase project

3. **Monitoring**:
   - Enable Firebase Analytics
   - Set up Vercel Analytics
   - Monitor Railway logs for errors

4. **Scaling**:
   - Railway auto-scales, but monitor usage
   - Consider Firebase Blaze plan if you exceed free tier
   - Optimize Firestore queries if needed

5. **Security**:
   - Review and tighten Firestore security rules
   - Enable Firebase App Check (optional)
   - Set up rate limiting on Railway (if needed)
