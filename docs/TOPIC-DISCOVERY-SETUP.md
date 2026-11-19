# Topic Discovery and four-step setup

Inspected and implemented 2026-11-19 (Asia/Taipei), repository `minzechen1511-ops/DPC`.

- Current main, checked before editing and fetched again before handoff: `fd118431dc9c62a2d424a750a4ed93d01e619645`.
- Implementation branch: `codex/topic-discovery-setup`, based on the committed five-step revision `76de0c38634744e20de16f87fc18356970dbb28d` in `DPC-gate-a`.
- The separate `DPC` worktree remains on `codex/release-acceptance-audit` at `aacaa0fd10a7fb91841ed0b86f03046444c1e82a`, with its existing uncommitted audit work preserved. It was not reset, copied over, or committed by this change.
- This branch does not deploy into AI Studio or update main. No PR was created. Unpublished audit-branch integrations are not represented as released features.

## Friction diagnosed before layout changes

The committed five-step journey separated collection and topic approval despite sharing the same research component and project data. Users had to navigate between two surfaces to understand evidence and choose a topic. The brief had optional editing but still exposed AI controls prominently and omitted format, boundaries and price assumptions from its initial summary. Legacy next-step branches and help text still referred to a mandatory 13-field stage. Generated parser outputs assigned recommended positioning/title IDs before the creator acted. Empty drafts could also be described as stale work, and title-only generation could remove the visible stale status of a map whose positioning had changed.

## Before and after

Before: Market Research → Topic Selection / Gate A → Brief → UVZ → Transformation Map.

After: **Topic Discovery → Recommended Project Brief → Unique Value Zone (UVZ) → Transformation Map → Reference Library**.

| User task | Implemented interaction and boundary |
|---|---|
| Start | Project name is the simple intake. Market, language, format and research depth remain editable optional defaults. Creation saves before opening Topic Discovery. |
| Discover and compare | The same screen offers the actual supported scan, real scan status, recommendations, linked observations and original sources. Its primary action progresses through scan/retry, choose, explicit approval and continue. No topic is auto-selected. |
| Interpret results | Evidence strength and suitability remain separate. Audience, intended outcome, suggested format, effort estimate, uncertainty, creator-fit status and validation action are visible. A suggested starting point explains its existing recommendation reason. Chart/report signals explicitly do not establish demand for the proposed product or guarantee sales. |
| Inspect advanced research | Source directory, filters, collector diagnostics, web search, manual entry/import and review remain available through secondary tools. Partial/unavailable source outcomes are also summarized on the main discovery surface. Search results, samples, unverified imports and manually reviewed material retain their existing distinctions. |
| Use the brief | Seven summary items show audience, problem, concept, intended outcome, format, boundaries and pricing hypothesis. Continue accepts the available brief; detailed fields and AI polish are optional disclosures. The 13-field persisted model remains intact. |
| Handle creator unknowns | Identity, experience, expertise and interests remain blank unless supplied. Brief polishing preserves actual personal facts. Unknown expertise is a knowledge gap requiring qualified expert review, not proof of creator-market fit. |
| Choose positioning | Generate three comparable suggestions from the approved topic and brief. Recommended options stay unselected. Continue with recommendation, Select Positioning, or a custom option are explicit creator actions. Existing selections have a distinct continue label. |
| Use the map | Generate fresh Before/Bridge/After pillars and title/subtitle options from the selected UVZ. The suggested title remains unselected until Use suggested title & continue or Select Title. The handoff names Reference Library and explains what carries forward. |
| Recover | Failed parsing/network requests retain saved content. Existing drafts can be reopened and the individual action retried. Upstream changes visibly mark dependent drafts for review. Incomplete AI map responses cannot silently reuse old core pillars, and title-only regeneration cannot refresh a stale map. |
| Revisit work | Selecting the same topic, continuing with an unchanged accepted brief, or reusing an already selected option/title preserves the existing decision. Actual changes continue to invalidate downstream approvals through the existing gate policy. |

## Actual automation and persistence

The inspected `server/jobs/jobRoutes.ts` manages job/step records and status changes. It has **no generation executor** calling the AI services and persisting their outputs into the frontend Firestore project workspace. Consequently, this change does not offer a pretend “Generate recommended setup” sequence or working background pause/resume controls.

