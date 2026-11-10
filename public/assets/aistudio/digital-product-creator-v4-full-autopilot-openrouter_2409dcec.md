# DIGITAL PRODUCT CREATOR 2.0
# V4.0 — FULL AUTOPILOT & OPENROUTER EDITION

版本：4.0
制定日期：2026-11-10
文件語言：繁體中文
應用程式介面：繁體中文為預設，可切換英文
數位產品語言：依專案目標市場個別指定
適用開發環境：Gemini Canvas 原型、獨立 Web App、其他支援應用程式開發的 AI 工具

本文件為完整且獨立的應用程式開發需求、資料架構、AI 工作流程、工具整合、提示詞、測試條件及驗收標準。

## 0. 最高優先指令

你是資深全端工程師、AI 工作流程架構師、市場研究分析師、數位產品策略師、教學設計師、長篇內容編輯、研究品質稽核員及 UI/UX 設計師。

請以本文件建立真正可操作的 Digital Product Creator 2.0 應用程式。

不要只產生靜態畫面、展示性儀表板或假資料。

應用程式核心理念：

**系統主動研究、提出選項、執行工作；使用者負責選擇與必要審核。**

使用者不得被迫反覆手動撰寫階段性提示詞。

每次開啟新專案，系統應依照最新可取得的市場資料，主動研究可能具有商業機會的題材，產生推薦選項，並在使用者選擇之後完成研究、企劃、製作、檢查及匯出。

要求整合 OpenRouter API，讓使用者能安全地輸入或更換自己的 API Key，查看可用免費模型，選擇模型，設定各階段預設模型及備援模型，並監測用量。

所有研究、AI 生成、儲存、檔案匯出及 API 動作必須對應實際功能，不得使用假結果宣稱完成。

若執行環境無法支援某項功能，應明確顯示需要的整合方式及尚未完成的項目。

---

# 1. 產品願景

## 1.1 應用程式名稱

Digital Product Creator 2.0

副標題：
AI-Powered Digital Product Research, Creation & Launch Factory

## 1.2 主要目標

讓使用者可以完成以下工作：

1. 建立新專案。
2. 自動研究各大數位商品銷售平台。
3. 找出目前熱門或有潛力的數位產品題材。
4. 比較市場需求、競爭、定價與差異化機會。
5. 選擇其中一個 AI 推薦的產品題材。
6. 自動生成完整的 13 個專案描述欄位。
7. 自動完成 UVZ 與客戶轉變地圖。
8. 自動搜尋、驗證、摘要約 20 個相關研究來源。
9. 自動建立 Transformative Product Charter。
10. 自動建立章節與產品架構。
11. 自動生成長篇 ebook 或其他類型數位產品。
12. 自動生成工作簿、模板、追蹤表、檢查清單。
13. 自動完成品質初審與修訂。
14. 自動完成品牌化排版與產品組裝。
15. 自動產生價格建議、銷售頁與行銷內容。
16. 匯出可實際使用的檔案。
17. 儲存並重開專案。
18. 不需要重新輸入先前已核准的資料。

## 1.3 主要使用原則

採用 Selection-Driven Autopilot：

- 系統自動分析。
- 系統自動建立選項。
- 系統自動提供推薦。
- 系統預先選取最優建議。
- 使用者點擊核准或更改選項。
- 系統執行後續流程。

除非缺少無法推定的必要資料，否則不要求使用者自行撰寫文字。

## 1.4 不實現或不保證的事項

不可宣稱：
- 已複製 Synthesise AI 的私人原始碼或演算法。
- 每個平台都有公開真實銷量統計。
- AI 自動產生的產品一定賣得出去。
- 免費 API 沒有請求限制。
- 模型切換可以合法消除帳號配額。
- AI 產生的食譜已經實際烹調測試。
- 所有市場、法律、健康或金融數據都不需要驗證。
- 未執行的匯出功能已經產生檔案。

---

# 2. 整體自動化工作流程

## 2.1 主流程

```text
啟動應用程式
    ↓
載入使用者偏好與 API 設定
    ↓
建立新專案
    ↓
AI 自動調查最新市場趨勢與暢銷商品
    ↓
AI 產生 5–10 個候選題材及分析
    ↓
使用者選擇題材（必要決策）
    ↓
系統啟動兩個工作分支
    ├── 自動產生 13 個專案輸入欄位
    └── 自動蒐集與處理約 20 個研究來源
    ↓
AI 自動完成 UVZ
    ↓
AI 自動完成 Visceral Transformation Map
    ↓
整合與審核研究來源
    ↓
AI 產生 Product Charter
    ↓
AI 產生 2–3 個產品結構選項
    ↓
使用者選擇架構（可使用預設推薦）
    ↓
AI 自動逐章生成完整內容
    ↓
AI 自動生成補充工具與素材
    ↓
AI 自動品質審查與局部修正
    ↓
使用者檢查重大問題及出版風險
    ↓
AI 自動產生設計、定價、銷售資料
    ↓
組裝與輸出產品包
    ↓
專案儲存、可複製與再利用
```

## 2.2 自動化等級

每個階段支援：

- AUTO：自動執行。
- SUGGEST：自動產生選項，等待選擇。
- APPROVAL：需要使用者核准。
- MANUAL_OVERRIDE：使用者主動修改。
- BLOCKED：因工具、資料、配額或安全限制暫停。

預設：
- 市場研究：AUTO。
- 題材選擇：SUGGEST。
- 13 個欄位：AUTO。
- UVZ：AUTO。
- Transformation Map：AUTO。
- 參考來源：AUTO。
- Product Charter：AUTO。
- 產品架構：SUGGEST。
- 章節撰寫：AUTO。
- 工作簿：AUTO。
- 品質檢查：AUTO。
- 重大問題審核：APPROVAL。
- 品牌設計：AUTO。
- 價格研究：AUTO。
- 上架或付費操作：APPROVAL。
- 匯出：AUTO 或使用者按下匯出。

## 2.3 最少人工作業

理想新專案流程僅要求：

1. 點擊「建立新產品」。
2. 從市場研究結果選擇題材。
3. 核准 AI 推薦的產品定位與架構。
4. 檢查重大品質問題。
5. 點擊「下載完整產品」。

其餘採用自動化預設。

以上是使用體驗目標，實際執行仍受 API、可取得資料和運算環境限制。

---

# 3. UI 與首頁設計

## 3.1 主要頁面

左側導覽列：

1. Dashboard
2. New Project
3. Market Intelligence
4. Topic Recommendations
5. Project Brief — 13 Fields
6. Unique Value Zone
7. Transformation Map
8. Auto Reference Library
9. Product Charter
10. Outline Builder
11. Content Studio
12. Workbook & Resource Studio
13. Quality Assurance
14. Brand & Design Studio
15. Pricing & Launch
16. Export Center
17. My Projects
18. AI Model & API Settings
19. Automation Settings

