# Firestore Security Specification (`Digital Product Studio`)

## Phase 1: Collection Inventory & Master Source of Truth

1. `/users/{userId}` (`UserProfile`) — Private per-user account profile storing `uid`, verified `email`, `displayName`, `photoURL`, `activeProjectId`, `preferredLang`, `createdAt`, `updatedAt`. No RBAC/admin claims are mutable from client documents.
2. `/users/{userId}/projects/{projectId}` (`StudioProject`) — Private subcollection of multi-stage Digital Product Studio projects. Parent `/users/{userId}` is the Master Source of Truth verified on every single-document read/write/delete via `exists(...)` & `get(...)`.

## Data Invariants

1. **Identity Integrity**: Every document in `/users/{userId}` must have `uid == request.auth.uid == userId`. Every project in `/users/{userId}/projects/{projectId}` must have `ownerId == request.auth.uid == userId` and `projectId == projectId`.
2. **Email Verification**: All read and write access requires `request.auth != null && request.auth.token.email_verified == true`.
3. **No Secret Persistence**: `aiSettings.apiKey` and `aiSettings.baseUrl` must always be empty strings (`size() == 0`) — server-side `GEMINI_API_KEY` is never written to or read from Firestore.
4. **Immutable Ownership & Timestamps**: `ownerId`, `projectId`, `uid`, and `createdAt` cannot change after creation. `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
5. **Monotonic Revision**: `revision` starts at `1` on create and strictly increments (`incoming().revision == existing().revision + 1`) on update.
6. **Strict Key Allowlists**: Every document uses `hasAll([...]) && hasOnly([...])` on writes plus `affectedKeys().hasOnly([...])` on updates to reject ghost/shadow fields (e.g., `role`, `isAdmin`, `isVerified`).
7. **PII Isolation & Query Enforcement**: `/users/{userId}` forbids `list` queries (`allow list: if false;`) and restricts `get` strictly to `isOwner(userId)`. `/users/{userId}/projects` enforces `isOwner(userId) && resource.data.ownerId == request.auth.uid` on `list` without `get()`/`exists()` inside `allow list`.

## The "Dirty Dozen" Attack Payloads (All Must Return `PERMISSION_DENIED`)

1. **Cross-Tenant Profile Read/Write**: Signed-in user `alice` tries to read or create `/users/bob` with `uid: "alice"`.
2. **Unverified Email Bypass**: Signed-in user with `request.auth.token.email_verified == false` attempts to create `/users/alice`.
3. **Shadow Role Escalation on Profile Create**: `alice` attempts to create `/users/alice` with extra ghost field `isAdmin: true` or `role: "admin"`.
4. **Owner Spoofing on Project Create**: `alice` attempts to create `/users/alice/projects/proj_1` with `ownerId: "bob"`.
5. **Orphan Project Create (Missing Parent Profile)**: `alice` attempts to create `/users/alice/projects/proj_1` before `/users/alice` exists.
6. **ID Poisoning / Oversized Document ID**: `alice` attempts to create `/users/alice/projects/..%2Fevil` or a 200-char ID or 10KB name string.
7. **Forged Client Timestamp on Create**: `alice` sets `createdAt` or `updatedAt` to a client timestamp instead of server `request.time`.
8. **Update Immutable `ownerId` / `createdAt`**: `alice` updates `/users/alice/projects/proj_1` trying to alter `ownerId` or `createdAt`.
9. **Revision Replay / Downgrade on Update**: `alice` updates `/users/alice/projects/proj_1` with `revision: 1` when `existing().revision == 1` (not `+ 1`).
10. **Ghost Field Shadow Update on Project**: `alice` adds `{ extraBypass: true }` in `update()` on `/users/alice/projects/proj_1`.
11. **Secret Injection into Project**: `alice` sets `aiSettings.apiKey = "AIzaSy..."` inside Firestore project payload.
12. **Blanket User List Scraping**: Signed-in `alice` attempts `list` on `/users` or `/users/bob/projects`.
