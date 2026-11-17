# Digital Product Studio — Web-Only Micro SaaS Conversion
## Master Implementation & Security Repair Prompt v3.0 · Latest-Commit-Aware · No Desktop Packaging

> **用途：**直接交給 Codex、Cursor、Claude Code 或有權限讀取、修改、測試 GitHub Repository 的 Coding Agent 執行。這是一份**要求實際修改程式**的技術工作指令，而非產品企劃或僅供參考的重構建議。
>
> **Repository：** `https://github.com/minzechen1511-ops/DPC.git`  
> **最後已查核的 main commit：** `be803135f38b9b774ac9d14f6c4c2fc36f53425b`（2026-11-13）  
> **最重要的最新使用者決策：** **徹底移除 Windows Desktop / EXE / Electron / Node SEA 封裝、封裝檔下載、桌面本機訂閱與人工 License Key 核發功能。產品唯一正式交付方式為登入後才能使用的 Web Micro SaaS；不再提供下載完整軟體的商品模式。**  
> **付款／會員：** Whop；**核心應用：**既有 React + Vite + Express；**資料：**PostgreSQL（可用 Supabase）；**AI：**BYOK，保留 OpenRouter、Gemini、OpenAI、Claude；**長任務：**可恢復工作佇列。  
> **原則：**禁止從零重寫、禁止假整合、禁止只做 UI 鎖定、禁止變更正式付款或未授權部署；所有商用存取須經伺服器端驗證。

---

# 0. 操作角色、範圍與不可違反的指令

你是 Senior TypeScript / React / Express Engineer、Application Security Engineer、SaaS Architect、Whop Integration Engineer、Database Engineer、Workflow Engineer 與 QA Lead。請直接在現有 Repository 實作、測試、記錄，而不是只回覆操作建議。

1. **先檢查最新 HEAD。** 本指令所列 SHA 是已查核的歷史基線，不是固定要退回的版本。執行 `git fetch`、`git status`、`git rev-parse HEAD`、`git log -8 --oneline`；若 HEAD 已有新 commit，先查看 diff，標記已完成工作，不可覆寫後續提交。
2. 在最新 `main` 上建立 `feat/dpc-web-only-micro-saas-v3` 或清楚命名的**獨立 feature branch**；保留回退點，禁止 force push、直接覆寫 main、刪除遠端分支或直接修改正式客戶資料。
3. **單一產品決策：只做 Web SaaS。** 不建立 Desktop 第二產品線；不保留可重新開啟的 EXE 建置捷徑；不建立 offline license；不提供原始碼／二進位程式給付費用戶。即便是 owner/admin 介面，也不應有桌面封裝按鈕。
4. **應保留的是數位商品輸出，而不是軟體打包。** 使用者完成的 ebook、Markdown、PDF（若確實支援）、HTML、模板與 Buyer Learning Bundle ZIP 應繼續可匯出。這種「創作成果 ZIP」與「整套 DPC 應用 EXE」完全不同。不可誤刪 `src/utils/learningBundle.ts` 的合法產品輸出功能。
5. 預設保留 React 19、TypeScript、Vite、Express、既有 UI 與 Design System；勿以 Whop 為理由強迫改成 Next.js，除非先提出明確技術證據並取得使用者核准。
6. 保留原本研究與成品品質控管：Market Research、Topic Selection、13-Field Intake、UVZ、Transformation Map、Reference Integration、Charter、Outline、Content Studio、Workbook、Gate A/B/C、QA、Design、Pricing/Launch、Export。Budget Family Meal Planning 僅為 Demo，不是新專案固定內容。
7. 所有用戶秘密、Whop 金鑰、Session Cookie、Webhook Secret、Database Service Key、AI API Key、加密主密鑰不得暴露於公開前端 JS、公開檔案、Git 或任何匯出物。
8. 後端使用者身分、付費 entitlement、專案所有權均由可信伺服器資料決定；不能由 query、localStorage、可編輯 JSON、可偽造 header 或前端按鈕決定。
9. 未取得真實 Whop/DB 憑證時，應完成 sandbox/mock adapter、migration、測試及部署指引；標示 `BLOCKED`，不能宣稱真實收款、銀行提領、訂閱與部署已完成。不能製造虛構交易。
10. 盡可能依賴可持續維護的官方 SDK 與已核對的 API；不要臆測 webhook event type、OAuth scope 或 billing status 值。
11. 分階段提交原子化 commits；每階段通過可執行測試才標示完成；保留詳細的 before/after、風險與回退記錄。
12. 在未經使用者明確批准之前，不建立正式 Whop 付費商品、不變更正式價格、不啟用正式收款、不觸發真實交易、不部署 production。

## 必須先產出的審計文件

- `docs/web-saas-audit.md`：每項問題 ID、嚴重度、發現證據（檔案與行號）、風險、處理方式、結果。
- `docs/web-saas-architecture.md`：Web Only 架構、身分驗證／訂閱／資料／API Key／匯出邊界、運作流程圖。
- `docs/web-saas-migration-plan.md`：下列 Phase 0–6 的落地步驟、依賴、資料搬移與回退。
- `docs/web-saas-test-report.md`：真實測試指令、結果、缺口與完成 commit SHA。
- `docs/legacy-desktop-removal.md`：列出移除的 Desktop 檔案、端點、依賴、UI、舊資料備份方式與刪除原因。

---

# 1. 已核實的最新程式碼基線：不是從零開始

在 `be803135...` 已確認：

