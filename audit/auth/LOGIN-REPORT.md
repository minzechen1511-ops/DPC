# Local Google sign-in diagnosis — 2026-11-18

Inspected base: `8420c821a4c8ad6d0731b8f59bb8c00bf16b0c06`, branch `codex/release-acceptance-audit`, repository `minzechen1511-ops/DPC`. Working tree was clean before this fix. Existing Firebase identity, Firestore database, project data and authorization checks are preserved.

## Confirmed cause and external blocker

The user reported `http://127.0.0.1:3102/`. A real HTTP 200 response from Firebase's public client project configuration endpoint confirmed that neither `127.0.0.1` nor `localhost` is in project `melodic-mechanism-8klwk`'s authorized domains. The allowed entries are the existing Firebase Hosting domains and three AI Studio Cloud Run hosts. See [timestamped redacted response](config-check.json).

Opening this project's Firebase console with the browser's existing signed-in account showed: “Project does not exist, or you do not have permission to list apps in the project” (Chinese UI). No domain configuration was changed. Firebase/gcloud administration CLIs are not installed in this workspace environment. The public client configuration API grants no administrative access.

**Still required:** a Firebase project administrator must add exactly `127.0.0.1` in Authentication → Settings → Authorized domains, preserving existing entries. Add `localhost` separately if used. Do not include the port, scheme or path. The code fix cannot update this remotely administered setting. Sign-in success, Firestore access after sign-in and live Gemini generation remain unverified.

## Gemini credentials

`/api/health` returned HTTP 200 with `authRequired: true` and `geminiConfigured: false`. The local server has no `GEMINI_API_KEY`. Firebase's ID token protects Studio requests; the backend uses a separate server Gemini API key. Logging into a Google account does not supply that key or inherit Gemini app subscription quota. The existing implementation does not implement a separate Gemini OAuth authorization flow.

An administrator must configure a Gemini API key in local server `.env` or deployment secrets and restart/redeploy, then run AI Settings → Test Connection after completing sign-in. Key presence alone does not verify model access, billing or quota. No credential was requested in chat, copied from a browser session or exposed in this report.

## Changes

- Login preflight checks the current URL against Firebase's live authorized domains, including correct port handling, subdomain boundaries and distinct loopback names.
- A missing domain has exact hostname-only setup guidance, the correct project's console link, and recheck/reload actions. A failed/malformed diagnostic stays unknown. Reloading after a domain change resets the Auth SDK's cached origin validation promise (confirmed in the installed Firebase SDK).
- `auth/unauthorized-domain` and disabled Google provider errors receive actionable messages. Popup errors retain their existing handling.
- The login screen reports the actual server credential-presence flag, distinguishing missing, configured-but-untested and unknown.
- Login/AI settings no longer promise an account-linked Gemini token, automatic API credentials or already-active AI service. Missing-key backend errors and `.env.example` now describe actual configuration.
- No sign-in bypass, new Firebase project, OAuth scope expansion or change to API bearer-token validation was introduced.

## Verification

| Check | Actual result |
|---|---|
| Production startup | `npm start`, `NODE_ENV=production`, `PORT=3102`: successful; Express + built frontend served at the reported URL |
| Firebase public configuration | HTTP 200; reported hostname absent |
| Local health | HTTP 200; Gemini credential absent; auth required |
| Real sign-in attempt at reported URL | Reproduced domain rejection; actionable domain instructions rendered; no successful account sign-in claimed |
| Desktop | 1376 × 1243 screenshot: instructions, exact hostname, Firebase link, missing-key status and retry visible |
| Mobile | 390 × 844 viewport: stacked card, wrapped project/host text; setup card continues vertically; bilingual instructions inspected |
| Type-check | `npm run lint` / `tsc --noEmit`: exit 0 |
| Tests | Initial sandbox run hit loopback `EACCES`; rerun with loopback access: 102 tests, 102 pass, 0 fail, exit 0 |
| Build | `npm run build`: exit 0; existing large-bundle warning remains (JS ~1.67 MB, gzip ~496 KB) |
| Whitespace | `git diff --check`: exit 0 |

Screenshots: [desktop](desktop.jpg), [mobile](mobile.jpg). No real market data or user project was modified to test this login change.

## Primary documentation

- [Firebase Authentication troubleshooting](https://firebase.google.com/docs/auth/faq-and-troubleshooting): authorized-domain requirements; localhost is no longer automatically authorized for projects created after April 28, 2025.
- [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin): sign-in provider configuration and Firebase identity.
- [Gemini API keys](https://aistudio.google.com/docs/api-key): keys and associated Google Cloud projects.
- [Gemini OAuth setup](https://aistudio.google.com/docs/oauth): a separate authorization integration, not supplied by Firebase sign-in in this app.
