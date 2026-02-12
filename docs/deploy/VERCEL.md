# Deploying to Vercel

The Luxselle Dashboard frontend is a static Vite build. Deploys are driven by **Git**: connect your repo in the [Vercel dashboard](https://vercel.com) and push to the linked branch.

## Root directory

- **Repo root**: Use **Root Directory** empty so the repo root is used. The root `vercel.json` defines `npm run build` and output `dist`.
- **App subfolder**: If your Vercel project uses **Root Directory** = `app`, then `app/package.json` runs `cd .. && npm install` and `cd .. && npm run build` then copies `dist` into `app/dist`. Ensure Node version matches `.nvmrc` (e.g. 18 or 20).

## Environment variables (Vercel)

These are **build-time** variables (baked into the client bundle). Set them in Vercel → Project → Settings → Environment Variables.

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID (must match backend). |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage bucket name (must match backend `FIREBASE_STORAGE_BUCKET` so image URLs work). |
| `VITE_API_BASE` | **Yes for production** | Full URL of your backend API (e.g. `https://your-api.railway.app` or `https://your-api.vercel.app`). If unset, the app loads but all API calls receive the SPA HTML and show "Backend not configured." |
| `VITE_FIREBASE_USE_EMULATOR` | No | Set only for local dev; leave **unset** in production. |

**Note:** Backend variables (Firebase service account, `OPENAI_API_KEY`, `PORT`, etc.) are **not** used by the Vite build. Configure those only on the host where the Express API runs (e.g. Railway, Render, or a separate serverless project).

## Production API

On Vercel only the static frontend is deployed; there is no backend. You must:

1. Deploy the Express API elsewhere (e.g. Railway, Render, Fly.io, or a separate Vercel serverless project).
2. In Vercel → Settings → Environment Variables, set `VITE_API_BASE` to that backend URL (no trailing slash).
3. Redeploy so the new value is baked into the build.

Without `VITE_API_BASE`, the app will show a banner: "Backend not configured. Set VITE_API_BASE and redeploy."

## How to test

- **Build only:** `npm run build` (from repo root). Must succeed without requiring a local `.env`.
- **With API missing:** Deploy without `VITE_API_BASE`; you should see the backend banner, not repeated toasts on every request.
- **With API set:** Set `VITE_API_BASE` to a live API and redeploy; dashboard, inventory, and API calls should work.