| 模組 | 現有事實 | 轉型處理 |
|---|---|---|
| `src/App.tsx` | 已有多專案 React state、自動同步瀏覽器儲存與訂閱 state | **保留專案 UI**；改為帳戶專屬雲端儲存；移除 Desktop state |
| `src/utils/projectStorage.ts` | 本機 `localStorage` 多專案儲存、部分 API Key 清理 | 既有本機專案不能丟；改為一次性用戶確認遷移，並改由雲端為權威來源 |
| `src/components/views/MyProjectsView.tsx` | 切換／複製／刪除／匯入匯出 JSON 已有 | 與登入帳號的 DB 專案 CRUD 整合，不重寫整個畫面 |
| `server.ts` | 精簡 Express 入口但仍啟用 Desktop Packager | 取消建置 callback 與任何 Desktop route 註冊 |
| `server/apiRouter.ts` | 已有研究、來源、AI、`/desktop/*` API | **保留研究與 AI 路由；完整刪除 Desktop 子路由**，加入受保護的 SaaS API |
| `scripts/buildDesktopExe.ts` | Node SEA / postject Windows EXE 產製器 | **刪除** |
| `server/desktopMain.ts` / `server/desktopPackage.ts` | 內嵌資產、localhost EXE、`subscription.json` | **刪除** |
| `electron/main.cjs` / `electron/preload.cjs` | Desktop wrapper 原始碼 | **刪除整個 Electron 包裝入口** |
| `src/components/views/SubscriptionDesktopView.tsx` | EXE Download、Manual Subscription 與 License Issuer UI | **刪除並以 Web Account & Billing 畫面取代** |
| `src/utils/subscriptionLicense.ts` | 前端內含核發與驗證 License 的固定 pepper、試用／月年費／Lifetime | **移除整套本機授權作為有效付費機制；Web 以 Whop / server entitlement 取代** |
| `src/services/aiService.ts` | 多模型 BYOK，以 `localStorage` 儲存 AI Keys | 改為安全 server-side vault 或僅記憶體短期模式，預設不可持久化明文 |
| `src/components/views/AISettingsView.tsx` | 能讀／寫 Key 並將 key 放進 project.aiSettings | Key 與 project data 完全分離；不在備份與輸出中夾帶秘密 |
| `src/components/views/ExportCenterView.tsx` | Buyer ZIP／Author Review Bundle、JSON 備份、Desktop 客戶端 gate | 匯出保留，但 server-side entitlement 與 QA 必須真正驗證；修復 JSON key 洩漏 |
| `src/components/views/AutomationSettingsView.tsx` | 仍強制 `manual_review`；需人為核准 Gate | 不可把假的 Autopilot 當已完成；日後新增可恢復的自動生成，人工品質閘門不取消 |
| `src/components/views/PricingLaunchView.tsx` / `src/utils/commercialMath.ts` | 用戶所建立數位商品之價格、獲利試算 | 完整保留；**不是 DPC 自己的訂閱定價** |
| `src/utils/gatePolicy.ts` | 市場／引用／章節 QA 閘門 | 保留並強化，禁止因商業化而弱化 |
| `public/assets/aistudio/*.md` | 原始工作流與提示詞文件在 `public` 資料夾 | 審核是否含商業機密／內部提示詞；不宜公開者移到受保護後端，確認 Vite 不再靜態公開 |

上述為靜態程式碼事實；執行前重新核對最新 HEAD。任何已在新 commit 解決的問題，應記錄為 `ALREADY_FIXED` 而非重做。

---

# 2. Phase 0 — Baseline、風險隔離與保護現有資料

## 0.1 Baseline

```bash
git status --short
git rev-parse HEAD
git log -8 --oneline
npm run lint
npm test
npm run build
```

若系統使用 Bun 且有 lockfile，先檢查 Node / Bun 相容版本，使用與現有 repo 一致的 dependency install，避免無必要 lockfile 大量變動。記錄每個命令 exit code、測試數與錯誤；不允許修改測試以掩蓋程式錯誤。

## 0.2 預先盤點

- 搜尋 `desktop`、`electron`、`build:desktop`、`postject`、`license`、`DPS1-`、`subscription`、`getLocalSubscriptionFilePath`、`release/`、`buildDesktopExecutable`、`localhost:3847`、所有 `/api/desktop/` 參照。
- 搜尋 `localStorage`、`apiKey`、`apiKeys`、`JSON.stringify(project)`、`buildLearningBundle`、`GEMINI_API_KEY`、`fetch('/api/ai/chat')` 等潛在存取路徑。
- 找出是否有既有部署檔、GitHub Releases、打包產物或公開下載 URL；**不要自動刪除正式 Releases／已有顧客的公開資產**，先列出並要求確認下架範圍。
- 若 repo 為 Public，記錄原始碼已公開、現有歷史無法僅靠刪除工作樹檔案來撤回。評估轉 Private、移出商業關鍵 server-side prompts 並輪替已曝光的密鑰；不得擅自重寫 Git 歷史。
- 將舊本機 `dps_saved_projects_v1` 的資料匯出／匯入路徑保留到遷移驗收完成；不能刪除使用者的本機專案資料。

---

# 3. Phase 1 — 完全移除 Desktop、應用打包及本機 License（P0，必須完成）

這個 Phase 是**使用者明確決定要刪除**的功能，不是僅隱藏按鈕、切斷下載、隔離模式或改成管理員專用。

## 1.1 必須刪除的檔案與資料夾

先核對目前是否仍存在，然後移除所有已不再被其他功能需要的 Desktop-only 程式：

```text
electron/main.cjs
electron/preload.cjs
server/desktopMain.ts
server/desktopPackage.ts
server/desktopPackage.test.ts
scripts/buildDesktopExe.ts
scripts/postject.d.ts
src/components/views/SubscriptionDesktopView.tsx
src/utils/subscriptionLicense.ts
src/utils/subscriptionLicense.test.ts
```

