# Luxselle API Server

Express API used by the dashboard frontend. Runs on port 3001 (or `PORT` env).

## What this package does

- **Routes** (`src/routes/`): One file per area — products, buying-list, pricing, suppliers, dashboard, sourcing, jobs.
- **Repos** (`src/repos/`): Firestore access for each entity (products, suppliers, sourcing requests, etc.).
- **Services** (`src/services/`): Pricing (AI providers), supplier CSV import.
- **Config** (`src/config/`): Env and Firebase.
- **Middleware** (`src/middleware/`): Request ID, logging, auth (optional), idempotency.

### Idempotency (optional)

The idempotency middleware is **not mounted on any route by default**. It is available for critical POST operations (e.g. invoice creation, pricing analyse, supplier sync) where replay protection is required.

- **Client:** Send `X-Idempotency-Key: <uuid>` (or use `generateFileIdempotencyKey` for file-based flows).
- **Server:** Mount per route: `router.post('/path', idempotency, handler)`. If the key was already used, the cached response is returned; if the same key is in progress, the API returns 409 Conflict.
- **Storage:** Firestore collection `idempotency_keys`; keys expire after 24 hours.

See `src/middleware/idempotency.ts` for usage and `generateFileIdempotencyKey` for supplier import flows.

## Run

From repo root: `npm run dev --workspace=@luxselle/server` or `npm run dev` (runs emulators + server + frontend). Seed: `npm run seed`.

## Tests

Unit tests live next to source (e.g. `src/lib/fx.test.ts`). From root: `npm run test`.