## 3.2 Dashboard

顯示：
- 專案名稱。
- 產品類型。
- 產品主題。
- 目標顧客。
- 進度百分比。
- 目前階段。
- 研究來源數量。
- 已生成章節與總字數。
- 品質審查狀態。
- API 連線狀態。
- 目前使用模型。
- 已用請求數與預估成本。
- 最近儲存時間。

主要按鈕：
- 一鍵研究市場。
- 新建數位產品。
- 開始全自動製作。
- 繼續製作。
- 更換 AI 模型。
- 下載產品。

## 3.3 每階段的統一介面

每個階段都顯示：
- 階段目標。
- AI 分析結果。
- 推薦選項。
- 推薦理由。
- 資料可信度。
- 目前使用模型。
- 預估所需操作次數。
- 目前進度。
- 自動採用推薦選項。
- 手動改選。
- 重新分析。
- 核准並繼續。

使用者不需開啟另一個聊天視窗輸入新的提示詞。

---

# 4. 自動化市場研究與熱門題材推薦系統

## 4.1 模組名稱

MTRE — Market Trend & Recommendation Engine

這是每個新專案的預設起點。

不得要求使用者先自行決定題材。

## 4.2 研究平台

優先研究：
- Amazon Kindle / Kindle Store。
- Apple Books。
- Google Play Books。
- Kobo。
- Barnes & Noble。
- Gumroad。
- Payhip。
- Etsy（須檢查商品上架政策）。
- 其他有適當授權、可取得資料的平台。

可使用合法且可取得的：
- 官方暢銷排行榜。
- 官方分類頁面。
- 官方 API。
- 公開商品頁。
- 搜尋趨勢資料。
- 授權第三方市場分析資料。
- 可引用的消費者評價及需求研究。

不得假設每個平台都公開完整真實成交量。

不得繞過平台登入、付費牆、robots 規則、反爬蟲限制或服務條款。

當無法取得資料時應顯示：
- 無可用官方 API。
- 僅公開排名。
- 僅搜尋結果。
- 僅商品價格。
- 無可驗證銷量資料。

## 4.3 自動研究設定

使用者可以選擇：

市場：
- 美國（預設）。
- 英國。
- 加拿大。
- 澳洲。
- 台灣。
- 全球英文市場。
- 自訂。

語言：
- English。
- 繁體中文。
- 其他。

產品類型：
- Ebook + Toolkit（預設）。
- Ebook。
- Workbook。
- Template Bundle。
- Mini-Course。
- Challenge。
- Lead Magnet。
- All Products。

題材策略：
- 平衡型（預設）。
- 高需求。
- 低競爭。
- 長青。
- 新興趨勢。
- 高單價。
- 易製作。
- 可搭配模板。

一般使用者不須先修改這些設定。

## 4.4 趨勢資料時間窗

若資料可取得，分析：
- 最近 7 天。
- 最近 30 天。
- 最近 90 天。
- 最近 12 個月。

當缺少歷史快照時，不得虛構成長率。

可以建立應用程式自己的資料快照資料庫，從實際收集日期起計算未來變化。

顯示：
- 排名變動。
- 出現頻率。
- 價格變化。
- 可核對的評價變化。
- 類別熱度。
- 日期及資料來源。

## 4.5 商品資料模型

每筆市場商品至少包含：

- marketplace。
- productTitle。
- sellerOrAuthor。
- category。
- productType。
- currentPrice。
- currency。
- observedRank。
- rankScope。
- reviewCount（僅實際可取得）。
- rating（僅實際可取得）。
- productURL。
- observedAt。
- sourceType。
- evidenceLevel。
- verifiedSalesVolume（可為 null）。
- historicalSnapshots。
- limitations。

不得以評價數直接當作成交件數。

## 4.6 熱門題材分群

將商品分類至：
- 主題。
- 子題材。
- 使用者族群。
- 解決問題。
- 產品格式。
- 價格區間。
- 功能與附加資源。

使用 AI 產生語意分群後，由程式驗證是否有實際來源支持。

## 4.7 題材評分

預設權重：
- 需求訊號 25%。
- 問題迫切性 15%。
- 競爭可切入性 15%。
- 可差異化程度 15%。
- 內容可信製作能力 10%。
- 目標顧客可接觸性 10%。
- 數位產品適配性 5%。
- 製作成本與風險 5%。

總分使用 0–100。

此分數是決策啟發式模型，不是真實暢銷機率。

各平台的不同排名與評價資料必須先分別標準化，再進行跨平台比較；資料不足時降低信心，不得產生虛假的精確統計。

## 4.8 自動推薦

每次產生 5–10 個題材。

每個題材顯示：
- 建議名稱。
- 對應的商品例子。
- 主要客群。
- 市場訊號。
- 購買痛點。
- 差異化空間。
- 可交付的產品內容。
- 競爭強度。
- 參考售價區間。
- 建議試售價格。
- 預估製作複雜度。
- 主要風險。
- AI 推薦分數。
- 信心等級。
- 推薦理由。
- 資料來源及日期。

提供三類優先推薦：
1. 最平衡的選項。
2. 最容易開始製作的選項。
3. 具有差異化潛力的選項。

## 4.9 使用者選擇

每張題材卡片提供：
- 選擇此題材。
- 比較細節。
- 產生不同定位。
- 加入收藏。
- 排除類似題材。

預設將最高推薦分的題材標示為推薦選項，但除非使用者已啟用自動選題授權，否則仍須核准。

## 4.10 市場研究失敗時

不得自動編造平台暢銷排名。

顯示來源失敗原因，並使用已取得的資料生成「部分驗證的候選題材」。

如使用者同意，可改用長青題材模式；此時清楚標記為非最新市場排行榜研究。

---

# 5. 專案建立與 13 欄位全自動生成

## 5.1 功能目標

選定題材後，自動生成 13 項專案欄位。

不應要求使用者逐一手動輸入。

## 5.2 13 個欄位

1. Project name。
2. Creator or business name。
3. Experience level。
4. Years or nature of relevant experience。
5. Expertise and professional skills。
6. Interests and passions。
7. Target audience。
8. Problems you can solve。
9. Existing product idea。
10. Desired transformation。
11. Brand style and voice。
12. Constraints and topics to exclude。
13. Recommended digital product price。

## 5.3 自動資料來源

優先使用：
1. 本次專案已選題材。
2. 使用者已儲存的偏好。
3. 已提供的真實經歷。
4. 市場研究結果。
5. 題材相關研究資料。
6. 合理但清楚標註的預設假設。

不得捏造使用者的職業、證照或年資。

## 5.4 欄位產生標準

每欄應包含實際可用描述，不是單一關鍵字。

Brand Style and Voice 應包含：
- 品牌人格。
- 色彩與 HEX。
- 版面方向。
- 字體類型。
- 圖像風格。
- 寫作語氣。
- 主要情緒訊息。
- 禁止風格。

