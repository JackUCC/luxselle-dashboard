# Stack Research

**Domain:** Luxury resale intelligence dashboard — agentic scraping, ML price prediction, background job scheduling
**Researched:** 2026-02-28
**Confidence:** MEDIUM (WebSearch/WebFetch tools unavailable; npm registry accessible but Bash sandboxed; findings based on codebase inspection + training data; confidence levels assigned per-finding)

---

## Context: What Already Exists

This is an **additive** research document. Do NOT re-evaluate the existing React/Vite/Express/Firebase stack. The existing foundation is:

- Express + tsx (no build, direct ESM execution) — `packages/server`
- OpenAI SDK v6 via dynamic import — used for chat completions + `responses.create` with `web_search` tool
- Existing `JobRunner.ts` — in-process async job execution (comment in file explicitly says "replace with Bull/BullMQ for production at scale")
- Existing `SearchService.ts` — wraps OpenAI Responses API `web_search` tool for RAG pipelines
- Firestore (`firebase-admin`) — used as both primary DB and job state store via `SystemJobRepo`
- No scraping library (zero Playwright, Puppeteer, cheerio, or axios-html currently installed)
- No scheduling library (zero node-cron, BullMQ, agenda installed)
- No ML library (zero TensorFlow.js, ONNX, simple-statistics installed)

The question is: **what to add** for agentic scraping, ML price prediction, and background job scheduling.

---

## Recommended Stack

### Core Technologies: Background Job Scheduling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **BullMQ** | ^5.x | Job queue + scheduler for background intelligence tasks | Purpose-built for Node.js job queues; Redis-backed so jobs survive server restarts (critical for Railway); built-in cron scheduling via `QueueScheduler`; TypeScript-first API; the existing `JobRunner.ts` already anticipates this ("replace with Bull/BullMQ"). Confidence: MEDIUM — training data, widely used in Node.js ecosystem. |
| **ioredis** | ^5.x | Redis client required by BullMQ | BullMQ requires Redis; ioredis is its documented peer dependency; Railway supports Redis add-on. Confidence: MEDIUM. |

**Why BullMQ over alternatives:**
- `node-cron` / `cron`: Runs in-process, jobs lost on restart — same problem `JobRunner.ts` already has. Good only for simple triggers, not durable work.
- `agenda`: MongoDB-backed — adds a second DB when Firestore already exists. No benefit.
- `Temporal.io` / `Inngest`: Cloud services, add external dependency and billing complexity. Overkill for a single-operator internal tool.
- Raw `setInterval`: Loses jobs on crash, no retry, no visibility. Already proven insufficient.

**Railway Redis:** Railway provides a Redis add-on as a first-class service. Single `REDIS_URL` env var. Zero ops burden. Confidence: MEDIUM.

---

### Core Technologies: Agentic Scraping

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Playwright** | ^1.x (already in project as `@playwright/test`) | Headless browser for JS-rendered competitor pages | Already installed as a dev/test dependency (`@playwright/test ^1.58.0`). Can be used in production server code via `playwright` (core package). Handles SPAs, anti-bot JS challenges, lazy-loaded prices. For luxury resale sites (Vestiaire is heavy React, Designer Exchange uses JS), HTML fetch alone fails. |
| **cheerio** | ^1.x | HTML parsing for static/SSR pages | When pages don't require JS execution (simpler sites), cheerio is 10–100x faster than Playwright. Use as the fast path; fall back to Playwright only when needed. Cheerio is a familiar jQuery-like API for HTML parsing. Confidence: HIGH — industry standard. |

**Why not alternatives:**
- `puppeteer`: Playwright is the modern successor. More reliable, better TypeScript support, works across Chromium/Firefox/WebKit. @playwright/test is already installed.
- `axios` + `cheerio` only: Will fail on Vestiaire Collective and other heavy SPA-based resale marketplaces.
- Browserless.io / ScrapingBee: External services add billing, rate limits, and latency. Adds vendor lock-in. Wrong choice for a single-operator tool.
- `Crawlee` (Apify): Heavyweight framework. Good for large crawlers, overkill here.

