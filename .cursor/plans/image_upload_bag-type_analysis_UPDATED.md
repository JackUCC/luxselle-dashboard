---
name: Image upload bag-type analysis
overview: Image upload does not automatically run "what type of bag" analysis; the backend analyze-image endpoint bypasses AiRouter and only uses OpenAI. Fix by (1) routing analyze-image through AiRouter and adding Perplexity vision so either key works, (2) auto-triggering analyze on image select. If removal is preferred, the plan includes a minimal removal path.
todos: []
isProject: false
---

# Image upload and automatic bag-type analysis

## Current behavior

- **Evaluator (Price Check)** ([src/pages/BuyBox/EvaluatorView.tsx](src/pages/BuyBox/EvaluatorView.tsx)) and **Unified Intelligence** ([src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx](src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx)): User selects an image → preview appears with two buttons: **"Analyze with AI"** and **"Find similar"**. Nothing runs automatically.
- **QuickCheck (sidecar)** ([src/components/sidecar/QuickCheck.tsx](src/components/sidecar/QuickCheck.tsx)): Image upload only supports **"Find similar"** (visual similarity). It does **not** call the analyze-image endpoint, so it never infers bag type from the image.
- **Backend** ([packages/server/src/routes/pricing.ts](packages/server/src/routes/pricing.ts)): `POST /api/pricing/analyze-image` currently **bypasses the AiRouter**: it calls **OpenAI Vision (gpt-4o)** directly and returns **503** if `OPENAI_API_KEY` is not set. The **AiRouter** ([packages/server/src/services/ai/AiRouter.ts](packages/server/src/services/ai/AiRouter.ts)) already has a `vision_analysis` task and `analyseVisionJson()` but only implements OpenAI; Perplexity's API also supports image input (base64/URL, `input_image` content type), so vision can work with either key.

So "image upload not working" is likely one or both of:

1. **Expectation:** "When I add the image it should automatically search and figure out what type of bag" → **not implemented**. Analyze only runs when the user clicks "Analyze with AI".
2. **Environment:** If neither `OPENAI_API_KEY` nor `PERPLEXITY_API_KEY` is set (or only Perplexity is set but the route only checks OpenAI), analyze-image returns 503 and the UI shows a generic "Analyze failed" toast.

---

## Recommended fix

### 1. Backend: Route analyze-image through AiRouter and add Perplexity vision

- **Use AiRouter for vision** so image analysis respects `AI_ROUTING_MODE` and works with **either** `OPENAI_API_KEY` or `PERPLEXITY_API_KEY`.
  - In [packages/server/src/routes/pricing.ts](packages/server/src/routes/pricing.ts): Replace the direct OpenAI call in `POST /api/pricing/analyze-image` with `getAiRouter().analyseVisionJson()`.
  - Define a Zod schema for the response (e.g. `brand`, `model`, `category`, `condition`, `colour`), pass `imageBase64`, `mimeType`, and the same text prompt. Map the router result to the existing API response shape (`query` string from brand + model + colour, plus `condition`, etc.).
  - Remove the `if (!env.OPENAI_API_KEY)` 503 guard; let the router throw when no provider is available. In the route's catch, map AiRouter errors to 503 and use the router's message (e.g. "No configured AI provider available for vision. Set OPENAI_API_KEY or PERPLEXITY_API_KEY.").
- **Add Perplexity vision to AiRouter** ([packages/server/src/services/ai/AiRouter.ts](packages/server/src/services/ai/AiRouter.ts)):
  - In `analyseVisionJson()`, add `perplexity: () => this.analyseVisionWithPerplexity(opts)` to `runByProvider`.
  - Implement `analyseVisionWithPerplexity(opts: VisionJsonOptions<T>)`: call Perplexity chat/completions with a `content` array that includes a text part and an image part (Perplexity supports images via base64 data URI or `type: "input_image"` per their docs). Use the same JSON-extraction prompt and `parseJsonWithRepair()` for the response.
  - Set `getProviderAvailability().vision` to `Boolean(env.OPENAI_API_KEY) || Boolean(env.PERPLEXITY_API_KEY)`.
  - Set `PREFERRED_PROVIDERS_BY_TASK.vision_analysis` to `['openai', 'perplexity']`. In `resolveBaseProviderOrder` for `vision_analysis`, return both providers in preferred order based on `AI_ROUTING_MODE` (openai-only / perplexity-only / dynamic with preferred list).

Result: analyze-image works when **either** key is set; with both set, routing mode and health determine which provider is used.

### 2. Frontend: Auto-analyze on image select

- **EvaluatorView** and **UnifiedIntelligenceView**: After the user selects an image, automatically call POST `/api/pricing/analyze-image` so the search field and condition are filled without an extra click.
  - Implementation: Use a `useEffect` that depends on `uploadedImage`. When `uploadedImage` changes from `null` to a `File`, call the analyze-image API with that file (e.g. via a small helper that builds FormData and calls the API). Set loading state, then update `query` and `condition` from the response (toast on success/failure). Avoid double-firing (e.g. only run when a new file is set, not on every mount).
- **Optional:** In **QuickCheck**, after image select, call analyze-image and set the "Item description" field so the user can click "Run" for a price check without typing.
- **Error handling:** For 503, show a clearer toast: e.g. "Image analysis unavailable. Set OPENAI_API_KEY or PERPLEXITY_API_KEY on the server, or enter search text manually." Frontend can keep surfacing `error.message` from the API and add this fallback for 503.

This keeps the existing "Analyze with AI" and "Find similar" buttons for re-run and manual triggers.

---

## If you prefer to remove the feature

If auto-analyze still doesn't solve the issue or you want to drop image-based analysis:

1. **Frontend:** Remove or hide the image upload + "Analyze with AI" (and optionally "Find similar") in:
  - [src/pages/BuyBox/EvaluatorView.tsx](src/pages/BuyBox/EvaluatorView.tsx)
  - [src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx](src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx)
  - [src/components/sidecar/QuickCheck.tsx](src/components/sidecar/QuickCheck.tsx) (image block)
2. **Backend:** Remove or stub `POST /api/pricing/analyze-image` in [packages/server/src/routes/pricing.ts](packages/server/src/routes/pricing.ts) (e.g. return 410 Gone or 501 with message "Image analysis disabled").
3. **Docs:** Note in README or deploy docs that image analysis is removed; neither `OPENAI_API_KEY` nor `PERPLEXITY_API_KEY` is required for this flow if no other vision/AI usage remains.

---

## Summary

| Issue | Cause | Fix |
|-------|--------|-----|
| "When I add the image it should automatically search / figure out bag type" | Analyze only runs on "Analyze with AI" click | Auto-trigger analyze when image is selected (useEffect in Evaluator + UnifiedIntelligence) |
| Analyze only works with OpenAI | Route uses OpenAI directly; AiRouter vision is OpenAI-only | Route through AiRouter; add Perplexity vision in AiRouter; vision works with either key |
| Analyze fails with no clear reason | 503 when no vision provider (e.g. missing both API keys) | Router message + toast: set OPENAI_API_KEY or PERPLEXITY_API_KEY or enter search manually |
| Sidecar "upload image" doesn't infer bag type | QuickCheck never calls analyze-image | Optional: add analyze-image on image select and fill query so user can Run |

No change to `apiPostFormData` or multer is required; the analyze-image endpoint and FormData usage are correct. Visual search ("Find similar") uses a mock embedding service and does not require an API key; it can return low-quality matches but should not block the flow.