Constraints and Topics to Exclude 應包含：
- 產品範圍。
- 品質要求。
- 內容風險。
- 需要檢查的事實。
- 不能宣稱的效果。
- 法律、版權、安全事項。
- 不適合的主題。

價格應包含：
- 一般價格。
- 上市測試價格。
- 進階方案價格。
- 可驗證的市場比較。
- 定價理由。
- 驗證方法。

## 5.5 UI

顯示 13 張自動生成卡片。

提供：
- 全部核准。
- 單欄重寫。
- 單欄編輯。
- 自動優化。
- 儲存為偏好模板。

預設「全部採用 AI 建議」，除非使用者改選。

---

# 6. 全自動 20 個參考來源引擎

## 6.1 名稱

ARCE — Automatic Reference Collection Engine

## 6.2 觸發時機

一旦題材獲核准：

`TOPIC_APPROVED -> START_REFERENCE_COLLECTION`

資料收集可以與 13 欄位產生、UVZ 分析同時啟動，但必須在需要來源證據的完整產品寫作前通過研究品質門檻。

## 6.3 預設來源數量

- 快速：8。
- 標準：20（預設）。
- 深度：30。

此數字是目標，不是虛構補足的配額。

## 6.4 全自動步驟

1. 分析選定的產品題材。
2. 建立 5–8 個研究主軸。
3. 為每個研究主軸產生搜尋查詢。
4. 搜尋約 40–60 個候選來源。
5. 正規化網址與文件身分。
6. 移除重複來源。
7. 透過實際工具取得網頁、PDF 或文件內容。
8. 評估權威性、相關性、時效性及證據品質。
9. 選擇涵蓋面合理的來源。
10. 為每個來源生成研究卡片。
11. 驗證卡片中的事實是否受到來源支持。
12. 建立引用與章節對應。
13. 儲存來源資訊與內容。
14. 自動尋找替代來源補足研究缺口。
15. 輸出 Reference Library。

## 6.5 來源品質評分

建議權重：
- 出版與作者可信度：25。
- 主題相關性：25。
- 內容證據清晰度：20。
- 時效性：10。
- 可完整取得程度：10。
- 實用性：10。

低於品質門檻的候選應排除或要求檢查。

不同領域應有不同門檻，例如醫療、食安與法律更應優先使用原始權威來源。

## 6.6 七部分研究卡

每個驗證過的來源，必須建立：

### A. Title
來源的正確名稱與可讀的主題標題。

### B. Description
來源介紹及其對本數位產品的價值。

### C. Content Outline
來源真正涵蓋的核心議題與段落大綱。

### D. Practical Framework
將來源支持的概念轉換為可操作的原創框架。

必須標記為「編輯性整理」，不得假稱原作者提出該框架。

### E. Research Summary
原創改寫、忠於來源、保留限制條件的研究摘要。

### F. Editorial Notes
建議放入的章節、工作表、實作活動、引用位置、風險與待驗證事項。

### G. Brand Guidelines
將研究內容轉換為本專案的寫作語氣、圖像建議、呈現風格與讀者理解方式。

另外儲存：
- Source ID。
- 真正來源標題。
- 作者與出版者。
- 原始 URL。
- 來源日期。
- 取得日期。
- 擷取狀態。
- 可信度分數。
- 已確認的事實主張。
- 必要引用資訊。
- 相關章節 ID。
- 再確認需求。
- 著作權與利用限制。

## 6.7 來源取得狀態

只允許：
- VERIFIED_FULL_TEXT。
- VERIFIED_PARTIAL_TEXT。
- METADATA_ONLY。
- RETRIEVAL_BLOCKED。
- NOT_FOUND。
- REJECTED_DUPLICATE。
- REJECTED_LOW_QUALITY。
- NEEDS_REVIEW。

不能取得內文的來源不得標記成全文驗證。

## 6.8 自動補缺與替換

若來源不足 20 個：
- 依缺少的研究主軸重新搜尋。
- 提高搜尋多樣性。
- 尋找同等可信的替代來源。
- 設定合理最大重試次數。
- 最後顯示實際驗證數量。

不得虛構來源。

## 6.9 參考內容可攜性

研究卡需儲存在專案資料庫中。

後續 AI 不需要每次重新讀取全部原始網站，可先使用卡片與引文索引。

對即時數字、高風險主張或內容爭議，再使用原始來源重新驗證。

可以匯出：
- Reference Library.md。
- references.json。
- source-index.csv。
- chapter-reference-map.json。

---

# 7. Unique Value Zone 全自動化

系統自動分析：
- 使用者真實技能或已知興趣。
- 客戶重要痛點。
- 解決問題的需求。
- 差異化空間。
- 市場替代方案。
- 製作與交付可行性。

產生三個主要產品定位方案。

每個方案包含：
- 受眾。
- 痛點。
- 轉變承諾。
- 產品形式。
- 差異化。
- 優點。
- 風險。
- 定價假設。
- 推薦分數。

預設選取最佳方案供使用者核准。

若沒有真實個人專長，不得將 AI 生產能力當作已具備特定領域的專業資格。

---

# 8. Visceral Transformation Map 全自動化

自動產生：

## BEFORE
- 顧客原有問題。
- 主要焦慮與不便。
- 現有替代方案的不足。
- 時間、金錢或精力負擔。

## BRIDGE
- 核心步驟。
- 方法。
- 教學資源。
- 任務。
- 里程碑。
- 解決常見阻礙的方法。

## AFTER
- 可實際達成的改善。
- 新能力。
- 已完成的具體任務。
- 可檢查的進度指標。

另產生：
- 三個產品標題。
- 三個副標題。
- 核心產品承諾。
- 獨特賣點。
- 初步定價。

用選項卡呈現，預設最佳推薦。

---

# 9. Product Charter 全自動化

整合：
- 題材。
- 市場研究。
- 13 個欄位。
- UVZ。
- Transformation Map。
- Reference Library。

自動產生：
1. 最終標題。
2. 副標題。
3. 目標顧客。
4. 主要問題。
5. 產品承諾。
6. 不保證事項。
7. 轉變框架。
8. 交付形式。
9. 內容深度。
10. 學習目標。
11. 章節方向。
12. 工作簿需求。
13. 目標長度。
14. 品牌設定。
15. 定價定位。
16. 證據標準。
17. 品質驗收條件。

允許自動採用或編輯。

核准版本為後續內容生成的權威專案設定。

---

# 10. Outline Builder 全自動化

依產品類型自動建立架構。

Ebook：
- 前言。
- 章節。
- 子章節。
- 實例。
- 練習。
- 檢查清單。
- 結論。
- 參考資料。

Course：
- 模組。
- 課程。
- 學習目標。
- 講稿。
- 投影片。
- 作業。
- 資源。

