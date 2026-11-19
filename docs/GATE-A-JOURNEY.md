# Gate A journey revision

Historical five-step implementation report. The current four-step UX supersedes its navigation and is documented in [Topic Discovery setup](TOPIC-DISCOVERY-SETUP.md). Earlier test results below describe that earlier revision.

Inspected: 2026-11-19 (UTC+8), `minzechen1511-ops/DPC`, latest fetched `main` at `fd118431dc9c62a2d424a750a4ed93d01e619645`.

Work is isolated in branch `codex/gate-a-journey`, worktree `DPC-gate-a`. The existing `DPC` worktree on `codex/release-acceptance-audit` contained substantial uncommitted changes; it was neither reset nor overwritten. No PR was created. This revision does not change later-stage designs or CI configuration.

## Friction and concrete changes

| User task | Observed friction | Implemented interaction |
|---|---|---|
| Begin a project | Creation navigated before the cloud save finished; Market Research opened a source directory | Creation waits for a successful save, shows pending/error state, then opens scan status. New projects can run the available scan; existing failed/interrupted scans offer explicit retry |
| Understand research | Directory access, observation count and quality were easy to confuse | Scan summary separates actual observations from currently qualified evidence, links source diagnostics, retains all original evidence/review/import routes, and keeps evidence strength separate from product suitability |
| Choose a niche | Formal approval appeared both in the header and each selected card | Selection remains an explicit separate action; the topic screen has one formal Gate A approval action and then opens the recommended brief |
| Use the brief | A mandatory-sounding 13-field editor was the main experience | A four-part brief summary comes first. Continue as-is is primary; AI polish and detailed editing are optional. Detailed edits apply on leaving the editor or using Save Draft; the header remains the authority for cloud save state |
| Choose positioning | Lens controls preceded the three options; generation and continuation competed | One primary action generates three complete options, then becomes Continue with recommendation. Options show audience, promise, advantages, risks and recommendation reasoning. Manual options/editing remain available; optional regeneration controls are collapsed |
| Produce the map | Several generation actions competed, and missing UVZ could be described as something AI would infer | The primary action uses the explicitly chosen UVZ to generate the map and title/subtitle options, then becomes Continue to Reference Library. Missing prerequisites block entry rather than silently inferring a choice |
| Know the next step | Dashboard, sidebar, stage metadata and screens had separate logic | A shared five-stage state model drives the journey navigation and Gate A recommendations. It distinguishes current/completed/blocked/upcoming; active journey location is persisted and restored after hydration |
| Recover from failures | Raw JSON/transport errors and transient scan state were confusing | Scan failure/interruption state is stored with the project, existing evidence is retained, and generation errors offer a readable retry. A failed parse does not replace the prior output |

## Actual automation capability

Inspection of `server/jobs/jobRoutes.ts` found job/step records and status mutations for create, pause, resume, retry and cancel. There is no worker that calls generation services or writes generated outputs back to the Firestore workspace. The frontend's Firestore project store is distinct from the local server job store.

Accordingly, the UI exposes real per-stage scan/generation actions and explicitly states that background execution and resumable guided generation are unavailable. The settings page no longer offers queue/pause/resume/retry controls as though they execute generation. Saved drafts and selections can be reopened, and failed stages can be retried individually. This is **not** a newly implemented background runner.

The app never chooses or approves a niche automatically. Formal Gate A, B, C and source-evidence review decisions remain explicit. Recommended UVZ selection is applied by the creator's Continue/Select action. No real market observations were created or marked reviewed for this UI task.

## Data and approval boundaries

- Topic selection prefills only the immediate brief/charter handoff; it preserves existing references, manuscript and companion work rather than replacing the whole project with a fresh template.
- Creator identity, experience and expertise are not supplied by AI brief polishing. Fresh projects leave experience level blank. Missing expertise in UVZ prompts is explicitly unknown.
- Brief or UVZ changes mark affected strategy work for review while retaining its content. Gate B/C invalidation continues through the existing gate policy; no downstream approvals are silently granted.
- Asynchronous Gate A callbacks are scoped to their originating project. UVZ/map updates also check the upstream inputs captured by that request, preventing a late result from overwriting a different context.
- Existing serialized Firestore save infrastructure is reused. New scan metadata is inside the persisted `marketResearch` object; active stage is inside `workflow`.
- The latest main's copilot/research panel referenced non-existent `uvz.recommendations`, `customStatement` and resource `url`/scope/access enum fields. These Gate A handoff/type mismatches were corrected to the actual persisted models. No unrelated CI cleanup was performed.

## Changed files

- Integration/navigation: `src/App.tsx`, `src/components/GateAJourneyNav.tsx`, `src/components/Sidebar.tsx`, `src/components/views/DashboardView.tsx`.
- Journey surfaces: `NewProjectWizard.tsx`, `MarketIntelligenceView.tsx`, `ProjectBriefView.tsx`, `UVZView.tsx`, `TransformationMapView.tsx`, `AutomationSettingsView.tsx` under `src/components/views`.
- Research/copilot handoffs: `src/components/market/GroundedWebResearchPanel.tsx`, `ManualEvidenceReviewPanel.tsx`, `src/services/aiService.ts`.
- State, copy and defaults: `src/utils/gateAJourney.ts`, `workflowEngine.ts`, `i18n.ts`, `stageSynthesis.ts`, `strategySynthesis.ts`, `src/types/project.ts`, `src/data/demoProject.ts`.
- Tests: `src/utils/gateAJourney.test.ts`, `src/utils/strategySynthesis.test.ts`, `tests/gateAJourneyFixture.ts`.

## Validation

- `npm test`: **100 tests passed, 0 failed**, exit 0. Added journey tests cover fresh/empty/sample evidence, explicit selection versus approval, prefill and creator unknowns, preservation of existing manuscript, recommended/manual positioning, storage round trips, current prerequisites, failure/retry, three-option validation, final map/title handoff, no implied executor, and bilingual current/blocked/completed navigation semantics. Existing save-queue tests also pass.
- `npm run lint`: `tsc --noEmit`, exit 0.
- `npm run build`: exit 0, 1,800 modules. Existing Vite native-config compatibility and large-bundle warnings remain (~1.69 MB JS / ~503 KB gzip); no unrelated performance/CI rewrite was attempted.
- `git diff --check`: passed after removing trailing whitespace.
- Browser component checks used an **explicitly labeled synthetic fixture** in ignored `.local-data` files. Actual components were checked at desktop and 390 × 844 mobile size: scan status, brief summary/collapsed details, brief continuation, three comparable UVZ choices, Continue with recommendation, the selected UVZ reflected in map context, readable generation failure/retry, persisted fixture selection after reload, and Traditional Chinese navigation. Mobile controls wrap vertically without clipped content. Keyboard-focus styling and screen-reader step semantics are implemented; this is not a formal assistive-technology certification.

Local exact outputs and screenshots are in `.local-data/gate-a-tests.txt`, `gate-a-typecheck.txt`, `gate-a-build.txt`, `gate-a-desktop.jpg`, and `gate-a-mobile.jpg`. Test fixtures are never production research.

## Remaining verification limits

The new branch was not deployed into the user's AI Studio project. Browser checks were isolated component tests, **not** a complete authenticated production E2E test. Live Gemini generation, real Firestore save/refresh, multi-tab conflict handling, real collector response behavior in AI Studio, and end-to-end manual completion of the new map still require verification after the code is loaded there. No claim of error-free operation or functioning background pause/resume is made.
