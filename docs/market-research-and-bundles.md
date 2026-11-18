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

## Manual Evidence Review & CSV/JSON Import

When external platforms block automated fetchers or provide context reports (NYT, Keepa, Google Trends, creator listings), use **Manual Evidence Review**:

- Homepage URLs (`keepa.com/`, `trends.google.com/trends/`, `nytimes.com/books/best-sellers/`, etc.) and private network URLs are rejected.
- Every record retains separate **Source Class**, **Acquisition Method** (`live_collector`, `manual_observation`, `file_import`), **Evidence Type**, and **Review Status** (`unverified`, `retrieved_checked`, `manually_reviewed`, `blocked`, `rejected`).
- Manual entries and CSV/JSON imports always enter `unverified`, cannot be approved by a checkbox alone without an inspected excerpt, locator/attachment, and written rationale (>= 20 chars), and are never relabeled as live collector-verified.
- Multiple articles derived from the same dataset share one `evidenceChainId` and collapse cleanly when evaluating Gate A recommendations so duplicated coverage never inflates scores.

## Evidence Strength vs. Product Suitability

Gate A separates **A. Evidence Strength** (credibility, recency, scope fit, and independent evidence chains) from **B. Product Suitability** (unvalidated audience/problem hypothesis and `UNMEASURED` creator fit). Only directly observed or human-reviewed demand contributes points (`demandSignal`, max 25); unmeasured factors remain labeled `Unmeasured` (`0`) until directly researched. Fiction and unknown categories are excluded. Legacy `isSample` records are excluded from real counts and cannot satisfy Gate A.

## Review Chain & Bundles

1. Upstream evidence edits or revocations invalidate affected Gate A, B, and C approvals.
2. Bundle exports (`research/marketplace-evidence.json`, `review/publication-review.json`, and `START-HERE.html`) preserve live collector counts, manually reviewed counts, sample counts, and full observation provenance alongside integrity hashes (`manifest.json`).
