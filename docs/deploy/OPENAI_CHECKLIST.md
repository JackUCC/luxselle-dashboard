# OpenAI-Only Setup — Verification Checklist

The app uses **OpenAI only** for AI features (pricing, market research, image analysis). Use this checklist after setting `OPENAI_API_KEY` to confirm everything works.

---

## 1. Environment variables (Railway or local)

- [ ] **`AI_PROVIDER`** = `openai`
- [ ] **`OPENAI_API_KEY`** = your OpenAI API key (starts with `sk-...`)
- [ ] No `GEMINI_API_KEY` or other Gemini vars needed (they are ignored)

**Railway:** Project → Variables → confirm both set → redeploy if you just changed them.

---

## 2. Backend health and status

- [ ] **Health:** `GET https://your-railway-url.up.railway.app/api/health` returns `200` and `{"status":"ok",...}`
- [ ] **Dashboard status:** `GET https://your-railway-url.up.railway.app/api/dashboard/status` returns `200` and `data.aiProvider === "openai"`

```bash
curl -s "https://luxselleserver-production.up.railway.app/api/dashboard/status" | jq '.data.aiProvider'
# Expected: "openai"
```

---

## 3. Feature checks (all use OpenAI when `AI_PROVIDER=openai`)

### Buy Box / Pricing (Evaluator)

- [ ] Open **Buy Box** (Evaluator) page, enter brand/model (e.g. Chanel, Classic Flap), run analysis.
- [ ] Result shows **AI: OpenAI** or provider `openai`; no 500 error.
- [ ] Optional: use **Analyze image** on a product image; brand/model/category/condition/colour should be filled from the image.

### Market Research

- [ ] Open **Market Research** (Research) page.
- [ ] Header shows green badge **AI: OpenAI** (not "Mock Data").
- [ ] Run **Analyse** for an item; response returns market data (not mock).
- [ ] **Trending** loads and shows a list of trending items.

### Inventory CSV import (optional)

- [ ] Supplier Hub → Import CSV with non-standard column names.
- [ ] If AI mapping is used, import completes without 500 (OpenAI suggests column mapping).

---

## 4. If something fails

- **500 on pricing/market-research:** Check Railway logs for `unhandled_error`. Typical causes: missing/invalid `OPENAI_API_KEY`, or **429 quota**. To see the exact error in the response: `curl -H "X-Debug: 1" "https://your-api/api/market-research/trending"`.
- **429 rate limit:** "You exceeded your current quota" means your OpenAI account has hit usage/billing limits. Fix: add payment method or upgrade plan at [platform.openai.com](https://platform.openai.com); or temporarily set `AI_PROVIDER=mock` for testing.
- **"Mock Data" badge on Market Research:** Backend is not returning `aiProvider: 'openai'` — confirm env vars and that the server was restarted after changing them.

---

## 5. Quick test commands (after backend is running)

```bash
# Replace BASE with your Railway URL or http://localhost:3001

# Health
curl -s "$BASE/api/health"

# Status (should show aiProvider: "openai")
curl -s "$BASE/api/dashboard/status" | jq .

# Market research trending (should return real or mock data, not 500)
curl -s -X GET "$BASE/api/market-research/trending" | jq .
```

---

**Summary:** Set `AI_PROVIDER=openai` and `OPENAI_API_KEY`, then verify dashboard status and one flow from Buy Box and Market Research. If all return 200 and show OpenAI, you’re good.
