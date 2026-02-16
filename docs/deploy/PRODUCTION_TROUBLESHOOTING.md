# Production Not Working — Why and How to Fix

This doc explains **why** the app can show "Backend not configured" or fail in production, and what to check in Vercel, Railway, and Firebase.

---

## 1. Why you see "Backend not configured"

The frontend decides the backend is "not configured" in two places:

1. **ServerStatusContext** ([src/lib/ServerStatusContext.tsx](../../src/lib/ServerStatusContext.tsx))  
   On load it requests `GET {API_BASE}/dashboard/status`.  
   - If **API_BASE** is set (e.g. `https://luxselleserver-production.up.railway.app/api`), the request goes to Railway. If the response is JSON, the app sets `isConnected = true` and the banner does not show.  
   - If **API_BASE** is not set, it falls back to `/api` ([src/lib/api.ts](../../src/lib/api.ts)). So the request is `GET /api/dashboard/status` to the **same origin** (your Vercel URL). Vercel serves the SPA: every path is rewritten to `index.html`, so the response is **HTML**, not JSON. The code treats `content-type: text/html` as "backend not configured" and shows the banner.

2. **API helpers** (apiGet, apiPost, etc.)  
   If any request returns HTML (e.g. 200 with `<!doctype html`), the client throws a user-facing error saying to set `VITE_API_BASE` in Vercel and redeploy.

So **the usual cause** is: **VITE_API_BASE is not set in Vercel**, or it was set but the frontend was **not redeployed** (env vars are baked in at build time).

---

## 2. Checklist: Why is production not working?

| Symptom | Likely cause | What to do |
|--------|---------------|------------|
| Banner: "Backend not configured" | `VITE_API_BASE` unset or old build | Vercel → Settings → Environment Variables: set `VITE_API_BASE=https://luxselleserver-production.up.railway.app` (no trailing slash). Then Deployments → Redeploy. |
| Same banner after setting variable | New build not deployed | Redeploy the Vercel project so the new env is used. |
| API calls return 404 or HTML | Wrong `VITE_API_BASE` (typo, trailing slash, or wrong host) | Fix the value; use origin only, no `/api` suffix. Redeploy. |
| CORS errors in browser console | Backend does not allow your frontend origin | Backend allows `*.vercel.app`. If you use a **custom domain** (e.g. app.example.com), the server must allow it: update CORS in [packages/server/src/server.ts](../../packages/server/src/server.ts) to include that origin. |
| API returns 500 | Backend or Firebase error | Check Railway logs (Deployments → View Logs). See [RAILWAY_500_INVESTIGATION.md](RAILWAY_500_INVESTIGATION.md). |
| Health OK but other endpoints 500 | Firebase credentials, indexes, or route bug | Railway variables: `FIREBASE_USE_EMULATOR=false`, valid `GOOGLE_APPLICATION_CREDENTIALS_JSON`. Deploy Firestore indexes if the error says "index required". |

---

## 3. Quick verification

1. **Railway**  
   `curl https://luxselleserver-production.up.railway.app/api/health`  
   Expect: `200` and `{"status":"ok",...}`.

2. **Vercel env**  
   In Vercel → Settings → Environment Variables, confirm `VITE_API_BASE` = `https://luxselleserver-production.up.railway.app` (no trailing slash).  
   Confirm **Production** (and Preview if needed) is checked. Redeploy after any change.

3. **From the app**  
   Open your Vercel URL. If the banner is gone, open Dashboard or Inventory; data should load. In DevTools → Network, API requests should go to `luxselleserver-production.up.railway.app` and return 200 (or 401 if auth is required).

---

## 4. Code flow (for reference)

- **API base**  
  [src/lib/api.ts](../../src/lib/api.ts): `rawBase = import.meta.env.VITE_API_BASE ?? '/api'`. If it starts with `http`, the app appends `/api` so the base is `https://...railway.app/api`. Otherwise it uses `/api` (same-origin; on Vercel that serves HTML).

- **Status check**  
  [src/lib/ServerStatusContext.tsx](../../src/lib/ServerStatusContext.tsx): `fetch(API_BASE + '/dashboard/status')`. If the response is OK and JSON, `isConnected = true`. If not (e.g. HTML), `isConnected = false` and the banner shows.

- **CORS**  
  [packages/server/src/server.ts](../../packages/server/src/server.ts): In production, `origin` is allowed if it matches `/\.vercel\.app$/`, `localhost`, or `127.0.0.1`. Custom domains are not in this list; add them if you use one.

No application code change is required for the typical case: set `VITE_API_BASE` in Vercel and redeploy.
