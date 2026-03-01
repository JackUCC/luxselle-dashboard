# OpenAI-Only Setup - Verification Checklist

Use this checklist when you want OpenAI-only routing for AI features (pricing, market research, image analysis).

---

## 1. Environment variables (Railway or local)

- [ ] **`AI_ROUTING_MODE`** = `openai`
- [ ] **`OPENAI_API_KEY`** = your OpenAI API key (starts with `sk-...`)
- [ ] Optional: leave `PERPLEXITY_API_KEY` unset for strict OpenAI-only behavior

**Railway:** Project -> Variables -> confirm values -> redeploy if you just changed them.

---

## 2. Backend health and status

- [ ] **Health:** `GET https://your-railway-url.up.railway.app/api/health` returns `200` and `{"status":"ok",...}`
- [ ] **Dashboard status:** `GET https://your-railway-url.up.railway.app/api/dashboard/status` returns `200` and `data.aiRoutingMode === "openai"` with `data.providerAvailability.openai === true`

```bash
curl -s "https://luxselleserver-production.up.railway.app/api/dashboard/status" | jq '.data.aiRoutingMode, .data.providerAvailability'
# Expected: "openai" and openai=true
```

---

## 3. Feature checks (all use OpenAI when `AI_ROUTING_MODE=openai`)

### Buy Box / Pricing (Evaluator)

- [ ] Open **Buy Box** (Evaluator) page, enter brand/model (e.g. Chanel, Classic Flap), run analysis.
- [ ] Result returns provider `openai` (or `hybrid` only if fallback behavior is enabled in test overrides); no 500 error.
- [ ] Optional: use **Analyze image** on a product image; brand/model/category/condition/colour should be filled from the image.

### Market Research

- [ ] Open **Market Research** (Research) page.
- [ ] Header shows green badge **AI Routing: openai**.
- [ ] Run **Analyse** for an item; response returns live market data or explicit degraded output (no fabricated mock values).
- [ ] **Trending** loads and shows a list of trending items.

### Inventory CSV import (optional)

- [ ] Supplier Hub → Import CSV with non-standard column names.
- [ ] If AI mapping is used, import completes without 500 (OpenAI suggests column mapping).

---

## 4. If something fails

- **500 on pricing/market-research:** Check Railway logs for `unhandled_error`. Typical causes: missing/invalid `OPENAI_API_KEY`, or **429 quota**. To see the exact error in the response: `curl -H "X-Debug: 1" "https://your-api/api/market-research/trending"`.
- **429 rate limit:** "You exceeded your current quota" means your OpenAI account has hit usage/billing limits. Fix: add payment method or upgrade plan at [platform.openai.com](https://platform.openai.com), or configure `PERPLEXITY_API_KEY` with `AI_ROUTING_MODE=dynamic` as a fallback path.
- **AI status badge shows unavailable:** Confirm env vars and restart backend. `GET /api/dashboard/status` should report provider availability and routing mode.

---

## 5. Quick test commands (after backend is running)

```bash
# Replace BASE with your Railway URL or http://localhost:3001

# Health
curl -s "$BASE/api/health"

# Status (should show aiRoutingMode + providerAvailability)
curl -s "$BASE/api/dashboard/status" | jq .

# Market research trending (should return live data or explicit degraded output, not 500)
curl -s -X GET "$BASE/api/market-research/trending" | jq .
```

---

**Summary:** Set `AI_ROUTING_MODE=dynamic` and configure `OPENAI_API_KEY` (optionally `PERPLEXITY_API_KEY`), then verify dashboard status and one flow from Buy Box and Market Research.
