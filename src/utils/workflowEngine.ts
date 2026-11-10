import { DigitalProductProject, StageId, StageStatus } from '../types/project.ts';

export const STAGE_ORDER: StageId[] = [
  'market_research',
  'topic_selection',
  'project_brief',
  'uvz',
  'transformation_map',
  'reference_library',
  'product_charter',
  'outline_builder',
  'content_studio',
  'workbook_studio',
  'quality_assurance',
  'brand_design',
  'pricing_launch',
  'export_center',
];

export const STAGE_METADATA_EN: Record<StageId, { title: string; subtitle: string; icon: string }> = {
  market_research: {
    title: 'Market Intelligence (MTRE)',
    subtitle: 'Multi-platform sales data, pricing, rankings & real market signals',
    icon: 'TrendingUp',
  },
  topic_selection: {
    title: 'Topic Recommendations (Gate A)',
    subtitle: 'Candidate evaluation, heuristic opportunity scoring & topic approval',
    icon: 'Sparkles',
  },
  project_brief: {
    title: 'Project Setup (13 Fields)',
    subtitle: 'Creator background, audience pain points, brand voice & negative constraints',
    icon: 'FileText',
  },
  uvz: {
    title: 'Unique Value Zone (UVZ Analysis)',
    subtitle: 'Skills convergence, commercial viability & 3 positioning options',
    icon: 'Target',
  },
  transformation_map: {
    title: 'Customer Transformation Map',
    subtitle: 'Before current pain, Bridge practical action, After concrete milestones',
    icon: 'GitFork',
  },
  reference_library: {
    title: 'Automated Reference Library (ARCE)',
    subtitle: '20 seven-part knowledge cards (A-G), source verification & evidence claims',
    icon: 'BookOpen',
  },
  product_charter: {
    title: 'Transformational Product Charter (Gate B)',
    subtitle: '17 immutable criteria, learning outcomes & QA acceptance standards',
    icon: 'Compass',
  },
  outline_builder: {
    title: 'Outline & Structure Builder',
    subtitle: 'Chapter goals, word count budgets, companion deliverables & source mapping',
    icon: 'ListTree',
  },
  content_studio: {
    title: 'Full Content Studio',
    subtitle: 'Chapter-by-chapter manuscript generation, Product Bible & voice consistency',
    icon: 'Feather',
  },
  workbook_studio: {
    title: 'Workbook & Resource Suite',
    subtitle: 'Worksheets, action checklists, schedules & tracking templates',
    icon: 'Layers',
  },
  quality_assurance: {
    title: 'Quality Assurance & Audit (Gate C)',
    subtitle: 'Evidence support, fact verification, disclaimer compliance & auto-repair',
    icon: 'ShieldCheck',
  },
  brand_design: {
    title: 'Brand & Visual Styling',
    subtitle: '60-30-10 palette, typographic hierarchy, cover spec & layout rules',
    icon: 'Palette',
  },
  pricing_launch: {
    title: 'Pricing & Launch Strategy',
    subtitle: 'Price ladder testing, sales page copy, 5-email sequence & 30-day plan',
    icon: 'Tag',
  },
  export_center: {
    title: 'Product Assembly & Export Center',
    subtitle: 'Markdown, JSON backup, styled HTML & downloadable multi-format assets',
    icon: 'Download',
  },
};

export const STAGE_METADATA_ZH: Record<StageId, { title: string; subtitle: string; icon: string }> = {
  market_research: {
    title: '市場趨勢情報 (MTRE)',
    subtitle: '多平台暢銷數據、價格、排名與真實市場訊號',
    icon: 'TrendingUp',
  },
  topic_selection: {
    title: '熱門題材推薦 (Gate A)',
    subtitle: '候選產品評估、啟發式商機評分與題材核准',
    icon: 'Sparkles',
  },
  project_brief: {
    title: '13項專案設定 (Project Brief)',
    subtitle: '創作者背景、受眾痛點、品牌聲音與排他邊界',
    icon: 'FileText',
  },
  uvz: {
    title: '獨特價值區 (UVZ Analysis)',
    subtitle: '技能交集、商業可行性與三種市場定位方案',
    icon: 'Target',
  },
  transformation_map: {
    title: '客戶轉變地圖 (Transformation)',
    subtitle: 'Before 現況痛點、Bridge 實作橋樑、After 具體里程碑',
    icon: 'GitFork',
  },
  reference_library: {
    title: '自動研究文獻庫 (ARCE)',
    subtitle: '20 篇七部分知識卡 (A-G)、真實來源驗證與證據主張',
    icon: 'BookOpen',
  },
  product_charter: {
    title: '轉變型產品憲章 (Gate B)',
    subtitle: '17項不可更動基準、學習目標與品質驗收規範',
    icon: 'Compass',
  },
  outline_builder: {
    title: '架構與大綱 (Outline Builder)',
    subtitle: '章節目標、字數配比、交付物與研究文獻對應',
    icon: 'ListTree',
  },
  content_studio: {
    title: '長篇內容工廠 (Content Studio)',
    subtitle: '逐章完整長篇生成、Product Bible 與連貫性保持',
    icon: 'Feather',
  },
  workbook_studio: {
    title: '實作工具與伴隨資源',
    subtitle: '工作表、行動檢核清單、28天菜單與追蹤表格',
    icon: 'Layers',
  },
  quality_assurance: {
    title: '品質審查與稽核 (Gate C)',
    subtitle: '證據支持、事實查核、免責聲明與自動修復',
    icon: 'ShieldCheck',
  },
  brand_design: {
    title: '品牌排版與外觀設計',
    subtitle: '調色盤、字體層次、封面說明與排版規範',
    icon: 'Palette',
  },
  pricing_launch: {
    title: '定價策略與上市銷售',
    subtitle: '價格測試、銷售頁文案、5封電郵序列與30天計畫',
    icon: 'Tag',
  },
  export_center: {
    title: '成品組裝與匯出中心',
    subtitle: 'Markdown、JSON 備份、Styled HTML 與多檔案下載',
    icon: 'Download',
  },
};

