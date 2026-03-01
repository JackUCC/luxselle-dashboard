# Railway Checklist — What to Check So Your Backend Works

Use this list in **Railway Dashboard** (and in code) so the Express API runs correctly. The frontend (Vercel) calls this backend; Firebase is used for Firestore and Storage.

---

## 1. Project and repo

| Check | Where | What to verify |
|-------|--------|----------------|
| Project exists | Railway Dashboard | Backend is a separate Railway project (not the Vite app). |
| Repo connected | Railway → **Settings** → **Source** | Connected to `luxselle-dashboard` (or your fork); correct branch. |
| Root directory | Railway → **Settings** → **Build** | **Root Directory** is empty (repo root). Monorepo: server is `packages/server`, started from root. |

---

## 2. Build and start (railway.toml / Settings)

Repo has [railway.toml](/railway.toml) at root. Railway can use it or you can set the same in the dashboard.

| Item | Expected | Where to check |
|------|----------|----------------|
| Build command | `npm install` (or `npm install && npm run build --workspace=@luxselle/server` if you add a build step) | Railway → **Settings** → **Build** or [railway.toml](railway.toml) `buildCommand` |
| Start command | `npm run start --workspace=@luxselle/server` | Railway → **Settings** → **Deploy** or [railway.toml](railway.toml) `startCommand` |
| Node version | 18, 20, or 22 (match root `package.json` engines) | Optional: add `.nvmrc` with `18` or `20` at repo root |

---

## 3. Variables (required for production)

In Railway → **Variables** (or **Raw Editor** for bulk paste).

### 3.1 Firebase (required)

| Variable | Value | Notes |
|----------|--------|--------|
| `FIREBASE_USE_EMULATOR` | `false` | Must be `false` in production. |
| `FIREBASE_PROJECT_ID` | `luxselle-dashboard` | Same as Firebase Console. |
| `FIREBASE_STORAGE_BUCKET` | `luxselle-dashboard.firebasestorage.app` | Same as Firebase Console. |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Full service account JSON (one line) | Preferred. Copy from Firebase Console → Project settings → Service accounts → Generate key. Paste entire `{"type":"service_account",...}`. |
| **or** `GOOGLE_APPLICATION_CREDENTIALS` | Path to JSON file | If you upload the file in Railway, use the path Railway gives (e.g. `/etc/secrets/serviceAccount.json`). |

Checklist:

