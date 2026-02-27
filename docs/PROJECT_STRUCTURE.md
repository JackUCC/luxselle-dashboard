# Project Structure and Guide

This document provides an overview of the project's directory structure and the purpose of key files and folders.

## Directory Overview

### `app/`

**Purpose**: Vercel Deployment Root.

- This folder exists primarily for Vercel's **Root Directory** setting.
- **Vercel Project ID**: `prj_tgxQea77MuP99i9oUQDPVkoJIs4W`
- **Note**: Do not add source code here; it stays at the repo root. Validation and build output is copied here during deployment.

### `config/`

**Purpose**: Build and Test Configuration.

- Contains configuration files for development tools, keeping the root directory clean.
- **Key Files**:
  - `vite.config.ts`: Frontend dev/build config (proxies `/api`, aliases `@shared`).
  - `vitest.config.ts`: Unit test config for backend logic.
  - `playwright.config.cjs`: E2E test config.
- **Note**: `tsconfig.json`, `tailwind.config.js`, and `postcss.config.js` remain at the root for tool compatibility.

### `firebase/`

**Purpose**: Firebase Configuration and Rules.

- **Key Files**:
  - `firebase.json`: Emulator ports and rules paths.
  - `firestore.rules`: Security rules for Firestore.
  - `storage.rules`: Security rules for Storage.
  - `firestore.indexes.json`: Database indexes.
- **Emulators**: Run with `npm run emulators` from the repo root.

### `packages/`

**Purpose**: NPM Workspaces for Monorepo Structure.

- **`server`**: Express API backend (Products, Sourcing, Jobs, etc.).
  - Run: `npm run dev --workspace=@luxselle/server`
- **`shared`**: Shared Zod schemas and TypeScript types used by both frontend and backend.

### `src/pages/`

**Purpose**: Frontend Page Components.

- Each folder corresponds to a route and contains the main view and page-specific components.
- **Routes**:
  - `Dashboard` (`/`): Overview, KPIs, Command Bar.
  - `Inventory` (`/inventory`): Product list, details drawer.
  - `Evaluator` (`/buy-box`): Product analysis and buy box calculator.
  - `SupplierHub` (`/supplier-hub`): Supplier management and CSV imports.
  - `Sourcing` (`/sourcing`): Sourcing request pipeline.
  - `Jobs` (`/jobs`): System background jobs.
- **Shared Code**: Global components in `src/components/`, API/Config in `src/lib/`.

### `src/styles/`

**Purpose**: Global Styling.

- **`index.css`**: Tailwind directives, CSS variables, and custom utility classes (e.g., `.lux-card`, `.lux-btn-primary`).
- **Config**: Tailwind configuration is at `tailwind.config.js` in the root.

### `storage/invoices/`

**Purpose**: Local storage for Invoice PDFs.

- Contains PDF files for testing or seeding the database.
- **Importing**: Use `npm run import-invoice-pdfs` to upload these to Firebase Storage and create Firestore records.

### `tests/`

**Purpose**: Automated Tests.

- **`e2e/`**: Playwright end-to-end browser tests.
  - Run: `npm run test:e2e` (requires running app).
- **Unit Tests**: Co-located with source code in `packages/server/src/` (e.g., `fx.test.ts`).
  - Run: `npm run test`.

## Other Key Files

- **`AGENTS.md`**: Guide to the AI agents and their capabilities within this project.
- **`docs/`**: Detailed documentation on deployment, architecture, and planning.
