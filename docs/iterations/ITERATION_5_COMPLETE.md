# Iteration 5 — Staged plan (complete)

**Scope:** API keys and Vercel launch; fix images; test and document; VAT compliance calculator; invoices from in-person sales; UI cleanup.

---

## Summary

- **Stage 1:** Document Vercel env vars, .env.example production block, init-time API check and "Backend not configured" banner.
- **Stage 2:** Firebase Storage CORS/bucket docs; image `onError` fallbacks in Inventory, ProductDetailDrawer, SupplierHub, BuyingList.
- **Stage 3:** CODE_REFERENCE and ARCHITECTURE updated; production deployment section; placeholder for new routes/schemas (VAT, invoices) added when implemented.
- **Stage 4:** Settings `vatRatePct`; `vat.ts` + API; VAT calculator UI; VAT in product/sale context.
- **Stage 5:** Invoice schema + repo; invoices API; "Create invoice" from Record Sale; Invoices list and detail view.
- **Stage 6:** UI cleanup (consistent styles, loading/empty/a11y).

---

## How to test

- **Unit tests:** `npm run test`
- **E2E:** Start app (`npm run dev`), then `npm run test:e2e`
- **Build:** `npm run build` (no .env required for build)
- **Deploy:** Set env vars per [docs/deploy/VERCEL.md](../deploy/VERCEL.md); deploy frontend to Vercel; run API elsewhere and set `VITE_API_BASE`.

---

## Demo paths

1. Deploy without `VITE_API_BASE`: app shows "Backend not configured" banner.
2. Record sale → Create invoice for this sale → view invoice in Invoices list; VAT shown in calculator and on invoice.

---

## Changed files (summary)

- **Stage 1:** `docs/deploy/VERCEL.md`, `.env.example`, `README.md`, `src/lib/api.ts`, `src/LuxselleApp.tsx`
- **Stage 2:** `docs/firebase/FIREBASE_SETUP.md`, `src/lib/placeholder.ts`, `src/pages/Inventory/ProductDetailDrawer.tsx`, `src/pages/Inventory/InventoryView.tsx`, `src/pages/SupplierHub/SupplierHubView.tsx`, `src/pages/BuyingList/BuyingListView.tsx`
- **Stage 3:** `docs/CODE_REFERENCE.md`, `docs/design/ARCHITECTURE.md`, `docs/README.md`, `docs/iterations/ITERATION_5_COMPLETE.md`
- **Stage 4:** `packages/shared/src/schemas/settings.ts`, `packages/server/scripts/seed.ts`, `packages/server/src/lib/vat.ts`, `packages/server/src/lib/vat.test.ts`, `packages/server/src/routes/vat.ts`, `packages/server/src/server.ts`, `src/pages/Dashboard/DashboardView.tsx`, `src/pages/Inventory/ProductDetailDrawer.tsx`, `docs/CODE_REFERENCE.md`
- **Stage 5:** `packages/shared/src/schemas/invoice.ts`, `packages/shared/src/schemas/index.ts`, `packages/server/src/repos/InvoiceRepo.ts`, `packages/server/src/repos/index.ts`, `packages/server/src/routes/invoices.ts`, `packages/server/src/server.ts`, `src/pages/Inventory/ProductDetailDrawer.tsx`, `src/pages/Invoices/InvoicesView.tsx`, `src/LuxselleApp.tsx`, `tests/e2e/evaluator.spec.ts`, `docs/CODE_REFERENCE.md`
- **Stage 6:** `src/pages/Inventory/ProductDetailDrawer.tsx` (aria-labels on close buttons), `docs/iterations/ITERATION_5_COMPLETE.md`

## UI cleanup checklist (Stage 6)

- [x] Reuse `lux-card`, `lux-btn-primary`, `lux-input` on new surfaces (VAT calculator, Invoices, invoice modal)
- [x] Page title + subtitle pattern on Invoices page
- [x] Empty state on Invoices list with short message and guidance
- [x] Loading state on VAT calculate and invoice create
- [x] aria-labels on icon-only buttons (drawer close, invoice modal close)
- [x] No large redesign; align and tidy only
