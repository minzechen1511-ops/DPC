# Actual source requests

These calls ran through the local production DPC backend at http://127.0.0.1:3102. The deployed Cloud Run APIs were inaccessible; these are **not deployed-backend results**. Check timestamps are UTC (Taipei = UTC + 8 hours).

| Source | Requested URL | Checked at (UTC) | HTTP / collector status | Observations | Limitations |
|---|---|---|---|---:|---|
| Apple Books | https://rss.applemarketingtools.com/api/v2/us/books/top-paid/100/books.json | 2026-11-18T11:32:20.708Z | 200 / verified | 100 | Ordinal book visibility only; no unit sales, workbook demand, prices, reviews, revenue or profit. Amazon requires an explicit numbered badge and matching ASIN link. |
| Amazon Kindle | https://www.amazon.com/Best-Sellers-Kindle-Store/zgbs/digital-text | 2026-11-18T11:32:20.708Z | 200 / verified | 30 | Ordinal book visibility only; no unit sales, workbook demand, prices, reviews, revenue or profit. Amazon requires an explicit numbered badge and matching ASIN link. |
| Amazon Kindle · Business & Money | https://www.amazon.com/Best-Sellers-Kindle-Store-Business-Investing/zgbs/digital-text/154821011 | 2026-11-18T11:32:20.708Z | 200 / verified | 30 | Ordinal book visibility only; no unit sales, workbook demand, prices, reviews, revenue or profit. Amazon requires an explicit numbered badge and matching ASIN link. |
| Amazon Kindle · Health & Wellness | https://www.amazon.com/Best-Sellers-Kindle-Store-Health-Fitness-Dieting/zgbs/digital-text/156430011 | 2026-11-18T11:32:20.708Z | 200 / verified | 30 | Ordinal book visibility only; no unit sales, workbook demand, prices, reviews, revenue or profit. Amazon requires an explicit numbered badge and matching ASIN link. |
| Amazon Kindle · Self-Help | https://www.amazon.com/Best-Sellers-Kindle-Store-Self-Help/zgbs/digital-text/156563011 | 2026-11-18T11:32:20.708Z | 200 / verified | 30 | Ordinal book visibility only; no unit sales, workbook demand, prices, reviews, revenue or profit. Amazon requires an explicit numbered badge and matching ASIN link. |
| Amazon Kindle · Cookbooks & Meals | https://www.amazon.com/Best-Sellers-Kindle-Store-Cookbooks-Food-Wine/zgbs/digital-text/156154011 | 2026-11-18T11:32:20.708Z | 200 / verified | 30 | Ordinal book visibility only; no unit sales, workbook demand, prices, reviews, revenue or profit. Amazon requires an explicit numbered badge and matching ASIN link. |
| Amazon Kindle · Tech & Systems | https://www.amazon.com/Best-Sellers-Kindle-Store-Computers-Technology/zgbs/digital-text/156116011 | 2026-11-18T11:32:20.708Z | 200 / verified | 30 | Ordinal book visibility only; no unit sales, workbook demand, prices, reviews, revenue or profit. Amazon requires an explicit numbered badge and matching ASIN link. |
| Amazon Kindle · Education & Career | https://www.amazon.com/Best-Sellers-Kindle-Store-Education-Teaching/zgbs/digital-text/158125011 | 2026-11-18T11:32:20.708Z | 200 / verified | 30 | Ordinal book visibility only; no unit sales, workbook demand, prices, reviews, revenue or profit. Amazon requires an explicit numbered badge and matching ASIN link. |
| Gumroad | https://gumroad.com/discover | 2026-11-18T11:32:20.708Z | 200 / no_ranking | 0 | Page reached, but no supported public ranking collector applies here. Discovery and featured listings are never bestseller proof. |
| Etsy | https://www.etsy.com/market/digital_downloads | 2026-11-18T11:32:20.708Z | 403 / unavailable | 0 | Source returned HTTP 403. Access or network policy may require configuration. |
| Payhip | https://payhip.com/marketplace | 2026-11-18T11:32:20.708Z | 403 / unavailable | 0 | Source returned HTTP 403. Access or network policy may require configuration. |

Raw per-source counts total 310; distinct retained observations after overlapping-ASIN deduplication: 275. All retained product/report URLs, category/rank scopes, data dates, retrieval dates, limitations, captured original fields and their SHA-256 hashes are in [local-market.json](results/local-market.json). Every retained original item was checked against extracted fields by [exercise-real-workflow.ts](exercise-real-workflow.ts).

| Directory-only resource | Requested URL | Checked at (UTC) | Status | Collector observations |
|---|---|---|---|---:|
| Apple Books US Top Paid (100) | https://rss.applemarketingtools.com/api/v2/us/books/top-paid/100/books.json | 2026-11-18T11:32:23.040Z | 301 / redirected | See collector table |
| Amazon Kindle Best Sellers | https://www.amazon.com/Best-Sellers-Kindle-Store/zgbs/digital-text | 2026-11-18T11:32:23.041Z | 200 / accessible | See collector table |
| The New York Times Best Sellers | https://www.nytimes.com/books/best-sellers/ | 2026-11-18T11:32:23.041Z | 403 / blocked | 0; no collector implemented |
| Keepa Amazon Rank & Price History | https://keepa.com/ | 2026-11-18T11:32:23.043Z | 200 / accessible | 0; no collector implemented |
| Google Trends | https://trends.google.com/trends/ | 2026-11-18T11:32:23.044Z | 200 / accessible | 0; no collector implemented |
| Etsy Digital-Download Discovery | https://www.etsy.com/market/digital_downloads | 2026-11-18T11:32:23.044Z | 403 / blocked | 0; no collector implemented |
| Etsy Seller Handbook | https://www.etsy.com/seller-handbook | 2026-11-18T11:32:23.045Z | 403 / blocked | 0; no collector implemented |
| Gumroad Discover | https://gumroad.com/discover | 2026-11-18T11:32:23.045Z | 200 / accessible | 0; no collector implemented |
| Payhip Marketplace | https://payhip.com/marketplace | 2026-11-18T11:32:23.045Z | 403 / blocked | 0; no collector implemented |

Directory HTTP 200 means reachability only. Keepa and Google Trends homepages were not converted into observations. NYT, Etsy and Payhip 403 responses remain visible. No samples replaced failures.

Additional observed failures: the first Apple run timed out (baseline-local-market.json); an intervening 11:32:42 UTC collector attempt returned HTTP 502 from the Apple canonical redirect target. Later success does not erase these failures. Apple feed freshness (48-hour maximum, five-minute clock tolerance) remains enforced. Final successful feed data date: 2026-11-18T11:32:22.000Z.

The genuine contextual import uses [the Federal Reserve report announcement](https://www.federalreserve.gov/newsevents/pressreleases/other20260513a.htm): October 2025 SHED fieldwork, published May 13, 2026. It is a published household survey, not product-demand evidence. The exact retrieved paragraph and retrieval date are in [real-reference-request.json](results/real-reference-request.json). The parser did not extract author/publication-date metadata; those card fields remain unresolved.