What operates automatically: the supported initial scan request when a new project has no previous scan state, topic-to-brief prefill, and the existing per-stage AI generation requests after the creator invokes them. Generated results use the existing project save queue. Active setup location and Reference Library handoff are restored from persisted workflow state. Legacy `market_research` navigation resolves to Topic Discovery. All 14 internal stage IDs, research data, source provenance and backend endpoints remain.

What remains human-controlled: topic selection, formal Gate A approval, brief acceptance, UVZ/title adoption, source evidence reviews and Gate B/C approvals. None is granted by generation. Background sequence resumption is unavailable; reopening saved progress and retrying a single stage is supported. Async map results also check the captured UVZ content, not just its ID, before application.

## Changed files

- Routing/state/navigation: `src/App.tsx`, `src/components/GateAJourneyNav.tsx`, `src/components/Sidebar.tsx`, `src/components/views/DashboardView.tsx`, `src/utils/gateAJourney.ts`.
- Setup views: `src/components/views/NewProjectWizard.tsx`, `MarketIntelligenceView.tsx`, `ProjectBriefView.tsx`, `UVZView.tsx`, `TransformationMapView.tsx`, `AutomationSettingsView.tsx`.
- Copy/context/generation: `src/utils/i18n.ts`, `workflowEngine.ts`, `marketDiscoveryEngine.ts`, `stageSynthesis.ts`, `strategySynthesis.ts`.
- Tests: `src/utils/gateAJourney.test.ts`, `src/utils/strategySynthesis.test.ts`.
- Documentation: `README.md`, this report, `docs/GATE-A-JOURNEY.md` (historical report marked superseded), `docs/market-research-and-bundles.md` (brief handoff wording).

## Validation

- `npm test`: **105 passed, 0 failed**, exit 0. Coverage includes merged discovery rendering/partial status, legacy route compatibility, fresh/sample/unavailable cases, manual import staying unverified until explicit review, source-type preservation, separate Gate A approval, optional brief acceptance, blank creator facts, supplied facts/boundaries, recommended/manual positioning, storage round trips, failure/retry, suggested IDs remaining unselected, stale-draft warnings, partial map rejection and gate boundaries.
- First restricted test attempt: 97 passed and 7 backend tests failed with loopback `EACCES`. This was an environment restriction. The complete final run with loopback permission passed; no test was disabled or changed to hide it.
- `npm run lint`: `tsc --noEmit`, exit 0. This repository's lint command is its TypeScript check; no separate lint script is configured.
- `npm run build`: exit 0, 1,800 modules. Final bundle: 1,697.34 kB JS / 504.50 kB gzip; CSS 71.83 kB / 12.78 kB gzip. Existing Vite native-config `__dirname` and >500 kB chunk warnings remain. No CI or bundle redesign was included.
- `git diff --check`: passed before commit.
- Browser: actual components exercised in an explicitly labeled synthetic preview at desktop (about 1270 px) and 390 × 844 mobile. Checked initial failure/retry, accessible manual evidence fallback, source/recommendation co-location, topic selection versus approval, optional brief continuation, three unselected UVZ suggestions, explicit use, selected-context map handoff, title adoption through keyboard Enter and reload. Four-step navigation semantics are also tested in English and Traditional Chinese. Inputs in the detailed brief now have accessible names; focus styling and `aria-current`/disabled step states are retained.

Exact local outputs are in ignored `.local-data/discovery-tests.txt`, `discovery-typecheck.txt`, and `discovery-build.txt`. Screenshots: `.local-data/topic-discovery-desktop.jpg`, `.local-data/topic-discovery-mobile.jpg`. Preview: `http://127.0.0.1:3110/.local-data/topic-discovery-preview.html` while its local Vite server is running. **This is a synthetic component preview, not actual market research or the authenticated application.**

## Remaining limits

No configured browser/E2E suite was found in package scripts; manual browser component checks supplement the Node tests. Authenticated AI Studio E2E, successful live Gemini responses, real Firestore save/refresh/conflict behavior and actual live collector access remain unverified for this branch. The component preview uses localStorage test callbacks, not cloud persistence. A failed live-service-shaped generation attempt and retry were exercised there; successful output behavior is covered with explicit synthetic parser/storage tests. No real research record, evidence review, production topic approval or production project was created for validation.

The current source integrations and freshness/numbered-entry validation remain unchanged. This focused UX revision does not establish Whop collection, competitor feature parity, all-stage release acceptance, or profitability. The final small naming/copy adjustments were typechecked and built after the browser pass; screenshots show the tested component structure. Full assistive-technology certification and production mobile E2E remain outstanding.