- `electron/` 若只含上述 Desktop 程式，刪除資料夾。
- `scripts/` 若已無非 Desktop 工作，移除空目錄。
- `release/`、`build-desktop/`、`.desktop-cache/` 為本地或 CI 產物：在開發工作區清理，不追蹤；**不要掃描使用者個人硬碟或刪除其歷史已下載檔案**。
- `docs/` 中與 EXE 構建或人工授權有關的過時說明應刪除、改寫或明確標記 Historical Only；不要留下可誤導消費者的下載承諾。

## 1.2 修改 `package.json`、Lockfile 與 scripts

- 移除 `build:desktop` 指令。
- 移除僅為打包而存在的 `postject`；若 `esbuild` 是 Desktop-only 直接依賴且 Vite 不需要它作為顯式依賴，可移除，先以依賴檢查證明用途。
- 若有 `desktop:electron`、`package`、`release:win` 或其他隱藏／新加的 Desktop script，一併移除。
- 對應更新 `bun.lock`（或真正在用的 lockfile）。
- 保留正常的 `dev`、`start`、`build`、`lint`、`test` 及 Web production 啟動方式。
- 檢查 README、metadata、favicon、package description，避免仍宣稱提供 Desktop EXE。

## 1.3 修改 `server.ts`（精確要求）

- 刪除 `buildDesktopExecutable` 的 import。
- `createApiRouter` 不再接收 `includeDesktopPackager: true` 與 `onBuildDesktop`。
- 移除任何會下載 Node Windows Binary、執行 CLI、postject 或打包的 Web 啟動路徑。
- 保留 Express、Vite dev middleware、production dist、API 健康檢查與安全的 Web 啟動流程。
- Production 只能提供 Web frontend 與受保護的正常 API，不得能觸發任意程式打包。

## 1.4 修改 `server/apiRouter.ts`（最重要安全修復之一）

**必須將下列 API 從 Route Registration 中刪除，不是用 CSS 隱藏：**

```http
GET  /api/desktop/subscription
POST /api/desktop/subscription
GET  /api/desktop/info
POST /api/desktop/build
GET  /api/desktop/download
```

- 刪除 `readDesktopSubscription`、`writeDesktopSubscription`、`getDesktopPackageInfo`、`DesktopPackageInfo` 等 Desktop import。
- 刪除 `fs` 等僅供 Desktop Download 的依賴與 `ApiRouterOptions` 中的 Desktop 專屬欄位；`ApiRouterOptions` 若不再需要可合理簡化。
- 保留 `GET /api/market/research`、Reference Search / Retrieve / Verify、`POST /api/ai/chat` 等既有核心，並在下一 Phase 加上身份授權。
- 所有上述 Desktop 路徑在 Web Production 應返回無實際功能的 `404`（或明確的 `410`，以 API 設計為準），無檔案存取、無狀態改寫、無建置程序副作用。
- `GET /api/health` 不再宣告 `desktopPackagerAvailable`，而應反映 Web-only 服務狀態；不得暴露密鑰或內部路徑。

## 1.5 修改 `src/App.tsx`、導航、Header、輸出中心

- 移除 `SubscriptionDesktopView` import、`subscription_desktop` route、`loadSubscriptionState` / `saveSubscriptionState`、`AppSubscriptionState` 與同步 `/api/desktop/subscription` 的 useEffect。
- 刪除 `handleUpdateSubscription`、所有使用 `DPS1` License 決定付費的前端 state 與邏輯。
- 將 Sidebar 的「Desktop Subscription / Download EXE / License Issuer」項目刪除，改為 Web「Account & Billing」導覽（搭配 Phase 2）。
- 修改 `ExportCenterView.tsx`，移除 `AppSubscriptionState`、`evaluateSubscriptionStatus` 和 Desktop License Gate；保留真正的 QA Gate A/B/C，新增由後端提供的 Whop entitlement 判定（Phase 2／4）。
- 如 `src/components/views/SubscriptionDesktopView.tsx` 有已不屬於 Desktop 的一般產品資訊，僅抽取不涉及授權、下載或 Owner Issuer 的合法文案到新的 SaaS Billing View；不要移植 License Issuer。
- 若 UI 表示「永久離線」「下載 EXE」「無需訂閱即可使用完整程式」等文字，一律移除並修正。

## 1.6 刪除手動授權與本機試用真相來源

- 移除 `APP_LICENSE_PEPPER`、`computeKeySignatureHex`、`issueSubscriptionKey`、`verifySubscriptionKey`、`DPS1-*`、`IssuedSubscriptionRecord`、`manualPaymentInstructions`、本機 Trial 日期可編輯機制、手動 Owner 授權面板。
- **不要用另一組前端密碼、混淆或 localStorage token 取代**；這些都不是可靠的付費授權。
- 方案顯示從後端 Whop Entitlement 取得；售價由商家端配置／Whop Plan 決定，不從用戶能改的 project JSON 取得。
- 明確禁止 `enforceExportGate: false` 作為已付費的預設。若無可信的有效付費狀態，付費功能須 fail-closed。
- 不保留 Lifetime / Founder License 發證功能。未來若要一次性收費，仍由 Whop 的官方一次性方案與後端權限判定，而不是本機金鑰。

## 1.7 移除後驗收（必須用自動測試）

1. `rg` 全 repo 不應再發現可執行的 `buildDesktopExecutable`、`postject`、`SubscriptionDesktopView`、`DPS1-`、`/api/desktop/`、Electron 實作或 `.exe` 下载入口；歷史說明若保留，需註明非現行產品。
2. 執行 `npm run lint && npm test && npm run build` 全部成功。
3. GET/POST 上述 Desktop API 皆 404/410，不呼叫 filesystem、child process 或向外部下載 runtime。
4. 公開 UI 中無 Desktop Download、Create EXE、Issue Manual License、Founder Lifetime Offline 功能。
5. 原本 JSON 專案匯入／匯出、ebook ZIP、Markdown、Styled HTML、QA/來源驗證持續運作。

