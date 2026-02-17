# Firebase: what it should connect to vs what it connects to

## What it **should** connect to (intended config)

| Environment | FIREBASE_USE_EMULATOR | FIREBASE_PROJECT_ID | Where used |
|-------------|------------------------|----------------------|------------|
| **Local dev** (emulator) | `true` | `luxselle-dashboard` | Scripts (clear-inventory, import-*), server when `.env` has emulator on. Firestore/Storage hit `127.0.0.1:8082` and `127.0.0.1:9198`. |
| **Production** (live app) | `false` | `luxselle-dashboard` | Deployed API (e.g. Railway), and scripts when you set `FIREBASE_USE_EMULATOR=false`. Same project in Firebase Console. |

- **Backend** reads: `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_USE_EMULATOR`, `FIRESTORE_DATABASE_ID` (optional; for eur3 use `luxselle-dashboard-95977150`), and credentials (`GOOGLE_APPLICATION_CREDENTIALS_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`).  
  See: [packages/server/src/config/env.ts](../../packages/server/src/config/env.ts) and [packages/server/src/config/firebase.ts](../../packages/server/src/config/firebase.ts).
- **Frontend** (Vite) reads: `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET` (for Storage/auth).  
  See: [src/lib/firebase.ts](../../src/lib/firebase.ts).

For production, backend and frontend should both use the **same** Firebase project and bucket (e.g. `luxselle-dashboard` and `luxselle-dashboard.firebasestorage.app`).

### Two Firestore instances (default vs eur3)

The project **luxselle-dashboard** has two Firestore instances:

| Instance | Database ID | Location | Use |
|----------|-------------|----------|-----|
| **(default)** | `(default)` | nam5 (US) | Used when `FIRESTORE_DATABASE_ID` is unset. |
| **eur3 (Europe)** | `luxselle-dashboard-95977150` | eur3 | Active inventory DB; use by setting `FIRESTORE_DATABASE_ID=luxselle-dashboard-95977150` on Railway and in local production runs. |

If your data lives in the **eur3** instance, the backend must set **`FIRESTORE_DATABASE_ID=luxselle-dashboard-95977150`** (e.g. in Railway env). Otherwise the API talks to the **(default)** US database and will see no data.

## What it **is** connected to (at runtime)

When you run the server or a server script, Firebase Admin initializes using the env above. The process logs:

```text
Firebase Admin initialized (project: <projectId>, emulator: <true|false>, database: <id>?)
```

- **projectId** is from `FIREBASE_PROJECT_ID`.
- **emulator** is `FIREBASE_USE_EMULATOR`; if `true`, Firestore/Storage use emulator hosts.
- **database** is shown when `FIRESTORE_DATABASE_ID` is set (e.g. `luxselle-dashboard-95977150` for eur3); otherwise the **(default)** Firestore database is used.

So “what it is connected to” is exactly the project and emulator flag from the env that was loaded for that process.

## How to check your current connection

From the repo root:

```bash
# Use whatever env is in .env (or shell). Shows “configured” and “connected”.
npm run firebase-connection-details --workspace=@luxselle/server
```

To force production and see that connection:

```bash
FIREBASE_USE_EMULATOR=false npm run firebase-connection-details --workspace=@luxselle/server
```

The script prints:

- **Configured (from env)**: `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_USE_EMULATOR`, and whether credentials are set.
- **Actually connected to**: project ID from the initialized Firebase Admin app and the emulator flag.
- **Match**: whether configured and connected project IDs match.

## Why “0 products deleted” can happen

When you run:

- `npm run clear-inventory --workspace=@luxselle/server`  
  The script sets `FIREBASE_USE_EMULATOR = 'true'` by default, so it clears the **emulator** only.
- `FIREBASE_USE_EMULATOR=false npm run clear-inventory --workspace=@luxselle/server`  
  It uses production. If it still reports “0 products deleted”, then the **production** `products` collection in project `luxselle-dashboard` is empty (or the credentials used are for that project and there are no docs).

If your **app** shows items but the script deletes 0:

1. **App and script use different targets**  
   - App might be using production (e.g. Vercel + Railway) with `FIREBASE_USE_EMULATOR=false` and project `luxselle-dashboard`.  
   - Script might be running with emulator on (default), so it only clears the emulator.  
   **Fix:** Run the script with `FIREBASE_USE_EMULATOR=false` (and the same `.env` or credentials as production) so it hits the same project as the app.

2. **Different Firebase project**  
   - Deployed app might use a different project (e.g. another `VITE_FIREBASE_PROJECT_ID` / backend `FIREBASE_PROJECT_ID`).  
   **Fix:** Set backend and frontend env to the same project/bucket and run `firebase-connection-details` (with `FIREBASE_USE_EMULATOR=false` for production) to confirm “configured” and “connected” both show that project.

## Where config lives

| Source | File or location |
|--------|-------------------|
| Backend env defaults | [packages/server/src/config/env.ts](../../packages/server/src/config/env.ts) (`FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_USE_EMULATOR`) |
| Backend init | [packages/server/src/config/firebase.ts](../../packages/server/src/config/firebase.ts) |
| Frontend | [src/lib/firebase.ts](../../src/lib/firebase.ts) (`VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`) |
| Local env | `.env` in repo root (and optionally `packages/server/.env`) |
| Production | Railway (or host) env vars; Vercel env vars for Vite (`VITE_*`) |
