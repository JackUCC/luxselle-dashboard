# Firebase Checklist — Add & Verify So Your Code Works

Use this list to confirm everything is in place for Firebase (local emulators and production). Check off each item as you verify or add it.

---

## 1. Firebase CLI & project link

| Item | What to do | Verify |
|------|------------|--------|
| Firebase CLI | Install: `npm install` (includes `firebase-tools`). Global optional: `npm install -g firebase-tools` | `npx firebase --version` or `firebase --version` |
| Logged in | Log in to your Google account | `firebase login:list` |
| Project linked | Default project set | `firebase use` → should show `luxselle-dashboard` |
| Project exists | Project exists in Firebase Console | [Console](https://console.firebase.google.com) → project `luxselle-dashboard` |

**Files that should exist:**

- [ ] Root [`.firebaserc`](/Users/jackkelleher/luxselle-dashboard/.firebaserc) with `"default": "luxselle-dashboard"`
- [ ] [firebase/.firebaserc](/Users/jackkelleher/luxselle-dashboard/firebase/.firebaserc) (optional; can match root)

---

## 2. Config files under `firebase/`

| File | Purpose | Status in repo |
|------|---------|-----------------|
| [firebase/firebase.json](/Users/jackkelleher/luxselle-dashboard/firebase/firebase.json) | Services + emulator ports | Present: Firestore 8082, Storage 9198, UI 4010 |
| [firebase/firestore.rules](/Users/jackkelleher/luxselle-dashboard/firebase/firestore.rules) | Firestore security rules | Present: `allow read, write: if false` (backend uses Admin SDK) |
| [firebase/firestore.indexes.json](/Users/jackkelleher/luxselle-dashboard/firebase/firestore.indexes.json) | Composite indexes | Present: e.g. `transactions` (productId, occurredAt) |
| [firebase/storage.rules](/Users/jackkelleher/luxselle-dashboard/firebase/storage.rules) | Storage security rules | Present: `allow read, write: if false` |

**Checklist:**

- [ ] All four files exist under `firebase/`
- [ ] No syntax errors: e.g. `firebase deploy --only firestore:rules --dry-run`

---

## 3. Emulator ports (must match everywhere)

Current **source of truth** is [firebase/firebase.json](/Users/jackkelleher/luxselle-dashboard/firebase/firebase.json):

- Firestore: **8082**
- Storage: **9198**
- Emulator UI: **4010**

| Where | Variable / constant | Expected value |
|-------|---------------------|----------------|
| `.env` | `FIRESTORE_EMULATOR_HOST` | `127.0.0.1:8082` |
| `.env` | `FIREBASE_STORAGE_EMULATOR_HOST` | `127.0.0.1:9198` |
| Server [packages/server/src/config/firebase.ts](/Users/jackkelleher/luxselle-dashboard/packages/server/src/config/firebase.ts) | Defaults when env unset | `127.0.0.1:8082`, `127.0.0.1:9198` |
| E2E tests | Firestore emulator API (clear data) | Must use **8082** (see [tests/e2e](/Users/jackkelleher/luxselle-dashboard/tests/e2e)) |

**Checklist:**

- [ ] `.env` has `FIRESTORE_EMULATOR_HOST=127.0.0.1:8082` and `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9198`
- [ ] E2E specs use `http://127.0.0.1:8082` for the Firestore emulator base URL (not 8080), so clearing data works

---

## 4. Environment variables

### Backend (server / API)

| Variable | Required for | Example / note |
|----------|--------------|----------------|
| `FIREBASE_USE_EMULATOR` | All | `true` (local) or `false` (production) |
| `FIREBASE_PROJECT_ID` | All | `luxselle-dashboard` |
| `FIREBASE_STORAGE_BUCKET` | All | `luxselle-dashboard.firebasestorage.app` |
| `FIRESTORE_EMULATOR_HOST` | Local only | `127.0.0.1:8082` |
| `FIREBASE_STORAGE_EMULATOR_HOST` | Local only | `127.0.0.1:9198` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Production | Path to service account JSON file |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Production (e.g. Railway) | Full service account JSON string |

**Checklist:**

- [ ] Copy [`.env.example`](/Users/jackkelleher/luxselle-dashboard/.env.example) to `.env` if you don’t have `.env`
- [ ] Local: `FIREBASE_USE_EMULATOR=true` and emulator hosts set (see above)
- [ ] Production: `FIREBASE_USE_EMULATOR=false` and one of `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_APPLICATION_CREDENTIALS_JSON` set

### Frontend (Vite)

| Variable | Required for | Example |
|----------|--------------|---------|
| `VITE_FIREBASE_PROJECT_ID` | Storage/auth config | `luxselle-dashboard` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage URLs | `luxselle-dashboard.firebasestorage.app` |

**Checklist:**

- [ ] Both set in `.env` (or in build env) so [src/lib/firebase.ts](/Users/jackkelleher/luxselle-dashboard/src/lib/firebase.ts) resolves them

---

## 5. npm scripts

| Script | Purpose | Config path |
|--------|---------|-------------|
| `npm run emulators` | Start Firestore + Storage emulators | `firebase/firebase.json` |
| `npm run dev` | Emulators + backend + frontend | Uses same config |

**Checklist:**

- [ ] Root [package.json](/Users/jackkelleher/luxselle-dashboard/package.json) has `"emulators": "firebase emulators:start --only firestore,storage --config firebase/firebase.json"`
- [ ] From repo root, `npm run emulators` starts without errors and UI is at http://localhost:4010

---

## 6. Backend (Firebase Admin SDK)

| Item | Location | What to check |
|------|----------|---------------|
| Package | `packages/server` or root | `firebase-admin` in dependencies |
| Init | [packages/server/src/config/firebase.ts](/Users/jackkelleher/luxselle-dashboard/packages/server/src/config/firebase.ts) | Sets `FIRESTORE_EMULATOR_HOST` / `FIREBASE_STORAGE_EMULATOR_HOST` when `FIREBASE_USE_EMULATOR=true` |
| Exports | Same file | `db` (Firestore) and `storage` (Storage) exported and used by routes/services |

**Checklist:**

- [ ] Server starts without Firebase init errors when `.env` is correct
- [ ] With emulators on: server logs show “emulator: true” and operations hit emulators

---

## 7. Production: credentials & rules

**Railway:** For a full list of what to set and verify on Railway (variables, build, domain, logs), see [docs/deploy/RAILWAY_CHECKLIST.md](../deploy/RAILWAY_CHECKLIST.md).

| Item | What to do |
|------|------------|
| Service account | Firebase Console → Project settings → Service accounts → Generate new private key. Use file path or paste JSON into `GOOGLE_APPLICATION_CREDENTIALS_JSON`. |
| Firestore rules | Deploy: `firebase deploy --only firestore:rules` (from repo root; config in `firebase/`). Rules should deny client access (`if false`) when using Admin-only backend. |
| Firestore indexes | Deploy: `firebase deploy --only firestore:indexes` so production has the same indexes as in `firestore.indexes.json`. |
| Storage rules | Deploy: `firebase deploy --only storage`. Same “deny all” for client; backend uses Admin SDK. |

**Checklist:**

- [ ] Production env has valid credentials and `FIREBASE_USE_EMULATOR=false`
- [ ] Rules and indexes deployed after any change to `firebase/firestore.rules` or `firebase/firestore.indexes.json`

---

**Vercel:** For a full list of what to set and verify on Vercel (env vars, build, redeploy), see [docs/deploy/VERCEL_CHECKLIST.md](../deploy/VERCEL_CHECKLIST.md).

## 8. Production: Storage bucket & CORS

| Item | What to do |
|------|------------|
| Bucket name | Backend and frontend must use the same bucket: `FIREBASE_STORAGE_BUCKET` and `VITE_FIREBASE_STORAGE_BUCKET` (e.g. `luxselle-dashboard.firebasestorage.app`). |
| CORS | If the frontend loads images from Storage (e.g. product images), set CORS on the bucket so your app origin can GET. Example: Firebase Console → Storage → … → CORS, or `gsutil cors set cors.json gs://<bucket>`. |

**Checklist:**

- [ ] Bucket name identical in server and frontend env
- [ ] CORS configured for frontend origin(s) if you use direct Storage URLs in the browser

---

## 9. Optional: Firebase Client SDK on frontend

The app is designed to use the **backend API only** (no Firebase client SDK). [src/lib/firebase.ts](/Users/jackkelleher/luxselle-dashboard/src/lib/firebase.ts) only exports config (projectId, storageBucket).

- [ ] If you never add `firebase` (client) package: nothing to do.
- [ ] If you add it later: install `firebase`, init in `src/lib/firebase.ts`, and if you use emulators from the client, connect to `127.0.0.1:8082` (Firestore) and `127.0.0.1:9198` (Storage).

---

## 10. Quick verification commands

```bash
# CLI and project
firebase login:list
firebase use

# Config and rules (dry run)
firebase deploy --only firestore:rules --dry-run
firebase deploy --only firestore:indexes --dry-run

# Emulators (from repo root)
npm run emulators
# Then: Emulator UI http://localhost:4010, Firestore 8082, Storage 9198

# Full stack
npm run dev
# Then: Frontend http://localhost:5173, API http://localhost:3001
```

---

## Summary table: “Did I add / check it?”

| Area | Add / check |
|------|-------------|
| CLI & project | Login, `firebase use`, `.firebaserc` |
| Config files | `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules` in `firebase/` |
| Ports | All use 8082 (Firestore) and 9198 (Storage) to match `firebase.json` |
| Env (backend) | `FIREBASE_USE_EMULATOR`, project id, bucket, emulator hosts; production credentials |
| Env (frontend) | `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET` |
| Scripts | `npm run emulators` uses `firebase/firebase.json` |
| Production | Credentials, deploy rules & indexes, bucket name, CORS if needed |

Once everything above is checked, Firebase should work for both local development and production.