---

# 4. Phase 2 — Whop 登入、訂閱及 SaaS 商用權限（P0）

## 2.1 架構原則

單一流程：**訪客 → Whop Login/OAuth → 伺服器 session → Whop Membership 查核 → DPC Entitlement → 可授權 API → Project / AI / Export**。

Whop 負責 checkout、方案、付款與訂閱資料；DPC 負責使用者身份映射、產品權限、Quota、安全與資料。不要自己收集信用卡號、儲存卡片資訊或設計手動付款轉帳／發證機制。

## 2.2 官方文件查核（實作前即時驗證）

- <https://docs.whop.com/>
- <https://docs.whop.com/api-reference/plans/create-plan>
- Whop 官方 OAuth／App Authentication／Webhook／Membership／Entitlement／Checkout 文件：Coding Agent 需依當日文件定位最新章節與欄位。
- 若某官方流程要求 Whop App 嵌入環境，而本專案採 Standalone Web App，須選用官方支援的 **External SaaS / OAuth / Checkout** 合適方式，不可混用不相容的驗證碼或虛構方法。

**不得在本提示詞中假定具體 webhook event name、token endpoint、scope 或 Membership status 永遠不變。** 以實作當天官方 SDK/文件為準，必要時在 adapter 中集中映射、清楚測試。

## 2.3 伺服器端身份驗證

- 新增 `server/auth/*` 或合理結構的登入、OAuth callback、session、logout、`GET /api/me`。
- OAuth `state`、PKCE（官方流程適用時）、redirect allowlist、nonce（適用時）、CSRF 及 session 固定攻擊防護；只透過 HTTPS 及安全 HttpOnly、Secure、SameSite Cookie 保存應用 session。
- 綁定 Whop 穩定識別 ID 與本地 `users.id`；不可僅以 email 字串當付費身份或讓前端自行指定 Whop user ID。
- 登入不等於付費。訪客／免費試用只可使用後端允許的 Demo 權限。
- `GET /api/me/entitlements` 由可信 server 計算；回覆 plan、features、quota、expiry/status、最近核驗時間，**不回傳 Whop 密鑰**。

## 2.4 正確的訂閱同步與 Webhook

- 新增 `server/billing/whopClient.ts`、`webhooks.ts`、`entitlements.ts`、`planMapping.ts`（可依架構調整）。
- API/Webhook signing secret **僅存 server env**，驗證官方簽章與原始請求 body；嚴格限制 body 大小、防 replay，必要時確認 event timestamp。
- `whop_webhook_events` 保存唯一 event ID，以資料庫唯一索引與 transaction 保證重複投遞不重複賦權；失敗可安全重試。
- 購買、續費、取消、到期、退款、爭議、付款失敗等狀態，依官方**有效權限**語義核對；取消訂閱時是否仍可用至已付費期末由實際 entitlement 決定，不自行猜測。
- Webhook 僅是狀態變更來源之一；登入、敏感操作或快取過期時須用官方 Membership API 重新核對，避免漏事件造成永久權限。
- Whop 不可用／查證失敗時**不可默認升級付費**；依事先明確的短暫快取策略決策，對高風險操作採 fail-closed。
- 費率、商品、Plan ID、Company ID 作為 server-side config；沒有正式授權不得在 Whop 建立、刪除、定價或啟用方案。
- 對應的 UI：`Account`, `Current Plan`, `Upgrade`, `Manage Billing`, `Logout`，只顯示經驗證的狀態和可用的官方結帳/管理連結。

## 2.5 建議權限模型

```text
VISITOR       → 只能查看公開商品介紹／介紹性示範
FREE_DEMO     → 有限且低成本的功能、無商業 Buyer Bundle 匯出
PRO_MONTHLY   → 完整產品開發工作流程（仍受合理配額及 QA Gate 約束）
PRO_ANNUAL    → 與 PRO 相同，年付優惠
ADMIN         → 由 server 端獨立設定的營運權限，不是用戶自行建立的 License Issuer
```

- **目前售價不寫死在 UI**；前述 Desktop 預設 $29 / $249 / $499 只是舊程式示例，不等於 Whop 正式訂閱價格。
- 不在 v3 自行開啟 Lifetime 買斷，避免與「持續登入訂閱」的使用者決策衝突。
- 不同 tier 的功能與 quota 由 server 端 `authorizeFeature(user, action)` 同一處實作。

---

# 5. Phase 3 — PostgreSQL 多租戶雲端專案儲存與安全遷移（P0）

## 3.1 必要資料表（可合理合併）

- `users` / `auth_identities`（Whop user ID 對映）。
- `sessions`（若非外部託管 session storage）。
- `whop_memberships`、`entitlements`、`whop_webhook_events`、`billing_audit_logs`。
- `projects`（`id`, `owner_user_id`, `schema_version`, `title`, `status`, `revision`, `created_at`, `updated_at`）。
- `project_versions` / `project_snapshots`（必要時保留可復原版本）。
- `chapters`、`project_assets`／JSONB 欄位、`references`、`workflow_jobs`、`job_steps`／`job_events`（依性能合理設計）。
- `encrypted_ai_credentials` 或外部 Secret Vault 的 reference metadata（絕不明文放在 project JSON）。
- `usage_events`、`quota_counters`（以伺服器端使用紀錄為準）。

