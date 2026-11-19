# Gemini UVZ and OpenRouter repair — 2026-11-19

The user's newer AI Studio provider implementation was preserved by pushing its 35 files to main at `21c1cfc7af1bfdf33911c4a67e05912350f49ae6` before this repair. The earlier in-progress patch was checkpointed separately; it was not applied over that newer implementation. The original dirty audit worktree remains untouched.

## Confirmed defects and changes

- An older request's usage callback changed the current provider while leaving the newly selected model unchanged. Sanitization could then normalize the mismatched pair back to Gemini. Usage now updates counters only and checks its originating project; a regression test covers saved OpenRouter selection.
- OpenRouter catalog loading required a connected key, seeded stale curated models, cut off the list at 45 entries, rounded cheap paid pricing to zero, and the settings view displayed only the first 16. The public catalog is now fetched without a key; all free text models are retained and sorted first. Exact zero pricing is required, missing/negative prices remain unknown, and unavailable/saved catalog states remain visible. The free-only filter affects OpenRouter while keeping Google models alongside it.
- Quick selectors hid OpenRouter when connection detection failed and could not represent a saved model absent from the list. They now expose catalog choices and retain an explicitly labeled saved selection. Choosing a model in settings applies its provider/model pair immediately through the existing project save mechanism.
- The account-connect button used an unverified popup flow. Its UI and message listener were removed as requested. Existing OAuth backend records/routes remain compatible. A real authenticated **Save and verify API key** form validates with OpenRouter before encrypting the key in user-scoped server storage. Rejection leaves the old key intact. Existing `OPENROUTER_API_KEY` secrets continue to work. Keys are never returned in plaintext or stored in project exports.
- Gemini UVZ now requests a server-owned three-option JSON schema and a larger output allowance. The backend honors the output allowance, rejects incomplete/blocked/empty/malformed responses, and retains specific error codes. The newer baseline's Firebase token refresh and warmup retries remain intact. Google login and server Gemini credential status are described separately; credential status is checked rather than assumed active.
- Backend HTML/proxy responses, provider rejection and malformed generated content no longer collapse into the same misleading connection error. Existing rate-limit metadata is retained.

## Validation

- Baseline: 114 tests passed on the preserved Studio commit.
- Repair: 120 tests passed, zero failed; `npm run lint` (`tsc --noEmit`) and production build passed. Existing Vite native-config and large-chunk warnings remain.
- The real public OpenRouter catalog was requested on 2026-11-19; it initially returned 16 zero-text-token-price candidates. Hosted inspection identified two paid music generators with mixed text/audio output; those are excluded from the authoring catalog, leaving 14 text-only free models at that check. This is catalog availability, not proof of a successful authenticated generation with every model. No sample catalog is substituted for failed research.
- Integration tests use explicit test doubles to verify authentication, key rejection, encryption/user isolation, anonymous catalog access, and routing to the exact requested free model. Client tests cover provider persistence after usage, transport/parse errors, key intake, and removal of the unverified connect control.
- Live hosted connection checks and preview synchronization must be recorded in the handoff. Test-double results must never be reported as live credential spending or live OAuth authorization.

## Delivery and limitations

The canonical testing target is the existing AI Studio project linked in `AGENTS.md`. Completed authorized updates include main push, Studio pull, reload and hosted verification; a local harness is not delivery. The original four-step report describes its historical pre-deployment state; main was subsequently synchronized into AI Studio.

Gemini quota/billing and OpenRouter rate limits still depend on their respective provider credentials. Login does not create quota. Free catalog pricing is not an availability guarantee. Personal keys are encrypted in the current server's local data store; recreating that store can require re-entry. A server secret is the existing alternative. No claim of durable Firestore credential storage or working account OAuth UI is made.