**Important caveat (LOW confidence — needs validation):** Competitor sites (designerexchange.ie, luxuryexchange.ie, siopaella.com) may use Cloudflare or similar bot protection. Playwright with stealth plugins (`playwright-extra` + `puppeteer-extra-plugin-stealth`) is the workaround, but this adds complexity. Verify by manually testing a headless fetch against each target site before committing to the scraping approach.

**The existing OpenAI `web_search` tool is already doing light scraping.** The real gap is *persistent, scheduled* scraping that runs without a user trigger — that's the BullMQ job use case. The scraper itself can still delegate to OpenAI `web_search` + cheerio for extraction, using Playwright only as a last resort when pages block simple fetches.

---

### Core Technologies: ML Price Prediction

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **simple-statistics** | ^7.x | Statistical price modelling (regression, percentiles) | For luxury resale price prediction, the signal set is sparse (few comps per item) and bespoke. A full ML model needs hundreds of labelled training examples per item class. The existing system already gets 2–6 comps per query via OpenAI web_search. The smart play is **statistical enhancement of the existing RAG pipeline** rather than a full ML model. `simple-statistics` gives linear regression, percentile bands, and outlier removal with zero model training overhead. Confidence: HIGH — widely used, simple API. |
| **OpenAI gpt-4o** | via existing `openai` SDK | Upgraded model for price reasoning | The existing services use `gpt-4o-mini`. For serial decode confidence and price predictions where higher accuracy matters, upgrading specific calls to `gpt-4o` (full model) yields meaningfully better results. This is not a new library — it's a configuration decision. Cost: ~10x vs mini, use selectively. Confidence: HIGH. |

**Why NOT traditional ML frameworks:**
- `TensorFlow.js` / `@tensorflow/tfjs-node`: Requires training data (hundreds to thousands of labelled examples per brand/model). Luxselle doesn't have this yet. Training infrastructure (GPU, data pipelines) doesn't exist. Time-to-value is months. Wrong for this phase.
- `ONNX Runtime`: Same problem — requires pre-trained models and a training data pipeline.
- `ml5.js`: Browser-only, not useful server-side.
- `brain.js`: Simple neural nets, but same data requirement problem. No advantage over statistical methods for sparse data.

**The honest ML recommendation:** "ML price prediction" in the project requirements means *smarter price guidance*, not literally training neural networks. The right implementation is:
1. Statistical modelling of comps (regression, confidence intervals) via `simple-statistics`
2. Richer prompts to `gpt-4o` for items where high confidence is needed
3. Longitudinal price trend tracking by storing scraped comps in Firestore over time
4. Once 3–6 months of historical data accumulates, revisit training a lightweight regression model

---

### Core Technologies: Real-Time Data Pipeline (Scraping → Frontend)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Server-Sent Events (SSE)** | Native Node.js / Express | Stream job progress + new competitor listings to frontend | SSE is natively supported in Express (`res.write`, `Content-Type: text/event-stream`). The React frontend can consume via `EventSource` API or TanStack Query's subscription support. No WebSocket library needed. Fits the unidirectional push pattern (server → client). For this single-operator tool, SSE is the correct simplicity/power tradeoff. Confidence: HIGH — native platform feature. |

**Why not WebSockets:**
- Bidirectional communication isn't needed. Job status and new listings are server-push only.
- Socket.io adds ~200KB client bundle and a stateful connection layer with no benefit here.
- The frontend already uses React Query (`@tanstack/react-query ^5.x`) which supports polling and has a compatible refetch-on-focus model. SSE is the upgrade path when polling isn't fast enough.