Workbook：
- 使用方式。
- 工作頁。
- 範例。
- 進度追蹤。
- 回顧。

Challenge：
- 每日或每週任務。
- 達成標準。
- 進度表。

每章包含：
- Chapter ID。
- 標題。
- 學習目標。
- 子主題。
- 目標字數。
- 引用資料。
- 實例需求。
- 練習。
- 交付成果。

系統產生 2–3 個架構選項。

使用者可選擇：
- 簡潔實用版。
- 深度完整版。
- 工具套件導向版。

預設推薦最適合目標客群的一版。

---

# 11. 完整內容生成與長文管理

## 11.1 原則

真正生成完整章節，不得將大綱當作完成品。

## 11.2 生成程序

對每章：
1. 取得專案資料。
2. 取得已核准的 Charter。
3. 取得指定章節大綱。
4. 搜尋相關參考研究卡。
5. 取得 Product Bible。
6. 取得前面章節的摘要。
7. 呼叫指定模型生成內容。
8. 檢查章節完整性。
9. 查核重要事實與引用。
10. 儲存草稿。
11. 更新統計與連貫性記錄。
12. 自動繼續下一章。

## 11.3 長度選項

- Short：3,000–7,000 words。
- Standard：8,000–20,000 words。
- Extended：20,000–40,000 words。
- Custom：自訂。

目標字數不代表 API 單次呼叫一定能完成。

依章節逐段生成，必要時每章分區塊生成。

## 11.4 Product Bible

維護：
- 主題與受眾。
- 核心承諾。
- 關鍵術語。
- 品牌語氣。
- 已介紹的概念。
- 已使用案例。
- 已安排練習。
- 研究來源。
- 尚待驗證主張。
- 下一章提示。

## 11.5 模型更換不中斷專案

不同章節可以使用不同模型。

所有已核准的上下文以結構化資料傳給新模型，而不是依賴舊模型的隱含記憶。

每章儲存：
- Model ID。
- Provider。
- Prompt template version。
- Completion timestamp。
- Usage。
- Content checksum。
- Quality status。

## 11.6 可用操作

- Generate All。
- Continue。
- Pause。
- Retry。
- Rewrite Section。
- Expand。
- Simplify。
- Add Examples。
- Add Worksheet。
- Lock。
- Approve。

---

# 12. Workbook 與 Bonus Resources 自動生成

依產品目標自動辨識所需工具。

例：
- 行動清單。
- 規劃表。
- 預算追蹤表。
- 練習題。
- 日曆。
- 決策表。
- 模板。
- 教材。
- 速查表。

每個工具包含：
- 名稱。
- 使用目的。
- 清楚說明。
- 可填入欄位。
- 實際範例。
- 完成標準。
- 對應章節。

不得用無用工作頁灌水提高頁數。

---

# 13. Quality Assurance 自動審查

檢查項目：
- 是否涵蓋整體轉變。
- 是否完整依照架構。
- 是否有空白章節。
- 是否重複。
- 是否缺乏步驟。
- 是否有不可信數據。
- 是否存在虛構引用。
- 是否引用錯誤來源。
- 是否有版權問題。
- 是否符合受眾程度。
- 是否有安全問題。
- 工作表是否真的能使用。
- 是否存在不合理保證。
- 品牌語氣是否一致。

問題分為：
- CRITICAL。
- MAJOR。
- MINOR。

系統可自動修復非重大問題。

高風險事實、專業內容、真人測試需求與重大內容爭議必須提示使用者確認。

品質分數是編輯評估，不得視為產品已獲專業認證。

---

# 14. 品牌設計與成品組裝

自動使用第 11 欄 Brand Style and Voice。

提供：
- Modern Minimalist。
- Premium Editorial。
- Warm & Family-Friendly。
- Business Professional。
- Creative Lifestyle。
- Educational Workbook。

自動生成：
- 品牌色彩。
- 標題字級。
- 內文字體方向。
- 封面設計說明。
- 排版系統。
- 章節扉頁。
- 工作表樣式。
- 圖表版型。
- 頁尾、頁碼及目錄。

圖片如未使用實際圖像生成工具，不得宣稱已生成。

輸出前檢查排版溢出、缺章、目錄與章節一致性。

---

# 15. 定價與銷售內容自動化

由市場資料計算與建議：
- 低價入門版。
- 標準版。
- 進階組合包。

提出：
- Regular price。
- Launch test price。
- Premium price。
- 價格假設。
- 平台比較。
- 提升價值的方法。

製作：
- 商品說明。
- 銷售頁。
- FAQ。
- 電郵行銷序列。
- Lead magnet。
- 30 天上市計畫。
- 社群內容。
- 可選的客戶拓展文案。

不要捏造銷量、見證或營收。

使用者未授權時，不可自動發送郵件、發布商品或產生付費交易。

---

# 16. OpenRouter API 完整整合

本章是 V4.0 必須新增的核心功能。

## 16.1 API 管理頁名稱

**AI Model & API Settings**

所有 API 和模型操作透過圖形介面完成。

## 16.2 API 服務提供者

支援：
- OpenRouter（優先）。
- Gemini API（選用）。
- 其他相容服務（未來擴充）。

採用 provider adapter 架構，不將流程寫死在一個 AI 廠商上。

## 16.3 API Key 輸入介面

欄位：
- AI Provider。
- API Base URL（預設官方 URL）。
- API Key（遮蔽輸入）。
- Connection Name。
- Connect。
- Test Connection。
- Replace Key。
- Disconnect。
- Delete Saved Credential。

OpenRouter 官方基礎網址：

`https://openrouter.ai/api/v1`

API Key 可由使用者自行取得。

UI 應支援：
- 貼上金鑰。
- 顯示／隱藏。
- 測試。
- 連線狀態。
- Key 狀態摘要。
- 更換。
- 刪除。

不得將金鑰寫入：
- 原始前端程式碼。
- Git repository。
- 瀏覽器 URL。
- 日誌。
- 匯出 JSON。
- 公開錯誤訊息。

## 16.4 安全儲存

**Production 建議：**

由前端透過 HTTPS 將使用者輸入交給受信任的後端。

後端：
- 儲存加密後的金鑰或使用安全祕密管理服務。
- 僅授權使用者可管理自己的金鑰。
- 不向其他瀏覽器使用者回傳明文金鑰。
- 呼叫 OpenRouter API。
- 執行金鑰輪替與刪除。

**Gemini Canvas 原型：**

若沒有安全後端，應明確告知無法提供真正的伺服器端金鑰保護。

可以設計僅供單一使用者測試的暫時連線模式，但必須揭露瀏覽器端金鑰暴露風險；不得宣稱完全安全。

不得把未加密金鑰永久存放於 localStorage。

## 16.5 官方 API 端點

列出模型：

`GET https://openrouter.ai/api/v1/models`