所有專案讀寫必須在後端驗證 `owner_user_id`，若使用 Supabase RLS 也要配置與測試。Service Role Key 只留在後端；跨用戶查詢、更新、複製、匯出都要 IDOR 測試。

## 3.2 建議 REST API

```http
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/duplicate
POST   /api/projects/import
GET    /api/projects/:id/export-backup
GET    /api/me
GET    /api/me/entitlements
```

- validate schema、body size、per-user quotas，支援 optimistic concurrency `revision` / `If-Match` 之類機制，避免多頁籤覆寫較新的內容。
- Autosave 需要 debounce／狀態顯示 `Saving / Saved / Error / Retry`；失敗時不得顯示已儲存。
- 含圖、長文或大型 base64 附件應存 Object Storage，非全部塞入 Cookie 或 localStorage。

## 3.3 保留既有資料並安全搬移

現有 `src/utils/projectStorage.ts` **已實作**多專案本機保存，不能說尚未做。需要新增遷移而非重複重建：

1. 登入後偵測 `dps_saved_projects_v1`、`dps_active_project_id_v1` 的存在。
2. 顯示「偵測到舊版本機專案，是否匯入雲端？」並先提供安全備份。
3. 舊專案資料通過 schema 驗證、深層 secrets 清洗、重複 project ID 檢查、ownership 指派後才匯入。
4. 明確通知成功數、失敗數、已重新命名項目、未搬移的敏感欄位；在成功驗證前**不清空** localStorage。
5. 支援未來直接匯入舊版 Backup JSON，不把 `subscriptionState`、`DPS1` License 或可偽造 trial 當作付費權限。
6. 保留原 UI 的切換／複製／刪除／備份功能；改接雲端 CRUD，並加入實際遠端回讀驗證。
7. 在雲端成為主要來源後，本機只可留非敏感 UI 偏好與短期快取；不能成為付款或專案所有權的權威資料。

---

# 6. Phase 4 — API Key、AI Proxy、Research、Export 安全修復（P0）

## 4.1 BYOK Security

**現有問題：** `src/services/aiService.ts` 把 `dpc_key_*` 放在 localStorage；`AISettingsView.tsx` 同時把 API Key 放入 `project.aiSettings`；`ExportCenterView.tsx` 使用原始 `JSON.stringify(project)`。既有 `sanitizeProjectForStorage` **只解決部分路徑**，不能視為全面完成。

- 刪除**永久明文 localStorage API Key 儲存**設計；選擇：A) server-side encrypted vault（建議正式 SaaS）、B) 永不儲存的短期記憶體 Key（可供測試，重整頁面即失效）。
- 若採 server vault：使用環境外密鑰／KMS 類機制管理 encryption key；使用加密與驗證、key rotation 策略；DB 不保存明文；不回傳完整 Key，只回傳 `configured: true` 與遮蔽末幾碼；提供更換／刪除 API。
- 新增 server-side key ownership 驗證；不能透過提供別人的 user ID 取得其 Key。
- 後端 `POST /api/ai/chat`、`/api/ai/connection/test`、模型清單與研究代理，需 session + entitlement、request validation、限速、模型/Token 上限、提供者 allowlist、費用／配額控制。
- 目前 `baseUrl` 可被使用者指定；必須限制允許的 HTTPS 端點／主機、阻擋 localhost、私網、metadata IP 與 redirect SSRF，最好正式版不接受不必要的自訂代理 endpoint。
- 不可在錯誤訊息或 log 回傳 Provider 原始 response 中可能含有的秘密；對外安全訊息、內部以 request ID 追蹤。
- 停用無明確授權的 `GEMINI_API_KEY` 站長付費模型 fallback；不要因用戶 BYOK 失敗而悄悄消耗平台的 Key。
- 真實用量使用供應商回傳 usage 與官方費率，區分 `actual / estimated / unknown`。目前以模型 ID 含 `flash` 即認定免費或固定費率估算，需移除錯誤假設。
- 每一個 project JSON／ZIP／HTML／Markdown／錯誤快照都不能包含 Key；使用正向 allowlist 的輸出 schema（優於只 regex 替換字符串）。

## 4.2 修復 Export：保留 ebook／產品 ZIP，封鎖繞過付費的 API

- 保留 `src/utils/learningBundle.ts`、`src/utils/styledBook.ts`、Markdown／HTML 編譯，以及 Author Review Bundle。
- 保留 Gate A/B/C 原有的來源證據審查，不允許付費就繞過品質審查，也不允許未通過 Gate C 偽裝 Buyer Ready。
- **Buyer commercial export 必須由伺服器端**驗證 session、付費權限、該 project ownership、Gate 狀態及必要來源證據；UI `disabled={...}` 不能算安全措施。
- 如目前 ZIP 由瀏覽器直接 `buildLearningBundle(project)` 產生，應建立可信後端匯出流程，將必須受保護的功能移到 server（或 server-authorized short-lived output flow）。不能只把付費 flag 傳給 browser，再讓 browser 控制所有敏感商業判定。
- Free Demo 允許什麼 preview / author-only 內容，須明確由產品規格與權限策略決定；試圖改 request body 為 Paid 必須失敗。
- `ExportCenterView.tsx` 中 `getContent: () => JSON.stringify(project, null, 2)` 必須改為使用中央 export sanitizer；也檢查 `buildLearningBundle`、MyProjects JSON、複製 project、資料庫序列化與 legacy migration。
- 區分「DPC 應用本身不可下載」與「用戶生成的 ebook 和工作表可以下載」；禁止發生誤刪使用者產出的商品檔案。

## 4.3 公開 Web API 一般防護

