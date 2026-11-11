export type Language = 'en' | 'zh';

export const translations = {
  en: {
    // Header
    appName: 'Digital Product Studio',
    subtitle: 'Stage-by-stage research, authoring and review',
    exportProduct: 'Export Product',
    aiSettings: 'AI Model & API Keys',
    activeProject: 'Active Project',
    untitledProject: 'Untitled Digital Product',

    // Sidebar
    pipelineProgress: 'Pipeline Progress',
    sources: 'Sources',
    chapters: 'Chapters',
    words: 'Words',
    openrouterReady: 'Multi-LLM Ready',
    groupStart: 'Project Genesis',
    groupResearch: 'Research & Ideation (Gate A)',
    groupStrategy: 'Strategy & Knowledge (Gate B)',
    groupContent: 'Content & Resources',
    groupPolish: 'Quality & Launch (Gate C)',
    groupSettings: 'System & Preferences',

    navDashboard: 'Dashboard Overview',
    navNewProject: 'Create New Project',
    navMarketResearch: 'Market Intelligence (MTRE)',
    navTopicSelection: 'Topic Recommendations (Gate A)',
    navProjectBrief: 'Project Setup (13 Fields)',
    navUvz: 'Unique Value Zone (UVZ)',
    navTransformationMap: 'Transformation Map',
    navReferenceLibrary: 'Reference Research (Gate B)',
    navProductCharter: 'Product Charter (Gate B)',
    navOutlineBuilder: 'Outline & Structure',
    navContentStudio: 'Full Content Studio',
    navWorkbookStudio: 'Workbook & Resource Suite',
    navQualityAssurance: 'Quality Review (Gate C)',
    navBrandDesign: 'Brand & Visual Styling',
    navPricingLaunch: 'Pricing & Launch Assets',
    navExportCenter: 'Export & Download Center',
    navMyProjects: 'My Projects Repository',
    navAiSettings: 'AI Model & API Settings',
    navAutomationSettings: 'Workflow & Review Settings',

    // Statuses
    statusNotStarted: 'Not Started',
    statusReady: 'Ready',
    statusRunning: 'Running',
    statusCompleted: 'Completed',
    statusNeedsReview: 'Needs Review',
    approved: 'Approved',
    pending: 'Pending Approval',

    // Blank State
    blankProjectNotice: 'New Blank Project Active',
    blankProjectDesc: 'You are starting with a clean slate. Run Market Intelligence to discover high-opportunity niches, or load the 28-Day Budget Family Meal Plan master template to see how every stage is filled out.',
    loadDemoTemplate: 'Load Sample: 28-Day Budget Meal Plan',
    startFromScratch: 'Start From Scratch',
    runMarketResearchNow: 'Research Market Trends Now',

    // Gates
    gateA: 'Gate A — Topic Approval',
    gateB: 'Gate B — Strategy & Charter',
    gateC: 'Gate C — Quality & Export',

    // Common Actions
    acceptAll: 'Accept All & Proceed',
    saveDraft: 'Save Draft',
    generateChapter: 'Generate Chapter',
    regenerate: 'Regenerate',
    downloadAll: 'Download All Files',
    downloadFile: 'Download File',
    testConnection: 'Test Connection',
    saveSettings: 'Save Settings',
    refresh: 'Refresh Signals',
    refreshing: 'Analyzing Platforms...',

    // Market Research (MTRE)
    mtreTitle: 'Marketplace Intelligence & Sales Observation (MTRE)',
    mtreSubtitle: 'On-demand public source checks across Amazon Kindle, Gumroad, Etsy, Apple Books, and Payhip',
    allPlatforms: 'All Platforms',
    searchMarketplacePlaceholder: 'Search by product title, author, or category...',
    priceLabel: 'Price',
    rankLabel: 'Observed Rank',
    ratingLabel: 'Rating',
    reviewsLabel: 'Reviews',
    evidenceLevel: 'Evidence Level',
    dataLimitationNotice: 'Platform Transparency & Data Limits:',
    openOriginalListing: 'Inspect Listing ↗',
    noObservationsFound: 'No marketplace signals recorded yet. Click below to run automated multi-platform discovery.',
    runDiscoveryBtn: 'Discover Hot Selling Niches Now',
    goToGateABtn: 'View Top Recommendations (Gate A) →',
    syncMarketToIntelligenceBtn: 'Synchronize Market Signals → Top Recommendations',
    prioritizeSignalBtn: 'Synthesize as #1 Gate A Topic',
    prioritizedSignalBadge: 'Prioritized from Market Signal',
    synchronizedFromMtreBadge: 'Synchronized from Market Intelligence (MTRE)',
    syncStatsSummary: 'Linked chart snapshot: inspect the source, chart scope and capture time. Scores reflect observed rank only, not sales velocity or revenue.',
    mtreSynthesisTitle: 'Market Intelligence Synthesis & Opportunity Matrix',
    detectedMarketLeader: 'Top Market Signal Velocity Leader',
    linkedMarketSignal: 'Linked Market Signal',
    reSyncCta: 'Re-sync from Market Signals',

    // Topic Recommendations (Gate A)
    topicTitle: 'Recommended Digital Product Niches (Gate A)',
    topicSubtitle: 'Current chart evidence informs original niche concepts; unmeasured criteria remain unscored',
    runMarketDiscoveryCta: 'Run Multi-Platform AI Market Analysis',
    opportunityScoreLabel: 'Opportunity Score',
    scoreBreakdownLabel: 'Score Breakdown',
    targetAudienceLabel: 'Target Audience',
    coreProblemLabel: 'Core Problem',
    bigPromiseLabel: 'Core Transformation Promise',
    suggestedFormatLabel: 'Format',
    priceTestingRangeLabel: 'Price Testing Range',
    testTier: 'Test',
    regularTier: 'Regular',
    bundleTier: 'Bundle',
    differentiationLabel: 'Differentiation Angle',
    companionAssetsLabel: 'Companion Toolkits & Deliverables',
    selectAndPropagateBtn: 'Select Niche & Initialize a New Research Plan',
    topicSelectedBadge: 'Selected Topic',
    approveGateACta: 'Approve Gate A & Proceed to 13 Fields →',
    gateAApprovedBadge: 'Gate A Approved',

    // 13 Fields (Project Brief)
    briefTitle: 'Project Setup & Boundaries (13 Mandatory Fields)',
    briefSubtitle: 'Structured project brief auto-populated from Gate A topic selection',
    part1Title: 'Part 1: Creator Background & Core Identity (Fields 1 – 6)',
    part2Title: 'Part 2: Audience & Transformation Strategy (Fields 7 – 10)',
    part3Title: 'Part 3: Style, Boundaries & Pricing Ladder (Fields 11 – 13)',
    approveBriefCta: 'Approve Brief & Enter UVZ Strategy →',

    // UVZ
    uvzTitle: 'Unique Value Zone (UVZ Analysis)',
    uvzSubtitle: 'Synthesizing buyer pain points, creator strengths, and competitive white space',
    buyerProblemsTitle: 'Buyer Problems Solved',
    solutionsTitle: 'Core Solution Architecture',
    positioningTitle: 'Positioning Angles & Market Personas',
    selectPositioningBtn: 'Select Positioning',
    approveUvzCta: 'Confirm UVZ & Build Transformation Map →',

    // Transformation Map
    mapTitle: 'Customer Transformation Map',
    mapSubtitle: 'Bridge the emotional and tangible gap from Current Symptoms to Empowered Outcomes',
    beforeStateTitle: '1. Before State (Current Symptoms & Drain)',
    bridgeProcessTitle: '2. The Bridge (Signature Methodology & Milestones)',
    afterStateTitle: '3. After State (Tangible Outcomes & Freedom Unlocked)',
    titleOptionsTitle: 'Product Title & Hook Options',
    selectTitleBtn: 'Select Title',
    approveMapCta: 'Confirm Map & Enter Reference Library →',

    // Reference Library (ARCE)
    refTitle: 'Reference Research & Evidence Review',
    refSubtitle: 'Topic source records with explicit claims, supporting excerpts and chapter mappings',
    verifiedCardsCount: 'Retrieved and reviewed source records',
    sevenPartStandard: 'Mandatory 7-Part Structure: Title, Description, Outline, Framework, Summary, Notes, Guidelines',
    searchRefPlaceholder: 'Search references by pillar, topic, or keyword...',
    allPillars: 'All Pillars',

    // Product Charter (Gate B)
    charterTitle: 'Product Charter (Gate B Strategy Approval)',
    charterSubtitle: '17 unalterable quality constraints and architectural pillars governing the product',
    approveGateBCta: 'Approve Gate B & Unlock Outline & Content Factory →',
    gateBApprovedBadge: 'Gate B Approved',

    // Outline Builder
    outlineTitle: 'Manuscript Outline & Chapter Architecture',
    outlineSubtitle: 'Targeted word counts, learning objectives, deliverables, and reference mapping per chapter',
    totalTargetWordCount: 'Target Word Count',
    actualWordCount: 'Current Manuscript Length',
    generateAllChaptersCta: 'Generate Full Manuscript (Content Studio) →',

    // Content Studio
    contentStudioTitle: 'Long-Form Content Studio',
    contentStudioSubtitle: 'Deep editorial generator with continuous chapter memory & reference grounding',
    selectChapterLabel: 'Select Chapter to Inspect or Generate:',
    generateCurrentChapterBtn: 'Generate This Chapter',
    regenerateChapterBtn: 'Regenerate Chapter',
    chapterStatusCompleted: 'Chapter Completed',
    chapterStatusPending: 'Draft Pending',

    // Workbook Studio
    workbookTitle: 'Companion Toolkits & Fillable Resources',
    workbookSubtitle: 'Done-for-you worksheets, automated spreadsheets, calendars, and cheat sheets',
    downloadToolkitFile: 'Download Tool Template',

    // Quality Assurance (Gate C)
    qaTitle: 'Quality Assurance & Publication Audit (Gate C)',
    qaSubtitle: 'Strict evaluation against hallucination risks, completeness, depth, and actionable utility',
    qaScoreLabel: 'Overall Publication Readiness Score',
    approveGateCCta: 'Approve Gate C & Proceed to Launch & Export →',
    gateCApprovedBadge: 'Gate C Approved',

    // Brand Design
    brandTitle: 'Brand Design & Manuscript Styling',
    brandSubtitle: 'Visual identity, typography pairings, color palette, and layout principles',

    // Pricing & Launch
    pricingTitle: 'Pricing Strategy & Sales Copy Suite',
    pricingSubtitle: '3-tier pricing ladder, sales page headlines, hero pitch, FAQs, and launch sequence',

    // Export Center
    exportTitle: 'Export & Download Center',
    exportSubtitle: 'Download your digital product package as clean Markdown, structured JSON, or printable document',
  },
  zh: {
    // Header
    appName: 'Digital Product Studio',
    subtitle: '逐階段研究、撰寫與審查',
    exportProduct: '匯出產品',
    aiSettings: 'AI 模型與 API 金鑰',
    activeProject: '目前專案',
    untitledProject: '未命名數位商品專案',

    // Sidebar
    pipelineProgress: '全自動製作進度',
    sources: '文獻',
    chapters: '章節',
    words: '字數',
    openrouterReady: '多模型支援就緒',
    groupStart: '專案起點',
    groupResearch: '市場研究與選題 (Gate A)',
    groupStrategy: '策略企劃與文獻 (Gate B)',
    groupContent: '內容與實作工具',
    groupPolish: '品質與上市 (Gate C)',
    groupSettings: '設定與系統',

    navDashboard: 'Dashboard 總覽',
    navNewProject: '建立新專案',
    navMarketResearch: '市場情報引擎 MTRE',
    navTopicSelection: '熱門題材推薦 (Gate A)',
    navProjectBrief: '13項專案設定',
    navUvz: '獨特價值區 UVZ',
    navTransformationMap: '客戶轉變地圖',
    navReferenceLibrary: '來源研究 (Gate B)',
    navProductCharter: '產品憲章 (Gate B)',
    navOutlineBuilder: '章節大綱規劃',
    navContentStudio: '長篇內容工廠',
    navWorkbookStudio: '實作工具與伴隨套件',
    navQualityAssurance: '品質審查 (Gate C)',
    navBrandDesign: '品牌排版外觀',
    navPricingLaunch: '定價與銷售文案',
    navExportCenter: '匯出下載中心',
    navMyProjects: '我的專案庫',
    navAiSettings: 'AI 模型與 API 設定',
    navAutomationSettings: '工作流程與審查設定',

    // Statuses
    statusNotStarted: '未開始',
    statusReady: '就緒',
    statusRunning: '執行中',
    statusCompleted: '已完成',
    statusNeedsReview: '待確認',
    approved: '已核准',
    pending: '待核准',

    // Blank State
    blankProjectNotice: '目前為全新空白專案',
    blankProjectDesc: '你正在使用空白專案。你可以立即執行市場情報引擎尋找高潛力數位產品，或一鍵載入《28天平價家庭餐桌計畫》官方完整範例了解各階段產出標準。',
    loadDemoTemplate: '載入範例：28-Day Budget Family Meal Plan',
    startFromScratch: '從空白開始建立',
    runMarketResearchNow: '立即啟動市場情報調查',

    // Gates
    gateA: 'Gate A — 題材核准',
    gateB: 'Gate B — 產品策略與憲章',
    gateC: 'Gate C — 品質審查與出版',

    // Common Actions
    acceptAll: '全部核准並繼續',
    saveDraft: '儲存草稿',
    generateChapter: '生成本章內容',
    regenerate: '重新分析',
    downloadAll: '一鍵批次下載全部檔案',
    downloadFile: '下載此檔案',
    testConnection: '測試連線',
    saveSettings: '儲存設定',
    refresh: '重新整理市場訊號',
    refreshing: '正在分析平台資料...',

    // Market Research (MTRE)
    mtreTitle: '市場情報與真實銷售平台監測 (MTRE)',
    mtreSubtitle: '搜尋並比對 Amazon Kindle, Apple Books, Gumroad, Payhip, Etsy 等平台之公開商品與排名資料',
    allPlatforms: '全部平台',
    searchMarketplacePlaceholder: '搜尋商品標題、作者或類別...',
    priceLabel: '觀察價格',
    rankLabel: '公開排名',
    ratingLabel: '評分',
    reviewsLabel: '評價數',
    evidenceLevel: '證據等級',
    dataLimitationNotice: '平台資訊透明度與限制提示：',
    openOriginalListing: '查看原始商品頁 ↗',
    noObservationsFound: '目前尚無市場觀測資料。點擊下方按鈕啟動多平台自動化市場情報發掘。',
    runDiscoveryBtn: '立即啟動市場情報調查與多平台爬梳',
    goToGateABtn: '查看推薦題材 (Gate A) →',
    syncMarketToIntelligenceBtn: '同步市場情報 → 演算推薦題材 (Gate A)',
    prioritizeSignalBtn: '以此市場信號為 #1 優先推薦',
    prioritizedSignalBadge: '來自市場信號優先對應',
    synchronizedFromMtreBadge: '已同步自市場情報引擎 (MTRE)',
    syncStatsSummary: '已連結排行榜快照：請審查原站、排行範圍與擷取時間。評分僅依觀測排名，不代表銷售速度或營收。',
    mtreSynthesisTitle: '市場情報綜合判讀與商機矩陣',
    detectedMarketLeader: '市場信號增長冠軍',
    linkedMarketSignal: '對應市場觀測信號',
    reSyncCta: '依市場信號重新同步',

    // Topic Recommendations (Gate A)
    topicTitle: 'AI 推薦數位產品題材與商機評分 (Gate A)',
    topicSubtitle: '根據目前排行榜證據提出原創題材；尚未觀測的指標不予評分',
    runMarketDiscoveryCta: '自動搜尋並統計暢銷題材方向',
    opportunityScoreLabel: '商機總分',
    scoreBreakdownLabel: '評分細項拆解',
    targetAudienceLabel: '目標客群',
    coreProblemLabel: '痛點問題',
    bigPromiseLabel: '核心承諾',
    suggestedFormatLabel: '建議產品形式',
    priceTestingRangeLabel: '定價測試區間',
    testTier: '測試價',
    regularTier: '常態價',
    bundleTier: '套件旗艦價',
    differentiationLabel: '獨特切入差異化',
    companionAssetsLabel: '規劃伴隨工具與交付物',
    selectAndPropagateBtn: '選定題材並初始化新的研究計畫',
    topicSelectedBadge: '已選定題材',
    approveGateACta: '核准選定題材並進入 13 欄位 (Gate A) →',
    gateAApprovedBadge: 'Gate A 題材已核准',

    // 13 Fields (Project Brief)
    briefTitle: '13項專案設定 (Project Brief — 13 Fields)',
    briefSubtitle: '選定題材後系統全自動產生之 13 項標準欄位，可直接使用或單欄客製微調',
    part1Title: '第一部分：創作者背景與專案身分 (欄位 1 – 6)',
    part2Title: '第二部分：客群與轉變策略 (欄位 7 – 10)',
    part3Title: '第三部分：外觀風格、安全邊界與定價 (欄位 11 – 13)',
    approveBriefCta: '全部核准並進入 UVZ →',

    // UVZ
    uvzTitle: '獨特價值區 (UVZ Analysis)',
    uvzSubtitle: '綜整買家核心難題、創作者優勢與市場空白切入點',
    buyerProblemsTitle: '買家痛點問題',
    solutionsTitle: '核心解決架構',
    positioningTitle: '定位角度與市場角色',
    selectPositioningBtn: '選擇此定位',
    approveUvzCta: '確認 UVZ 並進入客戶轉變地圖 →',

    // Transformation Map
    mapTitle: '客戶轉變地圖 (Transformation Map)',
    mapSubtitle: '搭建從現狀痛點通往賦能成果的情感與實質橋樑',
    beforeStateTitle: '1. 現狀痛點與日常消耗 (Before State)',
    bridgeProcessTitle: '2. 橋樑方法論與關鍵里程碑 (The Bridge)',
    afterStateTitle: '3. 賦能狀態與實質收穫 (After State)',
    titleOptionsTitle: '書名與副標題切入備選',
    selectTitleBtn: '選定書名',
    approveMapCta: '確認轉變地圖並進入自動文獻庫 →',

    // Reference Library (ARCE)
    refTitle: '來源研究與證據審查',
    refSubtitle: '具有論點、支持摘錄及章節配置的主題文獻紀錄',
    verifiedCardsCount: '已取回並審查的來源紀錄',
    sevenPartStandard: '嚴格 7 部分標準：標題、簡介、大綱、實作框架、文獻摘要、編輯指引、品牌規範',
    searchRefPlaceholder: '依支柱、標題或關鍵字搜尋文獻...',
    allPillars: '全部支柱',

    // Product Charter (Gate B)
    charterTitle: '產品憲章 (Gate B 策略與架構核准)',
    charterSubtitle: '17 項不可更動之核心品質標準與四大內容支柱',
    approveGateBCta: '核准 Gate B 產品憲章並進入章節大綱 →',
    gateBApprovedBadge: 'Gate B 策略憲章已核准',

    // Outline Builder
    outlineTitle: '章節大綱規劃與篇幅佈局',
    outlineSubtitle: '各章目標字數、學習目標、實作交付物與文獻對應',
    totalTargetWordCount: '目標總字數',
    actualWordCount: '目前完稿字數',
    generateAllChaptersCta: '進入長篇內容工廠 (Content Studio) →',

    // Content Studio
    contentStudioTitle: '長篇內容工廠 (Content Studio)',
    contentStudioSubtitle: '具備章節間連續記憶與文獻接地之長篇深度編輯器',
    selectChapterLabel: '選擇要檢視或產生的章節：',
    generateCurrentChapterBtn: '生成本章內容',
    regenerateChapterBtn: '重新生成',
    chapterStatusCompleted: '本章已完稿',
    chapterStatusPending: '草稿待生成',

    // Workbook Studio
    workbookTitle: '實作工具與伴隨套件 (Workbook & Resource Suite)',
    workbookSubtitle: '即開即用之填空工作表、自動計算試算表、採購清單與備忘卡',
    downloadToolkitFile: '下載工具範本',

    // Quality Assurance (Gate C)
    qaTitle: '品質審查與出版驗收 (Gate C)',
    qaSubtitle: '針對事實幻覺、結構完整性、內容深度與實用度之嚴格稽核',
    qaScoreLabel: '出版就緒品質評分',
    approveGateCCta: '核准 Gate C 並進入定價與匯出中心 →',
    gateCApprovedBadge: 'Gate C 品質稽核已通過',

    // Brand Design
    brandTitle: '品牌排版外觀與視覺風格',
    brandSubtitle: '品牌色票、字體搭配方向、視覺階層與封面版面規範',

    // Pricing & Launch
    pricingTitle: '定價階梯與銷售文案庫',
    pricingSubtitle: '三層定價策略、銷售頁主標、購買須知、常見問題與 30 天發布計畫',

    // Export Center
    exportTitle: '匯出下載中心 (Export Center)',
    exportSubtitle: '一鍵下載 Markdown、結構化專案 JSON 或完整印刷出版格式',
  },
};
