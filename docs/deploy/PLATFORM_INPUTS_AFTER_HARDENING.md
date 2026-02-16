# Platform Inputs Needed After Core Hardening Update

This checklist captures what you (ops/admin) need to add or verify in **Firebase**, **Railway**, and **Vercel** after the backend hardening + sample-data workflow update.

## 1) Railway (backend)

### Required

- `NODE_ENV=production`
- `FIREBASE_USE_EMULATOR=false`
- `FIREBASE_PROJECT_ID=<your-firebase-project-id>`
- `FIREBASE_STORAGE_BUCKET=<your-firebase-bucket>`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON=<service-account-json>` (or `GOOGLE_APPLICATION_CREDENTIALS` file path)

### Security requirement (new)

- **Do not set** `SKIP_AUTH=true` in production.
- The server now fails fast on startup if `NODE_ENV=production` and `SKIP_AUTH=true`.

### Optional feature inputs

- Pricing provider:
  - `AI_PROVIDER=openai` + `OPENAI_API_KEY=...`
  - or `AI_PROVIDER=gemini` + `GEMINI_API_KEY=...`
- Supplier email sync:
  - `SUPPLIER_EMAIL_ENABLED=true`
  - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER`

---

## 2) Firebase

### Verify project + credentials

- Firestore + Storage enabled for the same project used by Railway vars.
- Service account used in Railway has Firestore/Storage access.

### Suggested production hardening

- Keep Firestore and Storage rules locked down to client SDK reads/writes (backend uses Admin SDK).
- Confirm Storage CORS for Vercel origin(s).

---

## 3) Vercel (frontend)

### Required

- `VITE_API_BASE=https://<your-railway-backend-domain>`
- `VITE_FIREBASE_PROJECT_ID=<your-firebase-project-id>`
- `VITE_FIREBASE_STORAGE_BUCKET=<your-firebase-bucket>`

### Important

- `VITE_*` vars are **build-time** only. After changes, redeploy the frontend.

---

## 4) Sample data smoke verification (new workflow)

Use the new idempotent sample-data scripts to validate production flows without destructive resets.

### Load sample smoke data

```bash
npm run sample:load -- --org=default --allow-production-seed
```

### Clean up sample smoke data

```bash
npm run sample:cleanup -- --org=default
```

---

## 5) Destructive seed safety

The seed script is now reset-only and safety-gated.

- Emulator reset seed:

```bash
npm run seed -- --confirm-reset
```

- In production/non-emulator environments, destructive reset is blocked.
