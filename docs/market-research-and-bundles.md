# Marketplace research and learning bundles

Verified local runtime: **Node v22.23.2** and **Bun 1.4.4** (`bun install --frozen-lockfile`, `npm run dev`, `npm test`, `npm run lint`, `npm run build`). Server binds to `0.0.0.0` on `PORT` (default `3000`).

## Gate A Resource Directory & Live Collectors

`GET /api/market/research` and `POST /api/market/resources/check` run strictly on the server using `EnvHttpProxyAgent` / `Agent` with public DNS lookup validation (blocking private/loopback/link-local IPs), TLS verification, 3 MB response limits, and 15-second timeouts.

Seeded Gate A research resources:

1. **Apple Books US Top Paid (`https://rss.applemarketingtools.com/api/v2/us/books/top-paid/100/books.json`)**: Official chart collector. Handles the canonical 301 relocation to `https://rss.marketingtools.apple.com/api/v2/us/books/top-paid/100/books.json` safely, preserves `dataAsOfDate` (`feed.updated`) separately from HTTP `retrievedAt`, rejects feeds older than 48 hours, and never infers sales, price, or reviews.
2. **Amazon Kindle Best Sellers (`https://www.amazon.com/Best-Sellers-Kindle-Store/zgbs/digital-text` + educational subcharts)**: Official chart collector. Requires explicitly numbered rank badges (`.zg-bdg-text`) paired with canonical `/dp/{ASIN}` links. Robot checks, CAPTCHAs, or missing rank structures fail cleanly without fabricating substitutes.
3. **The New York Times Best Sellers (`https://www.nytimes.com/books/best-sellers/`)**: Secondary editorial report. Preserves exact list scope (e.g., combined print-and-ebook lists are never treated as digital-only marketplace rankings).
4. **Keepa (`https://keepa.com/`)**: Secondary historical/tracking report requiring explicit provenance (`historical`, `estimated`, `subscription_only`, or `authorized_api`).
5. **Whop (`https://whop.com/discover/`)**: Specific public product URLs can be retrieved through `POST /api/market/listings/retrieve`. Structured Product/Offer facts enter as `public_page_capture` + `listing_details` + `unverified`; they never become verified ranks. Discover may redirect to the homepage; this remains visible as zero extracted rankings.
6. **Supporting Interest & Discovery (`Google Trends`, `Etsy digital_downloads`, `Etsy Seller Handbook`, `Gumroad Discover`, `Payhip Marketplace`)**: Supporting context only. Discovery placement, featured badges, and self-reported creator claims never become collector-verified rankings.

An HTTP 200 check proves network reachability only; it never verifies page claims or bestseller status.

## Manual Evidence Review, Structured Checklist & 2-Step CSV/JSON Import

When external platforms block automated fetchers or provide context reports (NYT, Keepa, Google Trends, creator listings), use **Manual Evidence Review**:

- Homepage URLs (`keepa.com/`, `trends.google.com/trends/`, `nytimes.com/books/best-sellers/`, etc.) and private network URLs are rejected.
- Every record retains separate **Publisher**, **Source Class**, **Acquisition Method** (`live_collector`, `public_page_capture`, `manual_observation`, `file_import`), **Evidence Type**, and **Review Status** (`unverified`, `retrieved_checked`, `manually_reviewed`, `blocked`, `rejected`).
- **2-Step CSV/JSON Import**: Files and pasted tables are previewed with a SHA-256 `attachmentHash`, row numbers, raw row preservation, and per-row error diagnostics before committing as `file_import` + `unverified`.
- **5-Criteria Structured Review Checklist**: Approving or qualifying fallback evidence requires inspecting the excerpt/locator and recording: (1) what the observation establishes, (2) date/scope/product match (blocking `accepted` when `mismatch` is selected), (3) metric nature (`observed`, `reported`, `estimated`), (4) limitations/manual disclosure, and (5) written reviewer rationale (`>= 20` chars).
- **Evidence-Version Hash & Edit Invalidation**: Each observation stores `evidenceVersionHash` vs `reviewedEvidenceHash` plus `reviewHistory`. Editing any evidentiary field automatically resets status to `unverified`, appends an `invalidated` entry, flags stale reviews, and revokes downstream Gate A approval.
- Historical rankings (`> 14` days old or Keepa `historical` / `estimated`) never receive current bestseller labels or badges.

## Multi-Source Comparison Matrix & Audience-Topic Hypotheses

Gate A separates **A. Evidence Strength** (credibility, recency, scope fit, and independent evidence chains) from **B. Product Suitability** (unvalidated audience/problem hypothesis and `UNMEASURED` creator fit):

- **Multi-Source Status**: Candidates require `>= 2` independent, non-stale qualified chains (`evidenceChainId`) to earn `Reviewed Multi-Source`; 1 chain reports `Single-Source Evidence`; 0 chains reports `Needs Evidence`.
- **Comparison Matrix**: Displays supporting, complementary, contradictory, stale, unverified, and dataset-duplicated records together per domain, explicitly disclosing when ranking and interest signals complement each other without measuring unit sales.
- **Audience-Topic Hypotheses**: Presents 2–3 plausible target audience angles with uncertainties so the creator explicitly selects one hypothesis for Stage 3 without fabricating creator expertise.

## Review Chain, Migration & Bundles

1. `migrateProjectSchema()` upgrades legacy projects cleanly without dropping real observations, file attachment hashes, review history, or Gate B `referenceLibrary.cards`, while quarantining legacy `OBS-01..05` demo fixtures as `isSample: true`.
2. Upstream evidence edits or revocations invalidate affected Gate A, B, and C approvals.
3. Bundle exports (`research/marketplace-evidence.json`, `review/publication-review.json`, and `START-HERE.html`) preserve live collector counts, manually reviewed counts, stale review counts, multi-source comparisons, sample counts, and full observation provenance alongside integrity hashes (`manifest.json`).

## Public digital-product investigation

Choose Whop, Gumroad, Etsy or Payhip in Resource Directory → Log Manual Evidence. Enter a specific product URL, a category you want to investigate, and a product format to inspect. Use **Retrieve Public Listing as Unverified**. The server retains original structured Product/Offer facts, source and retrieval dates, hash, advertised currency/price and billing limitations. Inspect the original captured material and make an explicit review decision. Category/format are editorial investigation scope, not claims inferred from a generic Product schema.

A single matching Product is required. Homepages, discovery/search pages, unrelated Product schemas, malformed metadata, login/challenge pages and inaccessible sources create visible errors, never invented records. Free offers remain distinct from unknown prices. Multiple variants without a single unambiguous advertised price keep price unknown; subscription periods, trials, fees and checkout totals are not inferred. The same structured-data route supports Gumroad, Etsy and Payhip when their pages expose matching Product JSON-LD; unsupported layouts use manual evidence/import.

Whop joins all existing source filters, CSV/JSON mapping, origin-chain deduplication, project persistence, Gate A comparison and bundle provenance. Reviewed listing-only evidence can support a **low-confidence opportunity hypothesis** with **zero measured demand points**. Adding offer metadata cannot increase the demand score of an existing chart. Two Whop listings remain one marketplace evidence origin. Whop listing facts and seller claims cannot be described as unit sales, verified purchases, revenue or profitability.

Whop's [official product-list API](https://docs.whop.com/api-reference/products/list-products) documents public-marketplace query/search but requires authorization. This integration uses public product pages, does not introduce or request a third-party scraper, and does not implement authenticated API search. `whop.com` must be reachable from the backend environment alongside the existing source allowlist. Actual live integration evidence and all-source access results are in `audit/whop/INTEGRATION.md`.