查看目前金鑰狀態：

`GET https://openrouter.ai/api/v1/key`

文字生成：

`POST https://openrouter.ai/api/v1/chat/completions`

必須依目前官方文件檢查實際支援參數。

## 16.6 模型列表 UI

成功連線後取得模型列表並提供：

- Search Models。
- Free Only。
- Paid Models（預設隱藏）。
- Context Window。
- Input Price。
- Output Price。
- Model Availability。
- Structured Output Support。
- Tool Calling Support。
- Output Token Capacity。
- Provider。
- Select Model。

必須從 API 取得真正的模型 ID，而不是永久寫死過時的模型清單。

## 16.7 免費模型辨識

優先辨識：
- 具有 `:free` 變體的模型。
- 官方列出的零價格模型。
- `openrouter/free` 路由器。

注意：
不是所有標示零價格的模型都一定適合沒有充值的帳戶。

需考慮：
- 帳戶資格。
- 模型可用性。
- Context 長度。
- 支援功能。
- 即時限額。
- 供應商限制。

預設模型選擇：

`openrouter/free`

它可以由 OpenRouter 選用可用免費模型，但不同請求可能使用不同實際模型。

若需要內容連貫性，允許鎖定特定模型。

## 16.8 模型策略選擇

UI 提供：

**Auto Free**
- 系統選擇目前可用的免費模型。

**Manual**
- 使用者指定某一模型。

**Stage-Based**
- 不同階段使用不同模型。

**Fallback Chain**
- 依使用者設定的優先順序備援。

**Cost-Optimized**
- 在明確授權的成本條件下選擇模型。

預設：
Free Only + Auto Free。

## 16.9 各階段模型設定

允許指定：

| 工作階段 | 模型選擇 |
|---|---|
| Market Analysis | 自動 |
| Topic Ranking | 自動 |
| 13-Field Generator | 自動 |
| UVZ | 自動 |
| Transformation Map | 自動 |
| Reference Summaries | 自動 |
| Product Charter | 自動 |
| Outline | 自動 |
| Long-Form Writing | 可鎖定 |
| Workbook | 自動 |
| Quality Auditor | 可用不同模型 |
| Pricing & Sales Copy | 自動 |

模型切換後保留結構化專案記憶與章節版本。

## 16.10 免費限制管理

截至 2026-11-10，OpenRouter 官方公開資訊指出常見 `:free` 變體有：
- 每分鐘 20 requests。
- 一般免費帳戶每日 50 requests。
- 達指定充值門檻可提高每日 requests 上限。
- 失敗請求可能計入免費額度。

以上數字只是開發基準，應以即時官方規則與帳戶狀態為準。

不可把免費模型描述為真正無限制。

不得透過更換帳戶、輪轉不同金鑰或其他方式規避服務條款與帳戶配額。

## 16.11 配額監控 UI

顯示：
- 目前模型。
- 當次請求 tokens。
- 專案累積 requests。
- 專案累積 tokens。
- 預估費用。
- 已知帳戶使用情況。
- 最近錯誤。
- 目前冷卻狀態。
- 可取得的剩餘配額資訊。
- 下一階段預估請求量。

如果無法由 API 得知真實剩餘次數，不得捏造精確數字。

## 16.12 配額不足

若遇到 rate limit：

1. 保存工作進度。
2. 不要反覆無限制重試。
3. 依 API 提供的重試時間等待。
4. 使用合理 exponential backoff。
5. 檢查是否存在使用者允許的免費備援模型。
6. 若為帳戶共用免費配額已用盡，停止重試並顯示狀態。
7. 保留可續跑工作。
8. 需要使用者授權才能切換付費模型。

切換免費模型不保證突破帳戶共用限制。

## 16.13 備援優先順序

預設：
1. 已選免費模型。
2. 其他已確認可用免費模型。
3. `openrouter/free`。
4. 暫停等待使用者處理。

付費模型只有在使用者明確開啟「Allow Paid Fallback」之後才可使用。

若啟用付費模式，應要求設定：
- 每次請求最高價格。
- 每日花費上限。
- 每專案花費上限。
- 接近上限通知。

## 16.14 模型相容性檢查

在請求前確認：
- Context window 足夠。
- 可接受預期輸入格式。
- 可支援需要的 JSON 或 structured output。
- 支援必要工具或使用替代實作。
- 最大輸出限制足夠。
- 目前可使用。

不符合要求的模型應在對應階段中顯示為不可選或需要降級方案。

## 16.15 AI 請求成本優化

- 重用已核准研究卡。
- 單章節檢索相關來源。
- 避免每次送出所有 20 個完整來源。
- 使用 Product Bible。
- 根據階段決定所需上下文。
- 儘量以程式處理確定性計算。
- 使用 JSON schema 驗證。
- 避免無意義的多次自我重寫。
- 保留完成內容。
- 提供 Quick / Standard / Deep 模式。
- 使用條件允許的快取。
- 在成本或配額不足時暫停並續跑。

## 16.16 隱私和模型供應商

不同模型供應商可能有不同資料保留和訓練政策。

應提供：
- 模型服務商資訊。
- 可取得的資料政策資訊。
- 敏感內容提醒。
- 模型選用限制。
- 可選的隱私設定。

不得聲稱 OpenRouter 的所有底層供應商都有相同隱私條件。

---

# 17. OpenRouter 伺服器端呼叫範例

以下範例是開發示意。真正實作需加入驗證、授權、重試與錯誤處理。

```ts
type AIRequest = {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  maxTokens?: number;
};

async function generateWithOpenRouter(
  request: AIRequest,
  apiKey: string
) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 1200
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `OpenRouter request failed: ${response.status}`
    );
  }

  return response.json();
}
```

此函式應執行於安全的後端環境，不應將長期私人金鑰直接放入公開前端程式。

確認金鑰：

```text
GET /api/v1/key
Authorization: Bearer YOUR_API_KEY
```

動態載入模型：

```text
GET /api/v1/models
```

正式產品須加上安全憑證管理、模型能力篩選、請求用量記錄及錯誤類型處理。

---

# 18. AI Provider 抽象架構

使用一致的供應商介面：

```ts
interface AIProvider {
  id: string;
  listModels(): Promise<ModelInfo[]>;
  validateConnection(): Promise<ConnectionStatus>;
  generateText(input: AIInput): Promise<AIOutput>;
  generateStructured(input: StructuredInput): Promise<unknown>;
  getUsage(): Promise<UsageInfo>;
}
```

市場搜尋不必完全依賴文字模型：

```ts
interface SearchProvider {
  search(query: string): Promise<SearchResult[]>;
}

interface SourceRetriever {
  retrieve(url: string): Promise<RetrievedDocument>;
}
```

資料儲存：

