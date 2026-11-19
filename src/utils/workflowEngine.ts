import { gateAApproved } from './gateAJourney.ts';
import { ChapterOutlineItem, DigitalProductProject, ReferenceCard, StageId, StageStatus } from '../types/project.ts';

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
    title: '1. Market Research',
    subtitle: 'Inspectable research directory, live chart collectors, & manual evidence review',
    icon: 'TrendingUp',
  },
  topic_selection: {
    title: '2. Topic Selection (Gate A)',
    subtitle: 'Evidence-linked niche proposals, separated evidence strength vs suitability, & Gate A approval',
    icon: 'Sparkles',
  },
  project_brief: {
    title: '3. Recommended Project Brief',
    subtitle: 'Creator background, audience pain points, brand voice & negative constraints',
    icon: 'FileText',
  },
  uvz: {
    title: '4. Unique Value Zone (UVZ)',
    subtitle: 'Skills convergence, commercial viability & 3 positioning options',
    icon: 'Target',
  },
  transformation_map: {
    title: '5. Transformation Map',
    subtitle: 'Before current pain, Bridge practical action, After concrete milestones',
    icon: 'GitFork',
  },
  reference_library: {
    title: '6. Reference Library (Gate B Prep)',
    subtitle: 'Retrieved research sources, exact excerpts & chapter relevance mapping',
    icon: 'BookOpen',
  },
  product_charter: {
    title: '7. Product Charter (Gate B)',
    subtitle: '17 immutable criteria, learning outcomes & explicit strategy approval',
    icon: 'Compass',
  },
  outline_builder: {
    title: '8. Outline Builder',
    subtitle: 'Chapter goals, word count budgets, companion deliverables & source mapping',
    icon: 'ListTree',
  },
  content_studio: {
    title: '9. Content Studio',
    subtitle: 'Chapter-by-chapter manuscript generation, Product Bible & passage support review',
    icon: 'Feather',
  },
  workbook_studio: {
    title: '10. Workbook Studio',
    subtitle: 'Worksheets, action checklists, schedules & tracking templates',
    icon: 'Layers',
  },
  quality_assurance: {
    title: '11. Quality Assurance (Gate C)',
    subtitle: 'Evidence support, fact verification, disclaimer compliance & explicit publication review',
    icon: 'ShieldCheck',
  },
  brand_design: {
    title: '12. Brand Design',
    subtitle: '60-30-10 palette, typographic hierarchy, cover spec & layout rules',
    icon: 'Palette',
  },
  pricing_launch: {
    title: '13. Pricing & Launch',
    subtitle: 'Price ladder testing, sales page copy, 5-email sequence & 30-day plan',
    icon: 'Tag',
  },
  export_center: {
    title: '14. Export Center',
    subtitle: 'Markdown, JSON backup, styled HTML & buyer learning bundle archive',
    icon: 'Download',
  },
};

export const STAGE_METADATA_ZH: Record<StageId, { title: string; subtitle: string; icon: string }> = {
  market_research: {
    title: '1. 市場研究 (Market Research)',
    subtitle: '公開研究資源目錄、即時榜單採集與人工證據審查作業',
    icon: 'TrendingUp',
  },
  topic_selection: {
    title: '2. 選題評估與核准 (Gate A)',
    subtitle: '證據連結選題、證據強度與產品適配拆解及 Gate A 人工核准',
    icon: 'Sparkles',
  },
  project_brief: {
    title: '3. 推薦專案簡報',
    subtitle: '創作者背景、受眾痛點、品牌聲音與排他邊界',
    icon: 'FileText',
  },
  uvz: {
    title: '4. 獨特價值區 (UVZ)',
    subtitle: '技能交集、商業可行性與三種市場定位方案',
    icon: 'Target',
  },
  transformation_map: {
    title: '5. 客戶轉變地圖 (Transformation)',
    subtitle: 'Before 現況痛點、Bridge 實作橋樑、After 具體里程碑',
    icon: 'GitFork',
  },
  reference_library: {
    title: '6. 來源研究與知識庫 (ARCE)',
    subtitle: '七部分知識卡、真實來源擷取與章節關聯審查',
    icon: 'BookOpen',
  },
  product_charter: {
    title: '7. 產品憲章 (Gate B)',
    subtitle: '17項不可更動基準、學習目標與策略核准',
    icon: 'Compass',
  },
  outline_builder: {
    title: '8. 章節大綱規劃 (Outline Builder)',
    subtitle: '章節目標、字數配比、交付物與研究文獻對應',
    icon: 'ListTree',
  },
  content_studio: {
    title: '9. 長篇內容工廠 (Content Studio)',
    subtitle: '逐章完整長篇生成、Product Bible 與逐段來源查核',
    icon: 'Feather',
  },
  workbook_studio: {
    title: '10. 實作工具套件 (Workbook Studio)',
    subtitle: '工作表、行動檢核清單、實作範本與追蹤表格',
    icon: 'Layers',
  },
  quality_assurance: {
    title: '11. 品質審查與稽核 (Gate C)',
    subtitle: '證據支持、事實查核、免責聲明與正式發布前確認',
    icon: 'ShieldCheck',
  },
  brand_design: {
    title: '12. 品牌排版與外觀設計',
    subtitle: '調色盤、字體層次、封面說明與排版規範',
    icon: 'Palette',
  },
  pricing_launch: {
    title: '13. 定價策略與上市銷售',
    subtitle: '價格測試、銷售頁文案、5封電郵序列與30天計畫',
    icon: 'Tag',
  },
  export_center: {
    title: '14. 成品組裝與匯出中心',
    subtitle: 'Markdown、JSON 備份、Styled HTML 與完整商業套件下載',
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
      if (!gateAApproved(project) || !marketResearch.selectedTopicId) {
        return { canRun: false, reason: '需先在 Gate A 核准並選取產品題材。' };
      }
      if (stageId === 'uvz' && project.workflow.stageStatuses.project_brief !== 'COMPLETED') return {canRun: false, reason: 'Continue with the recommended brief or save your edits first.'};
      if (stageId === 'transformation_map' && (project.workflow.stageStatuses.uvz !== 'COMPLETED' || !project.uvz.positioningOptions.some(option => option.id === project.uvz.selectedOptionId))) return {canRun: false, reason: 'Select a UVZ positioning option first.'};
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
 * Computes outline_builder stage completion status from the current outline and reference library.
 */
export function computeOutlineStageStatus(
  outline: ChapterOutlineItem[],
  cards: ReferenceCard[] = []
): StageStatus {
  if (!outline || outline.length === 0) {
    return 'NOT_STARTED';
  }
  const availableCardIds = new Set(cards.map((card) => card.id));
  const allChaptersReady = outline.every((ch) => {
    const hasTitle = Boolean(ch.title?.trim());
    const hasObjective = Boolean(ch.objective?.trim());
    const hasSubtopics = Array.isArray(ch.subtopics) && ch.subtopics.some((s) => s.trim().length > 0);
    const hasTargetWords = Number(ch.targetWordCount) >= 100;
    const hasMappedSource =
      availableCardIds.size === 0 ||
      (Array.isArray(ch.mappedReferenceIds) &&
        ch.mappedReferenceIds.some((id) => availableCardIds.has(id)));
    return hasTitle && hasObjective && hasSubtopics && hasTargetWords && hasMappedSource;
  });
  return allChaptersReady ? 'COMPLETED' : 'PARTIAL';
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
