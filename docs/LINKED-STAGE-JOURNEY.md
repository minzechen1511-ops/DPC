# Linked stage journey

Baseline: `e049d37e7c0a05bd0f432b197e06ade076307c9a` (main, 2026-11-19). The dirty audit worktree was preserved; changes use `codex/linked-stage-journey`. Studio's GitHub sync check reported in sync before editing.

The old journey used inconsistent per-view links and only persisted the four setup stages plus Reference Library. QA's forward action skipped Brand Design and Pricing. Dashboard and sidebar each maintained different next-step rules.

The new visible route is Topic Discovery → Recommended Project Brief → UVZ → Transformation Map → Reference Library → Product Charter → Outline → Content → Workbook → Quality Assurance → Brand Design → Pricing & Launch → Export. There are 13 visible steps because the two original discovery stage IDs share one view; all 14 internal IDs and research services remain compatible.

## Interactions

| Finish action | Result |
|---|---|
| Explicitly approve the selected topic at Gate A | Save approval and prefilled context, then open Project Brief |
| Accept the recommended or edited brief | Save, then open UVZ; draft saves and AI polish remain for review |
| Select a current UVZ option | Save the explicit selection, invalidate affected downstream work, then open the map |
| Select a title after reviewing a usable map | Save the selection and map context, then open Reference Library |
| Finish source research | Require a genuinely retrieved/reviewed source, save, then open the charter; metadata alone cannot finish research |
| Explicitly approve Gate B with successful source checks | Save, then open Outline |
| Save/generate a complete outline | Save, then open Content; partial outlines stay open |
| Finish the last substantive chapter | Save, then open Workbook; passage support review is still required at Gate C |
| Save a substantive companion resource/suite | Save, then open QA; does not approve Gate C or source reviews |
| Explicitly approve Gate C with successful checks | Save, then open Brand Design |
| Save brand styling | Include the local styling edits, save, then open Pricing |
| Save pricing and copy | Include local edits, save, then open Export; export checks remain intact |

Existing forward controls and the shared finish/continue footer use the same handoff. The footer directs users to the stage-owned save/select control when there are local form drafts, so it cannot discard unsaved styling or copy. Earlier work remains editable from the sidebar and previous-stage controls.

The journey visualization shows four phases with actual completed counts and current/blocked steps. Handoffs announce what was saved, provide a return link, scroll the new view to its beginning and focus main content. Layout stacks for narrow previews; controls expose labels, current step, disabled states and visible focus.

## Save and approval boundaries

The existing serialized Firestore queue saves the completed stage and destination before navigation. The handoff snapshot suppresses a redundant debounced save. Failure keeps the current view and editable draft with retry; a different project, navigation or newer edit cancels the late navigation. No timer, polling completion guess or status-only observer moves a user on hydration. The active stage now persists throughout the route, including later stages.

No Gate A/B/C or source review is automatically approved. Generated suggestions are not selected by this feature. Existing evidence validation, upstream approval invalidation, provenance, manual research and author-review export checks remain intact.

AI generation uses existing per-stage services. The job API only stores metadata and is not a background executor; no unattended generation, pause/resume executor, fabricated progress or extra provider requests were added.

## Validation

- 127 tests passed, zero failed, including seven new focused journey tests: ordered links, approval boundaries, preserved selections/context, unsupported source records, delayed/failed save and retry, superseded handoffs, bilingual accessible markup.
- TypeScript (`npm run lint`), production build and `git diff --check` passed. Existing Vite configuration and large-chunk warnings remain.
- The first sandbox test run could not reach loopback integration servers (EACCES); the same suite passed with approved loopback access. This was an environment restriction, not a product regression.
- No browser/E2E test runner is configured. Hosted desktop/mobile observations and actual save/handoff results must be reported separately in the delivery handoff; unit tests do not establish a live cloud save.

Delivery requires a normal non-force main push, Studio pull, reload and hosted verification. Firebase/provider quotas and network errors can still block saving or generation; the UI must retain their true status.