```ts
interface ProjectStore {
  saveProject(project: Project): Promise<void>;
  getProject(id: string): Promise<Project>;
  saveCheckpoint(job: JobCheckpoint): Promise<void>;
}
```

將模型、搜尋、來源檢索與資料儲存拆開，使 OpenRouter 模型切換不影響既有專案架構。

---

# 19. AI 工作排程與狀態機

每個階段具有：
- NOT_STARTED。
- READY。
- QUEUED。
- RUNNING。
- NEEDS_REVIEW。
- COMPLETED。
- PARTIAL。
- PAUSED。
- FAILED。
- BLOCKED。

Job 記錄：
- Job ID。
- Project ID。
- Stage ID。
- Selected model。
- Primary provider。
- Fallback models。
- Started at。
- Last checkpoint。
- Current step。
- Retry count。
- Actual usage。
- Error。
- Output version。
- Completed at。

## 19.1 中斷續跑

當：
- API 額度不足。
- 網路斷線。
- 模型不可用。
- 章節過長。
- 應用程式重新整理。

應保存已完成的資料。

再次開始時由最後成功檢查點繼續。

不可將同一章節重複產生並覆蓋使用者已核准的版本。

## 19.2 平行與依賴

可平行：
- 13 欄位生成。
- Reference discovery。
- 初步 UVZ。

必須等待依賴：
- Charter 需要策略資料與適當研究覆蓋。
- 章節需要核准架構。
- 最終品質檢查需要完成所有主要內容。
- 完整匯出需要完成內容組裝。

---

# 20. 專案資料模型

使用具版本資訊的資料結構。

```json
{
  "schemaVersion": "4.0",
  "projectId": "",
  "name": "",
  "createdAt": "",
  "updatedAt": "",
  "preferences": {
    "market": "US",
    "language": "en",
    "productFormat": "ebook_toolkit",
    "automationMode": "selection_autopilot",
    "referenceTarget": 20
  },
  "marketResearch": {
    "researchDate": "",
    "platformEvidence": [],
    "topicCandidates": [],
    "selectedTopicId": null,
    "confidence": null
  },
  "intake": {
    "projectName": "",
    "creatorName": "",
    "experienceLevel": "",
    "relevantExperience": "",
    "expertise": "",
    "interests": "",
    "targetAudience": "",
    "problemsSolved": "",
    "productIdea": "",
    "desiredTransformation": "",
    "brandStyleAndVoice": "",
    "constraintsAndExclusions": "",
    "recommendedPrice": {}
  },
  "uvz": {},
  "transformationMap": {},
  "referenceLibrary": {
    "targetCount": 20,
    "verifiedCount": 0,
    "cards": [],
    "coverage": {},
    "status": "NOT_STARTED"
  },
  "charter": {},
  "outline": [],
  "productBible": {},
  "chapters": [],
  "resources": [],
  "qualityReport": {},
  "brand": {},
  "salesAssets": {},
  "aiSettings": {
    "provider": "openrouter",
    "defaultModel": "openrouter/free",
    "freeOnly": true,
    "allowPaidFallback": false,
    "stageModels": {},
    "fallbackModels": [],
    "credentialReferenceId": null
  },
  "workflow": {
    "activeStage": "market_research",
    "stageStatuses": {},
    "jobs": [],
    "lastCheckpoint": null
  }
}
```

注意：
- credentialReferenceId 只儲存憑證安全參照。
- 不可將真正 API Key 放進 Project JSON。
- 大型章節與參考文件應分表或使用物件儲存服務。

---

# 21. 預設 AI 指令

所有階段的 AI 生成應加入：

```text
你是 Digital Product Creator 2.0 的專業研究、
數位產品策略、教學內容與編輯助理。

你的工作是將已確認的產品題材和專案資料，
轉換成實用、有依據、可交付的數位產品。

使用當前專案的已核准資料。

除非必要，不得向使用者重複詢問資料。

在每一階段提出 2–3 個具體可選方案；
附上推薦方案與理由。

可合理推定的未知事項需標明假設。

不得捏造研究資料、暢銷排名、銷量、
使用者資格、來源內容、引用、測試結果或收入。

不得把未完成的大綱當成完整產品。

維持品牌聲音及章節一致性。

優先輸出有實際用途的內容和工具。

對需要人類測試或專業審查的事項明確標示。

若工具或 API 無法完成工作，保存工作進度，
說明限制並提供可恢復的下一步。
```

---

# 22. 內建階段性提示詞

以下提示詞由應用程式自動呼叫，不要求使用者手動輸入。

## 22.1 市場研究

```text
依照目前日期、所選市場和數位產品格式，
搜尋可驗證的商品榜單、商品頁與市場訊號。

產生 5–10 個具體可開發產品題材。

每個題材提供：
受眾、問題、產品概念、平台來源、價格、
競爭、差異化、風險、推薦分數與信心程度。

將官方排名、公開搜尋結果、商品宣傳、
評論數與可核對的銷量資料明確區分。

預設推薦最佳三案。
```

## 22.2 13 欄位

```text
根據已選題材、已知使用者偏好、目標市場及研究結果，
完整生成專案所需的 13 個標準描述欄位。

內容可直接複製或用於下游生成。

不得捏造使用者真實工作經歷。

清楚標註合理假設。

定價包含標準價格、測試價格與進階方案。
```

## 22.3 參考研究

```text
根據題材與讀者，建立研究主軸與搜尋查詢。

使用真實檢索的來源內容，建立 20 筆目標研究卡。

每筆包含 Title, Description, Outline,
Practical Framework, Research Summary,
Editorial Notes, Brand Guidelines。

保留來源標題、URL、出版者、日期與驗證狀態。

來源不足時查找替代來源，不得編造。
```

## 22.4 UVZ

```text
分析受眾重要問題、創作者技能適配、
競爭、差異化與產品可行性。

提供三種定位方案與推薦理由。

將實際市場資料與推測分開呈現。
```

## 22.5 Transformation Map

```text
建立顧客 Before、Bridge、After 的詳細轉變地圖。

產生產品名稱、承諾、框架、里程碑及價格假設。

避免保證不可能證實的結果。
```

## 22.6 Charter

```text
整合已核准題材、13 欄位、UVZ、Transformation Map、
Reference Library，建立完整 Transformative Product Charter。

輸出受眾、承諾、架構、目標、資源、範圍、
品牌與品質標準。
```

## 22.7 Outline

```text
建立符合產品 Charter 的完整產品目錄。

每章包含目標、子主題、案例、練習、
參考來源、字數與成果。

產生多個架構選項並推薦一個。
```

## 22.8 Long-form

```text
根據產品 Charter、章節大綱、研究卡、
Product Bible 和前文連貫性摘要，
撰寫指定章節的完整內容。

必須包含具體解釋、步驟、範例、
常見錯誤、實作活動和摘要。

引用有來源支持的重要事實。

輸出完整 Markdown 與章節連貫性紀錄。
```