**Why not Firebase Realtime Database:**
- Already using Firestore. Adding Realtime Database just for push updates is a second Firebase product to manage.
- Firestore onSnapshot listeners could work, but require the frontend to connect directly to Firestore — mixing the backend-as-API pattern the project already uses.

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cheerio` | ^1.0 | HTML parsing for scraped pages | Always — fast path for extracting listing data from HTML |
| `node-fetch` | built-in (`fetch` in Node 18+) | HTTP requests for scraping static pages | Use native `fetch` (Node 18+ has it); no library needed |
| `playwright` | ^1.x (core package) | Headless browser for JS-heavy pages | Only when static fetch fails (SPA competitor sites) |
| `simple-statistics` | ^7.x | Statistical price modelling | Price range calculation, confidence scoring, outlier removal |
| `date-fns` | ^3.x | Date arithmetic for scheduling and trend windows | Scheduling windows, staleness checks, trend time series |
| `p-limit` | ^5.x | Concurrency control for parallel scraping | Limit parallel Playwright instances (memory pressure) |
| `p-retry` | ^6.x | Retry with backoff for HTTP/scraper failures | Network errors and anti-bot blocks need exponential backoff |

---

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `tsx watch` | Already used for server dev | No change needed |
| Redis (Railway add-on) | BullMQ backend | Add `REDIS_URL` to `.env.example`; use `redis://localhost:6379` for local dev |
| Bull Board (`@bull-board/express`) | BullMQ dashboard UI | Mounts as Express middleware at `/admin/queues`; visibility into job state. Optional but highly recommended. |
| `vitest` (existing) | Test BullMQ job handlers | Mock the queue, test the job handler functions directly |

---

## Installation

```bash
# Core additions — server package
cd packages/server
npm install bullmq ioredis cheerio simple-statistics date-fns p-limit p-retry

# Optional: BullMQ dashboard
npm install @bull-board/express @bull-board/api

# Playwright core (for production scraping — @playwright/test is already installed as dev dep in root)
npm install playwright

# Dev dependencies
npm install -D @types/cheerio
```

**Note on Playwright browsers:** Playwright requires browser binaries. In Railway deployment, add `playwright install chromium --with-deps` to the Railway build command. ~250MB overhead. Evaluate whether this is acceptable before committing; if not, fall back to cheerio-only scraping + OpenAI web_search.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| BullMQ + Redis | Firestore-backed job queue (custom) | Only if Redis is genuinely unavailable or unacceptable. The existing SystemJobRepo in Firestore already implements a basic job queue — it could be extended with polling, but polling Firestore for job state is slower and more expensive than Redis pub/sub. |
| BullMQ + Redis | Inngest / Trigger.dev | If you need durable workflow orchestration with branching, human-in-the-loop steps, or multi-tenant isolation. Overkill for a single-operator cron-based intelligence feed. |
| Playwright (headless) | ScrapingBee / Bright Data proxy APIs | If competitor sites aggressively block datacenter IPs. Proxy services solve IP blocking but add cost and latency. Start with Playwright; add proxy only if blocked. |
| simple-statistics | TensorFlow.js | Only when you have >500 labelled price examples per brand/model category AND a training pipeline. Build the data collection first. |
| SSE (Server-Sent Events) | Firestore onSnapshot | Acceptable alternative if you're comfortable with direct Firestore client-side access. SSE keeps the API-as-gateway pattern consistent with the rest of the app. |
| `playwright` core package | `puppeteer` | Puppeteer is fine if you already have it. Playwright is preferred because @playwright/test is already in the project, sharing browser binaries. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `node-cron` as the primary scheduler | In-process, lost on crash, no job visibility, no retry. The existing `setImmediate` JobRunner already has this problem. | BullMQ with cron repeat jobs |
| `puppeteer` | Playwright is more capable and already present in the project via `@playwright/test`. Two headless browser libraries = doubled binary size. | `playwright` (core) |
| `Socket.io` | Server-to-client push only needed; full WebSocket bidirectionality adds bundle weight and connection complexity with no benefit. | SSE via native Node.js |
| `TensorFlow.js` / `brain.js` | No training data exists yet. Complexity without payoff. Models need months of labelled data before they outperform statistical regression on sparse comps. | `simple-statistics` + richer OpenAI prompts |
| `axios` for scraping | Returns HTML but can't execute JavaScript; will fail on heavy SPA competitor sites. | Native `fetch` + cheerio for SSR pages, Playwright for SPA pages |
| `mongoose` / additional ORM | Project already uses Firestore with typed repos. Adding a second DB ORM for Redis queue state creates a split data model. | Firestore repos for business data, BullMQ/Redis for job state only |
| `dotenv` (new import) | Already installed and configured via `packages/server/src/config/env.ts`. | Use the existing env module |

