# Vercel Checklist — What to Check So Your Frontend Works

Use this list in the **Vercel Dashboard** so the React/Vite frontend builds, deploys, and talks to your Railway backend correctly. Env vars are **build-time**: they are baked into the client bundle when Vercel runs `npm run build`.

---

## 1. Project and repo

| Check | Where | What to verify |
|-------|--------|----------------|
| Repo connected | Vercel → **Settings** → **Git** | Connected to `luxselle-dashboard` (or your fork); correct production branch (e.g. `main`). |
| Root directory | Vercel → **Settings** → **General** → **Root Directory** | **Empty** (use repo root). Build and `vercel.json` are at root. |
| Framework | Vercel → **Settings** → **General** | Usually auto-detected as Vite; optional. |

---

## 2. Build settings

The repo has a root [vercel.json](/vercel.json). Vercel can use it automatically.

| Item | Expected | Where to check |
|------|----------|----------------|
| Build command | `npm run build` | vercel.json `buildCommand` or Vercel → **Settings** → **Build & Development** |
| Output directory | `dist` | vercel.json `outputDirectory` or Vercel build output |
| Install command | `npm install` | vercel.json `installCommand` or default |
| SPA routing | All routes → `/index.html` | vercel.json `rewrites`: `{"source":"/(.*)","destination":"/index.html"}` so `/inventory`, `/evaluate`, etc. don’t 404 |

Checklist:

- [ ] Build command = `npm run build`, output = `dist`
- [ ] Rewrites present so client-side routes work (no 404 on refresh or direct URL)

---

## 3. Environment variables (required for production)

Set in **Vercel** → **Settings** → **Environment Variables**. Apply to **Production** (and Preview if you want the same API in previews).

| Variable | Required | Value | Notes |
|----------|----------|--------|--------|
| `VITE_API_BASE` | **Yes (production)** | Your Railway backend URL, **no trailing slash** | e.g. `https://your-backend.up.railway.app`. If missing, the app shows "Backend not configured" and API calls fail. |
| `VITE_FIREBASE_PROJECT_ID` | Yes | `luxselle-dashboard` | Must match backend and Firebase Console. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | `luxselle-dashboard.firebasestorage.app` | Must match backend so image URLs work. |

**Do not set in production:**

- [ ] `VITE_FIREBASE_USE_EMULATOR` — leave **unset** in production (only for local dev).

Checklist:

- [ ] `VITE_API_BASE` = your Railway URL (no trailing slash)
- [ ] `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_STORAGE_BUCKET` set
- [ ] Variables applied to Production (and Preview if desired)
- [ ] **Redeploy** after changing env vars (they are baked in at build time)

---

## 4. After changing variables: redeploy

Env vars are used only at **build time**. Changing them in the dashboard does not affect an already-built deployment.

- [ ] After adding or editing variables: Vercel → **Deployments** → latest → **⋯** → **Redeploy**

---

## 5. Live app checks

| Check | What to do |
|-------|------------|
| No "Backend not configured" banner | Open your Vercel URL. If the banner appears, set `VITE_API_BASE` and redeploy. |
| API calls work | Use the app (e.g. Dashboard, Inventory). Data should load from Railway; no repeated "Backend not configured" toasts. |
| SPA routes | Go to `/inventory`, `/evaluate`, `/buying-list`, etc. directly or refresh — no 404 (thanks to rewrites). |
| CORS | If API calls fail with CORS in the browser console, the **Railway** backend must allow your Vercel origin. See [RAILWAY_CHECKLIST.md](RAILWAY_CHECKLIST.md); server uses regex for `.vercel.app` and localhost. |

---

## 6. Domains (optional)

| Check | Where | What to verify |
|-------|--------|----------------|
| Default URL | Vercel → **Settings** → **Domains** | Default `*.vercel.app` URL works. |
| Custom domain | Same | Add a custom domain here if you use one. |

---

## 7. What not to set on Vercel

Backend and secrets stay on the API host (Railway), not in the frontend build:

- Do **not** set `GOOGLE_APPLICATION_CREDENTIALS`, `OPENAI_API_KEY`, `PORT`, etc. on Vercel — they are not used by the Vite build and would be exposed if they were.

---

## 8. Quick verification

```bash
# Local build (sanity check; uses .env if present)
npm run build

# After deploy: open app and check:
# - No "Backend not configured" banner when VITE_API_BASE is set
# - Navigate to /inventory, /evaluate — no 404
```

---

## Summary: "Did I check it on Vercel?"

| Area | What to check |
|------|----------------|
| **Project** | Repo linked; Root Directory empty |
| **Build** | Build = `npm run build`, output = `dist`; rewrites for SPA |
| **Variables** | `VITE_API_BASE` (Railway URL, no trailing slash), `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`; no emulator in production |
| **Redeploy** | Redeploy after changing env vars |
| **Live** | No backend banner; API and routes work; CORS ok (backend allows Vercel origin) |

See also: [VERCEL.md](VERCEL.md) (full deploy guide), [RAILWAY_CHECKLIST.md](RAILWAY_CHECKLIST.md) (backend and `VITE_API_BASE` source).