- 為 Market Research／Reference Search／Retrieve／Verify 設定登入／使用權限、輸入驗證、抓取配額、請求長度、 timeout 與 cache；不得因匿名流量造成高額成本。
- 繼續維持 `server/referenceResearch.ts` 的 SSRF 與來源限制。對接受 URL 的端點檢查 redirect、DNS rebinding、私有地址等已有限制是否完整。
- 加入合適的安全 headers、CSP、CORS allowlist、session cookie CSRF 防護、Audit Log 與必要時的速率限制。
- 對 `POST /api/ai/chat` 實作多用戶配額及昂貴模型選擇上限；切勿信任前端提供的 `maxTokens` 或消費紀錄。
- 不在公開 Vite assets 中暴露真正內部 Prompt、Whop 商業 secrets 或可重建商業價值的伺服器私有邏輯；前端載入的程式天然能被瀏覽器檢視。

---

# 7. Phase 5 — Workflow、Autopilot、品質與服務穩定性（P1）

## 5.1 不擅自消除原本有意保留的人工 Gate

根據 2026-11-11 commit，DPC 曾**刻意移除完全自動核准的 Autopilot**，目前 `AutomationSettingsView.tsx` 強制 `manual_review`。新的自動化必須尊重 **Gate A / B / C 的明確人工審核**，不能做成無證據直接發布。

- 先保留 Manual Review，重用既有 `workflowEngine.ts`、`gatePolicy.ts`、`Product Bible` 與來源引用規則。
- 增加 `Guided Automation` 與 `Generate Next Draft`／`Run until next approval gate`，自動生成章節與附加資源，但**不自動簽核 Gate A/B/C**。
- Full Autopilot 若未實作排程、續跑、錯誤重試、成本控制與人工審核，就不能在 UI 標記為可用或宣稱 fully autonomous。

## 5.2 工作佇列／檢查點

- 新增 durable `workflow_jobs`／`job_steps` 記錄，含 `queued / running / needs_review / completed / failed / cancelled` 狀態、關聯 user/project、step、checkpoint、retry_count、最後錯誤與費用。
- Worker 層按章節／參考文獻／資源分單位執行，避免 HTTP request timeout；失敗後重試要 idempotent，不能重複收費或覆蓋已核准內容。
- 實作 resume、cancel、progress polling 或 server events；若部署環境不支援長工作，使用真正的 Queue + Worker，不能靠前端 setTimeout 假裝背景排程。
- 重大變更（主題、受眾、Title、Charter）需透過 dependency invalidation，使需要重新確認的 Gate 成為 pending；不可修改已鎖定的核准內容。
- 任務完成只代表內容生成完畢，不代表事實、版權或外部來源已人工核實。

## 5.3 市場研究／引用與輸出回歸

- Market Research 必須區分真實 ranked bestsellers、平台推薦、搜尋熱度、賣家宣稱；資料不可得時顯示 unavailable，不自造收入、價格、排名。
- User 可一鍵由選題進入 13-field intake，重用已核准專案資料；Budget Family Meal Planning 只當 reference example。
- 長文需真實字數、章節連續性、引用編輯與 Product Bible；Output 不得將 outline、placeholder 視為完整 ebook。
- 檢查 `PricingLaunchView.tsx` 數據計算正確；保留使用者「自己販售數位商品」的價格與獲利試算，不與 DPC SaaS 訂閱混淆。

---

# 8. Phase 6 — Web-only UI、部署、CI、營運與發售準備（P1/P2）

1. 保留現有 EN／繁中、RWD、Dashboard、Sidebar、品牌視覺、Content Editor 與 Export Center。
2. 新增 `src/components/views/AccountBillingView.tsx`（或合理名稱）：Whop 登入狀態、目前方案、有效期限、用量、Upgrade、Manage Billing、Logout，不提供 License Issuer/EXE。
3. 保留 Demo 導覽，但所有可產生付費價值的功能必須有後端 entitlement。前端只負責 UX；真正驗證在 server。
4. 新增 `docs/whop-setup.md`、`docs/database-setup.md`、`docs/deployment.md`、`docs/security-model.md`、`docs/pricing-and-entitlements.md`、`docs/rollback.md`。
5. `.env.example` 改為 Web config placeholders，如 `APP_URL`、`NODE_ENV`、`DATABASE_URL`、`WHOP_*`、`SESSION_SECRET`、`CREDENTIAL_ENCRYPTION_KEY`、`WEBHOOK_SECRET`、`REDIS_URL`（若使用 Queue）。永遠不寫入真密鑰。
6. 不宣稱 `npm run preview` 就是受保護的正式 SaaS；正式部署需 Express server、HTTPS、秘密管理、DB、檔案儲存、必要 Queue/Worker。
7. 新增 CI：lint、test、build、secret scan、dependency audit（依適當策略）、endpoint permission tests、migration tests、Webhook mock tests、export sanitization tests。
8. 接入 staging Whop + test membership 流程；真實商家 KYC、台灣銀行提領、手續費、退款、法律與稅務條款在商業上線前需人工確認。
9. 針對 Public Repository：公開網頁仍可被瀏覽器檢視，**無法保證所有前端程式永不被複製**。真正防止未訂閱而使用服務，靠的是不提供完整服務端原始碼／可部署 bundle，以及後端 session、ownership、entitlement、API 限速與密鑰隔離。評估改 Private，但不能承諾能撤回已公開歷史。
10. 不建立任何對客戶分發 DPC 全套應用的路由、EXE、ZIP、source bundle、installer、離線專業授權機制。開發者自己使用的 source repository / staging artifact 不等於可公開販售的程式下載商品，但不可公開無授權連結。

---

# 9. 必須逐項實作的檔案操作清單

