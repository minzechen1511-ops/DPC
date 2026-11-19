# Marketplace research and learning bundles

Verified local runtime: **Node v22.23.2** and **Bun 1.4.4** (`bun install --frozen-lockfile`, `npm run dev`, `npm test`, `npm run lint`, `npm run build`). Server binds to `0.0.0.0` on `PORT` (default `3000`).

## Gate A Resource Directory & Live Collectors

`GET /api/market/research` and `POST /api/market/resources/check` run strictly on the server using `EnvHttpProxyAgent` / `Agent` with public DNS lookup validation (blocking private/loopback/link-local IPs), TLS verification, 3 MB response limits, and 15-second timeouts.

Seeded Gate A research resources:

1. **Apple Books US Top Paid (`https://rss.applemarketingtools.com/api/v2/us/books/top-paid/100/books.json`)**: Official chart collector. Handles the canonical 301 relocation to `https://rss.marketingtools.apple.com/api/v2/us/books/top-paid/100/books.json` safely, preserves `dataAsOfDate` (`feed.updated`) separately from HTTP `retrievedAt`, rejects feeds older than 48 hours, and never infers sales, price, or reviews.
2. **Amazon Kindle Best Sellers (`https://www.amazon.com/Best-Sellers-Kindle-Store/zgbs/digital-text` + educational subcharts)**: Official chart collector. Requires explicitly numbered rank badges (`.zg-bdg-text`) paired with canonical `/dp/{ASIN}` links. Robot checks, CAPTCHAs, or missing rank structures fail cleanly without fabricating substitutes.
3. **The New York Times Best Sellers (`https://www.nytimes.com/books/best-sellers/`)**: Secondary editorial report. Preserves exact list scope (e.g., combined print-and-ebook lists are never treated as digital-only marketplace rankings).
4. **Keepa (`https://keepa.com/`)**: Secondary historical/tracking report requiring explicit provenance (`historical`, `estimated`, `subscription_only`, or `authorized_api`).
5. **Supporting Interest & Discovery (`Google Trends`, `Etsy digital_downloads`, `Etsy Seller Handbook`, `Gumroad Discover`, `Payhip Marketplace`)**: Supporting context only. Discovery placement, featured badges, and self-reported creator claims never become collector-verified rankings.

An HTTP 200 check proves network reachability only; it never verifies page claims or bestseller status.

## Manual Evidence Review, Structured Checklist & 2-Step CSV/JSON Import

When external platforms block automated fetchers or provide context reports (NYT, Keepa, Google Trends, creator listings), use **Manual Evidence Review**:

- Homepage URLs (`keepa.com/`, `trends.google.com/trends/`, `nytimes.com/books/best-sellers/`, etc.) and private network URLs are rejected.
- Every record retains separate **Publisher**, **Source Class**, **Acquisition Method** (`live_collector`, `manual_observation`, `file_import`), **Evidence Type**, and **Review Status** (`unverified`, `retrieved_checked`, `manually_reviewed`, `blocked`, `rejected`).
- **2-Step CSV/JSON Import**: Files and pasted tables are previewed with a SHA-256 `attachmentHash`, row numbers, raw row preservation, and per-row error diagnostics before committing as `file_import` + `unverified`.
- **5-Criteria Structured Review Checklist**: Approving or qualifying fallback evidence requires inspecting the excerpt/locator and recording: (1) what the observation establishes, (2) date/scope/product match (blocking `accepted` when `mismatch` is selected), (3) metric nature (`observed`, `reported`, `estimated`), (4) limitations/manual disclosure, and (5) written reviewer rationale (`>= 20` chars).
- **Evidence-Version Hash & Edit Invalidation**: Each observation stores `evidenceVersionHash` vs `reviewedEvidenceHash` plus `reviewHistory`. Editing any evidentiary field automatically resets status to `unverified`, appends an `invalidated` entry, flags stale reviews, and revokes downstream Gate A approval.
- Historical rankings (`> 14` days old or Keepa `historical` / `estimated`) never receive current bestseller labels or badges.

## Multi-Source Comparison Matrix & Audience-Topic Hypotheses

Gate A separates **A. Evidence Strength** (credibility, recency, scope fit, and independent evidence chains) from **B. Product Suitability** (unvalidated audience/problem hypothesis and `UNMEASURED` creator fit):

- **Multi-Source Status**: Candidates require `>= 2` independent, non-stale qualified chains (`evidenceChainId`) to earn `Reviewed Multi-Source`; 1 chain reports `Single-Source Evidence`; 0 chains reports `Needs Evidence`.
- **Comparison Matrix**: Displays supporting, complementary, contradictory, stale, unverified, and dataset-duplicated records together per domain, explicitly disclosing when ranking and interest signals complement each other without measuring unit sales.
- **Audience-Topic Hypotheses**: Presents 2–3 plausible target audience angles with uncertainties so the creator explicitly selects one hypothesis for the recommended brief in the four-step setup without fabricating creator expertise.

## Review Chain, Migration & Bundles

1. `migrateProjectSchema()` upgrades legacy projects cleanly without dropping real observations, file attachment hashes, review history, or Gate B `referenceLibrary.cards`, while quarantining legacy `OBS-01..05` demo fixtures as `isSample: true`.
2. Upstream evidence edits or revocations invalidate affected Gate A, B, and C approvals.
3. Bundle exports (`research/marketplace-evidence.json`, `review/publication-review.json`, and `START-HERE.html`) preserve live collector counts, manually reviewed counts, stale review counts, multi-source comparisons, sample counts, and full observation provenance alongside integrity hashes (`manifest.json`).
