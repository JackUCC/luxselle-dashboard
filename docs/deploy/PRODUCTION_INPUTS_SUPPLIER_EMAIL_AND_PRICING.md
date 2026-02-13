# Production Inputs Needed (Supplier Email + IE Buy Box + Auction Landed Cost)

Use this checklist to provide the remaining business/data inputs required for a reliable production rollout.

## Confirmed Inputs (2026-02-13)

- IE comparable allowlist:
  - `designerexchange.ie`
  - `luxuryexchange.ie`
  - `siopaella.com`
- Customs assumptions:
  - Japan imports: `3%` customs duty
  - EU imports: `0%` customs duty
- Import VAT default: `23%`

## 1) Shared Gmail Ingestion Inputs

Provide:
- Shared mailbox address (the account used by `GMAIL_USER`)
- OAuth app credentials for Gmail API:
  - `GMAIL_CLIENT_ID`
  - `GMAIL_CLIENT_SECRET`
  - `GMAIL_REFRESH_TOKEN`
- Confirmation to enable sync in production: `SUPPLIER_EMAIL_ENABLED=true`
- Final mailbox query (`SUPPLIER_EMAIL_DEFAULT_QUERY`) if different from default `has:attachment newer_than:30d`
- Maximum attachment size policy in MB (`SUPPLIER_EMAIL_MAX_ATTACHMENT_MB`)

## 2) Supplier Mapping Data (Per Supplier)

For each supplier, provide:
- Sender aliases to match inbound emails (`sourceEmails[]`)
- Sample CSV/XLSX file used by that supplier
- Column mapping decisions:
  - `externalId`, `title`, `brand`, `sku`, `conditionRank`
  - price fields (`askPriceUsd`/`askPriceEur`, `sellingPriceUsd`/`sellingPriceEur`)
  - optional `availability`, `imageUrl`, `sourceUrl`
- Availability normalization mapping (example: `UPLOADED -> uploaded`)
- Default availability when missing (`uploaded` / `sold` / `waiting`)

## 3) Ireland Market Pricing Policy Inputs

Provide:
- Final IE source allowlist domains for pricing comparables (`pricingIeSourceAllowlist`)
- Confirmation that market policy should remain `ie_first_eu_fallback`
- Any sources that should be explicitly excluded even if returned by AI

## 4) Auction Landed-Cost Profile Inputs

For each auction platform profile you use, provide:
- `id`, `name`
- `buyerPremiumPct`
- `platformFeePct`
- `fixedFeeEur`
- `paymentFeePct`
- `defaultShippingEur`
- `defaultInsuranceEur`
- `defaultCustomsDutyPct`
- `defaultImportVatPct`

## 5) Tax/Finance Defaults

Provide:
- Confirm import VAT default (`importVatPctDefault`) for your current operations
- Any category-specific customs duty assumptions you want documented
- Rounding policy confirmation (2-decimal monetary rounding is currently used)

## 6) Ops and Rollout Inputs

Provide:
- Railway cron interval confirmation (planned every 15 minutes)
- Who receives alerts when `supplier_email_sync` fails
- Preferred recovery action for failed imports:
  - manual retry only
  - auto-retry + manual review

Current recommended default policy:
- Cron: every 15 minutes (`*/15 * * * *`) using `npm run supplier-email-sync`
- Recovery: manual retry from Supplier Hub + automatic retry on next scheduled run
- Alerts: Railway run-failure notification to project owners (plus designated ops email if provided)

## 7) Validation Data Needed From You

To complete final acceptance testing, provide:
- 2-3 real supplier sample files (CSV/XLSX)
- 1-2 real sender addresses per sample supplier
- 3 known products with expected IE market comparables
- 2 auction examples with expected landed cost math (for cross-check)

## Completion Definition

Rollout is considered ready when:
1. All required env vars are set in Railway and `/api/suppliers/email/status` reports connected.
2. At least one supplier template is configured and manual sync imports expected rows.
3. Buy Box shows IE-first comparables and fallback indicators correctly.
4. Landed-cost snapshots persist to evaluation and buying list records.
