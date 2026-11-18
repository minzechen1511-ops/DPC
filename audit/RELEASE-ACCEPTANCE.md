# Digital Product Studio release acceptance audit

**Decision: HOLD for release acceptance.** Local code, APIs, evidence handling and isolated bundle checks passed after repairs. Deployed-backend research, authenticated browser flows, Cloud Firestore persistence, and desktop/mobile rendering remain unverified. These gaps prevent an unconditional release sign-off.

## Inspected version and runtime

- Repository: https://github.com/minzechen1511-ops/DPC
- Inspected upstream branch: `main`.
- Inspected commit: `bb5124d83400dc28d0ee2032fe0f0caef9c5caf6`.
- Repair branch: `codex/release-acceptance-audit`. The final commit and verified remote push receipt are returned with the delivery message; the commit containing this report identifies the audited changes without a self-referential hash.
- The supplied workspace was an empty, unborn Git repository with no working files or existing commits/remotes. A separate `DPC` clone preserved it. No existing source edits were overwritten. Clone checkout initially failed because the upstream tree tracked `D:\Digital Product Studio/store.json`, a Windows-invalid repository path. Its exact blob `a9e9979c37832fb9016e357a7269430e6c6cb12c` is preserved at `archive/legacy-local-store.json`. It contained no projects or credentials; 13 existing usage records were retained. The audit runtime never loaded that archive.
- All changes before commit belong to this audit. Final clean/dirty state and remote branch SHA must be read from the delivery receipt, not inferred from a successful local commit.
- Runtime used: Node `24.14.1`, Bun `1.4.4` via the official npm package. Initial frozen install installed 415 packages; final frozen install reported no lockfile changes.
- Development: `npm run dev` started Express and Vite on port 3101. HTTP frontend and health succeeded. An earlier duplicate HMR port warning disappeared after the isolated server was restarted with `DISABLE_HMR=true`.
- Production: `npm run build` succeeded; `NODE_ENV=production PORT=3102 npm start` started the server. [Local preview](http://127.0.0.1:3102/) returned HTTP 200, as did its actual JS and CSS assets. This establishes serving/startup, not browser rendering or successful Google sign-in. See `results/frontend-asset-checks.json`.
- `GEMINI_API_KEY` was not configured locally. AI generation was not claimed successful. The test suite checks the honest 503 behavior for missing configuration.
- Documented Cloud Run dev preview returned HTTP 200 **Cookie check HTML**, including for `/api/health` and `/api/market/research`. Shared preview returned 404. No working deployed API was established. Requests, timestamps and response fingerprints are in `results/deployed-requests.json`. The user was asked for the current accessible preview; no answer was available during the audit.

## Marketplace-to-Gate-A trace

Working means directly exercised at the stated layer. Incomplete/untested does not mean a passing unit test establishes browser or production behavior.

| Step | Actual component / code | API | Model and persistence | Status and evidence |
|---|---|---|---|---|
| Source requests | `MarketIntelligenceView`, `ResourceDirectoryPanel`, `App.handleRefreshResearch`; `server/marketResearch.ts` | GET `/api/market/research`; POST `/api/market/resources/check` | `MarketplaceObservation`, `SourceReport`, `GateAResourceEntry`; process cache, then project state | Working locally: 11 collector requests and nine directory checks; deployment untested. Full results in SOURCE-REQUESTS.md. |
| Extraction | `parseAppleChart`, `parseAmazonChart` | Same research endpoint | Original item/badge/title/ASIN/href subsets and SHA-256, separate data/retrieval dates | Working locally: 275 distinct retained observations, each compared with retained original fields. Apple freshness and explicit Amazon numbered-entry validation remain enforced. |
| Manual entry / file import | `ManualEvidenceReviewPanel`; `createManualObservationRecord`, `parseImportedObservations` | No write API: domain functions update App state; inspect-url is reachability only | `ManualEvidenceInput` → unverified observation; raw imported row, filename/hash/row number retained | Working via actual domain functions with genuine captured Amazon and Federal Reserve material. UI interaction untested. Unknown evidence types now fail instead of silently becoming interest signals. |
| Evidence review | `ManualEvidenceReviewPanel`, `applyManualReviewDecision` | No review API; project autosave follows | `ObservationReviewAssessment`, history, rationale, reviewed evidence fingerprint | Working via explicit test decisions and negative checks. Original excerpt/locator/import row/capture remain inspectable; manual/import acquisition never becomes live collector origin. Actual browser display untested. |
| Source comparison | `MultiSourceMatrix`, `compareCandidateEvidence`, `evidenceChainKeys` | Client/domain computation | Candidate comparison rows; original decisions persist, derived rows reconstructed on Firestore load | Working in local exercise: two independent origins, repeated Fed report collapsed, single-source and no-reviewed-evidence cases labeled accurately. Explicit corroborating/complementary/contradictory review requires rationale. Rejected records are excluded rather than falsely counted as contrary demand evidence. |
| Recommendations | `deriveSynchronizedCandidates`, `MarketIntelligenceView` | No separate recommendation API | `TopicCandidate`, `sourceObservationIds`, evidence strength, product suitability, factor assessments | Working locally; five candidate domains from actual data are saved in `actual-recommendations.json`. User display preference did not change scores. Prices, audience fit and production concepts remain hypotheses. |
| Explicit Gate A | Topic selection controls; `propagateTopicToDownstream`, `approveGate`, `gateIssues` | Domain action; no dedicated gate API | Selected topic/hypothesis and `WorkflowGate` approval fingerprint | Working via explicit domain action. Unverified, missing, rejected, stale, sample or scope-mismatched material cannot qualify. This is an isolated acceptance decision, not the owner's commercial sign-off. |
| Downstream state | `App` and all stage views | Frontend project writes go directly to Firestore; backend project routes are separate | `DigitalProductProject`; `users/{uid}/projects/{projectId}` in Firestore. Backend CRUD/snapshots use atomic JSON `LocalStore` | Local API round-trip, disk restart, backup and restore worked. Firebase browser auth and Cloud Firestore writes/refresh remain untested. `/api/health` now distinguishes the backend local store from the frontend Firestore store. |

The backend cache is 15 minutes when observations exist and one minute on an empty result. A cache hit is not a new source request. Directory accessibility is not validated evidence. [SOURCE-REQUESTS.md](SOURCE-REQUESTS.md) contains each requested URL, check timestamp, access result, collector status, count and limitations. It preserves the initial Apple timeout and an intervening canonical-feed 502 as well as later success.

## Fourteen-stage isolated exercise

`audit/exercise-real-workflow.ts` executes the actual domain functions and an isolated instance of the actual API router with a **test-only injected identity**, never production auth or a production account. The file-based store is under ignored `.local-data`. All market/reference material comes from real backend captures; synthetic regression tests are separate in `tests/` and `*.test.ts`.

| Stage | Result | Evidence / boundary |
|---|---|---|
| 1 Market research | Working locally | Original material verified for 275 observations. Genuine manual entry and JSON import initially unverified. |
| 2 Topic selection | Working at domain layer | Reviewed Amazon book chart plus independent SHED survey context; explicit Gate A; unknown creator identity/expertise preserved. |
| 3 Project brief | Working at domain layer | Test purpose, problem and transformation populated; audience explicitly an unvalidated hypothesis. |
| 4 UVZ | Working at domain layer | Positioning and direct buyer validation action recorded; no claimed credentials or validated differentiation. |
| 5 Transformation map | Working at domain layer | Before → baseline → ledger → review → completed exercise; conceptual, no promised financial outcome. |
| 6 Reference library | Working locally | Actual Federal Reserve page retrieval and exact paragraph/locator/document hash. Missing extracted bibliography metadata remains unknown. |
| 7 Product charter | Working at domain layer | Objectives and disclaimers; explicit Gate B after actual source relevance mapping. |
| 8 Outline | Working at domain layer | One scoped, original chapter with objective, deliverable, source mapping and completion milestone. |
| 9 Content studio | Working at domain layer | Substantive original planning manuscript, fictional arithmetic labeled as such; cited survey paragraph/table; every passage explicitly reviewed. No AI generation claim. |
| 10 Workbook studio | Working at domain layer | Usable expense ledger, column definitions, instructions, explicit unknowns and completion criteria; companion passages reviewed as original instructions. |
| 11 Quality assurance | Working at domain layer | Explicit Gate C; zero unresolved passage reviews; later brand/pricing edits stale the approval and require reapproval. |
| 12 Brand design | Working at domain layer | Digital Product Studio identity retained in test export; browser appearance untested. |
| 13 Pricing / launch | Working at domain layer | Example 100 visits × 1% conversion × $15, assumed fees/overhead/acquisition → **-$47/month**, not predicted profit. Refunds, taxes, labor and actual demand remain unknown. |
| 14 Export | Working locally | Incomplete buyer request HTTP 422; author-review ZIP HTTP 200. Real-reference reviewed test ZIP HTTP 200 with 23 manifest files, every byte count and SHA-256 verified. Source-backed figure and clearly labeled conceptual diagram checked. Backup downloaded, restored through import with approvals revoked, API refresh and store restart retained manuscript. |

See `results/real-workflow-exercise.json`, `real-project-backup.json`, `real-bundle-manifest.json`, and the actual downloaded ZIP files. The isolated bundle is an acceptance artifact, not a product cleared for sale. The final live-collector export also reconciled against actual backend source material and returned 200; changing its title to a forged value returned 422 `MARKET_SOURCE_CHECK_FAILED`.

## Confirmed defects and repairs

1. **Evidence authenticity:** retained original collector material and response hashes; strengthened ASIN-to-link consistency; exposed source HTTP outcomes. Buyer exports reconcile selected live evidence with actual backend research and check original material integrity. Amazon tracking-session differences do not become false content changes. Unsupported/challenge/empty extraction remains visible.
2. **Manual evidence:** fixed inspect-url response field mismatch (`lastCheckedAt`, `lastCheckNote`); retained imported retrieval dates and evidence types; rejected unsupported types/future timestamps; prevented explicit scope mismatch eligibility. Removed the fabricated record from the downloadable CSV template; parser fixtures now live in tests.
3. **Review integrity:** legacy migration no longer manufactures missing review fingerprints. Missing/changed fingerprints require fresh explicit review. Retrieval-date changes invalidate review. Existing text/history is retained.
4. **Independent sources:** common Apple, Amazon/Keepa, NYT and Trends origins collapse across different report labels/dates/categories. Explicit shared-dataset IDs also merge cross-host reports. A rejected claim is no longer labeled a contradiction automatically; deliberate relationship classification has a rationale.
5. **Approvals:** A/B/C decisions bind to their current input snapshots. Direct local/API and Firestore writes invalidate affected downstream approvals; brand/pricing handlers also revoke strategy/quality approvals. An old boolean alone cannot make an edited product buyer-ready. These fingerprints are change detectors, not cryptographic signatures of human identity.
6. **Persistence:** corrupt JSON stores stop with an explicit preservation error rather than resetting to empty. Firestore saves check the expected revision when supplied by App. Derived market comparison rows are compacted and reconstructed without deleting original observations/reviews. Actual market state shrank from 1,011,031 to 700,537 bytes under the 950,000-byte guard.
7. **Exports and commercial math:** buyer filename/delivery requires final reviewed manifest checks. Original source preflight remains mandatory. Negative unit contribution stays negative; impossible break-even is shown as unavailable rather than zero sales. Channel fee presets are explicitly illustrative assumptions requiring current verification.
8. **Repository/build:** portable archive for the Windows-invalid tracked path, frozen Bun CI installation matching the actual lockfile, `codex/**` CI branch trigger, removal of unused legacy desktop dependencies, and `import.meta.dirname` replacing deprecated Vite config globals.

Relevant full diffs: [evidence ingestion/review](evidence-ingestion-review.diff), [Gate A and comparison](gate-a-eligibility.diff), [approval/persistence](approval-invalidation.diff), [export checks](export-checks.diff). Full change summary: [git diff --stat](diff-stat.txt).

## Validation output and remaining acceptance work

- Baseline unrestricted suite: 81/81 passed. The first sandboxed run failed on denied localhost connections (`EACCES`), not accepted as a pass. Historical logs are retained.
- Final suite: **89 tests, 89 passed, 0 failed, 0 skipped**. `results/final-tests.txt`.
- Type-check: `npm run lint` / `tsc --noEmit`, exit 0. `results/final-typecheck.txt`.
- Build: `npm run build`, exit 0; 1,798 modules, JS ~1,659.57 kB / gzip ~490.39 kB. Vite still warns about the large single JS chunk. `results/final-build.txt`.
- Frozen dependency install: exit 0, no lockfile change. `results/final-install.txt`.
- Repository checks: no prohibited legacy packaging matches, no internal AI Studio spec assets in `dist`; archived store blob matches original exactly. `results/repository-checks.json`. `git diff --check` passed.
- **Desktop/mobile: untested.** The Computer Use tool stopped because it could not confidently determine the current Windows browser URL for policy enforcement. No screenshots, viewport tests, interactive Google sign-in, refresh, import clicks or browser-triggered downloads are claimed. Static responsive classes are not visual acceptance.
- **Deployment: untested.** A working accessible Cloud Run preview/backend is still required, then repeat source requests there and compare its served version with the pushed commit. A GitHub push is not proof of AI Studio deployment/synchronization.
- **Cloud persistence: untested.** Local-store/API restart is verified; real multi-tab Firestore transactions, authenticated refresh, disconnect/reconnect behavior and document-size rejection need a signed-in browser session. Firestore still has a 1 MiB document ceiling; large embedded images/manuscripts can exceed the guarded limit and currently require an explicit error/backup rather than silent truncation.
- **Market limitations:** book rankings and household surveys do not prove workbook/course/template sales, price elasticity, conversion, CAC, profitability or creator fit. Each recorded recommendation exposes source IDs, links, dates and limitations and proposes buyer validation. Source independence across unknown syndicated publishers still requires honest reviewer disclosure of their shared dataset.
- **Content/AI:** manually authored test content was exercised. Actual configured Gemini generation across stage views was not exercised. The synthetic 14-stage contract test does not establish the truth of its invented publications or market listings.
- No Synthesise.ai feature comparison, feature-parity claim or guaranteed-profit claim was made.

Required next acceptance action: supply an accessible deployed preview, sign in normally, and repeat the deployment/browser/Firestore/desktop/mobile checks. Preserve the manual gates while resolving any newly observed failures.
