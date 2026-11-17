# Security & Trust Boundary Model

## 1. Authentication, Sessions & CSRF
- **Opaque Cookie Session**: `/api/auth/whop/callback` and `/api/auth/sandbox/login` issue `dpc_session` with `HttpOnly`. For HTTPS requests (`req.secure`, `X-Forwarded-Proto: https`, HTTPS `Origin`/`Referer`, or non-local HTTPS `appBaseUrl`), cookies use `SameSite=None; Secure` so sessions work inside hosted HTTPS iframes; plain HTTP local dev uses `SameSite=Lax`. Only the SHA-256 digest (`token_hash`) is persisted in `sessions`.
- **CSRF Defense-in-Depth**: All mutating API requests (`POST`, `PUT`, `PATCH`, `DELETE`), excluding Standard Webhooks `/api/webhooks/whop`, validate the `Origin` allowlist (`ALLOWED_ORIGIN`, `APP_URL`, `APP_BASE_URL`, request `Host`, and reverse-proxy `X-Forwarded-Host`) and require matching `X-CSRF-Token` issued via `/api/me`.

## 2. Encrypted BYOK Vault & Secret Sanitization
- **Zero Plaintext Browser Storage**: Legacy `dpc_key_*` `localStorage` entries are scrubbed on startup (`scrubLegacyApiKeyStorage()`). Users store provider keys either in the AES-256-GCM server vault (`encrypted_ai_credentials`, per-key random 12-byte IV + 16-byte auth tag + masked `hint`) or page-scoped ephemeral React memory only.
- **No Plaintext Echo**: `GET /api/ai/credentials` returns only `{ provider, configured, hint, baseUrl, keyVersion, updatedAt }`.
- **Export & Log Redaction**: `src/utils/projectSanitizer.ts` strips credential blocks and redacts `sk-or-v1-*`, `sk-proj-*`, `sk-ant-*`, `AIzaSy*`, `whsec_*`, and `DPS1-*` across cloud saves, JSON backups, and `publisher/project-backup.json` inside buyer `.zip` bundles.

## 3. SSRF & AI Proxy Guardrails
- `server/ai/urlGuard.ts` rejects any custom AI `baseUrl` that is not `https://`, targets non-allowlisted hosts (`openrouter.ai`, `api.openai.com`, `api.anthropic.com`, `generativelanguage.googleapis.com`), contains embedded URL credentials, or resolves via DNS to private/loopback/link-local/metadata IP ranges (`127.0.0.0/8`, `10.0.0.0/8`, `169.254.169.254`, `::1`, `fc00::/7`).
- No silent fallback to platform `GEMINI_API_KEY`: `ALLOW_PLATFORM_GEMINI_FALLBACK` defaults to `false`; unconfigured users receive HTTP `400` prompting BYOK entry.
- Per-user sliding-window rate limits + daily quota checks + `maxTokens` caps apply to `/api/ai/chat`, `/api/market/*`, and `/api/references/verify`.

## 4. Webhook & Export Authorization
- `/api/webhooks/whop` verifies exact raw request bytes against `WHOP_WEBHOOK_SECRET` using constant-time HMAC-SHA256 comparison (`webhook-id`, `webhook-timestamp` within +/-300s, `webhook-signature` `v1,...`), logs every webhook ID once in `whop_webhook_events`, and rejects out-of-order stale updates (`source_updated_at`).
- `POST /api/projects/:id/export-bundle` verifies authenticated ownership, Pro entitlement (`canExportBuyerBundle`), `gateIssues()`, and `verifyReferenceRecords()` on the server before returning commercial buyer `.zip` files.

## 5. HTTP Headers & Prompt Isolation
- Express sends `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and strict CSP (`connect-src 'self'` in production; `'self' ws: wss:` in dev). Standalone production (`ALLOW_IFRAME_EMBED` unset on non-`.run.app` origins) enforces `X-Frame-Options: DENY` and `frame-ancestors 'none'`; AI Studio Cloud Run / dev previews allow configured `ALLOWED_FRAME_ANCESTORS` (`'self' https://aistudio.google.com https://*.google.com ...`).
- Both Express (`/assets/aistudio*` -> `404`) and Vite build cleanup ensure internal prompt specs cannot be fetched by browsers.