## 22.9 Quality

```text
對產品進行結構、準確性、實用性、
來源、可讀性、安全和一致性審查。

標記嚴重程度與具體位置。

可自動修復的問題請局部修復，
不要覆蓋使用者已鎖定內容。
```

## 22.10 Commercial

```text
分析同類商品可驗證的價格與交付價值，
建議產品定價、優惠測試和產品組合。

產生商品銷售頁、FAQ、五封電子郵件、
社群內容與 30 天上市計畫。

不得捏造成交、評論或保證收益。
```

---

# 23. 工作階段的預估 API 請求與預檢

建立 Preflight Planner。

在進入整個 Autopilot 前估計：
- 階段數。
- AI 請求數。
- 來源檢索量。
- 內容目標字數。
- 大約 token。
- 模型能力。
- 可用資料。
- 可能的模型成本。

預檢結果可顯示：
- 可直接執行。
- 可能超出當日免費配額。
- 須分批完成。
- 缺少搜尋服務。
- 缺少安全 API 後端。
- 需要使用者核准。

當預估超過免費限制時，預設採分批及續跑，不得擅自使用付費模型。

---

# 24. 匯出中心

至少提供：
- complete-manuscript.md。
- project-charter.md。
- product-outline.md。
- reference-library.md。
- references.json。
- companion-resources.md。
- launch-assets.md。
- project-backup.json。

選用：
- styled-ebook.html。
- print-ready.pdf。
- ebook.docx。
- worksheets.pdf。
- complete-product.zip。

只啟用真正可以產生檔案的按鈕。

缺少內容時顯示 incomplete，不要無聲省略章節。

---

# 25. 安全、授權與品質要求

## 25.1 API 安全

- HTTPS。
- 後端保存私人憑證。
- 驗證帳戶身分與專案權限。
- 加密敏感資料。
- 設定速率限制。
- 監測異常請求。
- 刪除使用者已撤銷的憑證。
- 不在日誌洩漏 API Key。
- 不在匯出專案中包含 API Key。

## 25.2 研究安全

- 不信任來源網頁中包含的操作指令。
- 防止 prompt injection。
- 限制遠端 URL 的協定與目標位置。
- 防止 SSRF。
- 檔案大小限制。
- 來源版權確認。
- 僅取得合法授權資料。

## 25.3 內容安全

- 對醫療、法律、財務等產品增加專業審查。
- 對食譜要求實際試做和食安核對。
- 不提供不可靠的危險操作。
- 不假裝擁有未經證實的資格。
- 不擅自複製外部書籍、圖片或付費教材。

## 25.4 發布規範

上架前重新核對 Amazon KDP、Etsy、Gumroad、Payhip 等平台的現行 AI 內容政策。

不得假設 AI 自動生成的任何指導型產品都可以在所有平台販售。

---

# 26. 技術架構

## 26.1 Gemini Canvas 原型

適合：
- 應用介面。
- 專案欄位生成。
- 一般模型生成。
- 基本工作流程。
- 章節編輯。
- 簡易本地儲存。
- Markdown／JSON 匯出。

若 Canvas 不支援安全第三方金鑰管理、跨站資料檢索或持續工作排程，應建立清楚的後端整合界面，不能假裝全功能已經完成。

## 26.2 Production 架構

建議：
- Next.js / React。
- TypeScript。
- PostgreSQL。
- Object Storage。
- Background Job Queue。
- OpenRouter API Adapter。
- Search Provider。
- URL / PDF Retriever。
- Structured Output Validation。
- Project Checkpoint Store。
- Export Renderer。
- Authentication。
- Monitoring。

## 26.3 API 路由建議

```text
POST /api/projects
GET  /api/projects/:id
PATCH /api/projects/:id

POST /api/research/trends
GET  /api/research/opportunities

POST /api/projects/:id/topic/select
POST /api/projects/:id/intake/generate

POST /api/projects/:id/references/collect
GET  /api/projects/:id/references
POST /api/projects/:id/references/refresh

POST /api/projects/:id/uvz
POST /api/projects/:id/transformation
POST /api/projects/:id/charter
POST /api/projects/:id/outline

POST /api/projects/:id/chapters/generate
POST /api/projects/:id/resources/generate
POST /api/projects/:id/quality/audit
POST /api/projects/:id/export

POST /api/ai/credentials
DELETE /api/ai/credentials/:id
POST /api/ai/connection/test
GET /api/ai/models
GET /api/ai/usage
PATCH /api/ai/preferences

POST /api/jobs/start
POST /api/jobs/pause
POST /api/jobs/resume
GET /api/jobs/:id
```

以上僅為需要實作的設計端點，不是已存在的服務。

---

# 27. 開發階段

## Sprint 1 — 工作基礎

完成：
- Dashboard。
- 專案系統。
- 導覽。
- 13 欄位。
- 儲存。
- JSON／Markdown 匯出。

## Sprint 2 — OpenRouter

完成：
- API Key UI。
- 安全後端代理。
- Test Connection。
- Dynamic Model List。
- Free Only。
- Model Selector。
- Usage Tracking。
- Fallback。
- 錯誤處理。

這是最高優先技術整合之一。

## Sprint 3 — 自動選題

完成：
- 真實市場資料來源。
- 多平台分析。
- 題材分群。
- 趨勢比較。
- 推薦評分。
- 選題卡片。

## Sprint 4 — 自動參考資料

完成：
- 來源發現。
- 來源取得。
- 去重。
- 品質評分。
- 七部分研究卡。
- 20 筆來源目標。
- 來源缺口補充。
- 儲存與匯出。

## Sprint 5 — 策略引擎

完成：
- UVZ。
- Transformation。
- Charter。
- Outline。
- 章節與研究對應。

## Sprint 6 — 完整內容

完成：
- 長篇寫作。
- Product Bible。
- 模型切換。
- 續跑。
- 工作簿。
- 資料引用。

## Sprint 7 — 品質與商品化

完成：
- QA。
- 自動修正。
- Brand Studio。
- 排版。
- 價格與行銷。
- 真正檔案匯出。

## Sprint 8 — 生產環境

完成：
- 驗證與授權。
- 持久化。
- Job Queue。
- 金鑰安全。
- 監測。
- 測試與備份。

優先建立真的可執行垂直流程，不要先做完所有裝飾性 UI。

---

# 28. 端到端測試

使用既有範例：

題材：Budget Family Meal Planning

產品：
28-Day Budget Family Meal Plan:
Affordable Dinners, Smarter Grocery Shopping & Less Food Waste

品牌：
The Smart Family Table

預計：
- 28 道晚餐。
- 4 週菜單。
- 4 份購物清單。
- 預算追蹤工具。
- 食材替代說明。
- 食品安全說明。
- 完整原創 ebook。
- 工作簿與 Bonus Toolkit。

