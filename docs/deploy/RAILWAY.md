# Deploying Backend to Railway

Step-by-step guide to deploy the Express API backend to Railway.

## Prerequisites

- Railway account (sign up at [railway.app](https://railway.app))
- GitHub repository with your code
- Firebase service account JSON file
- API key (OpenAI, optional)

---

## 1. Create Railway Project

### 1.1 Connect GitHub Repository

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Authorize Railway to access your GitHub
5. Select `luxselle-dashboard` repository
6. Railway will automatically detect it as a Node.js project

### 1.2 Configure Build Settings

Railway should auto-detect, but verify in **Settings** → **Build**:

| Setting | Value |
|---------|-------|
| **Root Directory** | Leave empty (repo root) |
| **Build Command** | `npm install && npm run build --workspace=@luxselle/server` |
| **Start Command** | `npm run start --workspace=@luxselle/server` |
| **Watch Paths** | `packages/server/**` (optional, to trigger rebuild only on server changes) |

### 1.3 Set Node Version

In your project root or `packages/server/`, create `.nvmrc`:

```
18
```

Or `20` if preferred. Railway will use this version automatically.

---

## 2. Environment Variables

Go to Railway project → **Variables** tab

### 2.1 Firebase Configuration

```bash
FIREBASE_USE_EMULATOR=false
FIREBASE_PROJECT_ID=luxselle-dashboard
FIREBASE_STORAGE_BUCKET=luxselle-dashboard.firebasestorage.app
FRONTEND_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```

### 2.2 Service Account Credentials

**Option A: JSON String (Recommended)**

1. Open your Firebase service account JSON file
2. Copy the **entire** JSON content
3. Add Railway variable:
   - Name: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Value: Paste the entire JSON (starts with `{"type":"service_account",...}`)

**Option B: File Upload**

1. Railway → **Variables** → **Raw Editor**
2. Click **Upload File**
3. Select your service account JSON file
4. Set variable name: `GOOGLE_APPLICATION_CREDENTIALS`
5. Railway will store the file at `/etc/secrets/serviceAccount.json`

### 2.3 Application Settings

```bash
NODE_ENV=production
PORT=3001
BASE_CURRENCY=EUR
TARGET_MARGIN_PCT=35
```

### 2.4 AI Provider (Optional)

**For OpenAI (pricing, market research, image analysis):**
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-your-key-here
```

**For Mock (no AI, testing only):**
```bash
AI_PROVIDER=mock
```

### 2.5 Complete Environment Variables Template

```bash
# Firebase
FIREBASE_USE_EMULATOR=false
FIREBASE_PROJECT_ID=luxselle-dashboard
FIREBASE_STORAGE_BUCKET=luxselle-dashboard.firebasestorage.app
FRONTEND_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"luxselle-dashboard",...}

# App Config
NODE_ENV=production
PORT=3001
BASE_CURRENCY=EUR
TARGET_MARGIN_PCT=35

# AI Provider (choose one)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
```

---

## 3. Deploy

### 3.1 Automatic Deployment

Railway automatically deploys when you push to your GitHub repository:

```bash
git add .
git commit -m "Configure for Railway deployment"
git push origin main
```

Railway will:
1. Detect the push
2. Run the build command
3. Start the server
4. Provide a public URL

### 3.2 Manual Deployment

In Railway dashboard:
1. Go to **Deployments** tab
2. Click **Deploy** → **Deploy Latest**
3. Or click **...** on any deployment → **Redeploy**

### 3.3 Get Your Backend URL

1. Railway dashboard → Your project
2. Look for **Settings** → **Networking**
3. Click **Generate Domain** if not already generated
4. Your URL will be like: `https://your-backend-production.up.railway.app`
5. **Copy this URL** - you'll need it for Vercel frontend configuration

---

## 4. Verify Deployment

### 4.1 Check Deployment Status

1. Railway → **Deployments** tab
2. Latest deployment should show **Success** (green)
3. If failed, click deployment → **View Logs** to see errors

### 4.2 Test Health Endpoint

```bash
curl https://your-backend-production.up.railway.app/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-01-15T12:34:56.789Z"}
```

### 4.3 Test Product List Endpoint

```bash
curl https://your-backend-production.up.railway.app/api/products
```

Expected: Empty array `[]` or list of products if you've seeded data.

### 4.4 Check Railway Logs

Railway dashboard → **Deployments** → Click latest → **View Logs**

Look for:
- ✅ `Server listening on port 3001`
- ✅ `Firebase initialized successfully`
- ❌ No error messages about credentials or Firebase connection

---

## 5. Update Frontend (Vercel)

Now that your backend is deployed, update your frontend to use it:

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add or update:
   ```bash
   VITE_API_BASE=https://your-backend-production.up.railway.app
   ```
5. Go to **Deployments** → Click **...** → **Redeploy**

---

## 6. Troubleshooting

### Build Fails: "Cannot find module"

**Cause**: Missing dependencies or wrong workspace setup

**Fix**:
1. Check `package.json` in `packages/server/` has all dependencies
2. Verify build command includes workspace: `--workspace=@luxselle/server`
3. Try rebuilding in Railway dashboard

### Server Crashes: "Firebase admin/app not found"

**Cause**: `firebase-admin` not installed

**Fix**:
```json
// In packages/server/package.json, verify:
{
  "dependencies": {
    "firebase-admin": "^12.5.0"
  }
}
```

### Error: "Invalid service account JSON"

**Cause**: Malformed JSON in `GOOGLE_APPLICATION_CREDENTIALS_JSON`

**Fix**:
1. Re-download service account JSON from Firebase Console
2. Validate JSON: Copy contents to [jsonlint.com](https://jsonlint.com)
3. Copy **exact** contents to Railway variable (including outer `{}`)
4. Redeploy

### Error: "Permission denied" from Firebase

**Cause**: Service account doesn't have permissions, or wrong project

**Fix**:
1. Verify `FIREBASE_PROJECT_ID` matches service account's project
2. In Firebase Console → Project Settings → Service Accounts:
   - Ensure service account exists
   - Check it has "Firebase Admin SDK Administrator Service Agent" role
3. Re-generate service account key if needed

### Server starts but API returns 404

**Cause**: Routes not properly loaded

**Fix**:
1. Check Railway logs for errors during route registration
2. Verify `packages/server/src/server.ts` loads all routes
3. Test with full path: `https://your-url.railway.app/api/health`

### High latency or timeouts

**Cause**: Railway region far from Firebase/users

**Fix**:
1. Railway → **Settings** → **Region**
2. Choose region close to your Firebase region
3. Redeploy after changing region

### Port binding error

**Cause**: Railway expects server to bind to `process.env.PORT`

**Fix**: Already handled in your code (`env.PORT` defaults to 3001 and Railway sets `PORT` automatically).

---

## 7. Advanced Configuration

### 7.1 Custom Domain

1. Railway → **Settings** → **Networking**
2. Click **Custom Domain**
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Add CNAME record to your DNS:
   - Type: `CNAME`
   - Name: `api`
   - Value: Railway provides (e.g., `your-app.railway.app`)

### 7.2 Health Checks

Railway automatically monitors your service. Configure in **Settings** → **Health Checks**:

- **Path**: `/api/health`
- **Method**: GET
- **Expected Status**: 200

### 7.3 Auto-Scaling

Railway auto-scales based on traffic. Monitor in **Metrics** tab:
- CPU usage
- Memory usage
- Request count
- Response times

### 7.4 Environment Groups

For multiple environments (staging, production):

1. Create multiple Railway projects
2. Use separate Firebase projects for each
3. Set up GitHub branches to trigger different deployments

---

## 8. Cost Management

Railway pricing (as of 2025):

- **Free Trial**: $5 credit (enough for testing)
- **Developer Plan**: $5/month + usage
- **Usage**: ~$0.000231/GB-hour memory, $0.000463/vCPU-hour

**Estimated costs** for this app:
- Small traffic: ~$5-10/month
- Medium traffic: ~$20-30/month

Monitor usage in Railway → **Usage** tab

---

## 9. CI/CD Integration

### Automatic Deployments

Railway automatically deploys on `git push`:

```bash
# Make changes
git add .
git commit -m "Update API endpoint"
git push origin main

# Railway auto-deploys in ~2-3 minutes
```

### Deploy Specific Branches

1. Railway → **Settings** → **Source**
2. Set **Branch** to deploy from (default: `main`)
3. Create staging: Deploy from `staging` branch

### Rollback

1. Railway → **Deployments**
2. Click **...** on previous deployment
3. Click **Redeploy**

---

## 10. Monitoring & Logs

### View Live Logs

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# View logs
railway logs
```

Or view in Railway dashboard → **Deployments** → **View Logs**

### Log Format

Your server uses `console.log`. Consider adding structured logging:

```bash
npm install pino --workspace=@luxselle/server
```

---

## Quick Reference Commands

```bash
# Test backend
curl https://your-backend.railway.app/api/health

# View logs (CLI)
railway logs

# Redeploy
railway up

# Open Railway dashboard
railway open

# Check environment variables
railway variables
```

---

## Next Steps

1. ✅ Backend deployed to Railway
2. ✅ Backend URL noted
3. → Update Vercel frontend with `VITE_API_BASE`
4. → Test full flow (frontend → backend → Firebase)
5. → Set up monitoring and alerts
6. → Configure custom domain (optional)

See [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) for the complete production deployment guide.


### CORS origin blocked from custom domain

If the frontend works on `*.vercel.app` but fails on your custom domain, set `FRONTEND_ORIGINS` on Railway to a comma-separated allow-list of exact frontend origins, then redeploy. Example:

```bash
FRONTEND_ORIGINS=https://your-app.vercel.app,https://app.yourdomain.com
```
