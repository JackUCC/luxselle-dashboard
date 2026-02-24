# Checklist after QA run (your side)

Use this after the `qa-run-fixes` branch is in your repo.

---

## 1. PR and merge

- [ ] Open PR: [Create PR from qa-run-fixes to main](https://github.com/JackUCC/luxselle-dashboard/pull/new/qa-run-fixes)
- [ ] Review changes (Playwright config, typecheck script, QA docs)
- [ ] Merge into `main` when ready

---

## 2. E2E tests (reliable run)

- [ ] Stop any running `npm run dev` or Firebase emulator processes
- [ ] Terminal 1: `npm run dev` — wait for Vite (http://localhost:5173) and API to be ready
- [ ] Terminal 2: `npm run test:e2e` — expect all 15 tests to pass

---

## 3. Baseline (optional re-check)

- [ ] `npm run test --workspace=@luxselle/server` — 44 tests pass
- [ ] `npm run typecheck` — no errors
- [ ] `npm run build` — build succeeds

---

## 4. Frontend smoke (optional)

With app running, open each route and confirm it loads and nav works:

- [ ] `/` (Dashboard)
- [ ] `/inventory`
- [ ] `/buy-box`
- [ ] `/market-research`
- [ ] `/sourcing`
- [ ] `/jobs`
- [ ] `/invoices`

---

## 5. Before production deploy

- [ ] Firebase (emulator or live project) and env vars set per deploy docs
- [ ] Gmail OAuth / supplier email / pricing API keys configured if needed (see [PRODUCTION_INPUTS_SUPPLIER_EMAIL_AND_PRICING.md](../deploy/PRODUCTION_INPUTS_SUPPLIER_EMAIL_AND_PRICING.md), [GMAIL_WORKSPACE_OAUTH_SETUP.md](../deploy/GMAIL_WORKSPACE_OAUTH_SETUP.md))
