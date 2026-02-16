# Railway 500 Errors — Full Investigation Guide

When `luxselleserver-production.up.railway.app` returns **500 Internal Server Error**, use this guide to find and fix the cause. The API uses a global error handler: **all uncaught errors become 500** (except Zod validation → 400).

---

## 1. Get the real error (where to look)

### 1.1 Railway logs (primary)

The server logs the actual error before sending 500:

- **Railway Dashboard** → your project → **Deployments** → latest deployment → **View Logs**
- Or CLI: `railway link` then `railway logs` (streaming)

Look for lines like:

```text
unhandled_error <Error message> { requestId: '...' }
```

That message (and optional stack) is the root cause. Note it and match it to the sections below.

### 1.2 Response body with debug header

For one-off debugging you can see the error message in the API response:

```bash
curl -H "X-Debug: 1" "https://luxselleserver-production.up.railway.app/api/products/622bnm72mZmiwco1Q7mp/transactions"
```

The JSON will include `error.message` (and optionally `error.details.stack`) when `X-Debug: 1` is sent. **Do not enable this for end users** — it’s for troubleshooting only.

---

## 2. Endpoints that were 500 in your case

| Endpoint | Purpose | Likely causes |
|----------|---------|----------------|
| `GET /api/products/:id/transactions` | List transactions for a product | Firebase/Firestore config, missing composite index |
| `POST /api/products/:id/transactions` | Create sale/adjustment | Same as above + validation (body shape) |
| `POST /api/market-research/analyse` | AI market analysis | AI provider config, API key, or AI response parsing |
| `GET /api/market-research/trending` | AI trending items | Same as above |

---

## 3. Products & transactions 500s

These routes use **Firestore** via `ProductRepo`, `TransactionRepo`, and `ActivityEventRepo`. Any failure in Firebase init or in a Firestore call becomes 500.

### 3.1 Firebase credentials on Railway

**Symptom:** Logs show Firebase init errors, "Permission denied", or "Could not load the default credentials".

**Check:**

1. **Railway** → **Variables**
   - Either:
     - `GOOGLE_APPLICATION_CREDENTIALS_JSON` = full service account JSON string (preferred), or
     - `GOOGLE_APPLICATION_CREDENTIALS` = path to JSON file (e.g. if Railway injected a file)
   - `FIREBASE_USE_EMULATOR` = `false` in production
   - `FIREBASE_PROJECT_ID` and `FIREBASE_STORAGE_BUCKET` match your Firebase project