---

## Stack Patterns by Variant

**If competitor sites respond to simple HTTP fetch (SSR/static HTML):**
- Use `fetch` + `cheerio` directly in the job handler
- Skip Playwright entirely for that target
- Fast path: ~50ms per page vs ~2–5s for Playwright boot

**If competitor sites require JavaScript execution (SPA):**
- Use `playwright` with shared browser context (launch once, reuse across jobs)
- Use `p-limit` to cap concurrent Playwright pages to 3 (memory constraint on Railway free tier)
- Close pages after each scrape; reuse the browser instance

**If competitor sites return 403/blocking:**
- First try: rotate user-agent strings and add `Accept-Language` headers
- Second try: add realistic delays between requests (1–3s random jitter via `p-retry`)
- Last resort: proxy service (Bright Data, ScrapingBee) — evaluate cost vs frequency

**If you want price prediction before historical data exists (first 0–3 months):**
- Use `simple-statistics` on the real-time comps already fetched by OpenAI web_search
- Confidence scoring = `(number of comps - 1) / (target comps - 1)` clamped to [0, 1]
- Store every comp in Firestore with timestamp for longitudinal tracking

**If Railway Redis add-on unavailable or too costly:**
- Use Firestore as a polling-based queue (the existing SystemJobRepo pattern)
- Extend with `updatedAt` polling and `setInterval` worker
- Acceptable for jobs that run hourly or less frequently
- NOT acceptable for real-time job scheduling at <5 minute intervals

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `bullmq ^5.x` | `ioredis ^5.x` | BullMQ v5 requires ioredis v5+ |
| `bullmq ^5.x` | Node 18+ | Already in project engines field |
| `playwright ^1.x` | `@playwright/test ^1.58.0` | Share the same major version. Project already has `@playwright/test ^1.58.0` — use the same version for `playwright` core. |
| `simple-statistics ^7.x` | Node 18+ | ESM-first; compatible with project's `"type": "module"` in server package |
| `cheerio ^1.x` | Node 18+ | v1.0.0-rc.12+ is ESM-compatible |
| `p-limit ^5.x` | Node 18+ | Pure ESM, no CJS build; compatible with server package |
| `p-retry ^6.x` | Node 18+ | Pure ESM, compatible with server package |

**Caution:** `p-limit`, `p-retry`, and `simple-statistics` are pure ESM. The server package uses `"type": "module"` so this is fine. If any consuming code uses `require()`, it will break. Use `import` everywhere in the server package (already the case with tsx).

---

## Sources

All findings based on:
- Codebase inspection of `/Users/jackkelleher/luxselle-dashboard/packages/server/` — HIGH confidence (direct evidence)
- Existing `JobRunner.ts` comment explicitly recommending BullMQ — HIGH confidence (direct project guidance)
- Existing `package.json` confirming `@playwright/test ^1.58.0` already installed — HIGH confidence
- Training data for BullMQ, Playwright, cheerio, simple-statistics ecosystem knowledge — MEDIUM confidence (training cutoff August 2025; versions may have minor updates)
- WebSearch and WebFetch unavailable during this research session — explicit gap; version numbers should be verified against npm registry before installation

**Version verification recommended before implementation:**
```bash
npm show bullmq version
npm show ioredis version
npm show playwright version
npm show cheerio version
npm show simple-statistics version
```

---

*Stack research for: Luxselle Dashboard — agentic intelligence additions*
*Researched: 2026-02-28*