export const STAGE_METADATA = STAGE_METADATA_EN;

export function getStageMetadata(stageId: string, lang: 'en' | 'zh' = 'en') {
  const dict = lang === 'zh' ? STAGE_METADATA_ZH : STAGE_METADATA_EN;
  return (dict as any)[stageId] || null;
}

/**
 * Validates prerequisites before a stage can be executed.
 */
export function checkStagePrerequisites(
  stageId: StageId,
  project: DigitalProductProject
): { canRun: boolean; reason?: string } {
  const { workflow, marketResearch, charter, outline } = project;

  switch (stageId) {
    case 'market_research':
      return { canRun: true };

    case 'topic_selection':
      if (marketResearch.topicCandidates.length === 0) {
        return { canRun: false, reason: '需先取得市場情報分析以產生候選題材。' };
      }
      return { canRun: true };

    case 'project_brief':
    case 'reference_library':
    case 'uvz':
    case 'transformation_map':
      if (!workflow.gates.gateA.isApproved || !marketResearch.selectedTopicId) {
        return { canRun: false, reason: '需先在 Gate A 核准並選取產品題材。' };
      }
      return { canRun: true };

    case 'product_charter':
      if (!workflow.gates.gateA.isApproved) {
        return { canRun: false, reason: '需先在 Gate A 核准選題。' };
      }
      if (project.referenceLibrary.verifiedCount < 3) {
        return { canRun: false, reason: '需要至少具備初步驗證的研究文獻作為憲章基礎。' };
      }
      return { canRun: true };

    case 'outline_builder':
      if (!workflow.gates.gateB.isApproved) {
        return { canRun: false, reason: '需先在 Gate B 核准 Product Charter (產品憲章)。' };
      }
      return { canRun: true };

    case 'content_studio':
      if (!workflow.gates.gateB.isApproved) {
        return { canRun: false, reason: '需先核准 Product Charter。' };
      }
      if (outline.length === 0) {
        return { canRun: false, reason: '需先建立章節大綱。' };
      }
      return { canRun: true };

    case 'workbook_studio':
      if (!workflow.gates.gateB.isApproved) {
        return { canRun: false, reason: '需先核准 Product Charter。' };
      }
      return { canRun: true };

    case 'quality_assurance':
      const completedChapters = outline.filter((ch) => ch.isCompleted).length;
      if (completedChapters === 0) {
        return { canRun: false, reason: '需要至少完成部分章節以進行品質稽核。' };
      }
      return { canRun: true };

    case 'brand_design':
    case 'pricing_launch':
      if (!workflow.gates.gateB.isApproved) {
        return { canRun: false, reason: '需先核准產品憲章與策略。' };
      }
      return { canRun: true };

    case 'export_center':
      return { canRun: true };

    default:
      return { canRun: true };
  }
}

/**
 * Calculates overall progress percentage (0 - 100%).
 */
export function calculateOverallProgress(project: DigitalProductProject): number {
  let completedUnits = 0;
  const totalUnits = STAGE_ORDER.length;

  for (const stage of STAGE_ORDER) {
    const status = project.workflow.stageStatuses[stage];
    if (status === 'COMPLETED') {
      completedUnits += 1;
    } else if (status === 'PARTIAL' || status === 'NEEDS_REVIEW') {
      completedUnits += 0.5;
    }
  }

  // Weight chapter completion
  if (project.outline.length > 0) {
    const chaptersDone = project.outline.filter((c) => c.isCompleted).length;
    const chapterRatio = chaptersDone / project.outline.length;
    // Chapter progress contributes to content_studio
    const currentStatus = project.workflow.stageStatuses.content_studio;
    if (currentStatus !== 'COMPLETED') {
      completedUnits += chapterRatio * 0.5;
    }
  }

  return Math.min(100, Math.round((completedUnits / totalUnits) * 100));
}
