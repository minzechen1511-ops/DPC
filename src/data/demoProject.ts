import { DigitalProductProject } from '../types/project.ts';

export const DEMO_PROJECT: DigitalProductProject = {
  schemaVersion: '4.0',
  projectId: 'proj_budget_meal_planning_2026',
  name: '28-Day Budget Family Meal Plan',
  createdAt: '2026-11-10T08:00:00Z',
  updatedAt: '2026-11-10T11:30:00Z',
  preferences: {
    market: 'US',
    language: 'English',
    productFormat: 'ebook_toolkit',
    automationMode: 'manual_review',
    referenceTarget: 20,
    autoApproveNonCritical: false,
  },
  workflow: {
    activeStage: 'market_research',
    stageStatuses: {
      market_research: 'COMPLETED',
      topic_selection: 'COMPLETED',
      project_brief: 'COMPLETED',
      uvz: 'COMPLETED',
      transformation_map: 'COMPLETED',
      reference_library: 'COMPLETED',
      product_charter: 'COMPLETED',
      outline_builder: 'COMPLETED',
      content_studio: 'COMPLETED',
      workbook_studio: 'COMPLETED',
      quality_assurance: 'COMPLETED',
      brand_design: 'COMPLETED',
      pricing_launch: 'COMPLETED',
      export_center: 'READY',
    },
    gates: {
      gateA: {
        gate: 'GATE_A_TOPIC',
        isApproved: true,
        approvedAt: '2026-11-10T08:15:00Z',
        requiredFor: ['project_brief', 'reference_library', 'uvz', 'transformation_map'],
      },
      gateB: {
        gate: 'GATE_B_STRATEGY',
        isApproved: true,
        approvedAt: '2026-11-10T08:35:00Z',
        requiredFor: ['outline_builder', 'content_studio', 'workbook_studio', 'brand_design', 'pricing_launch'],
      },
      gateC: {
        gate: 'GATE_C_QUALITY',
        isApproved: true,
        approvedAt: '2026-11-10T11:00:00Z',
        requiredFor: ['export_center'],
      },
    },
    isAutopilotRunning: false,
    lastCheckpoint: '2026-11-10T11:30:00Z',
  },
  marketResearch: {
    researchDate: '2026-11-10',
    confidence: 'HIGH',
    platformEvidence: [
      {
        id: 'OBS-01',
        marketplace: 'Amazon Kindle',
        category: 'Cookbooks, Food & Wine > Cooking on a Budget',
        productTitle: 'Budget Meals for Busy Families: 100 Simple Dinners Under $10',
        sellerOrAuthor: 'Elena Rostova',
        productURL: 'https://amazon.com/dp/example1',
        currentPrice: 12.99,
        currency: 'USD',
        observedRank: 4,
        rankScope: 'Category Top 100',
        reviewCount: 1420,
        rating: 4.6,
        productFormat: 'Kindle Ebook',
        observedAt: '2026-11-09',
        evidenceLevel: 'VERIFIED_RANKING',
        dataLimitations: '平台僅揭示類別排名與公開評價數，非官方精確成交冊數。',
      },
      {
        id: 'OBS-02',
        marketplace: 'Gumroad',
        category: 'Food & Cooking > Family Meal Planners',
        productTitle: 'The $75 Weekly Family Dinner Matrix (Printable PDF + Notion)',
        sellerOrAuthor: 'Sarah Jenkins',
        productURL: 'https://gumroad.com/l/example2',
        currentPrice: 19.0,
        currency: 'USD',
        observedRank: 12,
        rankScope: 'Trending in Food',
        reviewCount: 310,
        rating: 4.9,
        productFormat: 'PDF Ebook + Notion + Printable Sheets',
        observedAt: '2026-11-08',
        evidenceLevel: 'FEATURED_COLLECTION',
        dataLimitations: '創作者宣稱銷量逾 5,000 套，無第三方審計銷量確認。',
      },
      {
        id: 'OBS-03',
        marketplace: 'Etsy',
        category: 'Digital Planners > Meal Planners & Grocery Lists',
        productTitle: 'Minimalist Family Meal & Grocery Budget Planner (GoodNotes/Printable)',
        sellerOrAuthor: 'PaperNestStudio',
        productURL: 'https://etsy.com/listing/example3',
        currentPrice: 8.5,
        currency: 'USD',
        observedRank: 2,
        rankScope: 'Bestseller in Digital Meal Planners',
        reviewCount: 4890,
        rating: 4.8,
        productFormat: 'Digital PDF Bundle',
        observedAt: '2026-11-09',
        evidenceLevel: 'VERIFIED_RANKING',
        dataLimitations: 'Etsy 標示 Bestseller 徽章，統計包含不同子規格評價。',
      },
      {
        id: 'OBS-04',
        marketplace: 'Apple Books',
        category: 'Cookbooks, Food & Wine > Quick & Easy',
        productTitle: 'Zero Waste Weeknight Dinners: Stretch Ingredients & Save $200/Month',
        sellerOrAuthor: 'Markus Chen',
        productURL: 'https://books.apple.com/us/book/example4',
        currentPrice: 9.99,
        currency: 'USD',
        observedRank: 18,
        rankScope: 'US Food Chart',
        reviewCount: 240,
        rating: 4.5,
        productFormat: 'Apple EPUB',
        observedAt: '2026-11-07',
        evidenceLevel: 'VERIFIED_RANKING',
        dataLimitations: 'Apple Books 排行榜變動頻繁，無歷史庫存資料。',
      },
      {
        id: 'OBS-05',
        marketplace: 'Payhip',
        category: 'Ebooks > Parenting & Lifestyle',
        productTitle: 'The 4-Week Family Pantry Reset & Meal System',
        sellerOrAuthor: 'FamilyTablePress',
        productURL: 'https://payhip.com/b/example5',
        currentPrice: 15.0,
        currency: 'USD',
        observedRank: 8,
        rankScope: 'Lifestyle Bestsellers',
        reviewCount: 95,
        rating: 4.7,
        productFormat: 'PDF + Excel Spreadsheet',
        observedAt: '2026-11-06',
        evidenceLevel: 'SEARCH_RESULT',
        dataLimitations: '銷售數據來自平台公開商店展示。',
      },
    ],
    topicCandidates: [
      {
        id: 'TOPIC-01',
        title: '28-Day Budget Family Meal Plan',
        subtitle: 'Affordable Dinners, Smarter Grocery Shopping & Less Food Waste',
        targetAudience: '忙碌家庭（3–5人），每週食材預算有限但重視營養多樣性與料理效率的家長',
        coreProblem: '高通膨下家庭晚餐支出失控、食材重複採購且經常腐壞過期、每天下班下課不知煮什麼的心力負擔',
        bigPromise: '建立 28 天免思考平價晚餐體系，每週控制晚餐食材支出在 $75-$95，減少 40% 食物浪費',
        suggestedFormat: 'ebook_toolkit',
        priceTestRange: {
          test: 9.99,
          regular: 14.99,
          premium: 19.99,
        },
        marketEvidenceSummary: 'Amazon 預算料理與 Etsy 餐食規劃表格長青高需求；讀者最痛點在於「食譜缺少每週連貫採購單」及「單次大量食材無法跨餐消耗」。',
        competitiveDensity: 'MEDIUM',
        differentiationAngle: '「食材接力鏈 (Ingredient Relay)」— 週一未用完的香草與蔬菜自動轉入週二週三，結合整合採購清單與食物保存防浪費指南。',
        creationComplexity: 'MODERATE',
        potentialCompanions: ['4週整合購物清單', '平價食材替換速查卡', '冰箱庫存即食盤點表', '食物防浪費保存手冊'],
        confidenceRating: 'VERY_HIGH',
        opportunityScore: 94.5,
        scoreBreakdown: {
          demandSignal: 24.5,
          problemUrgency: 14.5,
          competitionEntry: 14.0,
          differentiation: 14.5,
          creatorFit: 9.5,
          audienceReach: 9.5,
          digitalFit: 5.0,
          costRisk: 5.0,
        },
        badge: 'BEST_OVERALL',
        recommendationReason: '需求極高、經濟通膨壓力下的剛需題材，兼具食譜專書與實用工具套件（Toolkit）屬性，具備極強購買轉換力。',
        sourceObservationIds: ['OBS-01', 'OBS-02', 'OBS-03', 'OBS-04', 'OBS-05'],
      },
      {
        id: 'TOPIC-02',
        title: 'The 15-Minute Freezer Prep Matrix',
        subtitle: 'Batch Cooking Once a Week for 5 Stress-Free Dinners',
        targetAudience: '雙薪全職上班族家庭、下班後僅有 20 分鐘備餐時間的父母',
        coreProblem: '平日下班身心俱疲，外送費用高昂且不健康，傳統批量備餐耗費整個週末時間',
        bigPromise: '利用週末 90 分鐘一次備好 5 道冷凍半成品，平日 15 分鐘快煮上桌',
        suggestedFormat: 'ebook_toolkit',
        priceTestRange: { test: 9.99, regular: 14.99, premium: 22.0 },
        marketEvidenceSummary: 'YouTube 與 Pinterest 關於 Freezer Meals 的搜尋量暴增，但市場多數電子書缺少冷藏解凍安全時效規範。',
        competitiveDensity: 'MEDIUM',
        differentiationAngle: '冷凍真空與保鮮盒安全標籤系統，專門針對 3-5 人份量優化的小家庭模組。',
        creationComplexity: 'MODERATE',
        potentialCompanions: ['冷凍標籤可列印 PDF', '解凍復熱快速對照卡'],
        confidenceRating: 'HIGH',
        opportunityScore: 88.0,
        scoreBreakdown: {
          demandSignal: 22.0,
          problemUrgency: 13.5,
          competitionEntry: 14.0,
          differentiation: 12.5,
          creatorFit: 9.0,
          audienceReach: 9.0,
          digitalFit: 5.0,
          costRisk: 5.0,
        },
        badge: 'EASIEST_TO_LAUNCH',
        recommendationReason: '製作架構精確，流程直觀，非常容易在社群短影音與電郵名單中引爆銷售。',
        sourceObservationIds: ['OBS-01', 'OBS-04'],
      },
      {
        id: 'TOPIC-03',
        title: 'Zero-Waste Kitchen Cash-Back Blueprint',
        subtitle: 'Turn Leftovers into Gourmet Dinners & Save $2,500/Year',
        targetAudience: '講求環境永續、精打細算、渴望徹底終結冰箱廚餘腐壞問題的生活家長',
        coreProblem: '美國家庭每年因食物浪費平均損失 $1,800-$2,200，冰箱深處常年累積被遺忘的發霉食材',
        bigPromise: '掌握廚餘逆轉烹調法與剩料升級食譜，使家庭食材利用率達到 95% 以上',
        suggestedFormat: 'ebook_toolkit',
        priceTestRange: { test: 12.99, regular: 19.99, premium: 29.99 },
        marketEvidenceSummary: '永續生活愛好者黏著度極高，願為高質感設計與系統化指南支付較高溢價。',
        competitiveDensity: 'LOW',
        differentiationAngle: '「食材全利用烹飪科學」與「剩餘根莖骨頭熬湯底公式」，兼具生活質感與省錢實證。',
        creationComplexity: 'COMPLEX',
        potentialCompanions: ['剩料救援速查表', '全食材自製高湯與醃漬手冊'],
        confidenceRating: 'HIGH',
        opportunityScore: 86.5,
        scoreBreakdown: {
          demandSignal: 20.0,
          problemUrgency: 12.5,
          competitionEntry: 13.0,
          differentiation: 15.0,
          creatorFit: 8.5,
          audienceReach: 8.5,
          digitalFit: 5.0,
          costRisk: 4.0,
        },
        badge: 'HIGH_DIFFERENTIATION',
        recommendationReason: '具備頂級差異化切角，可包裝為高客單價的永續居家生活套組。',
        sourceObservationIds: ['OBS-04', 'OBS-05'],
      },
    ],
    selectedTopicId: 'TOPIC-01',
  },
  intake: {
    projectName: '28-Day Budget Family Meal Plan',
    creatorName: 'The Smart Family Table (聰明家庭餐桌研究室)',
    experienceLevel: 'ADVANCED',
    relevantExperience: '10 年以上家庭膳食經濟學、食譜研發、食品採購與家庭營養諮詢實務經驗。',
    expertise: '家庭預算編列、批次備餐流程設計、食材保鮮保存技術、家庭營養平衡調配。',
    interests: '平價料理、食物零浪費實踐、快節奏生活下的餐桌生活儀式感。',
    targetAudience: '生活步調緊湊、育有 1-3 名子女（家庭總人數 3–5 人）、希望控制伙食開銷且兼顧全家營養的忙碌家長。',
    problemsSolved: '解決晚餐食材採購昂貴、冰箱經常囤積壞掉蔬菜、天天為晚餐煮什麼焦慮、下班後料理過於耗時耗力的四大痛點。',
    productIdea: '一套結合 28 道完整晚餐食譜、4 週統整採購單、食材連鎖消耗鏈與實用列印工具的數位產品工具套組（Ebook + Toolkit）。',
    desiredTransformation: '從「每天下班手忙腳亂、採購浪費、外送破費」轉變為「食材物盡其用、每週省下 $50-$75、晚餐 30 分鐘輕鬆開飯的從容家庭」。',
    brandStyleAndVoice: {
      personality: '溫暖、具同理心、實用務實、結構嚴謹且賦能激勵（Warm & Family-Friendly Professional）。',
      primaryColor: '#0F172A', // Slate 900
      secondaryColor: '#10B981', // Emerald 500
      accentColor: '#F59E0B', // Amber 500
      typographyDirection: '標題清晰沉穩 (Plus Jakarta Sans)，內文易讀溫馨，數據與表格整齊 (JetBrains Mono)。',
      writingVoice: '像是一位懂料理、懂精打細算又體諒忙碌生活的好友教練；杜絕高高在上的專業說教，給予具體可落地的解方。',
      emotionalPositioning: '重掌家庭餐桌與荷包自主權的踏實感與幸福感。',
      stylesToAvoid: '避免繁複奢華難尋的高價特殊香料、避免過度理想化的全職主廚料理手法、避免未經說明的複雜工序。',
    },
    constraintsAndExclusions: {
      productBoundaries: '聚焦於平日週一至週日晚餐與採購規劃；不涵蓋昂貴外宴或特殊醫療處方飲食。',
      accuracyStandards: '所有食材價格均標明基準採購年份（以 2024-2026 美國平價超市主流價格如 Aldi, Walmart, Trader Joe’s 為基準範例）；明確指出地區價格差異性。',
      safetyRules: '嚴格遵守 USDA 與 FDA 食品安全指引（禽肉烹煮內部核心溫度 165°F / 74°C、碎牛肉 160°F、剩菜 2 小時內冷藏）。',
      copyrightAttribution: '所有食譜與框架均為原創研發與編輯整合；涉及官方數據或文獻研究均清楚註明機構出處。',
      claimsToAvoid: '不得宣稱「全家整週所有三餐零食只需 $75」（明確界定僅為 5-7 天晚餐食材預算）；不得在未經個別醫療諮詢下宣稱療效。',
      verificationRequirements: 'AI 生成食譜應註明家庭常備測試建議，標註過敏原提示（如花生、麩質、乳製品、蛋類）。',
    },
    recommendedPrice: {
      introductoryTest: 9.99,
      regular: 14.99,
      premiumBundle: 19.99,
      currency: 'USD',
      rationale: '在 Amazon Kindle 與 Etsy 同類商品中，$14.99 位於最佳性價比甜區；以「第一週現省 $50 食材費」為價值錨點，回本率超過 300%。',
      validationMethod: '首發 100 份測試 $9.99，搭配完整可列印 Toolkit 豪華包定價 $19.99 進行 A/B 轉換測試。',
    },
  },
  uvz: {
    buyerProblems: [
      '每次去超市採購缺乏精確規劃，結帳常破百美元，但回家依然湊不出完整幾頓晚餐。',
      '買了一把新鮮芫荽或一整袋西芹，只用兩根，剩下的在保鮮盒爛成菜泥。',
      '工作一整天後大腦枯竭，面對全家嗷嗷待哺，只能妥協花費 $40-$60 點油膩外送。',
      '試過網路零碎食譜，食材清單互不相容，導致採購成本反而大幅增加。',
    ],
    potentialSolutions: [
      '提供預先排定的 28 天晚餐輪替行事曆，免除每日決策疲勞。',
      '設計「食材連鎖接力法 (Relay Ingredients)」：同一批生鮮在 3 天內巧妙跨餐烹調消耗完畢。',
      '提供分區分類（蔬果、蛋白質、乾貨、乳製品）的合併採購清單，省時省力。',
      '附贈 30 分鐘快煮手法與平價食材替代公式，適應不同家庭口味。',
    ],
    creatorExpertiseFit: '將專業家庭預算分析能力與大眾化料理教學相結合，將複雜的食材供應鏈思維轉化為小家庭每日可操作的直覺工具。',
    commercialFeasibility: '數位交付成本極低（零邊際成本），邊際利潤高達 90% 以上；可列印 PDF + 數位試算表深受家庭主婦與忙碌父母歡迎。',
    differentiationOpportunities: [
      '多數食譜書只有單道菜餚；本產品以「週 (Week)」為單元，每週食譜之間高度共用基底食材，真正達到「零落單食材浪費」。',
      '包含 USDA 食安規範的生熟食分裝手冊，提升專業信賴感。',
      '提供「平價 vs. 有機」彈性預算切換開關，適應不同消費階層。',
    ],
    positioningOptions: [
      {
        id: 'POS-01',
        name: '平價高效家庭餐桌系統 (Recommended)',
        angle: '兼顧省錢、健康與快速備餐的 28 天晚餐解方，專為時間金錢緊縮的 3-5 人家庭量身打造。',
        targetPersona: '育兒全職或雙薪上班族父母，每晚備餐時間低於 40 分鐘。',
        promise: '每週晚餐預算鎖定在 $75-$95，每晚 30 分鐘熱騰騰營養開飯，食物浪費降至趨近於零。',
        pros: '痛點剛需強烈、受眾群體龐大、回本說服力極高、行銷文案極易切入。',
        risks: '需要確保食譜真正可口且容易採購到平價食材。',
        isRecommended: true,
      },
      {
        id: 'POS-02',
        name: '極簡廚房食材零浪費指南',
        angle: '著重環保、永續廚房、全食材烹飪技巧與剩料升級法。',
        targetPersona: '高教育程度、環保意識強烈、反感廚餘浪費的都市新家庭。',
        promise: '徹底掌握食材 95% 全利用法則，一年為家庭省下上千美元廚餘隱形浪費。',
        pros: '品牌溢價較高，易於吸引生活風格部落客推薦。',
        risks: '相較於「省錢快煮」，受眾規模略小，急迫性略遜於日常開銷減輕。',
        isRecommended: false,
      },
      {
        id: 'POS-03',
        name: '30分鐘省錢快煮料理包',
        angle: '純粹強調快速出餐、大份量、高飽足感與超低門檻。',
        targetPersona: '注重時間大於一切、料理新手家長、大胃王成長期青少年家庭。',
        promise: '免廚藝、不洗堆積如山的鍋碗瓢盆，一鍋到底與烤盤快煮。',
        pros: '進入門檻極低，衝動型購買比例高。',
        risks: '市場既有同質性競品較多，需靠更強的社群包裝突出重圍。',
        isRecommended: false,
      },
    ],
    selectedOptionId: 'POS-01',
  },
  transformationMap: {
    beforeState: {
      currentPains: [
        '每週採購花費 $200+，但到了週四冰箱滿是發黃爛葉，全家不知吃什麼。',
        '下班回家像打仗，廚房一片狼藉，煮一頓飯花費 1.5 小時，身心俱疲。',
        '每週叫外送 2-3 次，每個月晚餐額外花費 $300-$500，荷包失血罪惡感深重。',
      ],
      anxietiesAndFrustrations: [
        '擔心孩子吃不夠均衡蔬菜蛋白質，卻又不想花費大量時間洗切煮。',
        '對通膨物價感到無力，覺得省錢就等於吃得寒酸無味。',
      ],
      flawedAlternatives: [
        '訂閱高價料理食材包（Meal Kits，每人每餐 $10-$14，4人一餐要 $40-$56）。',
        '隨機上網搜尋食譜，結果每次買一堆少見香料調味料，用一次就束之高閣。',
      ],
      dailyDrainCost: '每個月浪費 $150+ 腐壞食材、額外支出 $350+ 外送費、每天浪費 45 分鐘在餐前焦慮。',
    },
    bridgeProcess: {
      coreMethodology: '「4-Pillar Smart Relay System (四維聰明接力膳食法)」：批次基礎備料、跨餐共用食材鏈、一鍋省時烹調、冷凍生鮮保鮮庫存管銷。',
      signatureFrameworkName: 'SMART DINNER MATRIX (聰明晚餐矩陣)',
      keyMilestones: [
        '第 1 階段：全家 15 分鐘冰箱與乾貨庫存盤點 (Pantry Reset)',
        '第 2 階段：掌握每週一次的高效分類採購單 (Master Grocery Run)',
        '第 3 階段：啟動第一週 7 道無縫接力晚餐 (Week 1 Relay Dinners)',
        '第 4 階段：熟練冷凍備料與食材替換公式，形成全自動家庭運作習慣',
      ],
      practicalTools: [
        '每週 $85 食材採購分配表',
        '28 道晚餐食譜卡與過敏原對照表',
        '冰箱食材保鮮天數速查圖',
        '食材替代彈性矩陣 (Protein & Veggie Swaps)',
      ],
      obstacleBypasses: [
        '挑食小孩不吃蔬菜？每道食譜附「挑食友善調整選項 (Kid-Friendly Tweaks)」。',
        '某種食材買不到或太貴？查閱「同等口感平價替代清單」。',
      ],
    },
    afterState: {
      tangibleOutcomes: [
        '全家每週晚餐食材開銷穩定控制在 $75-$95 區間，每個月淨省 $250-$400。',
        '冰箱一目了然，食材損耗浪費率從 35% 降至 5% 以下。',
        '平日每晚平均 25-35 分鐘開飯，晚餐時間不再充斥爭吵與焦躁。',
      ],
      acquiredCapabilities: [
        '懂得看超市特價單反推一週菜單，具備終身受用的食材經濟眼光。',
        '學會以「一底多用 (Base-Batching)」方式高效率烹調，廚房清潔量減半。',
      ],
      completedDeliverables: [
        '建立專屬全家口味的 28 天四季晚餐輪換資料夾。',
        '保存可永久重複利用的高效採購與庫存列印工具組。',
      ],
      measurableMetrics: [
        '食材支出下降 35%-40%',
        '外送頻率從每週 3 次降至每月少於 2 次',
        '每晚備餐時間節省 30 分鐘',
      ],
    },
    titleOptions: [
      {
        id: 'TITLE-01',
        title: '28-Day Budget Family Meal Plan',
        subtitle: 'Affordable Dinners, Smarter Grocery Shopping & Less Food Waste',
        rationale: '直觀易懂、涵蓋核心關鍵字（Budget, Family, Meal Plan, Dinners, Grocery, Food Waste），利於搜尋與直接傳達價值。',
        isRecommended: true,
      },
      {
        id: 'TITLE-02',
        title: 'The Smart Family Table: Dinner Edition',
        subtitle: 'How to Feed a Family of 4 for Under $90 a Week Without the Stress',
        rationale: '強調品牌調性與具體數字錨點（$90/週），對數字敏感型買家極具吸引力。',
        isRecommended: false,
      },
      {
        id: 'TITLE-03',
        title: 'Dinner Solved: The Zero-Waste Family Guide',
        subtitle: '28 Delicious Dinners, Master Shopping Lists & Big Grocery Savings',
        rationale: '以行動動詞「Dinner Solved」出發，訴求立即解除痛點。',
        isRecommended: false,
      },
    ],
    selectedTitleId: 'TITLE-01',
    bigPromise: '給忙碌家庭一套免用大腦的 28 天平價晚餐作戰計畫：每週食材支出鎖定 $75-$95，每晚 30 分鐘開飯，一年省下逾 $3,000 食材與外送費用。',
    uniqueSellingProposition: '不只是食譜書，而是結合「食材接力鏈」與「採購連鎖單」的實作工具套裝（Toolkit），買一次就能終生循環使用的家庭餐桌運作系統。',
  },
  referenceLibrary: {
    targetCount: 20,
    verifiedCount: 20,
    status: 'COMPLETED',
    coveragePillars: {
      'Budget & Economic Benchmarks': 4,
      'Food Waste & Storage Science': 4,
      'Nutrition & Dietary Balance': 4,
      'Meal Prep & Time-Saving Systems': 4,
      'Food Safety & Temperature Standards': 4,
    },
    cards: [
      {
        id: 'REF-01',
        title: 'USDA Thrifty Food Plan Monthly Cost Benchmarks (2024-2026)',
        description: '美國農業部（USDA）官方發布之節儉飲食計畫（Thrifty Food Plan），提供 3-5 人家庭在維持營養均衡前提下之最低月食物預算基準。',
        contentOutline: ['預算等級劃分（Thrifty, Low, Moderate, Liberal）', '家庭人口加權公式', '基本營養素最低支出結構'],
        practicalFramework: {
          name: 'USDA Thrifty Tier Allocation Matrix',
          editorialOrigin: '由編輯團隊將 USDA 原始宏觀膳食預算數據綜合整理為每週分類採購矩陣（非 USDA 專利版權主張）',
          actionSteps: [
            '確認家庭成員年齡與加權係數計算每人每餐基準（約 $2.10-$2.80/餐）',
            '採購支出配比：生鮮蔬果 32%、優質蛋白 28%、穀物乾貨 22%、乳品與基礎調味 18%',
            '每月比對區域物價調整，保留 10% 彈性緩衝款',
          ],
        },
        researchSummary: '根據 USDA 營養政策中心數據，一個 4 人家庭（兩名成人與兩名學齡兒童）在 Thrifty 規範下的月食材預算約為 $970-$1,020（平均每人每日約 $8.20，其中晚餐份額約佔 40%-45% 即 $13-$16/天，約合每週 5-7 天晚餐預算 $75-$95）。這證實了本產品每週 $85 晚餐目標在科學與營養數據上的可行性。',
        editorialNotes: {
          targetChapters: ['Chapter 1', 'Chapter 2'],
          exerciseSuggestions: ['設定家庭每週食材警戒線'],
          worksheetIntegration: '整合進「每週採購預算分配表」',
          verificationNotes: '數據依據 USDA 官方公告公開報告，非推測值。',
        },
        brandGuidelines: {
          toneApplication: '專業客觀、提供科學數字底氣，避免責怪家庭過去支出過多。',
          visualDirection: '以圓餅圖呈現預算百分比配比。',
          audienceFraming: '讓家長明白「吃得好不代表需要花大錢，而是有依據的分配」。',
        },
        sourceTitle: 'USDA Official Food Plans: Cost of Food at Home',
        publisherOrOrg: 'U.S. Department of Agriculture (Center for Nutrition Policy and Promotion)',
        author: 'USDA Food and Nutrition Service',
        sourceURL: 'https://www.fns.usda.gov/cnpp/usda-food-plans-cost-food-monthly-reports',
        publicationDate: '2024-10-01',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 98,
        pillars: ['Budget & Economic Benchmarks'],
        supportedClaims: ['美國 4 人家庭在營養充足條件下，晚餐最低食材基準可控制在每人每餐 $2.20-$2.80 之間。'],
        rightsNotes: '美國聯邦政府公共領域資訊 (U.S. Public Domain)，可合法引用與衍生分析。',
      },
      {
        id: 'REF-02',
        title: 'EPA Household Food Waste Report & Prevention Guidelines',
        description: '美國環保署（EPA）針對家庭食物浪費之統計分析，揭示蔬果腐爛、過期遺忘與過度採購為造成家庭隱形財務黑洞的主因。',
        contentOutline: ['家庭食物浪費統計與財務折算', '三大常遭丟棄食材類別', '家庭層級防浪費有效干預措施'],
        practicalFramework: {
          name: 'The First-In-First-Out (FIFO) Kitchen System',
          editorialOrigin: '由編輯團隊將商業庫存 FIFO 概念轉化為家庭冷藏冰箱三層收納分區法',
          actionSteps: [
            '設定「即期食用專區 (Eat-First Bin)」於冷藏視線正前方',
            '採購日進行「5 分鐘食材移位」：舊食材前移，新採購後置',
            '葉菜類去水保鮮袋分裝，延緩氧化腐敗 4-7 天',
          ],
        },
        researchSummary: 'EPA 報告指出，美國家庭購買的食物平均有 31.9% 未被食用即被丟棄，平均每年造成每個家庭約 $1,866 美元的金錢損失。其中高達 68% 的可食用食物浪費源於「缺乏每週膳食連貫規劃」及「食材未被及時察覺」。解決此問題是家庭食材預算最快見效的槓桿點。',
        editorialNotes: {
          targetChapters: ['Chapter 1', 'Chapter 7'],
          exerciseSuggestions: ['進行冰箱「即期食材檢閱」'],
          worksheetIntegration: '整合進「食物防浪費保存與檢查清單」',
          verificationNotes: '數據由 EPA 與 USDA 聯合統計審查。',
        },
        brandGuidelines: {
          toneApplication: '充滿希望與實用感，將防浪費視為「找回遺失在垃圾桶的現金」。',
          visualDirection: '清晰的冰箱分層指引圖示。',
          audienceFraming: '強調「不是你不會煮，而是過去缺少一套順手整理架構」。',
        },
        sourceTitle: 'From Farm to Kitchen: The Environmental Impacts of U.S. Food Waste',
        publisherOrOrg: 'U.S. Environmental Protection Agency (EPA)',
        author: 'EPA Office of Research and Development',
        sourceURL: 'https://www.epa.gov/sustainable-management-food',
        publicationDate: '2024-03-15',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 96,
        pillars: ['Food Waste & Storage Science'],
        supportedClaims: ['一般家庭約有近三分之一食材因保存不當或忘記食用而丟棄，透過連貫規劃每年可現省 $1,500 以上。'],
        rightsNotes: '美國政府公開資料，可自由引用。',
      },
      {
        id: 'REF-03',
        title: 'USDA-ARS Food Data Central: Nutrient Density vs. Ingredient Unit Cost',
        description: 'USDA 國家農業研究數據中心（FoodData Central）之全食材營養素與單位成本交叉比對數據庫。',
        contentOutline: ['每美元蛋白質含量排名 (Grams of Protein per Dollar)', '維生素與微量元素高性價比食材', '平價深綠色蔬菜營養對照'],
        practicalFramework: {
          name: 'High-Value Protein & Fiber Swap Matrix',
          editorialOrigin: '編輯團隊依據 USDA 營養資料庫所設計之高營養低單價食材替換矩陣',
          actionSteps: [
            '將昂貴牛肉片以「牛絞肉 50% + 扁豆/黑豆 50%」混炒，熱量與蛋白質不減且成本腰斬',
            '以平價冷凍毛豆、雞胸肉、雞蛋作為週間優質蛋白質底柱',
            '以當季胡蘿蔔、高麗菜、冷凍綠花椰取代嬌貴沙拉生菜',
          ],
        },
        researchSummary: '研究證實，冷凍蔬菜（如綠花椰、玉米粒、青豆）在採收後立即急凍處理，其維生素 C 與葉酸含量經常等同甚至高於經過長途運輸存放多日的昂貴「新鮮」蔬菜，而每磅價格常便宜 40%-60%。善用冷凍蔬菜是控制預算且維持全家免疫力的關鍵秘訣。',
        editorialNotes: {
          targetChapters: ['Chapter 2', 'Chapter 4', 'Chapter 5'],
          exerciseSuggestions: ['練習一次蛋白質混合延伸 (Protein Extension)'],
          worksheetIntegration: '平價食材營養替換速查表',
          verificationNotes: 'USDA-ARS 官方化驗數據。',
        },
        brandGuidelines: {
          toneApplication: '破除迷思，給予安心感。',
          visualDirection: '以對比資訊圖呈現營養素與價格比。',
          audienceFraming: '告訴父母「買冷凍蔬菜不是偷懶或次級，而是科學營養智慧」。',
        },
        sourceTitle: 'FoodData Central Nutrient Profiles and Cost Indices',
        publisherOrOrg: 'Agricultural Research Service (ARS), USDA',
        author: 'USDA-ARS Nutrition Data Laboratory',
        sourceURL: 'https://fdc.nal.usda.gov/',
        publicationDate: '2024-06-20',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 95,
        pillars: ['Nutrition & Dietary Balance'],
        supportedClaims: ['急凍蔬菜在營養素保留度上不輸長途生鮮蔬菜，且單價低 40%-60%，腐壞風險為零。'],
        rightsNotes: '公有領域公共資料庫。',
      },
      {
        id: 'REF-04',
        title: 'FDA Food Safety and Inspection Service: Safe Cooking & Storage Rules',
        description: '美國 FDA 與 FSIS 官方制定之生熟食溫度控制、加熱殺菌與安全存放時間指引。',
        contentOutline: ['肉類內部核心溫度安全標準', '危險溫度區（Danger Zone 40°F–140°F）規範', '剩菜冷藏保存與覆熱原則'],
        practicalFramework: {
          name: 'The 2-Hour 4-Day Safety Rule (2-4 食安法則)',
          editorialOrigin: '由編輯團隊簡化 FDA/FSIS 規範為家庭易記口訣',
          actionSteps: [
            '熟食烹調後 2 小時內移入淺盤冷藏（避免細菌在 40°F-140°F 快速滋生）',
            '冷藏熟食於 4 天內食用完畢，未吃完者在第 2 天即分裝冷凍',
            '覆熱熟食內部核心溫度需達到 165°F (74°C)，並維持滾燙',
          ],
        },
        researchSummary: 'FSIS 數據指出，家庭食物中毒大多源於大型深鍋直接塞入冷藏導致降溫過慢，或解凍時於室溫放置過久。本手冊食譜嚴格要求所有禽肉類（雞肉、火雞）烹煮必須達到內部核心溫度 165°F，豬肉、牛肉排達到 145°F，絞肉達到 160°F，確保全家老小飲食安全無虞。',
        editorialNotes: {
          targetChapters: ['Chapter 1', 'Chapter 3', 'Chapter 7'],
          exerciseSuggestions: ['備置一支實體數位探針溫度計'],
          worksheetIntegration: '食安溫度與剩菜冷藏標籤表',
          verificationNotes: '引用 FDA Food Code 2022-2024 更新版。',
        },
        brandGuidelines: {
          toneApplication: '嚴謹、清楚、負責任。不可有任何模糊空間。',
          visualDirection: '以警示方塊與清晰溫度計圖標註。',
          audienceFraming: '將食安視為給家人最深層的健康保護傘。',
        },
        sourceTitle: 'Safe Minimum Internal Temperature Chart & Cold Storage Time',
        publisherOrOrg: 'FDA / Food Safety and Inspection Service (FSIS)',
        author: 'FSIS Food Safety Education Staff',
        sourceURL: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation',
        publicationDate: '2024-01-10',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 99,
        pillars: ['Food Safety & Temperature Standards'],
        supportedClaims: ['熟食應在 2 小時內冷藏，禽肉核心溫度必須達到 165°F 方具備完全殺菌效果。'],
        rightsNotes: '美國聯邦官方安全指引。',
      },
      {
        id: 'REF-05',
        title: 'Academy of Nutrition and Dietetics: Family Dinner Benefits & Meal Structure',
        description: '美國營養與飲食學會（AND）關於家庭共餐頻率與學齡兒童認知、心理健康及肥胖預防之縱向研究報告。',
        contentOutline: ['每週共餐次數與家庭凝聚力', '餐盤三等分原則（MyPlate 落地實作）', '挑食兒童心理干預機制'],
        practicalFramework: {
          name: 'The 1-Safe-Food Serving Principle (一道安心食物原則)',
          editorialOrigin: '由編輯團隊將兒科營養學家 Ellyn Satter 之餵食職責分工理論轉化為家長晚餐實踐法',
          actionSteps: [
            '每餐餐桌上務必包含至少一項孩子絕對熟悉且喜愛的安全食材（如米飯、烤馬鈴薯塊或玉米）',
            '新菜餚以小份量「探索盤」呈現，不強迫進食，降低餐桌權力爭奪對立',
            '家長負責「提供什麼、何時提供、何地提供」，孩子負責「吃多少、是否吃」',
          ],
        },
        researchSummary: '研究追蹤發現，每週全家共同進餐 4 次以上的兒童與青少年，其過重風險降低 12%、飲食障礙發生率降低 35%、攝取蔬果營養素之比率提高 24%。家庭晚餐的意義不僅在於充飢，更是安定孩子情緒與培養生活節奏的核心場域。',
        editorialNotes: {
          targetChapters: ['Chapter 1', 'Chapter 8'],
          exerciseSuggestions: ['設定每週 3-4 天無手機干擾的家庭共餐日'],
          worksheetIntegration: '全家共餐檢核習慣打卡卡',
          verificationNotes: '發表於 Journal of the Academy of Nutrition and Dietetics。',
        },
        brandGuidelines: {
          toneApplication: '溫暖動人、富有生活情調與正面鼓勵。',
          visualDirection: '營造溫暖餐桌剪影。',
          audienceFraming: '肯定忙碌家長的付出，讓吃飯成為一天的放鬆時刻。',
        },
        sourceTitle: 'The Power of Family Meals: Nutritional and Psychosocial Benefits',
        publisherOrOrg: 'Academy of Nutrition and Dietetics',
        author: 'AND Research Committee',
        sourceURL: 'https://www.eatright.org/food/planning/family-dinners',
        publicationDate: '2023-11-12',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 94,
        pillars: ['Nutrition & Dietary Balance'],
        supportedClaims: ['每週家庭共餐 4 次以上對學童飲食習慣與心理健康具有顯著正向長期影響。'],
        rightsNotes: '引用公開學術白皮書摘要與教育指引。',
      },
      {
        id: 'REF-06',
        title: 'Bureau of Labor Statistics (BLS): Consumer Price Index for Food at Home',
        description: '美國勞工統計局 CPI 數據：家庭食材各品類價格變動趨勢分析（蛋肉類、乳製品、蔬果、糧油）。',
        contentOutline: ['生鮮食材年化通膨波動係數', '不同包裝規模之單位價格落差', '商店自有品牌 (Store Brands) 價差分析'],
        practicalFramework: {
          name: 'The Unit-Price Golden Rule (單位價格黃金律)',
          editorialOrigin: '編輯團隊將零售定價心理學整理為家庭採購清單標註規範',
          actionSteps: [
            '採購時忽略貨架大字特價標籤，專注比對「每盎司 (Per Ounce)」或「每磅 (Per Pound)」單位價格',
            '對常溫耐存品（米、義大利麵、番茄罐頭、燕麥）採大包裝採購，節省 25%-35%',
            '選擇連鎖超市自有品牌（如 Aldi 或 Great Value），成分一致但價格低 20%-30%',
          ],
        },
        researchSummary: 'BLS 數據顯示，家庭食材自有品牌與名牌產品在盲測品質滿意度上達 92% 無顯著差異，但價格平均差距達 23.4%。透過系統性轉移至超市自有品牌與善用單位價格比對，一個家庭每年可在同一份菜單下直接節省超過 $600 美元。',
        editorialNotes: {
          targetChapters: ['Chapter 2'],
          exerciseSuggestions: ['實地在超市記錄 5 種常備乾貨的單位價差'],
          worksheetIntegration: '採購單位價格比對小工具',
          verificationNotes: 'BLS 官方定期通膨監測報告。',
        },
        brandGuidelines: {
          toneApplication: '聰明幹練、破解商場消費心理學。',
          visualDirection: '以清晰對比表呈現名牌 vs 自有品牌價差。',
          audienceFraming: '賦予家長「超市省錢高手」的成就感。',
        },
        sourceTitle: 'Consumer Price Index: Food at Home Detailed Category Breakdowns',
        publisherOrOrg: 'U.S. Bureau of Labor Statistics',
        author: 'BLS Division of Consumer Prices',
        sourceURL: 'https://www.bls.gov/cpi/',
        publicationDate: '2024-09-12',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 97,
        pillars: ['Budget & Economic Benchmarks'],
        supportedClaims: ['轉移至超市自有品牌並比對單位價格，可在不降低生活品質前提下節省 20%-30% 支出。'],
        rightsNotes: '美國聯邦政府公開統計資訊。',
      },
      {
        id: 'REF-07',
        title: 'Harvard T.H. Chan School of Public Health: Healthy Eating Plate & Budgeting',
        description: '哈佛公共衛生學院「健康飲食餐盤」指南與低成本植物性蛋白質搭配原則。',
        contentOutline: ['植物與動物蛋白質黃金比例', '全穀物升糖指數與飽足感時長', '健康不飽和脂肪低成本來源'],
        practicalFramework: {
          name: 'The 2:1 Protein Stretcher Ratio (2:1 蛋白質延伸法)',
          editorialOrigin: '編輯團隊將哈佛餐盤原則落地為肉食愛好家庭無痛減肉增纖法',
          actionSteps: [
            '在肉醬、肉丸或燉肉中，以 2 份肉類搭配 1 份黑豆、鷹嘴豆或碎野菇',
            '使用豆類天然澱粉質增加醬汁濃郁度，同時增加膳食纖維',
            '降低每餐紅肉攝取比例，兼顧全家心血管健康與荷包厚度',
          ],
        },
        researchSummary: '哈佛公衛學院研究表明，以植物性優質蛋白（豆類、豆腐、堅果籽類）部分取代紅肉，每週進行 2 次「少肉或彈性素食晚餐」，不僅使全因死亡率風險降低 14%，且豆類蛋白質每克成本僅為牛排的八分之一。這是兼顧長壽健康與極致預算的雙贏策略。',
        editorialNotes: {
          targetChapters: ['Chapter 2', 'Chapter 4', 'Chapter 6'],
          exerciseSuggestions: ['安排每週二為「Taco Tuesday 豆肉混搭之夜」'],
          worksheetIntegration: '健康餐盤比例自我檢查表',
          verificationNotes: '哈佛公衛營養系官方出版文獻。',
        },
        brandGuidelines: {
          toneApplication: '科學權威、健康激勵、不極端不說教。',
          visualDirection: '以三色餐盤結構圖展現。',
          audienceFraming: '不強迫全素，強調「彈性、美味、多吃一點天然纖維」。',
        },
        sourceTitle: 'The Healthy Eating Plate & The Nutrition Source',
        publisherOrOrg: 'Harvard T.H. Chan School of Public Health',
        author: 'Department of Nutrition, Harvard School of Public Health',
        sourceURL: 'https://www.hsph.harvard.edu/nutritionsource/healthy-eating-plate/',
        publicationDate: '2023-08-15',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 98,
        pillars: ['Nutrition & Dietary Balance'],
        supportedClaims: ['以植物豆類混合紅肉烹調，可有效拉長飽足感、提升纖維攝取量，並大幅壓低肉品支出。'],
        rightsNotes: '哈佛公衛公開衛教文獻。',
      },
      {
        id: 'REF-08',
        title: 'NRDC Wasted: How America Is Losing Up to 40% of Its Food',
        description: '自然資源守護協會（NRDC）里程碑調查報告：揭露生鮮採購盲點、標籤誤解（Best By vs. Use By）與剩餘食材重生策略。',
        contentOutline: ['日期標籤迷思（Best if Used By vs Use By）', '食材保鮮袋與乙烯氣體分離法', '高產值剩料高湯公式'],
        practicalFramework: {
          name: 'The Freezer Scrap Bag Method (冷凍剩料聚寶袋)',
          editorialOrigin: '由編輯團隊整理西餐主廚高湯技法為家庭易行零成本省錢術',
          actionSteps: [
            '在冷凍庫放置一個大號夾鏈袋，專門收集洋蔥皮、紅蘿蔔頂端、西芹葉、蒜頭末屑',
            '收集滿一袋時，加入水與月桂葉小火慢熬 40 分鐘，濾出鮮甜全天然蔬菜高湯',
            '將高湯分裝為冰塊盒或保鮮盒，平日煮湯燉飯免買現成高湯罐頭（每年省 $60+）',
          ],
        },
        researchSummary: 'NRDC 發現超過 80% 的消費者因誤解包裝上的「最佳賞味期限（Best if Used By）」而過早將完全安全可食用的食物丟棄。除了嬰兒配方奶粉具法定嚴格期限外，多數「Best by」標籤僅代表廠商建議的巔峰風味，而非安全性指標。建立正確感官判斷與正確保存法可大幅減少不必要棄置。',
        editorialNotes: {
          targetChapters: ['Chapter 1', 'Chapter 7'],
          exerciseSuggestions: ['建立冷凍剩料袋並完成第一次高湯燉煮'],
          worksheetIntegration: '食材賞味期與判斷速查手冊',
          verificationNotes: 'NRDC 官方權威報告。',
        },
        brandGuidelines: {
          toneApplication: '生動實用、帶來小確幸的成就感。',
          visualDirection: '以步驟插圖展示剩料收集。',
          audienceFraming: '讓家庭體會「將看似垃圾變成美味高湯」的魔法體驗。',
        },
        sourceTitle: 'Wasted: How America Is Losing Up to 40 Percent of Its Food from Farm to Fork to Landfill',
        publisherOrOrg: 'Natural Resources Defense Council (NRDC)',
        author: 'Dana Gunders et al.',
        sourceURL: 'https://www.nrdc.org/resources/wasted-how-america-losing-40-percent-its-food-farm-fork-landfill',
        publicationDate: '2023-04-10',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 96,
        pillars: ['Food Waste & Storage Science'],
        supportedClaims: ['學會區分賞味期限標籤與自製剩料高湯，可直接回收 10%-15% 原本被浪費的家庭食材價值。'],
        rightsNotes: '非營利組織公開發布報告。',
      },
      {
        id: 'REF-09',
        title: 'Purdue University Extension: Batch Cooking & Meal Assembly Systems',
        description: '普渡大學推廣部農業與家庭經濟研究：針對全職家庭之「週日備餐 60 分鐘」與「半成品冷凍裝袋」系統化實證研究。',
        contentOutline: ['生肉醃漬冷凍法（Dump & Freeze Bags）', '根莖蔬菜預切浸水保鮮', '多合一醬汁基底（One-Sauce-Multi-Dish）'],
        practicalFramework: {
          name: 'The 3-Base Universal Sauce Protocol (三款萬用醬汁基底)',
          editorialOrigin: '編輯團隊將餐飲量產技術轉化為家庭週間 5 分鐘調味公式',
          actionSteps: [
            '調製萬用檸檬蒜香油醋醬（可涼拌、可烤雞肉、可醃魚）',
            '調製低鈉和風照燒芝麻醬（可炒蔬菜、可裹肉丸、可作豆腐拌醬）',
            '調製義式香草番茄基底醬（可作義大利麵、可作披薩吐司、可燉豆）',
          ],
        },
        researchSummary: '研究證實，事先備有 1-2 種通用醬汁與預先分裝醃漬肉品的家庭，平日準備晚餐的平均時間從 48 分鐘驟降至 19 分鐘，且因料理門檻降低，取消外送訂單的機率達 87%。預先準備是克服平日意志力耗盡的唯一防線。',
        editorialNotes: {
          targetChapters: ['Chapter 3', 'Chapter 4', 'Chapter 5'],
          exerciseSuggestions: ['在週日完成兩款萬用醬汁裝瓶'],
          worksheetIntegration: '萬用調味醬汁比例配方卡',
          verificationNotes: '大學推廣部學術實用推廣教材。',
        },
        brandGuidelines: {
          toneApplication: '高效、俐落、充滿解放感的省時指南。',
          visualDirection: '以醬汁比例量杯圖示呈現。',
          audienceFraming: '給予家長「下班 15 分鐘輕鬆搞定熱騰騰晚餐」的終極安心感。',
        },
        sourceTitle: 'Meal Planning and Preparation for Busy Families',
        publisherOrOrg: 'Purdue University Cooperative Extension Service',
        author: 'Department of Consumer and Family Sciences',
        sourceURL: 'https://extension.purdue.edu/',
        publicationDate: '2024-02-18',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 93,
        pillars: ['Meal Prep & Time-Saving Systems'],
        supportedClaims: ['常備基礎萬用調味醬與醃肉包，平日晚餐備料時間可縮短 60% 以上。'],
        rightsNotes: '大學公共推廣教材。',
      },
      {
        id: 'REF-10',
        title: 'CDC Food Safety Guidelines: Cross-Contamination Prevention in Home Kitchens',
        description: '美國疾病管制與預防中心（CDC）關於家庭廚房致病菌（沙門氏菌、曲狀桿菌、大腸桿菌）交叉污染之防護指引。',
        contentOutline: ['生肉清洗迷思（切勿水龍頭沖洗生雞肉）', '切菜板顏色分流管理', '洗手與海綿抹布微波消毒週期'],
        practicalFramework: {
          name: 'The Two-Board Color Separation Rule (紅白雙砧板法則)',
          editorialOrigin: '由編輯團隊將商業廚房 HACCP 砧板規範簡化為小家庭最精簡安全守則',
          actionSteps: [
            '指定紅色或專用塑膠砧板專切生肉生海鮮；木質或綠色砧板專切蔬果熟食',
            '生肉入鍋後立即以熱肥皂水洗手 20 秒，再接觸調味罐或水龍頭',
            '洗碗海綿每週置入微波爐加熱 1 分鐘或放入洗碗機高溫烘乾，殺滅 99% 細菌',
          ],
        },
        researchSummary: 'CDC 警告，高達 60% 的家庭沙門氏菌感染案例源於在水槽沖洗生禽肉時產生的氣溶膠噴濺（可擴散至周邊 3 英尺以內的餐具與生食），以及共用生熟食砧板。在推行平價高效率備餐的同時，嚴格杜絕家庭食安漏洞是負責任產品的基石。',
        editorialNotes: {
          targetChapters: ['Chapter 1', 'Chapter 7'],
          exerciseSuggestions: ['檢查廚房砧板分類現狀並標記專用板'],
          worksheetIntegration: '家庭安全廚房檢核清單',
          verificationNotes: '引用 CDC 官方食安衛教指引。',
        },
        brandGuidelines: {
          toneApplication: '專業、嚴謹、守護家庭健康。',
          visualDirection: '圖解展示水龍頭沖肉的噴濺風險。',
          audienceFraming: '建立正確食安觀念，讓家長煮得安心、全家吃得放心。',
        },
        sourceTitle: 'Foods That Can Cause Food Poisoning & Prevention Tips',
        publisherOrOrg: 'Centers for Disease Control and Prevention (CDC)',
        author: 'CDC National Center for Emerging and Zoonotic Infectious Diseases',
        sourceURL: 'https://www.cdc.gov/foodsafety/foods-linked-illness.html',
        publicationDate: '2024-04-05',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 98,
        pillars: ['Food Safety & Temperature Standards'],
        supportedClaims: ['切勿在水槽沖洗生雞肉以防細菌飛濺；生熟食砧板必須徹底分流。'],
        rightsNotes: '美國聯邦公共衛生文獻。',
      },
      {
        id: 'REF-11',
        title: 'Iowa State University Extension: Spend Smart. Eat Smart. Database',
        description: '愛荷華州立大學推廣部「聰明花費、聰明飲食」專案：驗證超過 200 道每份成本低於 $2.50 的家庭晚餐食譜與主廚測試記錄。',
        contentOutline: ['單餐總成本精確核算模型', '一鍋到底（One-Pot）能源與工時節省數據', '學齡兒童接受度評分準則'],
        practicalFramework: {
          name: 'The 3-Part Component Meal Builder (三件式無痛組裝餐)',
          editorialOrigin: '編輯團隊綜合該研究之營養平衡公式轉化為自由組合模組',
          actionSteps: [
            '主基底（全穀或根莖：糙米、義大利麵、烤地瓜丁）',
            '主要蛋白質（烤雞腿肉、黑豆碎肉醬、烘烤豆腐丁、水煮蛋丁）',
            '快熟高纖蔬菜（清炒高麗菜、烤綜合時蔬、蒸毛豆青花菜）',
          ],
        },
        researchSummary: '愛荷華州立大學的長青專案證實，採用一鍋到底或烤盤料理（Sheet Pan Dinners）的家庭，料理後需要清洗的廚具從平均 6.2 件降低至 1.8 件，家長在料理後的疲累感指數下降 45%，顯著增強長期在家烹調的持續率。',
        editorialNotes: {
          targetChapters: ['Chapter 4', 'Chapter 5', 'Chapter 6'],
          exerciseSuggestions: ['完成一次一盤烤箱晚餐 (Sheet Pan Dinner)'],
          worksheetIntegration: '三件式組裝食譜靈感清單',
          verificationNotes: '該專案所有食譜經家庭實測與營養師認證。',
        },
        brandGuidelines: {
          toneApplication: '平易近人、充滿操作信心。',
          visualDirection: '以模組化積木圖呈現主食、蛋白與蔬菜搭配。',
          audienceFraming: '不用當大廚也能端出看起來很厲害的一桌好菜。',
        },
        sourceTitle: 'Spend Smart. Eat Smart. Research-Tested Family Recipes',
        publisherOrOrg: 'Iowa State University Extension and Outreach',
        author: 'Food and Health Extension Specialists',
        sourceURL: 'https://spendsmart.extension.iastate.edu/',
        publicationDate: '2024-05-30',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 95,
        pillars: ['Meal Prep & Time-Saving Systems', 'Budget & Economic Benchmarks'],
        supportedClaims: ['一鍋到底與烤盤料理可減少 70% 鍋碗清洗量，有效維持平日在家煮飯的動力。'],
        rightsNotes: '大學推廣部公開實用研究。',
      },
      {
        id: 'REF-12',
        title: 'FAO: Global Food Losses and Food Waste — Extent, Causes and Prevention',
        description: '聯合國糧食及農業組織（FAO）全球家庭層面食物耗損研究：針對食材全株利用（根、莖、葉）之經濟效益分析。',
        contentOutline: ['全食烹飪概念（Root-to-Stem Cooking）', '綠色葉菜保水儲藏法', '發酵與自製簡易泡菜延壽術'],
        practicalFramework: {
          name: 'Root-to-Stem Zero Waste Cooking Formula',
          editorialOrigin: '由編輯團隊將名廚 Dan Barber 零浪費哲學轉化為日常家庭煎炒料理技巧',
          actionSteps: [
            '青花菜粗梗去外皮切薄片，口感媲美甜芥藍，同炒香脆可口',
            '青蔥根部留 2 公分泡水可於窗台二度再生',
            '香菜芹菜嫩莖切細碎加入絞肉或炒蛋，香氣加倍且零浪費',
          ],
        },
        researchSummary: 'FAO 統計指出，普通消費者丟棄的花椰菜梗、甜菜葉、胡蘿蔔嫩葉等「邊角料」，在重量上佔了整顆蔬果的 20%-35%，且這些部位的維生素與抗氧化多酚密度經常高於葉片本身。善用全株烹飪等於無形中將蔬果購買預算打八折。',
        editorialNotes: {
          targetChapters: ['Chapter 2', 'Chapter 7'],
          exerciseSuggestions: ['今晚保留青花菜梗進行切片清炒'],
          worksheetIntegration: '蔬菜邊角料重生美味指南',
          verificationNotes: '聯合國糧農組織官方研究報告。',
        },
        brandGuidelines: {
          toneApplication: '啟發性、尊重食材、發現日常驚喜。',
          visualDirection: '蔬果全株構造分解圖示。',
          audienceFraming: '讓做菜變成一場充滿探索樂趣的家庭環保小冒險。',
        },
        sourceTitle: 'Global Food Losses and Food Waste: Extent, Causes and Prevention',
        publisherOrOrg: 'Food and Agriculture Organization of the United Nations (FAO)',
        author: 'Jenny Gustavsson et al.',
        sourceURL: 'https://www.fao.org/food-loss-and-food-waste/en/',
        publicationDate: '2023-01-20',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 94,
        pillars: ['Food Waste & Storage Science'],
        supportedClaims: ['全食利用蔬菜莖梗可直接提升 20%-35% 蔬果食用可得份量。'],
        rightsNotes: '國際組織授權之公開引用知識。',
      },
      {
        id: 'REF-13',
        title: 'Journal of Nutrition Education and Behavior: The Grocery List Behavioral Effect',
        description: '同儕審查行為經濟學期刊研究：採購清單型態（隨興記帳 vs 分區結構化清單）對超市衝動消費金額之實證影響。',
        contentOutline: ['超市動線規劃對衝動購買之刺激誘因', '結構化分類清單之心理定錨效應', '空腹採購 vs 飽腹採購花費落差'],
        practicalFramework: {
          name: 'The Perimeter-First Classified Shopping List (超市外圍優先清單)',
          editorialOrigin: '編輯團隊依據超市動線心理學整理之高效採購防守系統',
          actionSteps: [
            '採購單依超市外圍動線嚴格分區（蔬果區 -> 肉品區 -> 乳製品冷藏區 -> 乾貨通道）',
            '絕不空腹逛超市；進店前嚼口香糖或喝一杯水，降低嗅覺與視覺衝動刺激',
            '對清單外物品實施「2 分鐘冷凍冷卻法則」，非必需品放回架上',
          ],
        },
        researchSummary: '研究發現，手持「依賣場分區整理之採購清單」並嚴格執行的消費者，其採購單總金額平均比無清單或僅有雜亂隨手筆記的消費者少支出 24.8%，且逛店時間縮短 32 分鐘。清單能有效抵禦超市精心設計的端架促銷與特價陷阱。',
        editorialNotes: {
          targetChapters: ['Chapter 2'],
          exerciseSuggestions: ['下一次去超市前填寫分類採購單'],
          worksheetIntegration: '4 週分區統整採購單 (Master Grocery Lists)',
          verificationNotes: '發表於 JNEB，經隨機對照試驗證實。',
        },
        brandGuidelines: {
          toneApplication: '冷靜理性、策略清晰、掌控感十足。',
          visualDirection: '以超市動線地圖對照採購單佈局。',
          audienceFraming: '讓家長在超市裡像精準特工一樣迅速完成任務。',
        },
        sourceTitle: 'Impact of Structured Grocery Lists on Household Food Expenditures and Nutrition',
        publisherOrOrg: 'Society for Nutrition Education and Behavior / Elsevier',
        author: 'Dr. Tamara Miller et al.',
        sourceURL: 'https://www.jneb.org/',
        publicationDate: '2023-09-01',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 96,
        pillars: ['Budget & Economic Benchmarks'],
        supportedClaims: ['使用結構化分區採購單並避免衝動消費，可減少 20%-25% 的非計畫性超市開銷。'],
        rightsNotes: '學術期刊研究成果引用。',
      },
      {
        id: 'REF-14',
        title: 'Cornell Food and Brand Lab: Visual Cues in Home Refrigerator Architecture',
        description: '康乃爾大學食品品牌實驗室研究：家庭冰箱內部食材擺放視線與健康食材消耗率關聯。',
        contentOutline: ['視線水平區（Eye-Level Zone）的進食選擇驅動', '保鮮抽屜（Crisper Drawers）的「食材黑洞」效應', '透明保鮮容器對保鮮感知之影響'],
        practicalFramework: {
          name: 'The Clear-Sight Refrigerator Architecture (可視化冰箱陳列)',
          editorialOrigin: '由編輯團隊將實驗室研究整理為透明保鮮盒三段陳列架構',
          actionSteps: [
            '易壞生鮮（如草莓、菠菜、絞肉）絕對不放底層抽屜，改置於冷藏第二層視線正中央',
            '將已切洗備用的蔬菜統一放入透明玻璃保鮮盒，一眼可見便於隨時取用',
            '底層抽屜改放不敏感耐放的調味罐、耐放胡蘿蔔或馬鈴薯',
          ],
        },
        researchSummary: '康乃爾實驗室實證顯示，當健康蔬果放置於冰箱開門後第一眼可見的中央視線區時，家庭在三天內將其吃完的機率提升了 2.7 倍；反之，放入隱蔽底層保鮮抽屜的蔬菜，被遺忘至腐爛的機率高達 48%。視線決定了食材的命運。',
        editorialNotes: {
          targetChapters: ['Chapter 1', 'Chapter 7'],
          exerciseSuggestions: ['拍照並重新整理冰箱冷藏視線層'],
          worksheetIntegration: '冰箱可視化分層地圖',
          verificationNotes: '康乃爾大學經典行為科學實驗。',
        },
        brandGuidelines: {
          toneApplication: '視覺感強烈、立竿見影、簡單易行。',
          visualDirection: '透明保鮮盒陳列示意圖。',
          audienceFraming: '改變一個擺放位置，就能不知不覺少浪費幾百塊。',
        },
        sourceTitle: 'Slim by Design: Mindless Eating Solutions for Everyday Life',
        publisherOrOrg: 'Cornell University Food and Brand Lab',
        author: 'Brian Wansink, Ph.D.',
        sourceURL: 'https://www.cornell.edu/',
        publicationDate: '2022-10-15',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 92,
        pillars: ['Food Waste & Storage Science'],
        supportedClaims: ['將易腐蔬果移至冷藏視線中央透明容器陳列，食材消耗率提升近三倍。'],
        rightsNotes: '學術專書與實驗室公開成果。',
      },
      {
        id: 'REF-15',
        title: 'American Heart Association (AHA): Sodium Reduction & Flavor Layering',
        description: '美國心臟協會（AHA）指南：在低成本料理中透過香草、香料、酸度（醋與柑橘汁）取代過量食鹽與味精之美味堆疊技巧。',
        contentOutline: ['家庭每日鈉攝取上限（< 2,300mg）', '平價香料七大天王（蒜粉、洋蔥粉、煙燻紅椒粉、孜然等）', '酸度（Acid）在料理收尾的點睛喚醒作用'],
        practicalFramework: {
          name: 'The 4-Element Flavor Layering Formula (S-A-F-T 原則)',
          editorialOrigin: '編輯團隊將專業廚藝學校調味架構轉化為平價料理調味公式',
          actionSteps: [
            'Salt（適量海鹽或低鈉醬油建立底味）',
            'Acid（料理起鍋前滴幾滴檸檬汁或蘋果醋，瞬間提升鮮度與明亮度）',
            'Fat（少量好油如橄欖油或芝麻油封鎖香氣）',
            'Texture（撒上少許烤香白芝麻、烤花生碎或麵包粉增加咀嚼趣味）',
          ],
        },
        researchSummary: 'AHA 調查表明，過度依賴市售高鈉醬料包是導致家庭料理單調且易水腫血壓偏高的主因。利用單價低廉的乾燥香料粉（如大蒜粉、煙燻紅椒粉）結合新鮮檸檬汁，可在減少 40% 鈉含量的同時，讓平價的雞胸肉或豆類煥發出媲美餐廳的濃郁深層風味。',
        editorialNotes: {
          targetChapters: ['Chapter 3', 'Chapter 4', 'Chapter 5', 'Chapter 6'],
          exerciseSuggestions: ['備齊廚房七大平價香料罐'],
          worksheetIntegration: '香料調配與風味替換矩陣',
          verificationNotes: '美國心臟協會官方營養指南。',
        },
        brandGuidelines: {
          toneApplication: '啟發廚藝感官、香氣四溢、味蕾享受。',
          visualDirection: '以色彩繽紛的香料對照盤呈現。',
          audienceFraming: '「省錢不等於吃水煮草，平價食材也能有高級飯店風味」。',
        },
        sourceTitle: 'Shaking the Salt Habit to Lower High Blood Pressure',
        publisherOrOrg: 'American Heart Association (AHA)',
        author: 'AHA Nutrition Advisory Committee',
        sourceURL: 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sodium',
        publicationDate: '2023-05-10',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 97,
        pillars: ['Nutrition & Dietary Balance'],
        supportedClaims: ['善用乾燥香料與起鍋微酸調味，可在減鈉 40% 的同時創造極致豐富口感。'],
        rightsNotes: '非營利醫學衛教公開資源。',
      },
      {
        id: 'REF-16',
        title: 'Ohio State University Extension: Pantry Staples Survival & Rotation Inventory',
        description: '俄亥俄州立大學家庭與消費科學推廣部：如何以 $50 打造一個可支撐一個月份量輪替的核心常備乾貨庫存（Pantry Staples）。',
        contentOutline: ['耐儲存乾貨核心十項（燕麥、糙米、罐頭豆、番茄泥等）', '乾貨防潮與防蟲收納規範', '庫存動態盤點每季時間表'],
        practicalFramework: {
          name: 'The $50 Core Pantry Anchor System ($50 核心乾貨錨定系統)',
          editorialOrigin: '由編輯團隊依據大學推廣部清單精選出的 10 樣萬用基底乾貨',
          actionSteps: [
            '穀物組：長粒糙米、全麥義大利麵、傳統大燕麥片（提供飽足與纖維）',
            '豆類與罐頭組：無鹽黑豆罐頭、鷹嘴豆、整粒剝皮番茄罐頭、低鈉鮪魚罐頭',
            '調味油品組：大蒜、洋蔥、芥花油/橄欖油、海鹽與黑胡椒',
          ],
        },
        researchSummary: '研究指出，擁有完整乾貨庫存的家庭，在面對臨時無法採購或預算吃緊時，平均能額外支撐 8-12 頓完整的健康晚餐而無須緊急衝動採購。乾貨是平抑每週生鮮預算波動的最強安全氣囊。',
        editorialNotes: {
          targetChapters: ['Chapter 1', 'Chapter 2'],
          exerciseSuggestions: ['對現有儲藏室乾貨進行 15 分鐘清點盤查'],
          worksheetIntegration: '核心乾貨盤點與採購清單',
          verificationNotes: '俄亥俄州立大學推廣部教育文獻。',
        },
        brandGuidelines: {
          toneApplication: '踏實有底氣、備而不慌的安穩感。',
          visualDirection: '以整齊的玻璃罐儲藏櫃為示意。',
          audienceFraming: '給家庭打造一個「即便狂風暴雨也能輕鬆煮好一餐」的避難所。',
        },
        sourceTitle: 'Stocking a Healthy Pantry on a Budget',
        publisherOrOrg: 'Ohio State University Extension',
        author: 'Family and Consumer Sciences Professionals',
        sourceURL: 'https://fcs.osu.edu/',
        publicationDate: '2023-10-10',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 94,
        pillars: ['Meal Prep & Time-Saving Systems', 'Budget & Economic Benchmarks'],
        supportedClaims: ['建立標準核心常備乾貨庫存，可平穩吸收生鮮食材價格波動，隨時化解缺菜危機。'],
        rightsNotes: '大學推廣部教育公有領域。',
      },
      {
        id: 'REF-17',
        title: 'University of Florida IFAS: Freezing Fruits and Vegetables at Home',
        description: '佛羅里達大學食品與農業科學研究所（UF/IFAS）：家庭自製生鮮急凍（Blanching 殺菁技術）完整操作手冊。',
        contentOutline: ['殺菁（Blanching）的作用原理：鈍化酶活性、鎖住色澤營養', '不同蔬菜最佳燙煮秒數表', '平鋪速凍法（Flash Freezing on a Sheet Pan）'],
        practicalFramework: {
          name: 'The 3-Step Flash Freeze Protocol (3步生鮮極速冷凍法)',
          editorialOrigin: '編輯團隊將工業急凍流程改編為一般家用冰箱烤盤操作手冊',
          actionSteps: [
            '滾水燙煮 60-120 秒後立即撈起浸入冰水冷卻（殺菁停止受熱）',
            '用廚房紙巾徹底擦乾水分，單層平鋪於鋪烘焙紙的烤盤上進冷凍庫 2 小時',
            '凍硬成單粒後裝入冷凍密封袋並擠出空氣標註日期（隨吃隨倒，不結成大冰塊）',
          ],
        },
        researchSummary: '未經殺菁直接冷凍的綠色蔬菜，其內生酶在低溫下仍會持續分解細胞壁與維生素，導致兩週後解凍時質地軟爛變黑且帶有苦味。經過 90 秒標準水燙殺菁的蔬菜，在 -18°C 冷凍庫可完好保存長達 8-12 個月，品質與新鮮度維持率達 85% 以上。',
        editorialNotes: {
          targetChapters: ['Chapter 7'],
          exerciseSuggestions: ['將特價買多的一袋青花菜進行殺菁冷凍'],
          worksheetIntegration: '家庭蔬果殺菁時間與冷凍保存表',
          verificationNotes: 'UF/IFAS 農業食品科學標準指引。',
        },
        brandGuidelines: {
          toneApplication: '科學精密、實作清晰、成果顯著。',
          visualDirection: '以步驟拆解圖呈現冰鎮與平鋪過程。',
          audienceFraming: '讓家長學會食品工廠級的保鮮技巧，特價大特賣時敢買不心虛。',
        },
        sourceTitle: 'Freezing Fruits and Vegetables: Principles and Guidelines',
        publisherOrOrg: 'University of Florida IFAS Extension',
        author: 'Amy Simonne, Ph.D.',
        sourceURL: 'https://edis.ifas.ufl.edu/',
        publicationDate: '2024-03-22',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 96,
        pillars: ['Food Waste & Storage Science', 'Food Safety & Temperature Standards'],
        supportedClaims: ['蔬菜殺菁後平鋪速凍可延長保鮮期至 8-12 個月，維持鮮豔翠綠與爽脆度。'],
        rightsNotes: '大學推廣部農業文獻。',
      },
      {
        id: 'REF-18',
        title: 'Appetite Journal: Family Eating Dynamics and Parental Decision Fatigue',
        description: '國際權威食慾與進食行為期刊（Appetite）：晚間決策疲勞對家庭食物採購選擇之神經心理學實證。',
        contentOutline: ['決策疲勞（Decision Fatigue）在傍晚 5-7 點達到高峰', '認知負荷對高糖高脂高成本外送的誘發機制', '消除「今晚吃什麼」疑問的認知減壓效果'],
        practicalFramework: {
          name: 'The Zero-Decision Dinner Rotation (零決策輪替行事曆)',
          editorialOrigin: '由編輯團隊依據行為心理學設計的「主題日固定模組」',
          actionSteps: [
            '設定每週主題標籤（週一義大利麵、週二墨西哥 Taco、週三一鍋燉、週四烤盤料理、週五剩料批薩之夜）',
            '主題固定，食材隨每週超市特價微調，大腦無需從零發想',
            '提前將一週菜單張貼於冰箱門，全家人清楚預期，終結反覆詢問',
          ],
        },
        researchSummary: '研究發現，每天傍晚反覆思考「今天煮什麼」會耗費家長平均 18-25 分鐘的焦慮心智頻寬。當意志力因一天工作與育兒消耗殆盡時，家長選擇放棄烹調而求助高價外送的機率高達 62%。事先確定固定輪替骨架，能大幅消除 80% 的餐前焦慮。',
        editorialNotes: {
          targetChapters: ['Chapter 1', 'Chapter 3'],
          exerciseSuggestions: ['將 4 週菜單輪替圖張貼至廚房顯眼處'],
          worksheetIntegration: '全家主題日晚餐輪替日曆',
          verificationNotes: '發表於 Appetite (Elsevier)，同行評審論文。',
        },
        brandGuidelines: {
          toneApplication: '深深同理、心理減壓、撫慰心靈。',
          visualDirection: '以日曆模組清晰呈現一週主題。',
          audienceFraming: '「你不是討厭煮飯，你只是大腦在傍晚太累了，讓系統替你思考」。',
        },
        sourceTitle: 'Parental Stress, Decision Fatigue, and the Nutritional Quality of Family Dinners',
        publisherOrOrg: 'Elsevier / Appetite Journal',
        author: 'Dr. Rebecca Hughes et al.',
        sourceURL: 'https://www.sciencedirect.com/journal/appetite',
        publicationDate: '2023-12-05',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 95,
        pillars: ['Meal Prep & Time-Saving Systems'],
        supportedClaims: ['主題化固定菜單輪替可消除傍晚 80% 的決策疲勞，顯著降低衝動叫外送的頻率。'],
        rightsNotes: '學術論文公開摘要與成果分析。',
      },
      {
        id: 'REF-19',
        title: 'Tufts University Friedman School: Food Price Elasticity & Healthy Diet Cost',
        description: '塔夫茨大學弗里德曼營養科學與政策學院：食物價格彈性與如何在通膨環境下鎖定高營養性價比之計量經濟模型。',
        contentOutline: ['通膨環境下不同食材替代彈性', '雞蛋、豆類、根莖類之性價比穩定性', '季末降價規律與冷凍策略'],
        practicalFramework: {
          name: 'The Price-Per-Portion Calculation Sheet (單餐人頭成本速算公式)',
          editorialOrigin: '編輯團隊將計量經濟模型簡化為每道食譜必備的「總成本 / 份數」公式',
          actionSteps: [
            '整鍋食譜總食材花費計算（例如一鍋燉雞肉時蔬花費 $8.80）',
            '除以家庭總人數（4 人份 = $2.20 / 人）',
            '若單餐人頭成本低於 $2.50 即符合預算黃金綠燈，高於 $3.50 則需調整蛋白配比',
          ],
        },
        researchSummary: '研究顯示，當家庭能直觀看到每人每餐的真實成本數字（如「這頓熱騰騰香煎雞腿排佐地瓜時蔬，每人只要 $2.15」）時，對家庭預算的掌控信心提高 74%，且顯著抑制了「想要外出聚餐揮霍」的補償心理。清晰的數字就是最好的動力。',
        editorialNotes: {
          targetChapters: ['Chapter 2', 'Chapter 4', 'Chapter 5', 'Chapter 6'],
          exerciseSuggestions: ['隨機挑選一道食譜核算今晚的單人份成本'],
          worksheetIntegration: '每道菜餚單人份成本速算表',
          verificationNotes: '塔夫茨大學營養經濟學權威研究。',
        },
        brandGuidelines: {
          toneApplication: '數字確鑿、充滿掌控感與精準感。',
          visualDirection: '以綠黃紅燈成本標籤呈現。',
          audienceFraming: '給家長一張清晰的記分板，每一餐都看到真金白銀的節省成果。',
        },
        sourceTitle: 'Cost and Affordability of Healthy Diets: Global and National Metrics',
        publisherOrOrg: 'Friedman School of Nutrition Science and Policy, Tufts University',
        author: 'William A. Masters et al.',
        sourceURL: 'https://nutrition.tufts.edu/',
        publicationDate: '2024-01-15',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 96,
        pillars: ['Budget & Economic Benchmarks'],
        supportedClaims: ['將晚餐預算拆解為每人每餐單位成本，能有效建立可持續的家庭財務防護意識。'],
        rightsNotes: '學術機構發表之經濟與公共衛生白皮書。',
      },
      {
        id: 'REF-20',
        title: 'Michigan State University Extension: Safe Thawing and Reheating Standards',
        description: '密西根州立大學推廣部：冷凍半成品與家庭熟食安全解凍四大途徑與危險防範指南。',
        contentOutline: ['四大安全解凍途徑（冷藏室解凍、冷水流水解凍、微波爐解凍、直接下鍋快煮）', '室溫常溫解凍的致命毒素風險', '反覆冷凍解凍（Refreezing）的質地與食安限制'],
        practicalFramework: {
          name: 'The Overnight Fridge Thaw Routine (前夜冷藏移位例行公事)',
          editorialOrigin: '由編輯團隊將食品微生物安全規範整理為睡前 30 秒順手動作',
          actionSteps: [
            '每晚就寢前，將隔天傍晚要烹調的冷凍醃肉包從冷凍庫移至冷藏最底層托盤',
            '經過 16-20 小時低於 40°F (4°C) 的冷藏慢速解凍，肉汁損失最少且完全避開危險溫度區',
            '若臨時忘記解凍，使用微波解凍檔位後「必須立即下鍋烹飪」，不可久置',
          ],
        },
        researchSummary: 'MSU 延伸報告特別警告：將冷凍絞肉或整隻生雞直接放置於廚房水槽或料理台常溫退冰，表面溫度在兩小時內即會進入 40°F-140°F 的危險區，金黃色葡萄球菌產生的腸毒素即便後續高溫加熱亦無法破壞。本手冊嚴格規定前夜冷藏移位，杜絕隱形食安威脅。',
        editorialNotes: {
          targetChapters: ['Chapter 1', 'Chapter 7'],
          exerciseSuggestions: ['設定每晚 9:30 冰箱前夜解凍提醒'],
          worksheetIntegration: '四大安全解凍方式對照手冊',
          verificationNotes: 'MSU 官方食品微生物安全指引。',
        },
        brandGuidelines: {
          toneApplication: '冷靜、清晰、科學可靠。',
          visualDirection: '以禁止紅叉標註室溫解凍風險。',
          audienceFraming: '給家庭最安心的防護，避免病從口入。',
        },
        sourceTitle: 'Safe Food Handling: The Four Safe Ways to Thaw Food',
        publisherOrOrg: 'Michigan State University Extension',
        author: 'Eileen Haraminac, Food Safety Educator',
        sourceURL: 'https://www.canr.msu.edu/foodsafety/',
        publicationDate: '2024-05-10',
        retrievedAt: '2026-11-10',
        status: 'VERIFIED_FULL_TEXT',
        qualityScore: 98,
        pillars: ['Food Safety & Temperature Standards'],
        supportedClaims: ['嚴禁常溫室溫解凍肉類；前夜冷藏解凍是最安全且能保留最多肉汁的黃金方式。'],
        rightsNotes: '大學推廣部公有教育資產。',
      },
    ],
  },
  charter: {
    productTitle: '28-Day Budget Family Meal Plan',
    subtitle: 'Affordable Dinners, Smarter Grocery Shopping & Less Food Waste',
    targetAudience: '忙碌家庭（3–5人），每週食材預算有限但重視營養多樣性與料理效率的家長。',
    primaryProblemSolved: '在高通膨時代下，終結家庭晚餐開銷失控、食材重複採購腐壞浪費，以及每天傍晚「不知道今晚煮什麼」的巨大心智焦慮。',
    centralPromise: '一套免動腦的 28 天平價家庭晚餐系統：每週晚餐食材支出控制在 $75-$95，每晚 30 分鐘開飯，減少 40% 食物浪費，一年淨省逾 $3,000。',
    explicitDisclaimers: [
      '本手冊所有食譜與預算以 2024-2026 年美國常見平價超市主流價格為基準估算；實際花費可能隨地區、物價通膨及個別品牌促銷而有所浮動。',
      '每週 $75-$95 預算明確界定為 3-5 人家庭之 5-7 天「晚餐食材支出」，並非全戶整週包含早午餐、點心及日用品之全部開銷。',
      'AI 輔助研發之食譜均經營養與食安規範校核，烹飪時請務必依個別爐具火力、食材新鮮度彈性調整，並遵守 USDA 肉類核心熟化溫度與過敏原警示。',
    ],
    signatureFramework: '4-Pillar Smart Relay System (四維聰明接力膳食法)',
    deliveryFormat: 'ebook_toolkit',
    contentDepthTarget: 'STANDARD',
    targetWordCount: 16000,
    learningObjectives: [
      '掌握 USDA 節儉飲食標準與家庭食材預算分配公式。',
      '學會超市外圍分區採購法則與單位價格比對技法。',
      '熟練食材連鎖接力烹調，徹底告別枯萎葉菜與冰箱廚餘黑洞。',
      '掌握 28 道營養均衡、低成本且深受孩子喜愛的一鍋到底與烤盤快煮晚餐。',
      '建立家庭前夜冷藏移位與標準殺菁冷凍保存系統。',
    ],
    structuralPillars: [
      '預算與採購心理學 (Budget & Grocery Psychology)',
      '食材接力鏈與防浪費保存 (Relay Ingredients & Waste Prevention)',
      '28 天晚餐食譜全庫 (The 28 Dinners: Week 1 to Week 4)',
      '實作工作簿與追蹤表套件 (Companion Printables & Trackers)',
    ],
    companionResourcePlan: [
      '4 週整合分區採購清單 (Master Shopping Lists)',
      '28 天晚餐輪替月曆 (Monthly Dinner Calendar)',
      '平價食材營養替換矩陣 (Protein & Veggie Swaps)',
      '家庭冰箱分層管理與防浪費檢查表 (Fridge Architecture)',
      '剩料高湯與邊角料重生手冊 (Scrap Stock Guide)',
      '每週食材預算記帳表 (Weekly Budget Tracker)',
    ],
    brandVoiceSummary: '溫暖、同理、實用、結構嚴謹且賦能激勵（The Smart Family Table）。',
    pricingStrategy: '標準價格 $14.99，上市推廣測試價 $9.99，豪華伴隨套件包 $19.99。',
    evidenceStandards: '所有數據嚴格錨定 USDA、EPA、FDA、BLS、哈佛公衛等權威機構之公開實證資料。',
    qualityAcceptanceCriteria: [
      '20 篇研究文獻均具備完整七部分知識卡 (A-G) 與清晰版權出處。',
      '28 道晚餐食譜均具備準備時間、烹飪時間、單人份預估成本、步驟及食安溫度。',
      '所有伴隨資源表格均具備完整欄位與實際示範填寫項目。',
      '三大重要免責聲明醒目標記於手冊扉頁。',
    ],
    isApproved: true,
    approvedAt: '2026-11-10T08:35:00Z',
  },
  outline: [
    {
      id: 'CH-01',
      order: 1,
      title: '解鎖聰明家庭餐桌：每週 $85 預算與終結廚房焦慮',
      objective: '建立家庭晚餐預算觀念，理解通膨下的家庭食材消費心理，並佈建家庭冷藏冷凍視線分區。',
      subtopics: [
        '家庭晚餐開銷暴增的隱形原因：外送、重複採購與丟棄浪費',
        'USDA 節儉飲食標準（Thrifty Food Plan）實例解密',
        '消除傍晚 5 點的決策疲勞：主題日輪替系統的威力',
        '2-4 食安守則與冰箱可視化分層架構',
      ],
      targetWordCount: 1800,
      actualWordCount: 1950,
      practicalDeliverable: '完成家庭每週食材預算上限設定，並將冷藏室完成視線專區規劃。',
      mappedReferenceIds: ['REF-01', 'REF-02', 'REF-04', 'REF-14', 'REF-18'],
      exampleScenarios: ['雙薪家庭週四晚上看著滿冰箱枯萎蔬菜只能點外送的真實翻轉案例'],
      completionMilestone: '第 1 階段建立共識與基礎架構完成',
      isCompleted: true,
      isLocked: false,
      lastGeneratedAt: '2026-11-10T09:00:00Z',
      usedModel: 'openrouter/free (DeepSeek-V3 / Gemini)',
      contentMarkdown: `## 歡迎來到聰明家庭餐桌！

如果每到了下午五點，你的胸口就泛起一陣莫名的窒息感；如果打開冰箱，映入眼簾的是發黑的香菜、化成爛泥的半條小黃瓜，以及三天前吃剩但沒人想碰的乾癟肉片；如果每個月看信用卡帳單，發現那些「隨手叫叫」的外送平台費用居然高達四五百美元——請深深吸一口氣：**這絕對不是因為你懶惰，也不是因為你不會做飯。**

這一切的混亂，只是因為現代忙碌家庭被拋入了一個充滿超市消費陷阱與高通膨的複雜世界，卻沒有人給你一套**「能自動運轉的家庭餐桌操作系統」**。

---

### 第一節：通膨時代的家庭食材經濟學

根據美國農業部（USDA）官方發布的飲食成本報告（Thrifty Food Plan），一個包含兩名成人與兩名學齡兒童的四人家庭，在兼顧完整維生素、礦物質與足夠熱量的前提下，每月的基礎食材採購預算約為 $970 至 $1,020 美元。將這個數字按比例拆解至家庭最具挑戰性、份量最重的「晚餐」，你會驚訝地發現：**每週 5 至 7 天的晚餐食材成本，完全可以健康、優雅地鎖定在 $75 到 $95 美元的區間內。**

換句話說，四人家庭平均每人每頓豐盛晚餐的食材成本，只需大約 **$2.10 到 $2.80 美元**！

但為什麼大部分家庭每週走進超市隨便結帳就超過 $200 美元，回家卻依然覺得「沒有晚餐可吃」？
美國環保署（EPA）的研究給出了令人心痛的答案：普通家庭購買的生鮮食材中，高達 **31.9%** 從未被送進家人的肚子，而是直接爛在冰箱後方或廚餘桶中。這相當於每週走進超市時，你直接將一張面額 $50 美元的鈔票當場撕碎丟進垃圾桶！

---

### 第二節：四維聰明接力膳食法 (4-Pillar Smart Relay System)

本書的核心，不是叫你全家每晚喝西北風或吃水煮胡蘿蔔，而是導入由主廚、營養學家與家庭經濟學家驗證的 **「四維聰明接力膳食法」**：

1. **超市外圍分區採購單 (Perimeter Shopping Lists)**：不讓超市動線牽著鼻子走，專注高性價比原型食材。
2. **食材連鎖接力鏈 (Relay Ingredients)**：週一買的一整束西芹或一大盤雞胸肉，自動無縫跨越週二與週三，在最新鮮的 72 小時內化身為三道風格迥異的美味晚餐。
3. **一鍋烤盤 30 分鐘快煮 (One-Pot & Sheet-Pan Efficiency)**：平日晚上不洗六七個鍋碗瓢盆，以最少工序完成最下飯的熱騰騰餐點。
4. **冰箱透明視線收納與防浪費急凍 (Visible Storage & Freezing)**：運用康乃爾大學證實的「視線層陳列法」，讓食材隨時被看見、被吃掉。

---

### 第三節：傍晚 5 點不再崩潰——擺脫決策疲勞

行為科學期刊《Appetite》的研究證實：人類的意志力在傍晚五點至七點處於一整天的最低點。如果此時你還需要逼大腦思考「今晚吃什麼」，大腦為了保護你，會直接發出訊號逼你尋求高油高鹽高花費的「外送垃圾食物」。

本書為你設計的 28 天晚餐日曆，就是你的**全自動導航儀**。你不再需要思考，只要看一眼日曆，照著步驟拿出前一晚已在冷藏室慢速解凍的食材，25 到 35 分鐘內，全家人就能圍坐在飄散著香氣的餐桌旁。

準備好重掌你的荷包與晚餐幸福感了嗎？讓我們從翻新你的採購清單開始！`,
    },
    {
      id: 'CH-02',
      order: 2,
      title: '超市採購防守戰：單位價格、自有品牌與分區清單',
      objective: '學會識破超市促銷心理學，掌握每盎司單位價格計算，並熟悉超市自有品牌替換技巧。',
      subtopics: [
        '超市動線心理學：為何高利潤精緻食品總在視線中央',
        '單位價格黃金律 (Unit-Price Golden Rule)',
        '名牌 vs 超市自有品牌 (Store Brands) 盲測真相',
        '急凍蔬菜與乾燥豆類的超級性價比優勢',
      ],
      targetWordCount: 1900,
      actualWordCount: 2050,
      practicalDeliverable: '建立個人化超市常買原型食材單位價格速查基準表。',
      mappedReferenceIds: ['REF-03', 'REF-06', 'REF-07', 'REF-13', 'REF-16', 'REF-19'],
      exampleScenarios: ['在 Walmart 或 Aldi 面對琳瑯滿目的番茄罐頭與雞肉時的精準抉擇'],
      completionMilestone: '第 2 階段採購防守力升級完成',
      isCompleted: true,
      isLocked: false,
      lastGeneratedAt: '2026-11-10T09:20:00Z',
      usedModel: 'openrouter/free (DeepSeek-V3 / Gemini)',
      contentMarkdown: `## 超市不是你的朋友，但你可以成為最精明的特工

走進現代大型連鎖超市，你所踩的每一步地磚、聞到的烘焙香氣、耳邊播放的輕柔音樂，全都是一群頂尖行為心理學家精密計算的結果。他們的唯一目的，就是誘使你在無意識中，把清單之外、利潤率最高的精緻加工食品放進推車。

在這一章，我們將徹底武裝你的雙眼，讓你走進賣場時不再被花俏的花招迷惑。

---

### 第一節：忽略特價大字，直視「單位價格 (Unit Price)」

在貨架標籤上，商家往往會用鮮豔的黃色或紅色大字標示「特價 $3.99！買二送一！」。請立刻移開你的視線，將目光移到標籤左下角或右上角那排微小的灰色小字：**「$0.24 / OZ」或「$2.15 / LB」**。

這就是**單位價格（Unit Price）**，它是衡量商品真實價值的唯一客觀量尺。
很多時候，大包裝並不一定更便宜，所謂的特價特賣包，其每盎司單價可能悄悄比旁邊的常規包裝高出 15%。只有學會比對單位價格，你才能真正識破所謂「促銷」的真實面貌。

---

### 第二節：名牌迷思的破滅——擁抱超市自有品牌

根據美國勞工統計局（BLS）與消費者報告的長年盲測追蹤：超市自有品牌（Store Brands，例如 Aldi 的 Simply Nature、Walmart 的 Great Value、Kroger 的 Simple Truth 或 Trader Joe’s 品牌）與昂貴全國性名牌產品相比，在內容物品質、純度與安全標準上的滿意度高達 **92% 無顯著差異**。

然而，兩者的終端價格平均相差了 **20% 到 30%**！
為什麼？因為名牌產品必須將數以億計的電視廣告費、明星代言費與超市黃金陳列架上架費（Slotting Fees）轉嫁給消費者；而自有品牌直接由同一家食品代工廠直供。轉向超市自有品牌，你的全家每週食材費立刻現省 $25 至 $40 美元，而菜餚的美味度絲毫未減。

---

### 第三節：急凍蔬菜是廚房裡最被低估的神物

許多家長有一種潛意識的罪惡感，認為「給孩子吃冷凍蔬菜就代表我不夠愛他們、我偷懶」。
**這是完全錯誤的偽科學！**

USDA 農業研究中心的權威化驗數據證實：生鮮蔬菜從農田採收、冷鏈運輸、上架擺放，直到你買回家放進冷藏室三天，其中的維生素 C 與葉酸已降解了 30% 到 50%。而商業急凍蔬菜（如綠花椰菜、四季豆、玉米粒、青豆）是在採收後數小時內立即完成殺菁急凍，營養素被完整封存。

更重要的是：
- 急凍蔬菜**零廚餘浪費**（沒有需要削掉的枯枝硬梗）。
- **零腐爛風險**，可在冷凍庫保存半年以上。
- 每磅價格平均比生鮮蔬菜便宜 **40% 到 60%**。

在接下來的 28 天晚餐中，急凍蔬菜將是我們維持每餐 $2.50 預算不可或缺的秘密武器！`,
    },
    {
      id: 'CH-03',
      order: 3,
      title: '第一週：無縫接力啟動週（Day 1 – Day 7 晚餐食譜）',
      objective: '實作第一週完整 7 道晚餐食譜，掌握烤盤雞腿排、多功能番茄肉醬與蔬菜接力鏈。',
      subtopics: [
        '第一週食材採購清單與支出預算審核 ($82.50)',
        '週一：香草烤盤脆皮雞腿排佐地瓜與青花菜 (Sheet-Pan Herb Chicken)',
        '週二：經典義式波隆那慢燉肉醬麵 (Bolognese Pasta with Hidden Veggies)',
        '週三：接力烤雞絲玉米黑豆墨西哥餡餅 (Chicken & Black Bean Quesadillas)',
        '週四：一鍋到底奶油蒜香培根時蔬燉飯 (One-Pot Creamy Bacon Risotto)',
        '週五：地中海香煎魚排佐番茄青檸醬汁 (Pan-Seared White Fish with Tomato Relish)',
        '週六：清冰箱酥脆蔬菜起司烘蛋 (Frittata Clean-Out)',
        '週日：慢燉牛肉末洋蔥馬鈴薯農夫鍋 (Rustic Beef & Potato Skillet)',
      ],
      targetWordCount: 2200,
      actualWordCount: 2350,
      practicalDeliverable: '完成第一週 7 道晚餐料理，達成第一週食物浪費低於 5% 檢核。',
      mappedReferenceIds: ['REF-01', 'REF-04', 'REF-09', 'REF-11', 'REF-15', 'REF-20'],
      exampleScenarios: ['週一烤好的大份量雞腿排，留出兩塊拆成雞肉絲，週三直接 10 分鐘變身熱騰騰墨西哥起司餡餅'],
      completionMilestone: '第 1 週晚餐全套食譜落地驗證',
      isCompleted: true,
      isLocked: false,
      lastGeneratedAt: '2026-11-10T09:45:00Z',
      usedModel: 'openrouter/free (DeepSeek-V3 / Gemini)',
      contentMarkdown: `## 第一週：無縫接力啟動週 (Day 1 – Day 7)

歡迎來到實戰環節！本週的採購總花費已嚴格審核在 **$82.50 美元**，供應全家 4 人完整的 7 頓豐盛晚餐。

---

### 【第一週核心食材接力鏈 (The Relay Chain)】
- **骨肉接力**：週一烤箱烘烤一大盤特價帶骨雞腿排（共 8 塊），當晚享用 4 塊；剩餘 4 塊去骨撕成鮮美雞肉絲冷藏，作為週三「墨西哥起司餡餅」的核心主角（省去週三生肉處理 20 分鐘！）。
- **蔬果接力**：週二義式肉醬使用一半的胡蘿蔔與芹菜末；剩餘的半袋胡蘿蔔切條，作為週四燉飯與週六清冰箱烘蛋的鮮甜蔬菜底。

---

### Day 1（週一）：香草烤盤脆皮雞腿排佐地瓜與青花菜
- **準備時間**：10 分鐘 | **烹飪時間**：30 分鐘 | **每人每餐預估成本**：$2.15
- **核心食材**：帶骨雞腿排 8 塊（約 3.5 磅）、地瓜 2 顆（滾刀塊）、急凍綠花椰 1 包、大蒜粉、煙燻紅椒粉、橄欖油、海鹽黑胡椒。
- **作法**：
  1. 烤箱預熱至 400°F (200°C)。在大型烤盤上鋪上鋁箔紙。
  2. 地瓜塊與綠花椰放入大碗，淋上 1 大匙油、少許海鹽黑胡椒抓勻，平鋪於烤盤兩側。
  3. 雞腿排用廚房紙巾徹底擦乾水分（脆皮關鍵！），雙面均勻撒上煙燻紅椒粉、大蒜粉與海鹽，雞皮朝上擺在烤盤中央。
  4. 進烤箱烘烤 30-35 分鐘，以數位探針溫度計確認雞肉最厚部位內部核心溫度達到 **165°F (74°C)**，雞皮金黃酥脆即可出爐。
  5. **【接力備料】**：取出全家當晚食用的 4 塊雞腿；剩餘 4 塊待涼後去皮去骨拆絲，放入保鮮盒冷藏備用（供 Day 3 使用）。

---

### Day 2（週二）：經典義式波隆那慢燉肉醬麵
- **準備時間**：10 分鐘 | **烹飪時間**：25 分鐘 | **每人每餐預估成本**：$1.95
- **核心食材**：80/20 牛絞肉（或牛豬混合）1 磅、洋蔥半顆切碎、胡蘿蔔 1 根刨絲、番茄泥罐頭（Crushed Tomatoes）28oz、全麥義大利麵 1 磅。
- **作法**：
  1. 煮一鍋熱水加 1 小匙鹽，義大利麵煮至 al dente 彈牙口感瀝乾。
  2. 深平底鍋熱油，下絞肉大火炒香至表面金黃出油，加入洋蔥碎與胡蘿蔔絲拌炒 3 分鐘至軟化釋放自然甜味。
  3. 倒入整罐番茄泥，加入 1 茶匙義大利綜合香草與少許鹽，小火慢燉 15 分鐘讓醬汁濃郁收汁。
  4. 淋在義大利麵上，撒少許乳酪粉即可上桌。這道菜隱藏了大量胡蘿蔔纖維，連挑食的孩子都會一口接一口！

---

### Day 3（週三）：接力烤雞絲玉米黑豆墨西哥餡餅 (Quesadillas)
- **準備時間**：5 分鐘 | **烹飪時間**：10 分鐘 | **每人每餐預估成本**：$1.85
- **核心食材**：Day 1 拆好的冷藏熟雞肉絲、墨西哥麵餅皮 8 片、黑豆罐頭（沖洗瀝乾）1 罐、玉米粒半杯、切達起司絲 1.5 杯。
- **作法**：
  1. 平底鍋刷少許油小火加熱，放入一片麵餅。
  2. 半邊均勻鋪上起司絲、黑豆、玉米粒與熟雞肉絲，再撒一層起司絲，將餅皮對折成半月形。
  3. 煎至底面金黃酥脆（約 2-3 分鐘），翻面再煎 2 分鐘至起司完全融化。
  4. 起鍋切三等分扇形，搭配市售平價莎莎醬，十萬火急的週三晚上 15 分鐘輕鬆開飯！

*(Day 4 至 Day 7 依此類推完整收錄於產品手冊中)*`,
    },
    {
      id: 'CH-04',
      order: 4,
      title: '第二週：舒心省時燉煮週（Day 8 – Day 14 晚餐食譜）',
      objective: '實作第二週以一鍋法、慢燉與平價牛肉/豬肉為核心的溫暖高飽足感家常晚餐。',
      subtopics: [
        '第二週食材採購預算核算 ($84.20)',
        '週一：法式鄉村獵人燉雞肉佐白米飯 (One-Pot Hunter’s Chicken)',
        '週二：香濃黑豆牛肉辣椒醬佐脆脆玉米片 (Hearty Beef & Black Bean Chili)',
        '週三：接力香脆辣椒起司焗烤熱狗堡 (Chili Cheese Dogs)',
        '週四：金黃香蒜檸檬胡椒烤豬排 (Garlic Herb Pork Chops with Applesauce)',
        '週五：日式照燒雞肉蔬菜五彩炒麵 (Teriyaki Chicken & Veggie Yakisoba)',
        '週六：家常濃郁奶油青花菜馬鈴薯濃湯 (Loaded Potato & Broccoli Soup)',
        '週日：經典英式牧羊人肉派 (Easy Cottage Pie)',
      ],
      targetWordCount: 2200,
      actualWordCount: 2280,
      practicalDeliverable: '完成第二週燉煮與冷凍利用食譜，每人每餐控制在 $2.20 以下。',
      mappedReferenceIds: ['REF-03', 'REF-04', 'REF-07', 'REF-11', 'REF-15'],
      exampleScenarios: ['週二煮的一大鍋黑豆牛肉辣椒醬，留出一半，週三 10 分鐘淋在烤熱狗麵包上立即開飯'],
      completionMilestone: '第 2 週燉煮系統食譜落地驗證',
      isCompleted: true,
      isLocked: false,
      lastGeneratedAt: '2026-11-10T10:05:00Z',
      usedModel: 'openrouter/free (DeepSeek-V3 / Gemini)',
      contentMarkdown: `## 第二週：舒心省時燉煮週 (Day 8 – Day 14)

進入第二週，全家將體驗到「大鍋燉煮 (Batch-Stewing)」帶來的極致便利感。本週總食材花費為 **$84.20 美元**。

---

### 【第二週接力亮點】
週二烹煮的一大鍋「黑豆牛肉辣椒醬（Beef & Black Bean Chili）」，融合了 50% 牛絞肉與 50% 黑豆（落實哈佛公衛推薦的蛋白質延伸法）。這道菜越煮越香，週三晚上只需加熱 5 分鐘，淋在特價買回的熱狗麵包上，撒上一把切達起司，就是孩子歡呼尖叫的「起司肉醬熱狗堡（Chili Dogs）」！

*(完整 Day 8 至 Day 14 詳細烹調步驟、精準食材克數與過敏原警示收錄於正式手冊)*`,
    },
    {
      id: 'CH-05',
      order: 5,
      title: '第三週：快手烤盤與異國風情週（Day 15 – Day 21 晚餐食譜）',
      objective: '實作第三週融合亞洲、地中海與美式西南風味之高纖抗炎快煮料理。',
      subtopics: [
        '第三週採購預算核對 ($86.00)',
        '週一：西南風味黑椒青椒牛柳炒盤 (Sheet-Pan Beef Fajitas)',
        '週二：韓式甜辣豬肉末豆腐鍋 (Quick Korean Pork & Soft Tofu Stew)',
        '週三：希臘檸檬牛至烤魚排佐溫沙拉 (Greek Lemon Herb Fish)',
        '週四：一鍋到底奶油番茄菠菜嫩雞麵 (Tuscan Garlic Chicken Pasta)',
        '週五：日式香煎照燒鮭魚碎拌飯 (Crispy Salmon Rice Bowls with Edamame)',
        '週六：美式經典水牛城辣雞絲生菜捲 (Buffalo Chicken Wraps)',
        '週日：全家歡樂手作平價發酵披薩之夜 (DIY Family Pizza Night)',
      ],
      targetWordCount: 2100,
      actualWordCount: 2200,
      practicalDeliverable: '完成第三週異國風情快手料理，建立自製披薩麵糰低成本配方。',
      mappedReferenceIds: ['REF-03', 'REF-04', 'REF-05', 'REF-11', 'REF-15'],
      exampleScenarios: ['週五利用罐裝或特價鮭魚碎肉搭配急凍毛豆，15 分鐘端出色彩斑斕的日式丼飯'],
      completionMilestone: '第 3 週異國快煮食譜落地驗證',
      isCompleted: true,
      isLocked: false,
      lastGeneratedAt: '2026-11-10T10:25:00Z',
      usedModel: 'openrouter/free (DeepSeek-V3 / Gemini)',
      contentMarkdown: `## 第三週：快手烤盤與異國風情週 (Day 15 – Day 21)

第三週的重點在於打破「家常菜天天吃容易膩」的魔咒。我們用最平價的基礎原型食材（豬肉末、魚排、麵粉、雞肉），搭配不同香料比例，帶全家的味蕾環遊世界。本週總食材花費為 **$86.00 美元**。

*(完整 Day 15 至 Day 21 步驟與香料調配比例收錄於手冊)*`,
    },
    {
      id: 'CH-06',
      order: 6,
      title: '第四週：終極庫存清空與大師衝刺週（Day 22 – Day 28 晚餐食譜）',
      objective: '實作第四週全盤盤點儲藏室與冷凍庫庫存，實現食材 0 浪費的高效閉環。',
      subtopics: [
        '第四週極致採購清單 ($72.50 — 因大量消耗前三週剩餘乾貨與冷凍食材)',
        '週一：金黃脆皮義式焗烤千層筆管麵 (Baked Ziti with Mozzarella)',
        '週二：泰式椰香紅咖哩豆腐時蔬湯 (Thai Red Curry Tofu & Veggies)',
        '週三：美式媽媽經典多汁烤肉糕 (Classic Glazed Meatloaf with Mashed Potatoes)',
        '週四：剩料變身特香黃金炒飯 (The Ultimate Leftover Fried Rice)',
        '週五：香脆烤盤墨西哥玉米片嘉年華 (Sheet-Pan Loaded Nachos)',
        '週六：法式洋蔥牛肉湯佐起司厚片烤土司 (Rich French Onion & Beef Soup)',
        '週日：28 天慶功宴：全家分享派對大總結 (Celebration Family Dinner)',
      ],
      targetWordCount: 2200,
      actualWordCount: 2310,
      practicalDeliverable: '完成 28 天全部晚餐閉環，冰箱達成全面乾淨清空狀態。',
      mappedReferenceIds: ['REF-01', 'REF-02', 'REF-04', 'REF-08', 'REF-12', 'REF-17'],
      exampleScenarios: ['第四週採購金額降至 $72.50，因為完美消耗掉儲藏室中的米、乾豆與冷凍高湯'],
      completionMilestone: '28 道晚餐食譜全線完工',
      isCompleted: true,
      isLocked: false,
      lastGeneratedAt: '2026-11-10T10:40:00Z',
      usedModel: 'openrouter/free (DeepSeek-V3 / Gemini)',
      contentMarkdown: `## 第四週：終極庫存清空與大師衝刺週 (Day 22 – Day 28)

恭喜你抵達第四週！在本週，你將見證系統最強大的收斂能力：前三週收集的自製蔬菜高湯、儲藏室剩下的半袋筆管麵、冷凍庫預留的碎牛肉，將在本週全部優雅登場。
因此，第四週的採購花費直接降至 **$72.50 美元** 的極低紀錄！

*(完整 Day 22 至 Day 28 步驟與清冰箱炒飯、焗烤食譜收錄於手冊)*`,
    },
    {
      id: 'CH-07',
      order: 7,
      title: '零浪費廚房手冊：食材急凍殺菁、自製高湯與保鮮科學',
      objective: '掌握食品微生物保鮮科學、USDA/FDA 食安低溫標準、自製剩料高湯公式與殺菁急凍法。',
      subtopics: [
        '殺菁（Blanching）科學：水溫與秒數決定蔬菜生死',
        '冷凍剩料聚寶袋：每個月免費收穫 3 公升純天然高湯',
        '四大安全解凍途徑與致命常溫退冰黑名單',
        '過期標籤解密：Best by 與 Use by 的科學判斷法',
      ],
      targetWordCount: 1800,
      actualWordCount: 1920,
      practicalDeliverable: '完成一袋自製冷凍蔬菜高湯磚，並掌握各類生鮮食材冷凍保鮮期限表。',
      mappedReferenceIds: ['REF-02', 'REF-04', 'REF-08', 'REF-10', 'REF-12', 'REF-17', 'REF-20'],
      exampleScenarios: ['將特價買多的一大把芹菜與胡蘿蔔，經 90 秒殺菁後平鋪速凍，保存半年依然鮮脆如新'],
      completionMilestone: '零浪費廚房保鮮科學篇完工',
      isCompleted: true,
      isLocked: false,
      lastGeneratedAt: '2026-11-10T10:50:00Z',
      usedModel: 'openrouter/free (DeepSeek-V3 / Gemini)',
      contentMarkdown: `## 食材的第二生命：零浪費保鮮與急凍科學

在這個章節，我們將傳授全套廚房科學防衛術。掌握這些知識，你將徹底杜絕「買了吃不完只能丟」的內疚感。

---

### 第一節：生鮮急凍的靈魂——殺菁 (Blanching)

許多人試過把吃不完的綠花椰或四季豆直接裝進塑膠袋丟進冷凍庫，結果兩週後拿出來，蔬菜發黑、軟爛、甚至帶有一股令人不適的苦水味。
為什麼？
因為生鮮植物組織內部含有過氧化物酶（Peroxidase）與多酚氧化酶。即便在 -18°C 的冷凍低溫下，這些酶依然會緩慢運作，持續瓦解蔬菜的細胞結構與維生素。

**標準 3 步殺菁操作法則：**
1. **高溫殺菁**：準備一大鍋沸水（滾水翻騰），將切好的蔬菜投入滾水中，精準燙煮 **60 至 120 秒**（青花菜 90 秒、胡蘿蔔片 120 秒、四季豆 90 秒）。
2. **冰水剎車**：撈出後立即浸入備有冰塊的冰水中 2 分鐘，徹底終止餘熱，鎖住葉綠素與爽脆質地。
3. **擦乾平鋪速凍**：用廚房紙巾徹底擦乾表面水分，在烤盤上單層平鋪，進冷凍庫 2 小時凍硬成單顆，再裝入冷凍密封袋。這樣處理後的蔬菜，可在冷凍庫保存 **8 到 12 個月**，風味如初！

---

### 第二節：冷凍剩料聚寶袋——免費熬出五星級純天然高湯

在料理過程中，胡蘿蔔頂端削下的頭部、洋蔥外層紅皮、西洋芹葉片、蒜頭末端，這些部位往往被直接丟進廚餘桶。
但請記住：這些部位的天然香氣與多酚抗氧化物含量極高！

只要在冷凍庫準備一個大號夾鏈袋：
- 每次備料剩下的乾淨蔬菜皮、根、葉，直接洗淨丟入袋中冷凍。
- 收集滿一大袋時，倒進湯鍋中，加入 2.5 公升清水與一片月桂葉。
- 小火慢燉 40 分鐘，濾出清澈金黃、甘甜無比的全天然蔬菜高湯。
- 將高湯分裝至冰塊盒或保鮮盒冷凍。平日煮湯、燉肉、煮義大利麵時丟入兩塊，鮮味立馬提升數倍，且每年直接省下幾十瓶高鈉化學高湯罐頭的費用！`,
    },
    {
      id: 'CH-08',
      order: 8,
      title: '終身受用的餐桌系統：四季菜單調整、習慣維持與全家共餐',
      objective: '總結 28 天實作成果，建立春、夏、秋、冬四季菜單微調心法，並深化全家共餐幸福感。',
      subtopics: [
        '四季時令食材價格波動與菜單切換模組',
        '面對通膨與突發開銷時的「極限 $60 週」應急菜單',
        '孩子挑食心理學：一道安心食物原則的奇蹟',
        '結語：每一頓飯，都是為全家未來存下健康與愛的存款',
      ],
      targetWordCount: 1600,
      actualWordCount: 1720,
      practicalDeliverable: '建立全家四季菜單輪換範本，並簽署全家每週 4 次無手機共餐約定。',
      mappedReferenceIds: ['REF-01', 'REF-05', 'REF-18'],
      exampleScenarios: ['夏季炎熱時如何將一鍋燉換成涼拌雞絲蕎麥麵與冷壓番茄冷湯'],
      completionMilestone: '全書 8 章大功告成',
      isCompleted: true,
      isLocked: false,
      lastGeneratedAt: '2026-11-10T11:00:00Z',
      usedModel: 'openrouter/free (DeepSeek-V3 / Gemini)',
      contentMarkdown: `## 結語：聰明餐桌，是給全家一生的最好禮物

走完這 28 天，請花幾分鐘走到你的廚房，拉開冰箱門看看。

那座曾經充斥著發霉剩菜、雜亂塑料袋與內疚感的「廚房黑洞」，如今是否變得井然有序？
冷藏室中央是透明玻璃盒裝好的預備食材；冷凍庫裡整齊排列著標註日期的醃肉包與金黃蔬菜高湯磚；水槽裡不再有堆積如山的油膩碗盤；而你的記帳軟體上，每個月清清楚楚少掉了兩三百美元無謂的外送與浪費。

這不僅僅是一次省錢的練習。
當你在傍晚能從容不迫地在半小時內端出一桌香氣撲鼻的飯菜，當全家人放下手機、在餐桌前相視微笑分享一天生活時，你給予家人的，是一種**無可撼動的安定感與幸福感**。

這套系統現在屬於你了。無論未來物價如何波動，世界如何紛擾，你都已經擁有了一套守護家庭餐桌的終身智慧。

祝你與家人：用餐愉快，生活從容！`,
    },
  ],
  productBible: {
    productTitle: '28-Day Budget Family Meal Plan',
    audiencePersona: '3–5人忙碌育兒家庭，預算緊縮但追求營養、美味與料理速度的現代父母。',
    centralPromise: '每週晚餐食材支出控制在 $75-$95，每晚 30 分鐘開飯，減少 40% 食物浪費。',
    signatureFramework: '4-Pillar Smart Relay System (四維聰明接力膳食法)',
    brandVoiceKeywords: ['溫暖 (Warm)', '務實 (Pragmatic)', '結構嚴謹 (Structured)', '賦能激勵 (Empowering)'],
    keyTerminology: {
      '食材接力鏈 (Relay Ingredients)': '前一天未用完的生鮮熟料，直接成為後一天晚餐的基底食材，連鎖消耗零浪費。',
      '殺菁 (Blanching)': '蔬菜冷凍前經 60-120 秒熱水燙煮後冰鎮，鈍化酵素以鎖住色澤與營養。',
      '單位價格 (Unit Price)': '包裝標籤上的每盎司或每磅價格，衡量食材性價比的唯一客觀量尺。',
      '2-4 食安守則 (2-Hour 4-Day Rule)': '熟食 2 小時內冷藏，冷藏熟食 4 天內食用完畢。',
    },
    introducedConcepts: [
      'USDA Thrifty Food Plan 基準',
      '超市外圍分區採購法則',
      '康乃爾冰箱中央視線陳列法',
      '冷凍剩料聚寶袋高湯法',
    ],
    usedExamples: [
      '週一烤雞腿排拆絲 -> 週三墨西哥玉米黑豆餡餅',
      '週二黑豆牛肉辣椒醬 -> 週三起司熱狗堡',
    ],
    activeReferenceMap: {
      'CH-01': ['REF-01', 'REF-02', 'REF-04', 'REF-14', 'REF-18'],
      'CH-02': ['REF-03', 'REF-06', 'REF-07', 'REF-13', 'REF-16', 'REF-19'],
      'CH-03': ['REF-01', 'REF-04', 'REF-09', 'REF-11', 'REF-15', 'REF-20'],
      'CH-04': ['REF-03', 'REF-04', 'REF-07', 'REF-11', 'REF-15'],
      'CH-05': ['REF-03', 'REF-04', 'REF-05', 'REF-11', 'REF-15'],
      'CH-06': ['REF-01', 'REF-02', 'REF-04', 'REF-08', 'REF-12', 'REF-17'],
      'CH-07': ['REF-02', 'REF-04', 'REF-08', 'REF-10', 'REF-12', 'REF-17', 'REF-20'],
      'CH-08': ['REF-01', 'REF-05', 'REF-18'],
    },
    unresolvedClaims: [],
    continuityHandoffNotes: [
      '全書 8 章已完整生成完畢，總字數達 16,840 字。',
      '食譜各週接力鏈前後銜接完整無矛盾。',
      '食安警示與 USDA 核心溫度標準全書保持一致。',
    ],
  },
  resources: [
    {
      id: 'RES-01',
      title: '4 週分區統整採購清單 (Master Grocery Shopping Lists)',
      category: 'CHECKLIST',
      purpose: '提供四週每週精確到品項與預估金額的採購清單，按超市動線分區，防止漏買與衝動消費。',
      instructions: '印出當週清單，採購前先勾除家中儲藏室已有的常備乾貨，進超市依區劃動線採購。',
      fieldsOrColumns: ['類別', '品項名稱', '規格份量', '預估單價', '實購勾選'],
      sampleEntries: [
        '生鮮蔬果區 | 帶皮胡蘿蔔 2 磅 | $1.49 | [x]',
        '肉品海鮮區 | 特價帶骨雞腿排 3.5 磅 | $4.50 | [x]',
        '冷凍食品區 | 急凍綠花椰菜 16oz | $1.29 | [x]',
      ],
      completionCriteria: '每週採購總額控制在 $75-$95 區間內，清單品項無遺漏。',
      associatedChapterId: 'CH-02',
      contentMarkdown: `### 第一週採購分配表 (總預算: $82.50)
- **【生鮮蔬果區】($24.50)**：地瓜 3 磅 ($2.20)、洋蔥 3 磅袋裝 ($2.50)、胡蘿蔔 2 磅 ($1.50)、大蒜 1 網袋 ($1.20)、大西洋檸檬 3 顆 ($1.50)、生薑 1 塊 ($0.80)、高麗菜 1 顆 ($1.80)、青蔥 2 束 ($1.00)、大番茄 4 顆 ($2.50)、青椒 3 顆 ($1.80)、馬鈴薯 5 磅袋裝 ($3.50)、西芹 1 束 ($1.70)、蘋果 3 磅袋裝 ($2.50)。
- **【肉品海鮮區】($28.50)**：帶骨雞腿排 3.5 磅 ($4.50)、80/20 牛絞肉 1.5 磅 ($7.50)、豬排 2 磅 ($5.00)、無骨雞胸肉 2 磅 ($5.50)、冷凍白魚排片 1.5 磅 ($6.00)。
- **【冷藏乳品與蛋豆】($13.50)**：大號雞蛋 1 盒 18 入 ($3.20)、切達起司絲 16oz ($3.00)、無鹽奶油 1 條 ($1.80)、原味希臘優格 32oz ($3.50)、傳統硬豆腐 1 盒 ($2.00)。
- **【冷凍與乾貨雜貨】($16.00)**：急凍綠花椰 16oz 2包 ($2.60)、黑豆罐頭 2 罐 ($1.60)、番茄泥罐頭 28oz ($1.80)、墨西哥捲餅皮 8片裝 ($2.20)、全麥義大利麵 1 磅 ($1.30)、白米 5 磅 ($3.50)、玉米罐頭 2 罐 ($1.50)、海苔酥少許 ($1.50)。`,
    },
    {
      id: 'RES-02',
      title: '28 天晚餐輪替行事曆 (Monthly Dinner Wall Calendar)',
      category: 'CALENDAR',
      purpose: '貼在冰箱上的全月晚餐日曆，每天一目了然晚餐菜色與前夜解凍提醒。',
      instructions: '印出後以磁鐵吸在冰箱正面，每晚晚餐前打勾，睡前檢查隔日解凍指示。',
      fieldsOrColumns: ['日期', '晚餐名稱', '備餐時間', '接力重點', '前夜解凍提醒'],
      sampleEntries: [
        'Day 1 | 香草烤盤雞腿排 | 35 min | 留 4 塊去骨拆絲 | 冷藏移位 Day 2 牛絞肉',
        'Day 2 | 義式波隆那肉醬麵 | 35 min | 留半袋胡蘿蔔 | 檢查 Day 1 雞肉絲密封',
      ],
      completionCriteria: '連續完成 28 天晚餐打卡。',
      associatedChapterId: 'CH-01',
      contentMarkdown: `### 28天晚餐輪替一覽表
- **第 1 週 (無縫啟動)**：Day 1 烤盤雞腿排 -> Day 2 波隆那肉醬麵 -> Day 3 墨西哥雞肉餡餅 -> Day 4 蒜香培根燉飯 -> Day 5 地中海香煎魚排 -> Day 6 蔬菜烘蛋 -> Day 7 農夫馬鈴薯鍋。
- **第 2 週 (溫暖燉煮)**：Day 8 法式獵人燉雞 -> Day 9 黑豆牛肉辣椒醬 -> Day 10 起司熱狗堡 -> Day 11 香蒜檸檬烤豬排 -> Day 12 照燒炒麵 -> Day 13 蔬菜濃湯 -> Day 14 牧羊人肉派。
- **第 3 週 (異國快手)**：Day 15 黑椒青椒牛柳 -> Day 16 韓式豆腐鍋 -> Day 17 希臘烤魚排 -> Day 18 奶油菠菜嫩雞麵 -> Day 19 照燒鮭魚拌飯 -> Day 20 水牛城雞肉捲 -> Day 21 手作披薩之夜。
- **第 4 週 (大師衝刺)**：Day 22 焗烤千層筆管麵 -> Day 23 泰式紅咖哩 -> Day 24 經典美式烤肉糕 -> Day 25 剩料變身黃金炒飯 -> Day 26 烤盤起司玉米片 -> Day 27 法式洋蔥牛肉湯 -> Day 28 慶功宴派對。`,
    },
    {
      id: 'RES-03',
      title: '食材替代與風味靈活矩陣 (Smart Swap Matrix)',
      category: 'TEMPLATE',
      purpose: '當某樣食材缺貨、特價過期或家人生病挑食時，一秒查找同等營養與口感的平價替代品。',
      instructions: '查閱左側原食材，依喜好從右側三種替代等級中任選一項直接代換。',
      fieldsOrColumns: ['原始食材', '第一推薦替代品', '超值平價替代品', '蔬食植物替代品'],
      sampleEntries: [
        '牛絞肉 1 磅 | 豬絞肉 + 醬油 | 雞肉絞肉 (Ground Turkey) | 棕色扁豆 (Brown Lentils)',
        '生鮮綠花椰 | 急凍青花菜朵 | 切片高麗菜梗 | 鮮嫩菠菜葉',
        '去骨雞腿排 | 特價帶骨雞腿自己剔骨 | 厚切豬里肌排 | 烤硬豆腐排',
      ],
      completionCriteria: '學會不因單一食材缺貨而放棄整道料理。',
      associatedChapterId: 'CH-02',
      contentMarkdown: `| 原食譜食材 | 首選替代品 | 超省錢替代品 | 植物蔬食替代品 |
|---|---|---|---|
| 牛絞肉 (Ground Beef) | 豬絞肉 (Ground Pork) | 絞火雞肉 (Ground Turkey) | 熟黑豆泥 + 扁豆 |
| 雞胸肉 (Chicken Breast) | 去骨雞腿肉 | 雞柳條 (Tenders) | 醃烤厚切豆腐塊 |
| 鮮奶 (Whole Milk) | 奶粉還原牛奶 | 燕麥奶 / 豆漿 | 清高湯加少許奶油 |
| 義大利麵醬 (Marinara) | 罐裝碎番茄加香草 | 番茄糊 (Paste) 加水稀釋 | 南瓜泥調味醬汁 |
| 帕馬森起司粉 | 熟成切達起司碎 | 營養酵母粉 (Nutritional Yeast) | 烘烤麵包屑加蒜鹽 |`,
    },
    {
      id: 'RES-04',
      title: '家庭冰箱可視化架構與防浪費保存手冊',
      category: 'GUIDE',
      purpose: '指導家庭將冷藏室、冷凍庫與蔬果保鮮抽屜重新分區，落實 FIFO 與可視化陳列。',
      instructions: '依照圖表指南，於週末花 15 分鐘重新調整冰箱各層陳列位置。',
      fieldsOrColumns: ['冰箱層別', '指定存放品項', '容器標準', '最長保存期限', '防浪費關鍵'],
      sampleEntries: [
        '冷藏上層 (最冷穩定區) | 熟食剩菜、冷飲、優格 | 密封玻璃盒 | 3-4 天 | 貼上標籤日期',
        '冷藏中央 (視線黃金區) | 2天內必吃蔬果、已切洗備料 | 透明可視保鮮盒 | 2-3 天 | 開門第一眼看見',
        '冷藏底層 (生肉專用抽屜) | 生肉生海鮮 | 托盤承接防滴漏 | 1-2 天 | 避免血水污染下層',
      ],
      completionCriteria: '冷藏室完成分層標籤化改造。',
      associatedChapterId: 'CH-07',
      contentMarkdown: `### 冰箱分層收納黃金法則
1. **上層 (視線之上)**：存放優格、果汁、即食起司與熟食保鮮盒。
2. **中層 (黃金視線層)**：**「即期食用專區 (Eat Me First Bin)」**！所有 48 小時內必須吃完的切片水果、剩餘半罐醬料、洗好的蔬菜，全部放在透明玻璃盒中，開門第一眼看到。
3. **下層 (低溫區)**：盛裝生肉生海鮮的專用托盤，嚴格防範肉汁滴漏到其他食材上。
4. **蔬果抽屜**：高濕度抽屜放葉菜（套保鮮袋微開孔透氣）；低濕度抽屜放蘋果、梨子等會釋放乙烯的熟成水果（與綠葉蔬菜分開！）。
5. **冷凍庫**：扁平化堆疊醃肉夾鏈袋（像書架一樣直立擺放），右側保留一格放置「冷凍剩料聚寶袋」。`,
    },
  ],
  qualityReport: {
    overallStatus: 'READY_FOR_EXPORT',
    overallScore: 98,
    actualWordCount: 16840,
    verifiedReferenceCount: 20,
    disclaimersVerified: true,
    reviewedAt: '2026-11-10T11:00:00Z',
    checksPassed: [
      '所有 8 個章節內容充實完整，無大綱假冒或空白佔位符號。',
      '20 篇參考文獻均經過真實七部分架構校對，無虛構捏造出處。',
      '食安規範完全遵循 USDA/FDA 禽肉內部核心溫度 165°F 及 2-4 食安法則。',
      '定價與每週預算明確聲明為「3-5人家庭之平日晚餐食材費」，杜絕不實過度保證。',
      '全書 28 道食譜準備時間、烹調時間、單餐成本與食材接力鏈均無邏輯矛盾。',
      '全書字數達 16,840 字，符合 STANDARD 長篇專書交付標準。',
    ],
    issues: [
      {
        id: 'ISSUE-01',
        severity: 'MINOR',
        category: 'SAFETY_DISCLAIMER',
        location: 'Chapter 3 & Chapter 5',
        description: '部分生海鮮與牛肉食譜建議補充孕婦或幼童之全熟注意警語。',
        suggestedFix: '已在 Chapter 3 與 Chapter 5 補充過敏原與全熟警示方塊。',
        isResolved: true,
        autoFixAvailable: true,
      },
    ],
  },
  brand: {
    profileName: 'The Smart Family Table (聰明家庭餐桌)',
    primaryHex: '#0F172A', // Slate 900
    secondaryHex: '#10B981', // Emerald 500
    accentHex: '#F59E0B', // Amber 500
    neutralBgHex: '#F8FAFC', // Slate 50
    fontDisplay: 'Plus Jakarta Sans',
    fontBody: 'Plus Jakarta Sans',
    coverBrief: '清新溫馨的高質感家庭廚房場景：明亮的石木複合餐桌上擺滿色彩斑斕的烤盤料理、新鮮蔬果與整齊的筆記採購單。暖金色午後陽光斜照，呈現現代、專業、安心且富有生活情調的精緻感。',
    manuscriptLayoutNotes: '雙色調標題排版，章節開頭附有本章目標摘要方塊；食譜區以三欄卡片呈現食材、時間與步驟；每章末尾附可交付成果檢核。',
  },
  pricingReport: {
    regularPrice: 14.99,
    introductoryPrice: 9.99,
    bundlePrice: 19.99,
    currency: 'USD',
    marketComparisonSummary: 'Amazon 預算食譜類均價 $11.99-$13.99（純文字居多）；Etsy 實作工具包與表格均價 $8.50-$12.00。本產品結合完整 Ebook 專書 + 4套實作列印 Toolkit，$14.99 具備極強競爭力。',
    rationale: '以「第一週現省 $50 晚餐食材費」作為核心訴求，相對於 $9.99 的首發投資，回本率超過 500%，大幅降低購買抗拒。',
  },
  salesAssets: {
    salesPageHeadline: '終結每天傍晚的「晚餐焦慮」：一套每週省下 $75 食材費、30 分鐘輕鬆開飯的 28 天家庭平價餐桌作戰計畫！',
    salesPageSubheadline: '不用當五星級大廚、不必犧牲全家營養、告別冰箱腐爛蔬菜與昂貴外送帳單。',
    heroPitch: '你是否厭倦了每週在超市結帳破兩百美元，回到家卻依然對著滿冰箱食材不知煮什麼？28-Day Budget Family Meal Plan 是專為 3-5 人忙碌家庭設計的完整餐桌解方。透過革命性的「食材連鎖接力法」，同一批生鮮食材在三天內巧妙消耗完畢，每晚 30 分鐘熱騰騰端上桌，一年為全家淨省逾 $3,000 美元！',
    productDescriptionBullets: [
      '【28 道完整實證晚餐食譜】：中西合璧、一鍋到底與烤盤快煮，每人每餐食材成本低於 $2.50！',
      '【4 週分區統整採購清單】：按超市動線分類，進店 20 分鐘精準買齊，杜絕所有衝動消費。',
      '【食材連鎖接力系統】：打破單道料理孤島，週一未用完食材自動成為週二週三美味基底。',
      '【零浪費廚房保鮮科學】：USDA 食安標準、蔬菜殺菁急凍法與自製免費鮮甜高湯手冊。',
      '【全套可列印實作工具箱】：含冰箱可視化分層地圖、挑食小孩應對法與食材替代矩陣。',
    ],
    targetBuyerNotice: '本產品非常適合：家有 1-3 名發育期子女、雙薪或全職家長、希望在通膨壓力下守住家庭荷包與健康均衡的忙碌父母。',
    notForBuyerNotice: '本產品不適合：希望尋求高檔奢華米其林繁複刀工宴客菜、或需要特殊重度醫療處方飲食（如末期腎病低蛋白飲食）之個別病患。',
    faqList: [
      {
        question: '每週 $85 的預算真的可能達成嗎？現在超市物價這麼高！',
        answer: '完全可能！本預算嚴格依據 USDA 最新節儉飲食數據（Thrifty Food Plan）計算，專注於「超市外圍原型食材」與「自有品牌善用」，並杜絕了 30% 的食材浪費。我們在清單中列出了精確的規格與單價對照，第一週實作你就會親眼見證。',
      },
      {
        question: '我家小孩非常挑食，不吃蔬菜怎麼辦？',
        answer: '別擔心！每道食譜均附有兒科營養專家推薦的「挑食友善調整選項（Kid-Friendly Tweaks）」與隱藏蔬菜烹飪法（如波隆那肉醬中的細絲胡蘿蔔），同時傳授「一道安心食物原則」，消除餐桌對抗。',
      },
      {
        question: '平日下班真的很累，做飯真的能在 30 分鐘內搞定嗎？',
        answer: '是的！因為我們採用了「接力食材鏈」與「前夜冷藏慢速解凍」。你平日晚上不需要從切洗整隻生雞開始，大部分料理只需 5-10 分鐘組裝，剩下時間交給烤箱或平底鍋，你完全有時間陪孩子寫作業或喝杯茶。',
      },
    ],
    leadMagnetConcept: {
      title: 'The 5-Day $50 Emergency Dinner Sprint (5天$50應急快煮指南)',
      hook: '本週荷包吃緊？用家裡儲藏室現有乾貨 + 超市 $50 原型食材，搞定全家 5 晚豐盛熱騰騰晚餐！',
      format: '12 頁精裝可列印 PDF + 1 頁快速採購檢查清單',
      deliverable: '5 道 20 分鐘極速晚餐食譜、50 美元精準採購單、剩菜打包技巧。',
    },
    emailLaunchSequence: [
      {
        day: 1,
        subject: '【真實計算】你家每個月悄悄丟進垃圾桶的 $150 美元...',
        preview: '打開冰箱看看，那包發黃的香菜與爛掉的芹菜在向你求救',
        goal: '喚醒痛點與共鳴，揭露家庭食物浪費與晚餐焦慮的真相',
        bodyMarkdown: `親愛的家長：

你算過家裡每個月在超市花費多少錢嗎？
更扎心的一個問題是：買回家的那些食材，到底有多少真正變成了全家滿足的笑容，又有多少在冰箱深處默默化成了一袋綠色爛泥？

根據統計，一般家庭每年無意間浪費在腐爛食材與隨手叫外送上的費用，高達 $2,000 到 $3,500 美元！
這不是因為你不會做飯，而是因為你缺少一套「自動運轉的餐桌接力系統」...（未完待續）`,
      },
      {
        day: 2,
        subject: '傍晚 5 點的心理學：為什麼你總是忍不住叫外送？',
        preview: '不是你意志力薄弱，而是大腦的決策疲勞在作祟',
        goal: '解釋決策疲勞機制，提出解決方案',
        bodyMarkdown: `昨天我們談到了冰箱裡的隱形黑洞。今天我想告訴你一個神經科學真相：
每天下午 5 點到 7 點，是全職父母意志力耗盡的「危險時段」...`,
      },
      {
        day: 3,
        subject: '【正式發布】28-Day Budget Family Meal Plan 限量首發優惠！',
        preview: '第一週省下 $50，讓晚餐時間重回溫暖與從容',
        goal: '產品正式開賣，首發早鳥特惠與贈品促銷',
        bodyMarkdown: `經過數月籌備與實證測試，我們正式推出《28-Day Budget Family Meal Plan》！
首發 48 小時特惠僅需 $9.99，附贈全套可列印 Toolkit...`,
      },
      {
        day: 4,
        subject: '「我終於不再為煮飯跟先生吵架了」——媽媽們的實證心得',
        preview: '看看 Sarah 與 Elena 如何每週把晚餐花費壓在 $80 以內',
        goal: '提供社會認同與真實使用案例回饋',
        bodyMarkdown: `自發布以來，已有數百位忙碌父母開始了第一週的無縫接力...`,
      },
      {
        day: 5,
        subject: '最後 6 小時：$9.99 早鳥測試價即將截止！',
        preview: '明天起調回正式售價 $14.99，立即重掌家庭荷包自主權',
        goal: '營造倒數急迫性，促成最後一批觀望買家轉換',
        bodyMarkdown: `早鳥測試優惠即將在午夜關閉。用不到兩杯外帶咖啡的價格，為全家鎖定未來一年的健康與省錢系統...`,
      },
    ],
    socialPosts: [
      {
        platform: 'Instagram / Facebook',
        postText: '🥑 每次去超市花了 $200，回家卻依然不知道煮什麼？別再讓你的辛苦錢在冰箱底層爛掉了！試試「食材連鎖接力法」：週一烤雞腿排多烤 4 塊去骨拆絲，週三直接 10 分鐘變身墨西哥起司餡餅！每週晚餐預算只要 $85，全家 4 口吃得心滿意足。點擊個人簡介領取《28-Day Budget Family Meal Plan》完整指南！#家庭理財 #平價料理 #零浪費廚房',
      },
      {
        platform: 'Pinterest',
        postText: '28-Day Budget Family Meal Plan: How to Feed a Family of 4 for Under $90/Week! Includes master grocery lists, 28 easy dinner recipes, and printables. Pin for later!',
      },
    ],
    thirtyDayLaunchPlan: [
      {
        week: 1,
        focus: '暖身期 (Warm-up & Community Seed)',
        tasks: [
          '發布免費磁鐵誘餌《5-Day $50 Emergency Dinner Sprint》獲取首批 200 位目標家長名單',
          '在社群分享「冰箱冷藏視線層改造」前後對比短影片',
          '在烹飪與育兒社群解答食材保存與超市省錢問題，建立權威專業感',
        ],
      },
      {
        week: 2,
        focus: '首發開賣期 (Official Launch Week)',
        tasks: [
          '向電郵名單發送 5 封發布電郵序列，提供早鳥測試價 $9.99',
          '啟動 Gumroad / Etsy / 獨立站銷售頁，測試結帳流程無阻礙',
          '發布 3 篇 Instagram Reels 展示「15 分鐘雞肉絲餡餅快煮過程」',
        ],
      },
      {
        week: 3,
        focus: '社會認同與見證擴散 (Social Proof Acceleration)',
        tasks: [
          '邀請 10 位親子或省錢生活風格創作者進行試讀開箱分享',
          '將早鳥買家的正向反饋與曬出的晚餐照片整合進銷售頁 FAQ',
          '將定價調整為常規價格 $14.99，並推出包含試算表之 $19.99 豪華組合包',
        ],
      },
      {
        week: 4,
        focus: '常態化長青銷售 (Evergreen Optimization)',
        tasks: [
          '設定 Pinterest 自動化圖釘行銷，導流至磁鐵誘餌與銷售頁',
          '將 5 封電郵序列納入自動化迎賓電郵漏斗 (Welcome Funnel)',
          '每月檢查超市價格更新與當季食譜替換指南，維持產品最高評價',
        ],
      },
    ],
  },
  aiSettings: {
    provider: 'openrouter',
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/free',
    apiKeys: {
      openrouter: '',
      gemini: '',
      openai: '',
      claude: '',
    },
    providerModels: {
      openrouter: 'openrouter/free',
      gemini: 'gemini-2.5-flash',
      openai: 'gpt-4o',
      claude: 'claude-3-7-sonnet-20250219',
    },
    freeOnly: true,
    allowPaidFallback: false,
    maxSpendPerRequest: 0.05,
    dailyBudget: 1.0,
    projectBudget: 5.0,
    stageModels: {
      market_research: 'openrouter/free',
      topic_selection: 'openrouter/free',
      project_brief: 'openrouter/free',
      uvz: 'openrouter/free',
      transformation_map: 'openrouter/free',
      reference_library: 'openrouter/free',
      product_charter: 'openrouter/free',
      outline_builder: 'openrouter/free',
      content_studio: 'openrouter/free',
      workbook_studio: 'openrouter/free',
      quality_assurance: 'openrouter/free',
      brand_design: 'openrouter/free',
      pricing_launch: 'openrouter/free',
      export_center: 'openrouter/free',
    },
    fallbackModels: [
      'meta-llama/llama-3.3-70b-instruct:free',
      'deepseek/deepseek-r1:free',
      'google/gemini-2.0-flash-exp:free',
      'openrouter/free',
    ],
    usageStats: {
      totalRequests: 14,
      totalTokens: 42800,
      estimatedCostUsd: 0.0,
      lastRequestAt: '2026-11-10T11:00:00Z',
    },
  },
};

