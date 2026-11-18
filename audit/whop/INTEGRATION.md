# Whop and existing-source integration

Implemented on `codex/release-acceptance-audit`, building on commit `6a689211485317fbcfd78502e1f79c701ef1f457`. Existing source work and the earlier release-audit evidence were preserved. This report describes the Whop addition, not a deployment sign-off.

## Actual Whop result

- Backend verification completed: `2026-11-18T12:54:09.548Z` (UTC; Taipei = UTC + 8).
- Requested legacy product URL: `https://whop.com/discover/iimagined/digital-products-reimagined/`.
- Resolved product URL: [Digital Products](https://whop.com/iimagined/digital-products-reimagined/).
- Public Product/Offer JSON-LD: title **Digital Products**, brand **IImagined**, advertised offer **USD 189**.
- Original offer fields, retrieval timestamp, response/capture SHA-256 and source URL are retained in [actual-whop-listing.json](actual-whop-listing.json).
- Ingestion status: **unverified**; acquisition: **public_page_capture**; evidence type: **listing_details**. No collector-verified ranking, sales number, review-to-purchase conversion, revenue or profitability was inferred.
- Billing periods, renewals, trials, fees and checkout totals remain unknown from this offer metadata alone. The listing does not establish the price or demand of a different proposed product.
- A second specific Whop page returned **404**. The API returned **422** with that HTTP status and no observation. See [actual-whop-unavailable-listing.json](actual-whop-unavailable-listing.json).
- [Importable actual Whop observations](whop-observations.json) contains real captured facts, not a synthetic sample. Importing it still creates unverified records requiring review.

## Integration path

1. **Resource Directory** now merges ten resources, including Whop, into both new and legacy projects. Previous access outcomes remain intact. Counts are dynamic.
2. **Manual Evidence Review**: choose Whop (or use its directory action), enter a specific product URL, investigation category and product format, then choose **Retrieve Public Listing as Unverified**. Review actual title, seller/brand, advertised price/currency, original captured material and limitations. Category/format are user-supplied investigation scope, not automatically validated product attributes.
3. **Backend**: `POST /api/market/listings/retrieve`. Only supported HTTPS marketplace hosts and specific product paths are requested. TLS verification, bounded response size, a shared 15-second deadline, and restricted same-marketplace redirects remain enforced. Home/search/discovery URLs, unrelated Product schemas, malformed metadata, challenges and access errors cannot become fabricated observations.
4. **Evidence identity**: Whop is recognized in shared platform options, CSV/JSON mapping, migrations, acquisition/evidence types, origin grouping, filters, comparisons, backups and exports. `Google Play Books` and `Kobo`, already present in the model, remain available in the same manual/import options.
5. **Explicit review and Gate A**: original capture remains unverified until a deliberate review with rationale. Manually reviewed listing facts may support a **LOW-confidence opportunity hypothesis**, with **0 measured demand points**. They cannot receive a live-chart badge. Adding listing context to an existing chart does not increase its demand score. Two Whop listings count as one marketplace origin; reviewers can also declare shared datasets across platforms.
6. **Downstream**: linked evidence IDs, original URLs, dates, evidence types, currencies and billing limitations are passed into brief/UVZ/transformation strategy context. Market text is data, not instructions. Creator experience/expertise fields remain the creator's actual supplied values; AI output cannot manufacture them. Proposed audiences and profitability remain hypotheses requiring validation.
7. **Persistence/export**: public-page origin, original capture and pricing limitations survive project editing/migration/backup restoration. Price/currency/billing edits stale the review. Existing approval invalidation and author-review/buyer-export safeguards remain. The actual isolated Whop exercise created [whop-author-review-test.zip](whop-author-review-test.zip), retaining Whop provenance and an unreviewed publication manifest.

## All previously considered sources

| Source | Integrated path | Current investigation boundary |
|---|---|---|
| Apple Books | Existing official JSON chart collector, directory, comparison, manual/import and export | 48-hour feed freshness retained; rank is not sales. A current canonical-feed 502 is visible below. |
| Amazon Kindle | Existing seven overall/category chart requests, explicit numbered badges and matching ASIN links | Ranking rules and original material retained; no sales-volume inference. |
| Whop | Directory/discovery status plus specific public Product/Offer retrieval, manual/import and reviewed hypothesis route | Discover currently redirects to the homepage. No public ranking collector; product facts are not purchasing demand. |
| Gumroad | Discovery status plus shared specific Product/Offer retrieval and manual/import | Actual product lookup succeeded in this run. Discovery order and seller claims are not verified rank/sales. |
| Etsy listings | Directory, shared specific Product/Offer retrieval where accessible, manual/import | Actual product request returned 403; no substitute record. |
| Etsy Seller Handbook | Separate editorial/context directory resource and manual/import review | Editorial reports remain distinct from product ranks and independently originated sales data. |
| Payhip | Directory, shared specific Product/Offer retrieval where accessible, manual/import | Actual product request returned 403; no substitute record. |
| NYT Best Sellers | Published-report directory and explicit manual/file evidence review | Exact list and combined-print/ebook scope must remain; current 403 visible. |
| Keepa | Directory plus historical/estimated/subscription/API provenance in manual/import | Homepage reachability is not ASIN data. Amazon-derived reports collapse with Amazon origin. No authorized Keepa integration was invented. |
| Google Trends | Directory and manual/CSV evidence review | Normalized interest is not absolute volume, sales or conversion. Reachability alone creates no observation. |
| Google Play Books / Kobo | Existing model names retained in centralized selection and import mapping | Manual evidence only; no new live collector or extra directory source is claimed. |

The shared listing parser supports matching Product JSON-LD on Whop, Gumroad, Etsy and Payhip. A supported host does not guarantee a supported/accessible page layout; those failures remain explicit and manual review/import remains available.

## Actual backend requests for all sources

These are **local backend** requests, not deployed Google AI Studio/Cloud Run results. Per-request timestamps and complete results are in [all-source-research.json](all-source-research.json) and [all-resource-checks.json](all-resource-checks.json).

| Requested source | HTTP | Collector status | Ranking observations | Requested URL / timestamp (UTC) |
|---|---:|---|---:|---|
| Apple Books | 502 | unavailable | 0 | https://rss.applemarketingtools.com/api/v2/us/books/top-paid/100/books.json · 2026-11-18T12:54:04.385Z |
| Amazon Kindle | 200 | verified | 30 | https://www.amazon.com/Best-Sellers-Kindle-Store/zgbs/digital-text · 2026-11-18T12:54:04.385Z |
| Amazon Kindle · Business & Money | 200 | verified | 30 | https://www.amazon.com/Best-Sellers-Kindle-Store-Business-Investing/zgbs/digital-text/154821011 · 2026-11-18T12:54:04.385Z |
| Amazon Kindle · Health & Wellness | 200 | verified | 30 | https://www.amazon.com/Best-Sellers-Kindle-Store-Health-Fitness-Dieting/zgbs/digital-text/156430011 · 2026-11-18T12:54:04.385Z |
| Amazon Kindle · Self-Help | 200 | verified | 30 | https://www.amazon.com/Best-Sellers-Kindle-Store-Self-Help/zgbs/digital-text/156563011 · 2026-11-18T12:54:04.385Z |
| Amazon Kindle · Cookbooks & Meals | 200 | verified | 30 | https://www.amazon.com/Best-Sellers-Kindle-Store-Cookbooks-Food-Wine/zgbs/digital-text/156154011 · 2026-11-18T12:54:04.385Z |
| Amazon Kindle · Tech & Systems | 200 | verified | 30 | https://www.amazon.com/Best-Sellers-Kindle-Store-Computers-Technology/zgbs/digital-text/156116011 · 2026-11-18T12:54:04.385Z |
| Amazon Kindle · Education & Career | 200 | verified | 30 | https://www.amazon.com/Best-Sellers-Kindle-Store-Education-Teaching/zgbs/digital-text/158125011 · 2026-11-18T12:54:04.385Z |
| Gumroad | 200 | no_ranking | 0 | https://gumroad.com/discover · 2026-11-18T12:54:04.385Z |
| Etsy | 403 | unavailable | 0 | https://www.etsy.com/market/digital_downloads · 2026-11-18T12:54:04.385Z |
| Payhip | 403 | unavailable | 0 | https://payhip.com/marketplace · 2026-11-18T12:54:04.385Z |
| Whop | 200 | no_ranking | 0 | https://whop.com/discover/ · 2026-11-18T12:54:04.385Z |

Whop listing facts are the separate successful one-record request above; its discovery page creates zero ranking observations. No failed source was replaced with fixtures.

| Directory resource | HTTP/access | Check timestamp (UTC) |
|---|---|---|
| Whop Digital Products & Memberships | 301 / redirected | 2026-11-18T12:54:08.693Z |
| Apple Books US Top Paid (100) | 301 / redirected | 2026-11-18T12:54:08.693Z |
| Amazon Kindle Best Sellers | 200 / accessible | 2026-11-18T12:54:08.693Z |
| The New York Times Best Sellers | 403 / blocked | 2026-11-18T12:54:08.694Z |
| Keepa Amazon Rank & Price History | 200 / accessible | 2026-11-18T12:54:08.695Z |
| Google Trends | 200 / accessible | 2026-11-18T12:54:08.695Z |
| Etsy Digital-Download Discovery | 403 / blocked | 2026-11-18T12:54:08.696Z |
| Etsy Seller Handbook | 403 / blocked | 2026-11-18T12:54:08.696Z |
| Gumroad Discover | 200 / accessible | 2026-11-18T12:54:08.697Z |
| Payhip Marketplace | 403 / blocked | 2026-11-18T12:54:08.697Z |

Specific public-page checks beyond Whop ([raw results](other-public-listing-results.json)):

| Platform | API / origin HTTP | Actual outcome |
|---|---|---|
| Gumroad | 200 / 200 | BUDGET TEMPLATE |
| Payhip | 422 / 403 | Public listing returned HTTP 403; no observations validated. |
| Etsy | 422 / 403 | Public listing returned HTTP 403; no observations validated. |

## Verification and remaining limits

- **99 tests passed**, including ten new tests covering all-source preservation, Whop identity, cross-marketplace parsing, free/unknown/multiple prices, challenge/malformed sources, manual/import status, non-inflated demand scoring, origin deduplication, review invalidation, backup/export and downstream provenance/unknown credentials. See [tests.txt](tests.txt).
- Final local production public-listing request also succeeded with unverified Whop metadata: [production-smoke.json](production-smoke.json).
- Type-check and production build succeeded: [typecheck.txt](typecheck.txt), [build.txt](build.txt). The existing large frontend chunk warning remains.
- The actual Whop backend exercise verified public retrieval, failed-page visibility, import, explicit qualified review, LOW-confidence/zero-demand recommendation, explicit isolated Gate A decision, restoration and an actual author-review ZIP. See [integration-result.json](integration-result.json).
- A browser navigation rendered the local Google sign-in screen. An authenticated workspace session was not available, so clicking the new capture button and real Cloud Firestore refresh were not interactively verified. API/domain and production build checks are separate from that limitation.
- Whop's [official API documentation](https://docs.whop.com/api-reference/products/list-products) supports public-marketplace queries but requires authorization. This change does not implement authenticated API search, request a key, bypass access controls, or use a third-party paid scraper. The initial unauthenticated API probe returned HTTP 400; no API-search data was claimed.
- Existing release-audit deployment/authenticated desktop/mobile/Firestore limitations remain open. A pushed branch is not proof that AI Studio deployed it.

Use the local application at Resource Directory → Whop → Log Manual Evidence. Enter the specific product URL, investigation category and format; retrieve, inspect and explicitly review the captured offer before using it in a hypothesis. Use at least two independently originated relevant reviewed chains for the reviewed multi-source label, and direct buyer validation before claiming product demand.
