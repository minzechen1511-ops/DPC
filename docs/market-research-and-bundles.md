# Marketplace research and learning bundles

Run Node.js 24, `bun install --frozen-lockfile`, then `npm run dev`. Validate with `npm test`, `npm run lint` and `npm run build`.

## Live evidence

`GET /api/market/research` checks five fixed public source URLs. It uses the inherited HTTPS proxy and TLS trust, refuses redirects and arbitrary URL input, limits response size, times out after 15 seconds, coalesces concurrent requests, and caches successful research for 15 minutes (unavailable results for one minute).

- Apple Books: official US top-paid-books feed. Capture position and feed update time. Reject feeds older than 48 hours; never infer prices, reviews, sales or revenue.
- Amazon Kindle: public Best Sellers chart. Extract only explicitly numbered chart cards with ASIN product links. Captchas, access restrictions and layout changes produce an unavailable/no-ranking status. Do not bypass them.
- Gumroad, Etsy, Payhip: inspect public discovery/marketplace access and report status. No supported public ranking collector exists here. Search placement, featured products, seller statements, reviews and marketplace-wide popularity never become verified bestseller records.

Required outbound hosts: `rss.applemarketingtools.com`, `books.apple.com`, `www.amazon.com`, `gumroad.com`, `www.etsy.com`, `payhip.com`. Source-site and proxy restrictions still apply. This cloud instance returned HTTP 403 for the required destinations during development; live data was not validated here. Add required domains through environment settings. No paid marketplace API credentials are configured or requested by this implementation.

Gate A accepts only supported source provenance and rankings captured within 48 hours. Fiction and unknown categories are excluded from educational niche proposals. Category, marketplace, query and prioritized observation filters operate on the exact MTRE observations, not a fixed candidate catalog. Only observed demand is scored; user preference changes order without inflating evidence. A proposed original product is not a bestseller, and rankings do not guarantee its sales.

## Review chain

Selecting a different niche initializes an empty topic-specific manuscript plan; it does not invent research, author credentials, references, manuscripts, sales results or gate approvals. Export the previous project's backup before switching niches.

A: select a niche with current source-linked ranking evidence.
B: approve A, complete charter objectives and add topic research with an exact supporting excerpt, locator and author confirmation. Research source entry is in Reference Library.
C: approve B, complete substantive cited chapters, map reviewed references, remove unresolved claims, supply usable companion resources, and document image rights and paragraph placement. Recheck before approval. Marketplace evidence can expire, invalidating readiness even after a prior approval.

Upstream research and strategy changes revoke downstream approvals. Manuscript, illustration and resource changes revoke C. Existing imported/sample approvals cannot bypass the current policy at approval or bundle review time. These checks establish review completeness, not independent scientific or legal certification.

## Bundle

Open `START-HERE.html` after extracting the complete ZIP. It links the complete e-book, individual chapter readers, chapter practice worksheets, progress CSV, authored companion tools and topic source reading room. Research records, source-access reports, author project backup, publication review and a SHA-256 manifest are included. Actual licensed image bytes are included separately and embedded in the book; no paid original publications or nonexistent ePubs/videos/spreadsheets are claimed.

The e-book uses real cited numeric tables for quantitative charts, manuscript lists for explicitly conceptual diagrams and author-supplied original/licensed PNG/JPEG/WebP images for pictures. Insert an exact paragraph anchor, source reference, alt text, caption, credit and rights in Content Studio. Pictures and figures appear beside related text on large screens and stack on narrow screens. Missing evidence is marked; no illustrative figure proves an empirical claim.

Unapproved or incomplete projects remain downloadable as **author review** bundles for continued work. Buyer delivery status requires all current A/B/C checks and explicit C approval. Individual downloads are working author files.