export const BLANK_PROJECT: DigitalProductProject = {
  schemaVersion: '4.0',
  projectId: 'proj_blank_initial',
  name: 'Untitled Digital Product',
  isBlankProject: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  preferences: {
    market: 'US',
    language: 'English',
    productFormat: 'ebook_toolkit',
    automationMode: 'manual_review',
    referenceTarget: 20,
    autoApproveNonCritical: false,
  },
  workflow: {
    activeStage: 'market_research',
    stageStatuses: {
      market_research: 'NOT_STARTED',
      topic_selection: 'NOT_STARTED',
      project_brief: 'NOT_STARTED',
      uvz: 'NOT_STARTED',
      transformation_map: 'NOT_STARTED',
      reference_library: 'NOT_STARTED',
      product_charter: 'NOT_STARTED',
      outline_builder: 'NOT_STARTED',
      content_studio: 'NOT_STARTED',
      workbook_studio: 'NOT_STARTED',
      quality_assurance: 'NOT_STARTED',
      brand_design: 'NOT_STARTED',
      pricing_launch: 'NOT_STARTED',
      export_center: 'NOT_STARTED',
    },
    gates: {
      gateA: {
        gate: 'GATE_A_TOPIC',
        isApproved: false,
        requiredFor: ['project_brief', 'reference_library', 'uvz', 'transformation_map'],
      },
      gateB: {
        gate: 'GATE_B_STRATEGY',
        isApproved: false,
        requiredFor: ['outline_builder', 'content_studio', 'workbook_studio', 'brand_design', 'pricing_launch'],
      },
      gateC: {
        gate: 'GATE_C_QUALITY',
        isApproved: false,
        requiredFor: ['export_center'],
      },
    },
    isAutopilotRunning: false,
    lastCheckpoint: new Date().toISOString(),
  },
  marketResearch: {
    researchDate: new Date().toISOString().slice(0, 10),
    platformEvidence: [],
    topicCandidates: [],
    selectedTopicId: null,
    confidence: 'MEDIUM',
  },
  intake: {
    projectName: '',
    creatorName: '',
    experienceLevel: 'BEGINNER',
    relevantExperience: '',
    expertise: '',
    interests: '',
    targetAudience: '',
    problemsSolved: '',
    productIdea: '',
    desiredTransformation: '',
    brandStyleAndVoice: {
      personality: 'Practical, supportive, evidence-based, actionable',
      primaryColor: '#2563EB',
      secondaryColor: '#059669',
      accentColor: '#F59E0B',
      typographyDirection: 'Clean Sans-Serif with High Contrast',
      writingVoice: 'Empowering, clear, concise, no fluff',
      emotionalPositioning: 'From overwhelmed to confident & organized',
      stylesToAvoid: 'Academic jargon, unrealistic claims, passive tone',
    },
    constraintsAndExclusions: {
      productBoundaries: 'Digital downloadable guides and companion tools only.',
      accuracyStandards: 'Every claim grounded in public or scientific reference.',
      safetyRules: 'Explicit disclaimer that guidance does not replace professional advice.',
      copyrightAttribution: 'All references attributed with proper source provenance.',
      claimsToAvoid: 'No get-rich-quick or instant cure assertions.',
      verificationRequirements: 'Minimum 20 verified reference cards required.',
    },
    recommendedPrice: {
      introductoryTest: 19,
      regular: 29,
      premiumBundle: 49,
      currency: 'USD',
      rationale: 'Balanced entry tier with high perceived value toolkit',
      validationMethod: 'Marketplace competitor tier benchmarking',
    },
  },
  uvz: {
    buyerProblems: [],
    potentialSolutions: [],
    creatorExpertiseFit: '',
    commercialFeasibility: '',
    differentiationOpportunities: [],
    positioningOptions: [],
    selectedOptionId: '',
  },
  transformationMap: {
    beforeState: {
      currentPains: [],
      anxietiesAndFrustrations: [],
      flawedAlternatives: [],
      dailyDrainCost: '',
    },
    bridgeProcess: {
      coreMethodology: '',
      signatureFrameworkName: '',
      keyMilestones: [],
      practicalTools: [],
      obstacleBypasses: [],
    },
    afterState: {
      tangibleOutcomes: [],
      acquiredCapabilities: [],
      completedDeliverables: [],
      measurableMetrics: [],
    },
    titleOptions: [],
    selectedTitleId: '',
    bigPromise: '',
    uniqueSellingProposition: '',
  },
  referenceLibrary: {
    targetCount: 20,
    verifiedCount: 0,
    cards: [],
    coveragePillars: {},
    status: 'NOT_STARTED',
  },
  charter: {
    productTitle: 'Untitled Product',
    subtitle: '',
    targetAudience: '',
    primaryProblemSolved: '',
    centralPromise: '',
    explicitDisclaimers: [
      'This product is for educational purposes only.',
      'Individual results vary depending on consistency and external factors.',
    ],
    signatureFramework: '',
    deliveryFormat: 'ebook_toolkit',
    contentDepthTarget: 'STANDARD',
    targetWordCount: 18000,
    learningObjectives: [],
    structuralPillars: [],
    companionResourcePlan: [],
    brandVoiceSummary: 'Warm, expert, accessible, outcome-focused',
    pricingStrategy: 'Standard value ladder',
    evidenceStandards: '20+ source-grounded references',
    qualityAcceptanceCriteria: [
      'Zero factual hallucination on actionable steps',
      'At least 5 plug-and-play practical companion templates',
      'Total manuscript length exceeding 15,000 words',
    ],
    isApproved: false,
  },
  outline: [],
  productBible: {
    productTitle: 'Untitled Product',
    audiencePersona: '',
    centralPromise: '',
    signatureFramework: '',
    brandVoiceKeywords: ['Actionable', 'Ground-level', 'Encouraging'],
    keyTerminology: {},
    introducedConcepts: [],
    usedExamples: [],
    activeReferenceMap: {},
    unresolvedClaims: [],
    continuityHandoffNotes: [],
  },
  resources: [],
  qualityReport: {
    overallStatus: 'DRAFT_COMPLETE',
    overallScore: 0,
    issues: [],
    checksPassed: [],
    disclaimersVerified: false,
    actualWordCount: 0,
    verifiedReferenceCount: 0,
    reviewedAt: new Date().toISOString(),
  },
  brand: {
    profileName: 'Modern Minimalist',
    primaryHex: '#2563EB',
    secondaryHex: '#059669',
    accentHex: '#F59E0B',
    neutralBgHex: '#F8FAFC',
    fontDisplay: 'Plus Jakarta Sans',
    fontBody: 'Inter',
    coverBrief: 'Clean typography with crisp geometric grid',
    manuscriptLayoutNotes: 'High-contrast typography with colored callout boxes and checklists.',
  },
  pricingReport: {
    regularPrice: 29,
    introductoryPrice: 19,
    bundlePrice: 49,
    currency: 'USD',
    marketComparisonSummary: 'Matches middle-tier digital workbooks in US marketplace.',
    rationale: 'High conversion entry price with premium bundle upsell.',
  },
  salesAssets: {
    salesPageHeadline: '',
    salesPageSubheadline: '',
    heroPitch: '',
    productDescriptionBullets: [],
    targetBuyerNotice: '',
    notForBuyerNotice: '',
    faqList: [],
    leadMagnetConcept: {
      title: '',
      hook: '',
      format: 'PDF Quick-Start Checklist',
      deliverable: '1-page printable cheat sheet',
    },
    emailLaunchSequence: [],
    socialPosts: [],
    thirtyDayLaunchPlan: [],
  },
  aiSettings: {
    provider: 'openrouter',
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/free',
    apiKeys: {
      openrouter: '',
      gemini: '',
      openai: '',
      claude: '',
    },
    providerModels: {
      openrouter: 'openrouter/free',
      gemini: 'gemini-2.5-flash',
      openai: 'gpt-4o',
      claude: 'claude-3-7-sonnet-20250219',
    },
    freeOnly: false,
    allowPaidFallback: true,
    maxSpendPerRequest: 0.05,
    dailyBudget: 1.0,
    projectBudget: 5.0,
    stageModels: {
      market_research: 'openrouter/free',
      topic_selection: 'openrouter/free',
      project_brief: 'openrouter/free',
      uvz: 'openrouter/free',
      transformation_map: 'openrouter/free',
      reference_library: 'openrouter/free',
      product_charter: 'openrouter/free',
      outline_builder: 'openrouter/free',
      content_studio: 'openrouter/free',
      workbook_studio: 'openrouter/free',
      quality_assurance: 'openrouter/free',
      brand_design: 'openrouter/free',
      pricing_launch: 'openrouter/free',
      export_center: 'openrouter/free',
    },
    fallbackModels: [
      'meta-llama/llama-3.3-70b-instruct:free',
      'deepseek/deepseek-r1:free',
      'google/gemini-2.0-flash-exp:free',
      'openrouter/free',
    ],
    usageStats: {
      totalRequests: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    },
  },
};


