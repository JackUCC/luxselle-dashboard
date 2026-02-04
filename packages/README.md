# Packages

NPM workspaces for shared code and the API server.

| Package | Purpose |
|---------|---------|
| **server** | Express API: products, sourcing, suppliers, pricing, jobs, buying list, dashboard. See `packages/server/README.md`. |
| **shared** | Zod schemas and shared types used by both server and frontend. See `packages/shared/README.md`. |

Install from repo root: `npm install`. Run server: `npm run dev --workspace=@luxselle/server`.
