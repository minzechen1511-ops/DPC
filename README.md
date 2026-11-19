# Digital Product Studio

Digital Product Studio is a manual-gate-controlled commercial workspace for researching, structuring, drafting, auditing, and packaging educational digital products into verifiable buyer bundles.

For the current AI provider behavior and the real AI Studio delivery target, see [AI provider repair](docs/AI-PROVIDER-REPAIR.md) and [delivery instructions](AGENTS.md). GitHub pushes must be pulled into the connected AI Studio project and its hosted preview verified; they do not by themselves prove a preview update.

## Environment & Prerequisites

- **Runtime Verified Locally**: Node.js `v22.23.2` and Bun `1.4.4` (also tested against Node 24+ environments; use Bun with `--frozen-lockfile` to install exact locked dependencies without modifying `bun.lock`).
- **Port & Network Binding**: The Express + Vite server listens on `0.0.0.0` and binds to `process.env.PORT` (defaults to `3000`).
- **Preview URLs (AI Studio Cloud Run)**:
  - Dev Preview: `https://ais-dev-vdpfbf4ldv2d5ilgmzmbvc-758989687130.asia-east1.run.app`
  - Shared Preview: `https://ais-pre-vdpfbf4ldv2d5ilgmzmbvc-758989687130.asia-east1.run.app`

## Installation & Startup

```bash
bun install --frozen-lockfile
npm run dev
```

Available scripts:

- `npm run dev` — Starts Express API + Vite dev middleware on `0.0.0.0:3000` (`tsx server.ts`).
- `npm run lint` — Runs strict TypeScript typechecking (`tsc --noEmit`).
- `npm test` — Executes Node test suite across utilities, server collectors, security rules, and Gate A evidence workflows.
- `npm run build` — Compiles production client bundle via Vite (`vite build`).
- `npm start` — Runs production Express server (`tsx server.ts`).

## Environment Variables (Server-Side Only)

Copy `.env.example` and keep secrets strictly in server-side environment variables — never commit keys or expose secrets in client bundles:

- `NODE_ENV` — `"development"` or `"production"`
- `PORT` — HTTP listen port (default `3000`, bound on `0.0.0.0`)
- `DPC_DATA_DIR` — Optional override directory for server workflow storage (`store.json`, `vault.key`). Keep this strictly outside version control (defaults to gitignored `.local-data/`) and never commit `store.json` or `vault.key`.
- `GEMINI_API_KEY` — Server-side Google Gemini API key injected into AI Studio / Cloud Run secrets
- `HTTPS_PROXY` / `HTTP_PROXY` — Inherited automatically by `undici.EnvHttpProxyAgent` for outbound research requests

All research fetches (`/api/market/research`, `/api/market/resources/check`, `/api/market/evidence/inspect-url`, `/api/references/*`) run server-side with private-network SSRF checks, TLS verification, 15s timeouts, 3 MB response limits, and explicit redirect restrictions.

### Codex / External Sandbox Environment Settings (Owner Action Required Outside App Code)

Editing application files does **not** alter external Codex container networking or setup scripts. Apply these settings directly in your Codex environment configuration:

- **Install script**: `bun install --frozen-lockfile`
- **Start command**: `npm run dev` (development) or `npm run build && npm start` (production), bound to `0.0.0.0:${PORT:-3000}`
- **Node & Package Manager**: Node 22/24 LTS + Bun 1.4.4 (`node_modules` installed from existing `bun.lock`)
- **TLS & Proxy**: Preserve inherited `HTTPS_PROXY`/`HTTP_PROXY` env vars and CA verification
- **Gate A Research Host Allowlist** (preserve package-manager preset + add only implemented hosts; omit `api.keepa.com` since no Keepa API key integration is implemented):
  - `rss.applemarketingtools.com` and `rss.marketingtools.apple.com` (canonical Apple RSS/JSON chart redirect target)
  - `books.apple.com`
  - `www.amazon.com`
  - `www.nytimes.com`
  - `keepa.com`
  - `trends.google.com`
  - `www.etsy.com`
  - `gumroad.com`
  - `payhip.com`
- **Gate B Academic Reference Host Allowlist (Preserve Existing)**:
  - `api.crossref.org`, `www.ebi.ac.uk`, `europepmc.org`, `www.who.int`, `www.oecd.org`, `openstax.org`, `www.worldbank.org`, `www.imf.org`, `www.fao.org` (and permitted `.gov` / `.edu` / `.ac.uk` public research sources)

## Four-step setup and internal workflow

The primary setup journey is **Topic Discovery → Recommended Project Brief → Unique Value Zone (UVZ) → Transformation Map**, followed by Reference Library. Topic Discovery combines the supported scan, evidence/source listings, manual evidence fallback, topic comparison and explicit Gate A approval. Legacy `market_research` navigation opens this same screen; its data, services and stage ID are retained.

The brief starts with recommended content, not mandatory detailed intake. Creator facts remain blank unless provided. AI polish and detailed editing are optional. UVZ/title suggestions remain unselected until the creator explicitly uses them. Changed inputs mark dependent drafts for review.

Real per-stage AI actions are available. The server job API stores metadata but has no generation worker; background setup generation, pause and resume are unavailable. Saved drafts can be reopened and individual failed requests retried. See [setup implementation and validation](docs/TOPIC-DISCOVERY-SETUP.md).

The following 14 **internal stage IDs** remain for persisted-project compatibility and downstream gates:

1. `market_research` — Resource Directory (9 seed sources), live chart collectors, & Manual Evidence Review
2. `topic_selection` — Niche candidates with separated **Evidence Strength** vs. **Product Suitability** & **Gate A** approval
3. `project_brief` — Recommended Project Brief (13-field model retained behind optional detailed editing)
4. `uvz` — Unique Value Zone positioning
5. `transformation_map` — Before → Bridge → After roadmap & title selection
6. `reference_library` — Retrieved primary source excerpts & chapter relevance mapping
7. `product_charter` — 17-point charter & **Gate B** approval
8. `outline_builder` — Chapter objectives, deliverables, & reference mappings
9. `content_studio` — Chapter drafting & passage-level citation support audit
10. `workbook_studio` — Companion worksheets & practical templates
11. `quality_assurance` — Full citation/disclaimer audit & **Gate C** approval
12. `brand_design` — Imprint visual palette & typography
13. `pricing_launch` — Channel margin modeling & honest launch copy
14. `export_center` — Commercial Buyer Learning Bundle `.zip` & author backups

Changes to upstream market evidence or strategy automatically revoke downstream gate approvals.