| 路徑 | 動作 | 驗收重點 |
|---|---|---|
| `server.ts` | 修改 | 移除 desktop builder callback；保持 Web production 可啟動 |
| `server/apiRouter.ts` | 修改 | 完全移除 `/desktop/*`；AI/Research 接上受保護的路由 |
| `server/desktopMain.ts` | **刪除** | 不再有 Node SEA 本機 host |
| `server/desktopPackage.ts` | **刪除** | 不再儲存／讀取 `subscription.json` |
| `server/desktopPackage.test.ts` | **刪除** | 以 Web-only 404/security tests 取代 |
| `scripts/buildDesktopExe.ts` | **刪除** | 無 EXE 建構腳本 |
| `scripts/postject.d.ts` | **刪除** | 無 postject declarations |
| `electron/main.cjs`、`electron/preload.cjs` | **刪除** | 無 Electron 殼層 |
| `src/components/views/SubscriptionDesktopView.tsx` | **刪除** | 無封裝、License Issuer 與人工支付介面 |
| `src/utils/subscriptionLicense.ts` / `.test.ts` | **刪除／替換** | 無可自行簽發的本機付費金鑰 |
| `package.json`、`bun.lock` | 修改 | 移除 build:desktop、postject、僅 Desktop 的依賴 |
| `src/App.tsx` | 修改 | 雲端專案、Whop session、Server entitlements；無 Desktop state |
| `src/components/Sidebar.tsx`、`src/components/Header.tsx`、`src/utils/i18n.ts` | 修改 | 用 Account & Billing 取代 Desktop 授權項目 |
| `src/components/views/ExportCenterView.tsx` | 修改 | Buyer ZIP 後端授權；`JSON.stringify(project)` 清理；保留商品匯出 |
| `src/utils/projectStorage.ts` | 改造 | 提供可遷移的 Legacy Storage Adapter；雲端作為主要資料庫 |
| `src/components/views/MyProjectsView.tsx` | 改造 | 安全的使用者雲端專案 CRUD，舊 JSON import 保留 |
| `src/services/aiService.ts` | 修改 | 不用 localStorage 長期存 Key；受權限保護的 AI 代理 |
| `src/components/views/AISettingsView.tsx` | 修改 | Key 設定安全隔離，不進 Project Backup |
| `src/components/views/AutomationSettingsView.tsx` | 改造 | 實際可用的 Guided Job／Approval Gate 設定 |
| `src/components/views/PricingLaunchView.tsx` | **保留** | 仍為使用者數位商品定價，非 DPC 訂閱定價 |
| `src/utils/learningBundle.ts` / `styledBook.ts` / `markdownCompiler.ts` | **保留及強化** | 使用者生成的商品 ZIP／HTML／Markdown 持續可用 |
| `src/utils/gatePolicy.ts` / `sourceEvidence.ts` | **保留及強化** | 品質審核不得被付費授權繞過 |
| `src/components/views/AccountBillingView.tsx` | 新增 | 顯示 Whop 方案／管理訂閱；無手動授權 |
| `server/auth/*` | 新增 | OAuth/session/auth middleware |
| `server/billing/*` | 新增 | Whop adapter、webhooks、entitlement reconciliation |
| `server/projects/*` | 新增 | authenticated CRUD、import、ownership、revisions |
| `server/ai/*` | 新增／重構 | Key vault／provider proxy／quotas／cost controls |
| `server/jobs/*` | 新增 | Durable job orchestration、resume/retry/cancel |
| `db/migrations/*`（或選定框架路徑） | 新增 | users/memberships/projects/jobs/keys/tables、RLS 或等效 ownership |
| `tests/`、`server/*.test.ts` | 新增／更新 | 回歸、支付、隱私、授權、資料隔離、Desktop deletion |
| `public/assets/aistudio/*.md` | 審核並視情況移動 | 不公開商業機密 Prompt 或秘密 |
| `.env.example`、`.gitignore`、`docs/*` | 更新 | Web-only 環境與資料安全文檔，沒有 EXE 商業承諾 |

**重要：** 表中列為刪除的檔案只要在最新 HEAD 仍存在，就應實際執行 Git delete；不是僅增加 comment、disable flag 或隱藏 UI。表中列為保留的核心 Product Studio 功能，不得因移除 Desktop 被一併刪掉。

---

# 10. 完整驗收測試矩陣（禁止只靠人工點擊）

## A — 無桌面封裝／無軟體外洩面

- **A01** 無 `build:desktop`／`electron`／`postject`／`server/desktop*`／EXE download，且 `npm run build` 僅建立 Web Client 資產。
- **A02** 所有歷史 `GET/POST /api/desktop/*` 返回 404/410；沒有 build、寫檔、下載 runtime 或暴露 license 的 side effects。
- **A03** Sidebar、Account、Billing、Export Center 不存在 downloadable DPC EXE／源碼 bundle／Owner License Issuer。
- **A04** 正常 Buyer Learning Bundle ZIP 仍能依照權限和 Gate 生成；不得因 A01 誤刪用戶作品輸出。
- **A05** Public build 中不存在 `APP_LICENSE_PEPPER`、`DPS1-`、Whop secret 或完整 API Key。

## B — 真正的身分與付費

- **B01** 未登入無法呼叫個人 Projects、AI、商用 Export。
- **B02** Whop OAuth state/redirect/session 安全；假 token、冒名 user ID、CSRF 攻擊皆拒絕。
- **B03** 未付費或已失效會員即使修改前端 state、localStorage、Project JSON 或 API payload，仍無法取得付費能力。
- **B04** Webhook 簽章錯誤拒絕；重送事件不重複授權、不同順序事件正確 reconcile。
- **B05** 訂閱取消、到期、退款與付款失敗依官方 entitlement 反映；不能只看「取消」就錯誤剝奪已付款到期日前權利。
- **B06** 缺少 Whop secret 的 staging 可以 mock，production config 不完整必須 fail closed。

