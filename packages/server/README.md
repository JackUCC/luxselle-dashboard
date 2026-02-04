# Luxselle API Server

Express API used by the dashboard frontend. Runs on port 3001 (or `PORT` env).

## What this package does

- **Routes** (`src/routes/`): One file per area — products, buying-list, pricing, suppliers, dashboard, sourcing, jobs.
- **Repos** (`src/repos/`): Firestore access for each entity (products, suppliers, sourcing requests, etc.).
- **Services** (`src/services/`): Pricing (AI providers), supplier CSV import.
- **Config** (`src/config/`): Env and Firebase.
- **Middleware** (`src/middleware/`): Request ID, logging, auth (optional), idempotency.

## Run

From repo root: `npm run dev --workspace=@luxselle/server` or `npm run dev` (runs emulators + server + frontend). Seed: `npm run seed`.

## Tests

Unit tests live next to source (e.g. `src/lib/fx.test.ts`). From root: `npm run test`.