歷史價格假設：
- 一般：US$14.99。
- 測試：US$9.99。
- 進階：US$19.99。

## 測試過程

1. 使用者建立新專案。
2. 系統自動研究市場。
3. 顯示至少數個有依據的題材建議。
4. 使用者選擇 Budget Family Meal Planning。
5. 系統自動啟動來源研究。
6. 系統產生 13 欄位。
7. 系統產生 UVZ、Transformation、Charter。
8. 系統形成章節架構。
9. 系統逐章生成。
10. 系統生成工作簿。
11. 系統檢查事實和安全。
12. 系統輸出完整可下載檔案。

如資料來源不足，清楚列出真實取得數量。

不得因測試通過而稱食譜已實際烹調驗證。

---

# 29. V4.0 驗收標準

以下是必須測試的功能。

### Market Research
- [ ] 新專案可以自動觸發研究。
- [ ] 取得真實商品資料或清楚顯示無法取得。
- [ ] 區分排行榜與一般商品列表。
- [ ] 顯示資料時間。
- [ ] 提供 5–10 個候選題材（資料充足時）。
- [ ] 推薦結果可點擊選取。
- [ ] 資料不足時不捏造排名。

### Project Setup
- [ ] 13 欄位可自動產生。
- [ ] 可全部核准。
- [ ] 可單欄編輯。
- [ ] 使用者真實背景不被捏造。

### Reference Engine
- [ ] 選題後自動開始。
- [ ] 搜尋真實來源。
- [ ] 去重。
- [ ] 來源分類。
- [ ] 七部分研究卡。
- [ ] 顯示真實驗證數。
- [ ] 來源不足可補搜尋。
- [ ] 可儲存及匯出。

### OpenRouter
- [ ] 有 API Key 輸入介面。
- [ ] 可測試連線。
- [ ] 可替換與刪除金鑰。
- [ ] 金鑰不被匯出。
- [ ] 模型列表來自 API。
- [ ] 可以只顯示免費模型。
- [ ] 可以指定模型。
- [ ] 可以按階段指定模型。
- [ ] 可設定備援。
- [ ] 不會未授權切換到付費模型。
- [ ] 顯示用量與限制。
- [ ] 429 可暫停及合理處理。
- [ ] 切換模型後專案仍可繼續。

### Product Generation
- [ ] UVZ 真正生成。
- [ ] Transformation 真正生成。
- [ ] Charter 使用研究資料。
- [ ] Outline 有完整目標與引用。
- [ ] 章節生成為完整內容。
- [ ] Product Bible 保持一致性。
- [ ] 工作簿實際可用。
- [ ] 中斷後不丟失內容。

### Quality and Export
- [ ] 能找到真實缺漏或不支持的主張。
- [ ] 可自動局部修正。
- [ ] 保留已鎖定內容。
- [ ] 產生真的 Markdown 檔。
- [ ] 有 JSON 專案備份。
- [ ] 匯出內容非空殼。
- [ ] 重要出版風險仍標示待確認。

---

# 30. Gemini Canvas 完整建置提示詞

將本 Markdown 檔匯入 Gemini Canvas，輸入：

```text
請閱讀整份 Digital Product Creator 2.0 V4.0
Full Autopilot & OpenRouter Edition 開發規格。

請實際建立可操作的互動式 AI Digital Product
Factory 應用程式，不要只回覆開發建議，
也不要建立只有畫面、沒有功能的 mockup。

核心必須做到：

1. 使用者建立新專案後，系統主動研究目前
   各大數位產品平台的熱門及可驗證暢銷題材。

2. 顯示 AI 分析後推薦的產品題材，
   讓使用者點選即可決定主題。

3. 自動產生完整的 13 個專案描述欄位。

4. 選題後自動搜尋並處理約 20 個
   真正可取得、可信的研究參考來源，
   每個來源轉成七部分研究卡。

5. 自動執行 UVZ、Transformation Map、
   Product Charter、Outline、完整內容生成、
   Workbook、Quality Audit、Brand Design、
   Pricing & Launch、Export。

6. 建立 OpenRouter API Settings 介面，
   讓使用者可貼上、更換、測試和刪除 API Key。

7. 透過官方 API 即時列出模型，
   支援 Free Only、openrouter/free、
   自選模型、階段模型及備援模型。

8. 對 API 額度、失敗請求與速率限制提供
   真實處理，不得宣稱免費無限額。

9. 免費模型用量不足時，
   不得未經授權改用付費模型。

10. 所有階段共用已保存的專案資料，
    使用者主要透過選項和按鈕操作，
    不需每個階段自行撰寫提示詞。

11. 提供保存、恢復、編輯與實際下載功能。

12. 優先完成一條真正可運作的完整流程：
    API 連線 -> 研究題材 -> 選題 ->
    自動參考來源 -> 13 欄位 ->
    Charter -> Outline ->
    完整章節 -> 匯出。

先確認 Gemini Canvas 實際提供的開發與
AI 功能，再實作最合適的架構。

如果自動網路研究、後端 API 金鑰保護、
長時間排程或資料庫功能需要外部服務，
請建立明確的整合介面與設定指示，
不要偽裝成已完成。

以 Budget Family Meal Planning
作為端到端功能測試。

請直接開始產生可執行的應用程式碼，
並實際測試關鍵功能。

完成後列出：
- 已完成且測試通過的功能。
- 需要外部部署或 API 設定的功能。
- 尚未完成的功能。
- 真正的下一步操作方式。
```

---

# 31. 官方技術文件

OpenRouter:
https://openrouter.ai/docs

OpenRouter Free Models:
https://openrouter.ai/collections/free-models

OpenRouter Model Discovery:
https://openrouter.ai/docs/api/api-reference/models/get-models

OpenRouter Current API Key:
https://openrouter.ai/docs/api/api-reference/api-keys/get-current-key

OpenRouter Chat Completions:
https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request

OpenRouter Pricing:
https://openrouter.ai/pricing

Gemini Canvas:
https://support.google.com/gemini/answer/16047321

所有限制、模型、費率與 API 功能應在實際開發時再次確認。

---

# 32. 最終成功定義

本應用程式的成功標準不是漂亮的儀表板，而是：

使用者建立新專案後，可以透過選擇系統推薦的題材，讓系統自動完成市場研究、參考來源、內容企劃、長篇撰寫、工作簿、品質檢查及產品組裝，最後真正取得可編輯、可檢查、可下載的數位產品檔案。

AI 模型可透過 OpenRouter 更換。

整個系統免費優先、尊重使用限制、可保存、可續跑，使用者不需反覆編寫每一階段的 AI Prompt。

核心原則：

**Research Automatically. Recommend Clearly. Select Easily. Generate Completely. Verify Honestly. Export Reliably.**

END OF SPECIFICATION

Digital Product Creator 2.0
Version 4.0 — Full Autopilot & OpenRouter Edition