## C — 用戶資料與 API Key

- **C01** A、B 兩個帳號無法讀、寫、複製、刪除或匯出對方專案（IDOR）。
- **C02** 重新整理瀏覽器、換裝置、跨 session 登入，已完成雲端專案能正確回復。
- **C03** 多頁籤同時編輯有 revision 衝突保護；離線／超時不會假顯示 Saved。
- **C04** 舊版 `dps_saved_projects_v1` 可經使用者同意匯入；導入後完整、可回讀；不搬移舊 License 當作付費權限。
- **C05** 所有 JSON/ZIP/HTML/Markdown/export/API/log 不含完整 `sk-` 類、Gemini 類 Key、Webhooks secret、session 或可信其他金鑰。用測試 canary 注入檢查。
- **C06** BYOK 更新、刪除、解密、AI provider proxy 均由正確 user 授權；密鑰在 DB at rest 加密，HTTP only over TLS。
- **C07** 自訂 provider URL 不可打到 localhost、RFC1918、cloud metadata 或跳轉到私網；已有 Reference SSRF 保護不可倒退。
- **C08** 無授權時不可觸發服務商自有付費 Gemini fallback；使用量未知時不得填入假費率。

## D — 原有核心產品品質及 AI 流程

- **D01** 13 Field Intake 仍維持原順序與內容要求。
- **D02** 市場真實排名與普通搜尋資料有證據標示；外部失敗不造假。
- **D03** Gate A/B/C 需要原本的來源核實、人工批准；不能被 paid plan 或 Autopilot 自動簽過。
- **D04** 書籍真正產出有完整章節／資源與字數；輸出沒有假 placeholder。
- **D05** Guided Generation 的 Job 能夠中斷、重試、續跑與取消，不覆寫人類已核准內容；缺少 durable queue 的版本明示 `BLOCKED`。
- **D06** `PricingLaunchView` 為用戶產品定價，與 SaaS Whop Plan UI 分離。
- **D07** 測試、TypeScript 型別檢查與 Vite production build 均成功；不刪除 failing tests 來掩蓋問題。

## 最少必跑命令

```bash
npm run lint
npm test
npm run build
rg -n "build:desktop|postject|buildDesktopExecutable|SubscriptionDesktopView|DPS1-|/api/desktop/|electron" --glob '!bun.lock' --glob '!docs/web-saas-*' .
```

最後一個 `rg` 若出現項目，逐一判斷是否是**仍可執行的程式碼**、不該公開的歷史文案，或僅是移除審計紀錄；不要因為審計文件提到「已移除」就錯誤宣告測試失敗。另需以 HTTP integration tests 實際確認端點不存在。

---

# 11. 交付物與報告格式（每一 Phase 後執行）

每個 Phase 須回覆：

```text
Phase：
Base commit / Working branch / Resulting commit：
Files CREATED / MODIFIED / DELETED：
已實際修復的問題（含檔案與行號）：
執行的測試命令、退出碼、pass/fail 數與關鍵證據：
尚未完成的外部整合：
安全／資料遷移回退方案：
Status: DONE | PARTIAL | BLOCKED | ALREADY_FIXED | REMOVED
```

結案必須交付：

1. 可審查的分支與 commit SHA；若環境不允許 push，只需給 patch/diff 與明確路徑，不虛構 PR。
2. Desktop/EXE/License **已刪除清單及端點拒絕測試**。
3. SaaS Auth / Whop Billing / Entitlement / Multi-tenant storage / BYOK / Jobs / Export 測試證據。
4. Migration SQL、示例環境變數、最小部署文件、回退步驟、Whop Sandbox 操作手冊。
5. Test Report、Security Audit、已知風險與 P0/P1 遺留問題。
6. 目前是否真的可商用的明確結論：必須通過付款、身份、資料隔離、安全輸出與部署 smoke tests 才能標示 `LAUNCH READY`；否則 `STAGING READY` 或 `NOT READY`。

---

# 12. 最終執行命令 — 供 Agent 直接使用

**現在就開始實作，不要只產出建議、TODO 或抽象規劃。** Clone 或打開 `https://github.com/minzechen1511-ops/DPC.git`，核對 HEAD 與 `be803135f38b9b774ac9d14f6c4c2fc36f53425b` 差異，建立 feature branch，跑 Baseline；先完整執行 **Phase 1「移除所有 Desktop / EXE 打包、下載、本機手動訂閱與 License Issuer」**，再按 Phase 2–6 實作 Whop + Web SaaS。

**不要要求我替各階段再撰寫 Prompt。** 逐檔案修改程式、實作測試、修復錯誤並提交可審查的小型 commits；每個階段保留已有工作成果。不要為了轉型而重寫 DPC 主要創作流程，也不要刪除用戶產出的 ebook ZIP／Markdown／HTML。

**核心安全目標：沒有有效後端驗證的訂閱，不可取得付費 SaaS 功能；使用者也不再能透過 DPC 商業介面下載完整程式封裝。** 同時理解：瀏覽器前端資產本來可被檢視，不能以「只移除下載按鈕」當成完整防盜措施；真正有商業價值的付費運算與私有資料須留在受保護的後端。

缺少 Whop / DB / 雲端部署憑證時，完成無秘密的本地／sandbox 實作和可執行測試，將實際受阻項目明確列為 BLOCKED；禁止假稱正式串接或付款已完成。禁止擅自上架、直接部署 production、合併 main、刪除正式資料或改動商家付款設定。

---

**End of Master Implementation Prompt v3.0 — Web Only / No Desktop Packaging**