- [ ] `FIREBASE_USE_EMULATOR=false`
- [ ] `FIREBASE_PROJECT_ID` and `FIREBASE_STORAGE_BUCKET` set and correct
- [ ] One of `GOOGLE_APPLICATION_CREDENTIALS_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` set
- [ ] If using `GOOGLE_APPLICATION_CREDENTIALS_JSON`: valid JSON (no trailing commas; test at [jsonlint.com](https://jsonlint.com))

---

### 3.2 App config (optional but recommended)

| Variable | Typical value | Notes |
|----------|----------------|--------|
| `NODE_ENV` | `production` | Often set by Railway; if not, set it. |
| `PORT` | (Railway sets this) | Server uses `process.env.PORT`; no need to set unless you override. |
| `BASE_CURRENCY` | `EUR` | Default in code; set if you want to override. |
| `TARGET_MARGIN_PCT` | `35` | Default in code; set if you want to override. |

---

### 3.3 AI / market research (optional)

Used by `/api/market-research/analyse` and `/api/market-research/trending`.

| Variable | When to set |
|----------|-------------|
| `AI_PROVIDER` | `perplexity`, `openai`, `gemini`, or `mock`. Default: `mock`. |
| `PERPLEXITY_API_KEY` | Required if `AI_PROVIDER=perplexity`. |
| `OPENAI_API_KEY` | Required if `AI_PROVIDER=openai`. |
| `GEMINI_API_KEY` | Required if `AI_PROVIDER=gemini`. |

If you don’t set an AI provider or keys, keep `AI_PROVIDER=mock` so those endpoints return mock data and don’t 500.

Checklist:

- [ ] Either `AI_PROVIDER=mock`, or `AI_PROVIDER=perplexity` + `PERPLEXITY_API_KEY`, or `AI_PROVIDER=openai` + `OPENAI_API_KEY`, or `AI_PROVIDER=gemini` + `GEMINI_API_KEY`

---

### 3.4 Supplier email / Gmail (optional)

Only if you use supplier email sync (cron or manual).

| Variable | Purpose |
|----------|--------|
| `SUPPLIER_EMAIL_ENABLED` | `true` to enable. |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER` | From Gmail OAuth setup. See [GMAIL_WORKSPACE_OAUTH_SETUP.md](GMAIL_WORKSPACE_OAUTH_SETUP.md). |

---

## 4. Networking and domain

| Check | Where | What to verify |
|-------|--------|----------------|
| Public URL | Railway → **Settings** → **Networking** (or **Domains**) | **Generate Domain** if you don’t have one. You get a URL like `https://your-service.up.railway.app`. |
| HTTPS | Same | Railway provides HTTPS. |
| No trailing slash | When you use the URL elsewhere | Use `https://your-service.up.railway.app` (no trailing slash) in Vercel’s `VITE_API_BASE`. |

Checklist:

- [ ] Domain generated; note the URL
- [ ] In **Vercel** → **Settings** → **Environment Variables**: `VITE_API_BASE` = your Railway URL (no trailing slash), then redeploy frontend. Full list: [VERCEL_CHECKLIST.md](VERCEL_CHECKLIST.md).

---

## 5. Deploy and logs

| Check | Where | What to verify |
|-------|--------|----------------|
| Latest deploy | Railway → **Deployments** | Build and deploy succeeded (green). |
| Logs | Railway → **Deployments** → latest → **View Logs** | On startup you should see something like: `Firebase Admin initialized (project: luxselle-dashboard, emulator: false)`. No uncaught errors. |
| Health endpoint | Browser or `curl` | `curl https://your-railway-url.up.railway.app/api/health` returns 200 and JSON. |

Checklist:

- [ ] Deploy succeeded
- [ ] Logs show Firebase init and no `unhandled_error` on startup
- [ ] `GET /api/health` returns 200

---

## 6. When you get 500 errors

1. **Railway logs** — Deployments → View Logs. Look for `unhandled_error` and the message/stack.
2. **Debug header** — `curl -H "X-Debug: 1" "https://your-railway-url/api/..."` to see `error.message` in the JSON (do not enable for end users).
3. **Common causes:**
   - **Firebase:** Invalid or missing `GOOGLE_APPLICATION_CREDENTIALS_JSON`; wrong project/bucket; `FIREBASE_USE_EMULATOR` not `false`.
   - **Firestore index:** Error says “index required” or includes a Firebase Console index URL → create that composite index in Firebase, wait for it to build.
   - **AI:** `AI_PROVIDER=perplexity`, `openai`, or `gemini` but missing or invalid API key → set key or use `AI_PROVIDER=mock`.

Full steps: [RAILWAY_500_INVESTIGATION.md](RAILWAY_500_INVESTIGATION.md).

---

## 7. Quick verification commands

```bash
# Health check (replace with your Railway URL)
curl https://your-backend.up.railway.app/api/health

# Optional: list products (will 401 if auth required, or 200 with data)
curl https://your-backend.up.railway.app/api/products
```

---

## Summary: “Did I check it on Railway?”

| Area | What to check |
|------|----------------|
| **Project** | Repo linked, root directory empty |
| **Build / Start** | `npm install`, start = `npm run start --workspace=@luxselle/server` |
| **Variables** | `FIREBASE_USE_EMULATOR=false`, project id, bucket, service account JSON (or path); optional: NODE_ENV, AI_*, Gmail |
| **Domain** | Domain generated; URL used in Vercel as `VITE_API_BASE` (no trailing slash) |
| **Deploy & logs** | Deploy succeeded; logs show Firebase init; `/api/health` returns 200 |
| **500s** | Use logs + [RAILWAY_500_INVESTIGATION.md](RAILWAY_500_INVESTIGATION.md) |

See also: [RAILWAY.md](RAILWAY.md) (full deploy guide), [FIREBASE_CHECKLIST.md](../firebase/FIREBASE_CHECKLIST.md) (Firebase side).