2. **JSON validity:** If using `GOOGLE_APPLICATION_CREDENTIALS_JSON`, paste the value into [jsonlint.com](https://jsonlint.com). No trailing commas, no line breaks inside strings.

3. **Service account permissions:** Firebase Console → Project Settings → Service Accounts. The account must have roles that allow Firestore read/write (e.g. "Firebase Admin SDK Administrator Service Agent" or appropriate Firestore role).

**Docs:** `docs/deploy/RAILWAY.md` (Firebase section).

### 3.2 Firestore composite index for transactions

**Symptom:** Logs say the query requires an index, or error message contains a URL like `https://console.firebase.google.com/.../firestore/indexes?create_composite=...`.

**Cause:** `GET /api/products/:id/transactions` runs:

```ts
collection.where('productId', '==', productId).orderBy('occurredAt', 'desc')
```

Firestore needs a **composite index** on `productId` (ASC) and `occurredAt` (DESC).

**Fix:**

1. Copy the index-creation URL from the error (if present) and open it in the browser to create the index in the correct project, or  
2. In Firebase Console → Firestore → **Indexes** → **Composite** → Add:
   - Collection: `transactions`
   - Fields: `productId` (Ascending), `occurredAt` (Descending)

Wait a few minutes for the index to build, then retry.

### 3.3 Product not found vs 500

If the product doesn’t exist, the route returns **404** (not 500). So a 500 on `GET/POST .../transactions` is not “product not found” — it’s an error inside the handler (e.g. Firestore or repo).

---

## 4. Market research 500s (`/analyse`, `/trending`)

These call `MarketResearchService`, which uses **OpenAI** or **mock**. Any thrown error (missing key, network, or bad AI response) becomes 500.

### 4.1 Env and provider selection

**Symptom:** "AI returned no valid JSON", or API key / provider errors in logs.

**Check Railway Variables:**

- `AI_PROVIDER` = `mock` or `openai`
- If `AI_PROVIDER=openai` → `OPENAI_API_KEY` must be set and valid
- If `AI_PROVIDER=mock` → no keys needed; service returns mock data (no 500 from external AI)

**Quick fix to stop 500s:** Set `AI_PROVIDER=mock` until the key and parsing are fixed. Mock responses are defined in `MarketResearchService` and don’t call external APIs.

### 4.2 Invalid or expired API key

- **OpenAI:** Dashboard → API keys. Ensure key is active and has capacity.

Wrong or expired keys often yield 401/403 from the provider; the server may wrap that in a 500. Check Railway logs for the underlying HTTP or error message.

### 4.3 AI returned non-JSON or unexpected shape

**Symptom:** Logs: "AI returned no valid JSON for market research" or JSON parse errors.

The service parses the model output with a regex and expects a JSON object. If the model returns markdown (e.g. ```json ... ```) or extra text, parsing can throw.

**Where it’s handled:** `packages/server/src/services/market-research/MarketResearchService.ts` — `parseJSON()`, `formatResult()`, and the prompts.

**What to do:** Check logs for the exact throw. If it’s parse/format, consider relaxing parsing or falling back to mock when parsing fails (so you return 200 with mock instead of 500).

### 4.4 429 Quota exceeded (OpenAI / Firebase)

**Symptom:** Logs show "429 You exceeded your current quota" or similar rate-limit errors.

**Cause:** OpenAI or Firebase has hit rate or usage limits. The server surfaces these as 500.

**Options:**

- **Temporary:** Set `AI_PROVIDER=mock` in Railway Variables so market-research and pricing endpoints return mock data and no longer call OpenAI.
- **OpenAI:** Check [OpenAI usage](https://platform.openai.com/usage) and upgrade plan or add usage limits; ensure the key has capacity.
- **Firebase 429:** Less common; if the log points to Firestore, check Firebase Console → Usage and quotas.

---

## 5. Checklist summary

Use this order:

| # | Check | Where |
|---|--------|--------|
| 1 | Read **Railway logs** for `unhandled_error` and stack | Railway → Deployments → View Logs |
| 2 | (Optional) Reproduce with `X-Debug: 1` and read `error.message` in response | `curl -H "X-Debug: 1" <failing URL>` |
| 3 | **Firebase:** `GOOGLE_APPLICATION_CREDENTIALS_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`, valid JSON, correct project | Railway → Variables; Firebase Console |
| 4 | **Firestore index** for `transactions` (productId + occurredAt desc) | Firebase Console → Firestore → Indexes; or URL in error |
| 5 | **Market research:** `AI_PROVIDER` and corresponding API key set and valid; or use `mock` | Railway → Variables |
| 6 | **429 quota:** If logs show 429, use `AI_PROVIDER=mock` or increase OpenAI quota | Railway → Variables; OpenAI dashboard |
| 7 | **Market research:** If 500 persists, check logs for parse/format errors and consider fallback to mock | `MarketResearchService.ts` |

---

## 6. Code reference (where errors come from)

- **Global error handler:** `packages/server/src/server.ts` (Zod → 400, everything else → 500).
- **Products/transactions:** `packages/server/src/routes/products.ts` (GET/POST `/:id/transactions`); repos: `ProductRepo`, `TransactionRepo`, `ActivityEventRepo` in `packages/server/src/repos/`.
- **Firebase init:** `packages/server/src/config/firebase.ts` (needs valid credentials in production).
- **Market research:** `packages/server/src/routes/market-research.ts` → `packages/server/src/services/market-research/MarketResearchService.ts` (analyse + getTrending; OpenAI/mock).
- **Env schema:** `packages/server/src/config/env.ts` (all env vars and defaults).

---

## 7. Firestore index definition (for `transactions`)

If you manage indexes via config (e.g. `firebase deploy --only firestore:indexes`), ensure a composite index exists for the transactions query. Example in `firebase/firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "productId", "order": "ASCENDING" },
        { "fieldPath": "occurredAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

If your repo uses a **collection group** or different structure, adjust `collectionGroup` / `queryScope` to match. Then deploy indexes and wait for them to build.

---

**Quick wins:**  
1) Get the exact error from Railway logs.  
2) Fix Firebase credentials or add the Firestore index for transactions.  
3) Set `AI_PROVIDER=mock` to eliminate market-research 500s until AI keys and parsing are solid.
