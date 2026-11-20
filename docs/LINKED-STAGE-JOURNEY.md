# Linked stage journey

Baseline: `e049d37e7c0a05bd0f432b197e06ade076307c9a` (main, 2026-11-19). The dirty audit worktree was preserved; changes use `codex/linked-stage-journey`. Studio's GitHub sync check reported in sync before editing.

The old journey used inconsistent per-view links and only persisted the four setup stages plus Reference Library. QA's forward action skipped Brand Design and Pricing. Dashboard and sidebar each maintained different next-step rules.

The new visible route is Topic Discovery → Recommended Project Brief → UVZ → Transformation Map → Reference Library → Product Charter → Outline → Content → Workbook → Quality Assurance → Brand Design → Pricing & Launch → Export. There are 13 consecutively numbered visible steps because the two original discovery stage IDs share one view; all 14 internal IDs and research services remain compatible. Both translations, metadata, the dashboard and sidebar follow that sequence.

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

The journey visualization shows four phases with actual completed counts and current/blocked steps. Handoffs announce what was saved, provide a return link, scroll the new view to its beginning and focus main content. Narrow previews use a compact two-column phase summary with expandable steps; controls expose labels, current step, disabled states and visible focus.

## Save and approval boundaries

The existing serialized Firestore queue saves the completed stage and destination before navigation. The handoff snapshot suppresses a redundant debounced save. Failure keeps the current view and editable draft with retry; a different project, navigation or newer edit cancels the late navigation. No timer, polling completion guess or status-only observer moves a user on hydration. The active stage now persists throughout the route, including later stages.

One runner prevents duplicate saves/navigation. Revisiting an unchanged decision skips already completed steps and resumes at the next incomplete or review-required stage. Meaningful upstream edits retain downstream output but mark affected completed/partial stages for review. Editing a chapter's outline context retains its manuscript text and removes stale chapter completion. Existing gate revocation and evidence checks still apply.

Existing-profile startup now reads without requiring a profile metadata write. Changed profile values avoid redundant writes; new profile creation and denied reads remain security boundaries. A workspace that has not hydrated shows loading/unavailable and retry instead of an empty project labelled Cloud Synced. Mobile header actions wrap and keep save status visible.

No Gate A/B/C or source review is automatically approved. Generated suggestions are not selected by this feature. Existing evidence validation, upstream approval invalidation, provenance, manual research and author-review export checks remain intact.

AI generation uses existing per-stage services. The job API only stores metadata and is not a background executor; no unattended generation, pause/resume executor, fabricated progress or extra provider requests were added.

## Validation

- 137 tests passed, zero failed, including 17 new focused journey/profile tests: ordered links and translated numbering, approval boundaries, preserved selections and blank creator facts, unsupported source records, delayed/failed save and retry, superseded/duplicate handoffs, review invalidation, retained manuscript text, skipping unchanged completed decisions, readable quota errors, no-op profile writes and truthful hydration status.
- TypeScript (`npm run lint`), production build and `git diff --check` passed. Existing Vite configuration and large-chunk warnings remain.
- The first sandbox test run could not reach loopback integration servers (EACCES); the same suite passed with approved loopback access. This was an environment restriction, not a product regression.
- No browser/E2E test runner is configured. Hosted desktop/mobile observations and actual save/handoff results must be reported separately in the delivery handoff; unit tests do not establish a live cloud save.
- Hosted testing of the accepted Transformation Map's forward action exposed Firestore's exhausted free daily write quota. The UI stayed on the current stage and exposed retry, as required; at that check successful live advancement was blocked by the external quota. Raw wrapped database errors were replaced with readable recovery guidance and a sanitized JSON recovery-backup action. No gates or selections were changed for this test. Final hosted observations belong in the delivery handoff.

Delivery requires a normal non-force main push, Studio pull, reload and hosted verification. Firebase/provider quotas and network errors can still block saving or generation; the UI must retain their true status.

## Continuing from the work itself

The stage header shows the current step and the destination that opens after a successful save. Its phase bars contain one segment per stage. When an earlier decision needs attention, the header links directly to that decision. My Projects resumes the first unfinished or review-required step.

Custom UVZ selection and saving a complete edited map use the same handoff as suggested options. Saving a checked, matching source opens Product Charter, with a secondary action for researchers collecting more sources. Saving an unverified note stays in Reference Library. Batch writing evaluates the accumulated manuscript after each chapter update. Undersized chapters remain available for retry. Revising a manuscript retains chapter text and reopens dependent work. The header sync retry repeats a failed handoff as well as its save.
