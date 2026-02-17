# Production verification checklist

Use this list to verify **Vercel (frontend)**, **Firebase**, **Railway (backend)**, and **GitHub** after deployment or config changes. Check off each item as you verify.

---

## 1. Vercel (frontend)

**Where:** [vercel.com](https://vercel.com) → your project → **Settings** and **Deployments**

### Project and repo
- [ ] **Git** — Repo connected (e.g. `JackUCC/luxselle-dashboard`); production branch = `main`
- [ ] **Root directory** — Empty (repo root)
- [ ] **Framework** — Vite (auto-detected)

### Build
- [ ] **Build command** — `npm run build`
- [ ] **Output directory** — `dist`
- [ ] **Rewrites** — SPA: all routes → `/index.html` (in `vercel.json` or Settings) so `/inventory`, `/buy-box` etc. don’t 404 on refresh

### Environment variables (Production)

| Variable | Value | Notes |
|----------|--------|--------|
| `VITE_API_BASE` | `https://luxselleserver-production.up.railway.app` | **No trailing slash.** App appends `/api`. |
| `VITE_FIREBASE_PROJECT_ID` | `luxselle-dashboard` | Match Firebase and backend |
| `VITE_FIREBASE_STORAGE_BUCKET` | `luxselle-dashboard.firebasestorage.app` | Match Firebase and backend |

- [ ] All three set for **Production** (and Preview if you want same API there)
- [ ] **Do not set** `VITE_FIREBASE_USE_EMULATOR` in production
- [ ] **Redeploy** after changing any variable (env is baked in at build time)

### After deploy
- [ ] Open **luxselle-dashboard.vercel.app** (or your domain) — app loads
- [ ] Go to **Inventory** — list loads from API (or empty if cleared)
- [ ] No “Backend not configured” or CORS errors in browser console

---

## 2. Firebase

**Where:** [console.firebase.google.com](https://console.firebase.google.com) → project **luxselle-dashboard**

### Project
- [ ] Project **luxselle-dashboard** exists and you have access
- [ ] **Firestore** — Two instances: **(default)** nam5 (US), **luxselle-dashboard-95977150** eur3 (Europe). Inventory uses **eur3**.

### Firestore (eur3)
- [ ] **Database** `luxselle-dashboard-95977150` (eur3) is the one used in production
- [ ] **Rules** — Backend uses Admin SDK (service account); rules can stay restrictive for client
- [ ] **Indexes** — Deploy if you add composite queries: `firebase deploy --only firestore:indexes`

### Storage
- [ ] **Bucket** — `luxselle-dashboard.firebasestorage.app` (or as in Project settings)
- [ ] **CORS** — If you upload from frontend, bucket CORS allows your Vercel origin (see `docs/firebase/FIREBASE_SETUP.md`)

### Service account (for Railway / backend)
- [ ] **Project settings** → **Service accounts** — Service account exists
- [ ] **Generate new private key** — JSON used as `GOOGLE_APPLICATION_CREDENTIALS_JSON` on Railway
- [ ] Same project as **FIREBASE_PROJECT_ID** and **FIRESTORE_DATABASE_ID** (eur3)

---

## 3. Railway (backend)

**Where:** [railway.app](https://railway.app) → project → your backend service → **Variables** and **Deployments**

### Project and repo
- [ ] **Source** — Repo connected; branch e.g. `main`
- [ ] **Root directory** — Empty (repo root); monorepo runs `packages/server`

### Build and start
- [ ] **Build** — `npm install` (or as in `railway.toml`)
- [ ] **Start** — `npm run start --workspace=@luxselle/server`
- [ ] **Port** — App listens on `PORT` (Railway sets this, e.g. 3001)

### Environment variables (Production)

| Variable | Value | Notes |
|----------|--------|--------|
| `FIREBASE_USE_EMULATOR` | `false` | **Must be false** in production |
| `FIREBASE_PROJECT_ID` | `luxselle-dashboard` | Same as Firebase Console |
| `FIREBASE_STORAGE_BUCKET` | `luxselle-dashboard.firebasestorage.app` | Same as Firebase Console |
| `FIRESTORE_DATABASE_ID` | `luxselle-dashboard-95977150` | eur3 Firestore (required for inventory) |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Full service account JSON (one line) | From Firebase Console → Service accounts → Generate key |

- [ ] All five set correctly
- [ ] `GOOGLE_APPLICATION_CREDENTIALS_JSON` is valid JSON (no trailing commas)
- [ ] **Optional:** `FRONTEND_ORIGINS` — add Vercel URL if you need to restrict CORS

### After deploy
- [ ] **Logs** — On startup you see: `Firebase Admin initialized (project: luxselle-dashboard, emulator: false, database: luxselle-dashboard-95977150)`
- [ ] **Health** — `GET https://luxselleserver-production.up.railway.app/api/health` returns 200
- [ ] **Inventory API** — `GET https://luxselleserver-production.up.railway.app/api/products` returns JSON (array, possibly empty)
- [ ] **Clear inventory** (if needed): `POST https://luxselleserver-production.up.railway.app/api/products/clear` returns `{ "data": { "deleted": N } }`

---

## 4. GitHub

**Where:** [github.com](https://github.com) → **JackUCC/luxselle-dashboard** (or your repo)

### Repo and branch
- [ ] **Default branch** — Usually `main`; matches Vercel and Railway
- [ ] **Latest commit** — Contains your recent changes (Firebase eur3, clear API, env example, etc.)
- [ ] **.env** — Not committed (in `.gitignore`); only `.env.example` is in repo

### Secrets
- [ ] No API keys, Firebase JSON, or tokens committed in repo
- [ ] Production secrets live only in **Vercel** and **Railway** env vars (and local `.env`)

### Integrations
- [ ] **Vercel** — Connected to this repo; deploys on push to `main` (or your production branch)
- [ ] **Railway** — Connected to this repo; deploys on push (or as configured)

---

## 5. End-to-end flow

- [ ] **Vercel** frontend loads at your URL
- [ ] **Vercel** → calls **Railway** (`VITE_API_BASE` + `/api/...`)
- [ ] **Railway** → reads/writes **Firebase Firestore (eur3)** and Storage
- [ ] **Inventory** page shows data from eur3 (or empty after clear)
- [ ] **Image uploads** (if used) — Storage bucket and CORS allow frontend origin

---

## Quick reference

| Layer | URL / ID |
|-------|----------|
| Frontend | luxselle-dashboard.vercel.app |
| Backend API | https://luxselleserver-production.up.railway.app |
| Firebase project | luxselle-dashboard |
| Firestore (inventory) | Database ID: luxselle-dashboard-95977150 (eur3) |
| Storage bucket | luxselle-dashboard.firebasestorage.app |
