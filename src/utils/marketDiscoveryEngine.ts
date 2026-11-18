import type {
  AudienceTopicHypothesis,
  CandidateEvidenceComparisonRow,
  CandidateEvidenceLabel,
  CandidateEvidenceStrength,
  CandidateProductSuitability,
  DigitalProductProject,
  EvidenceRelationshipKind,
  GateAResourceEntry,
  MarketplaceObservation,
  MultiSourceStatus,
  ProductFormat,
  ScoreFactorAssessment,
  TopicCandidate,
} from '../types/project.ts';
import { rankAndBadgeCandidates } from './scoring.ts';
import { BLANK_PROJECT } from '../data/demoProject.ts';
import { Language } from './i18n.ts';
import { apiFetch } from '../services/apiClient.ts';
import {
  computeObservationEvidenceHash,
  inferObservationDefaults,
  isObservationReviewStale,
  isPrivateOrInvalidPublicUrl,
  isResourceHomepageUrl,
} from './manualEvidenceReview.ts';
import { mergeResourceDirectory } from './marketResourceDirectory.ts';

export interface MarketCategoryDef {
  id: string;
  labelEn: string;
  labelZh: string;
  descriptionEn: string;
  descriptionZh: string;
  marketplaces: string[];
}

export const MARKET_CATEGORIES: MarketCategoryDef[] = [
  {
    id: 'ALL',
    labelEn: 'All Categories',
    labelZh: '全部熱門類別',
    descriptionEn: 'Broad scan across educational digital product domains and commerce marketplaces',
    descriptionZh: '全面涵蓋知識手冊、實作工具、管理系統與數位規劃表',
    marketplaces: ['Amazon Kindle', 'Apple Books', 'NYT Best Sellers', 'Keepa', 'Google Trends', 'Gumroad', 'Etsy', 'Payhip'],
  },
  {
    id: 'productivity_systems',
    labelEn: 'Notion & Solo Founder Systems',
    labelZh: 'Notion 系統與一人公司生產力',
    descriptionEn: 'Operating systems, client onboarding portals, SOPs, and creator dashboards',
    descriptionZh: '一人事業工作空間、客戶接案流程、SOP 與個人生產力管理庫',
    marketplaces: ['Amazon Kindle', 'Apple Books', 'Gumroad', 'Payhip', 'Etsy'],
  },
  {
    id: 'wellness_habits',
    labelEn: 'Wellness, Habits & Mental Health',
    labelZh: '身心健康、微習慣與抗倦怠',
    descriptionEn: 'Burnout recovery journals, habit trackers, GoodNotes reset workbooks',
    descriptionZh: '自律微習慣、抗倦怠自癒手冊、GoodNotes 可填寫數位筆記',
    marketplaces: ['Amazon Kindle', 'Apple Books', 'NYT Best Sellers', 'Etsy'],
  },
  {
    id: 'personal_finance',
    labelEn: 'Personal Finance & Real Estate',
    labelZh: '個人理財、房產與資產配置',
    descriptionEn: 'Cashflow planners, debt payoff guides, first-time buyer educational kits',
    descriptionZh: '首購族避坑指南、收支盤點表、資產配置與預算管理套件',
    marketplaces: ['Apple Books', 'Amazon Kindle', 'Keepa', 'Gumroad'],
  },
  {
    id: 'freelance_career',
    labelEn: 'Freelance Growth & Client Proposals',
    labelZh: '接案變現、報價談判與合約工具',
    descriptionEn: 'Value pricing worksheets, proposal templates, scope guardrails',
    descriptionZh: '高報價談判架構、防合約扯皮條款、三層客戶提案範本',
    marketplaces: ['Amazon Kindle', 'Payhip', 'Gumroad'],
  },
  {
    id: 'budget_living',
    labelEn: 'Budget Living & Family Meal Planning',
    labelZh: '平價生活、家庭餐桌與節流食譜',
    descriptionEn: 'Zero-waste dinner systems, grocery inflation sheets, pantry inventory guides',
    descriptionZh: '抗通膨食材輪替矩陣、每週採買精算表、零浪費省錢料理計畫',
    marketplaces: ['Amazon Kindle', 'Apple Books', 'Gumroad', 'Etsy'],
  },
];

/**
 * Legacy illustrative fixtures. Never used by live research or accepted by Gate A.
 */
const DEMO_OBSERVATIONS: MarketplaceObservation[] = [
  {
    id: 'OBS-01',
    marketplace: 'Amazon Kindle',
    category: 'Cookbooks, Food & Wine > Cooking on a Budget',
    productTitle: 'Budget Meals for Busy Families: 100 Simple Dinners Under $10',
    sellerOrAuthor: 'Elena Rostova',
    productURL: 'https://www.amazon.com/s?k=budget+family+meal+plan+cookbook',
    currentPrice: 12.99,
    currency: 'USD',
    observedRank: 4,
    rankScope: 'Category Top 100',
    reviewCount: 1420,
    rating: 4.6,
    productFormat: 'Kindle Ebook',
    observedAt: '2026-11-09',
    evidenceLevel: 'VERIFIED_RANKING',
    dataLimitations: 'Illustrative sample fixture only.',
  },
  {
    id: 'OBS-02',
    marketplace: 'Gumroad',
    category: 'Business & Productivity > Notion Systems',
    productTitle: 'The Solo Founder Operating System (Notion Dashboard + 40 SOPs)',
    sellerOrAuthor: 'Alex Vance',
    productURL: 'https://gumroad.com/discover?query=solo+founder+operating+system+notion',
    currentPrice: 47.0,
    currency: 'USD',
    observedRank: 6,
    rankScope: 'Trending in Business',
    reviewCount: 420,
    rating: 4.9,
    productFormat: 'Notion Workspace + PDF Playbook',
    observedAt: '2026-11-08',
    evidenceLevel: 'FEATURED_COLLECTION',
    dataLimitations: 'Illustrative sample fixture only.',
  },
  {
    id: 'OBS-03',
    marketplace: 'Etsy',
    category: 'Digital Planners > Habit & Wellness Trackers',
    productTitle: 'Burnout Recovery & Daily Habit Reset System (GoodNotes + Fillable PDF)',
    sellerOrAuthor: 'SereneStudioPress',
    productURL: 'https://www.etsy.com/search?q=burnout+recovery+habit+reset+planner+digital',
    currentPrice: 14.5,
    currency: 'USD',
    observedRank: 2,
    rankScope: 'Bestseller in Digital Wellness',
    reviewCount: 3890,
    rating: 4.8,
    productFormat: 'Digital PDF Bundle + Fillable Journal',
    observedAt: '2026-11-09',
    evidenceLevel: 'VERIFIED_RANKING',
    dataLimitations: 'Illustrative sample fixture only.',
  },
  {
    id: 'OBS-04',
    marketplace: 'Apple Books',
    category: 'Personal Finance > Real Estate & Mortgages',
    productTitle: 'The First-Time Homebuyer Blueprint: Avoid Hidden Fees & Save $30,000',
    sellerOrAuthor: 'Marcus Chen',
    productURL: 'https://books.apple.com/us/charts/paid-books/finance',
    currentPrice: 19.99,
    currency: 'USD',
    observedRank: 12,
    rankScope: 'US Finance Chart',
    reviewCount: 310,
    rating: 4.7,
    productFormat: 'Interactive EPUB + Calculator Tool',
    observedAt: '2026-11-07',
    evidenceLevel: 'VERIFIED_RANKING',
    dataLimitations: 'Illustrative sample fixture only.',
  },
  {
    id: 'OBS-05',
    marketplace: 'Payhip',
    category: 'Freelancing & Career > Client Proposals',
    productTitle: 'Freelance Proposal & Value Pricing Mastery Kit (Templates + Contract)',
    sellerOrAuthor: 'ProCreatorTools',
    productURL: 'https://payhip.com/?query=freelance+proposal+templates+contracts',
    currentPrice: 29.0,
    currency: 'USD',
    observedRank: 8,
    rankScope: 'Trending in Career',
    reviewCount: 680,
    rating: 4.9,
    productFormat: 'Google Docs / Word Templates + Walkthrough',
    observedAt: '2026-11-06',
    evidenceLevel: 'FEATURED_COLLECTION',
    dataLimitations: 'Illustrative sample fixture only.',
  },
];

// Illustrative fixtures only. Never accepted as real or reviewed evidence.
export const SAMPLE_OBSERVATIONS: MarketplaceObservation[] = DEMO_OBSERVATIONS.map((observation) => ({
  ...observation,
  isSample: true,
  reviewStatus: 'unverified',
  acquisitionMethod: 'manual_observation',
  evidenceType: 'search_result',
  sourceClass: 'supporting_context',
  evidenceLevel: 'SEARCH_RESULT',
  dataLimitations: 'Sample data only; product, rank, price, and reviews are not live-verified observations.',
}));

export interface MarketSyncOptions {
  category?: string;
  prioritizedObservationId?: string;
  focusMarketplace?: string;
  searchQuery?: string;
}

export const EVIDENCE_MAX_AGE_MS = 48 * 60 * 60 * 1000;
export const ALLOWED_APPLE_FEED_URLS = new Set([
  'https://rss.applemarketingtools.com/api/v2/us/books/top-paid/100/books.json',
  'https://rss.marketingtools.apple.com/api/v2/us/books/top-paid/100/books.json',
]);
export const ALLOWED_AMAZON_CHART_PATTERN = /^https:\/\/www\.amazon\.com\/Best-Sellers-Kindle-Store(?:-[A-Za-z-]+)?\/zgbs\/digital-text(?:\/[0-9]+)?$/;

export function isCurrentMarketEvidence(observation: MarketplaceObservation, now = Date.now()): boolean {
  if (observation.isSample) return false;
  if (observation.reviewStatus === 'rejected' || observation.reviewStatus === 'blocked') return false;
  // Require authentic live-collector origin (manual records must go through isReviewedFallbackEvidence)
  const timestampRaw = observation.dataAsOfDate || observation.observedAt;
  const age = now - Date.parse(timestampRaw);
  const rank = observation.observedRank;
  const source = observation.sourceURL || '';
  const allowedSource =
    (observation.collector === 'apple-chart-v1' &&
      ALLOWED_APPLE_FEED_URLS.has(source) &&
      /^https:\/\/books\.apple\.com\//.test(observation.productURL)) ||
    (observation.collector === 'amazon-chart-v1' &&
      ALLOWED_AMAZON_CHART_PATTERN.test(source) &&
      /^https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}$/.test(observation.productURL));
  return Boolean(
    allowedSource &&
      observation.evidenceLevel === 'VERIFIED_RANKING' &&
      Number.isInteger(rank) &&
      rank! > 0 &&
      rank! <= 100 &&
      Number.isFinite(age) &&
      age >= -5 * 60_000 &&
      age <= EVIDENCE_MAX_AGE_MS &&
      (observation.evidenceExcerpt || '').trim().length >= 5
  );
}

export function isHistoricalOrAgedRanking(observation: MarketplaceObservation, now = Date.now()): boolean {
  if (observation.keepaProvenance === 'historical' || observation.keepaProvenance === 'estimated') {
    return true;
  }
  const defaults = inferObservationDefaults(observation);
  if (
    defaults.evidenceType === 'official_ranking' ||
    defaults.evidenceType === 'reported_ranking' ||
    defaults.evidenceType === 'estimate'
  ) {
    const ms = Date.parse(observation.dataAsOfDate || observation.observedAt || '');
    if (Number.isFinite(ms) && now - ms > 14 * 24 * 60 * 60 * 1000) {
      return true;
    }
  }
  return false;
}

export function isReviewedFallbackEvidence(observation: MarketplaceObservation): boolean {
  if (observation.isSample) return false;
  // Live collector records are checked by isCurrentMarketEvidence (with 48h window)
  if (observation.collector === 'apple-chart-v1' || observation.collector === 'amazon-chart-v1') return false;
  const defaults = inferObservationDefaults(observation);
  if (defaults.acquisitionMethod === 'live_collector') return false;
  if (observation.reviewStatus !== 'manually_reviewed') return false;
  if (isObservationReviewStale(observation)) return false;
  if (!observation.reviewedAt || !Number.isFinite(Date.parse(observation.reviewedAt))) return false;
  if (!observation.reviewerRationale || observation.reviewerRationale.trim().length < 20) return false;
  if (!observation.evidenceExcerpt || observation.evidenceExcerpt.trim().length < 20) return false;
  const hasLocator =
    Boolean((observation.excerptLocator || '').trim()) ||
    Boolean((observation.evidenceAttachmentRef || '').trim());
  if (!hasLocator) return false;

  const urlToCheck = (observation.sourceURL || observation.productURL || '').trim();
  if (!urlToCheck || !isPrivateOrInvalidPublicUrl(urlToCheck).valid || isResourceHomepageUrl(urlToCheck)) {
    return false;
  }

  // Seller claims and bare search placement alone do not establish demand evidence for Gate A
  if (defaults.evidenceType === 'seller_claim' || defaults.evidenceType === 'search_result') {
    return false;
  }

  return true;
}

export function isGateAQualifiedEvidence(observation: MarketplaceObservation, now = Date.now()): boolean {
  return isCurrentMarketEvidence(observation, now) || isReviewedFallbackEvidence(observation);
}

const FICTION_CATEGORY_PATTERN = /\b(fiction|romance|fantasy|sci-fi|science fiction|mystery|thriller|suspense|horror|manga|comics|graphic novel|poetry|drama|paranormal|erotica|young adult fiction|juvenile fiction|children's fiction|crime & mystery|historical fiction|literary|memoir & biography|novels)\b/i;

export function observationCategory(observation: MarketplaceObservation): string {
  const catLower = `${observation.category || ''}`.toLowerCase();
  const fullText = `${observation.category || ''} ${observation.productTitle || ''}`.toLowerCase();

  if (FICTION_CATEGORY_PATTERN.test(catLower)) {
    return 'other';
  }
  if (/\b(novel|a thriller|a mystery|fantasy series|romance novel|litrpg|manga)\b/i.test(observation.productTitle || '')) {
    return 'other';
  }

  if (/cook|meal|food|recipe|kitchen|pantry|budget living|nutrition/.test(fullText)) return 'budget_living';
  if (/health|habit|wellness|psychology|burnout|self-help|mindset|fitness|dieting|sleep|stress|anxiety|meditation|atomic habits|behavior/.test(fullText)) {
    return 'wellness_habits';
  }
  if (/finance|money|invest|real estate|wealth|retire|tax|mortgage|debt|budgeting|cashflow/.test(fullText)) {
    return 'personal_finance';
  }
  if (/freelance|career|proposal|education|teaching|coaching|negotiat|interview|resume|leadership|consulting|pricing/.test(fullText)) {
    return 'freelance_career';
  }
  if (/business|productiv|notion|management|computer|technology|software|system|workflow|automation|\bai\b|operating|time management/.test(fullText)) {
    return 'productivity_systems';
  }
  return 'other';
}

interface NicheBlueprint {
  title: string;
  subtitle: string;
  targetAudienceHypothesis: string;
  coreProblem: string;
  bigPromise: string;
  suggestedFormat: ProductFormat;
  priceTestRange: { test: number; regular: number; premium: number };
  differentiationAngle: string;
  potentialCompanions: string[];
  chapters: Array<{ title: string; objective: string; deliverable: string; milestone: string }>;
}

const NICHE_BLUEPRINTS: Record<string, NicheBlueprint> = {
  productivity_systems: {
    title: 'Solo Operator Systems & Workflow Playbook',
    subtitle: 'Original execution manual, SOP architecture, and decision toolkit for solo operators',
    targetAudienceHypothesis: 'Solo operators and freelancers seeking structured daily workflows (validate exact buyer persona in Stage 3)',
    coreProblem: 'Operators lose time switching across unstandardized notes, tasks, and client handoffs without repeatable checklists.',
    bigPromise: 'Build a lightweight, structured operating cadence using repeatable SOP templates and weekly review scorecards.',
    suggestedFormat: 'ebook_toolkit',
    priceTestRange: { test: 15, regular: 29, premium: 49 },
    differentiationAngle: 'Pairs concise architectural principles with copy-ready SOP checklists and measurable weekly cadence audits.',
    potentialCompanions: ['Weekly Operating Cadence Worksheet', 'Client Onboarding & Handoff SOP Pack', 'Time-Leak Audit Sheet', '30-Day Systems Implementation Tracker'],
    chapters: [
      { title: 'Diagnosing Operational Friction & Tool Sprawl', objective: 'Identify recurring workflow bottlenecks and categorize time drains.', deliverable: 'Workflow Friction Audit Worksheet', milestone: 'Document top 3 recurring bottlenecks and baseline time spent.' },
      { title: 'Single-Source Capture & Prioritization Architecture', objective: 'Design a minimal capture-to-action triage loop that prevents neglected backlogs.', deliverable: 'Daily Triage & Priority Matrix', milestone: 'Test 5 consecutive daily triage cycles without orphaned tasks.' },
      { title: 'Repeatable Client & Project SOP Standardization', objective: 'Convert complex recurring deliverables into checklist-driven standard operating procedures.', deliverable: 'Reusable 1-Page SOP Builder', milestone: 'Publish and test 2 core SOP checklists on active work.' },
      { title: 'Safe Automation & Quality Delegation Guardrails', objective: 'Separate deterministic rules from assisted drafting while preserving human quality verification.', deliverable: 'Verification Guardrail Checklist', milestone: 'Document review criteria for 1 recurring workflow.' },
      { title: 'Weekly Review & Continuous Calibration', objective: 'Sustain long-term system reliability through a 20-minute Friday review protocol.', deliverable: '20-Minute Weekly Review Scoreboard', milestone: 'Complete a 4-week operating calibration log.' },
    ],
  },
  wellness_habits: {
    title: 'Sustainable Energy & Habit Reset Workbook',
    subtitle: 'Practical behavioral routines, stress boundary scripts, and daily self-tracking worksheets',
    targetAudienceHypothesis: 'Working adults and caregivers interested in structured habit and focus routines (validate buyer willingness directly)',
    coreProblem: 'Rigid all-or-nothing habit plans often fail during busy weeks, leading to abandoned routines.',
    bigPromise: 'Practice realistic keystone routines for sleep hygiene, focus blocks, and daily reflection using structured worksheets.',
    suggestedFormat: 'workbook',
    priceTestRange: { test: 12, regular: 24, premium: 39 },
    differentiationAngle: 'Centers on minimum-viable daily baselines, friction reduction, and cited behavioral science rather than extreme routines.',
    potentialCompanions: ['Energy & Stress Trigger Self-Audit', 'Minimum-Viable Daily Routine Builder', '14-Day Sleep & Focus Stabilization Log', 'Boundary Script Pack'],
    chapters: [
      { title: 'Mapping Energy Leaks & Daily Load', objective: 'Pinpoint recurring daily stressors and attention fragmentation patterns before changing routines.', deliverable: '7-Day Energy & Stressor Audit Sheet', milestone: 'Establish baseline sleep, focus, and recovery notes across one week.' },
      { title: 'Designing Minimum-Viable Keystone Habits', objective: 'Anchor small, repeatable habits to existing daily cues.', deliverable: 'Habit Stacking & Cue Design Canvas', milestone: 'Test a 2-minute baseline version of 2 habits for 7 days.' },
      { title: 'Attention Protection & Evening Wind-Down Boundaries', objective: 'Reduce fragmented attention and late-evening stimulation through environment redesign.', deliverable: 'Workday Shutdown Checklist', milestone: 'Execute a 5-day evening wind-down checklist.' },
      { title: 'Midday Recovery Micro-Breaks', objective: 'Integrate brief recovery pauses between focused work blocks.', deliverable: 'Midday Reset Menu', milestone: 'Adopt 2 scheduled midday breaks per workday.' },
      { title: 'Relapse Prevention & 30-Day Habit Calibration', objective: 'Recover cleanly from missed days using pre-committed fallback rules.', deliverable: '30-Day Habit Continuity Log', milestone: 'Complete a monthly reflection and adjust habit difficulty.' },
    ],
  },
  personal_finance: {
    title: 'Clarity-First Household Cashflow & Debt Reduction Guide',
    subtitle: 'Structured budgeting framework, expense audit sheets, and milestone worksheets for household clarity',
    targetAudienceHypothesis: 'Households and early-career earners seeking clear expense-tracking templates (educational tool, not financial advice)',
    coreProblem: 'Rising living costs and fragmented recurring subscriptions complicate monthly saving and debt prioritization.',
    bigPromise: 'Organize a transparent 30-day cashflow baseline, audit recurring expenses, and compare structured payoff sequences.',
    suggestedFormat: 'ebook_toolkit',
    priceTestRange: { test: 15, regular: 29, premium: 49 },
    differentiationAngle: 'Combines plain-language household budgeting concepts with printable cashflow audit worksheets and clear educational boundaries.',
    potentialCompanions: ['Monthly Cashflow Ledger', 'Subscription & Fixed-Cost Pruning Worksheet', 'Emergency Buffer & Debt Sequence Planner', 'Irregular-Expense Sinking Fund Matrix'],
    chapters: [
      { title: 'The Honest 30-Day Cashflow Baseline', objective: 'Reconstruct actual net inflow, fixed obligations, and variable spending clearly.', deliverable: 'Baseline Cashflow Snapshot Table', milestone: 'Categorize the past 30 days of recurring and variable spending.' },
      { title: 'Auditing Recurring Leaks & Fixed Costs', objective: 'Identify unused subscriptions, fee drains, and negotiable household bills.', deliverable: 'Expense Pruning Checklist', milestone: 'List recurring charges and review renewal dates.' },
      { title: 'Sinking Funds & Emergency Reserves', objective: 'Plan ahead for predictable irregular annual expenses.', deliverable: 'Sinking Fund Allocation Schedule', milestone: 'Define target reserve categories for top 3 irregular expenses.' },
      { title: 'Comparing Debt Payoff Sequencing Methods', objective: 'Compare avalanche and snowball math clearly using structured examples.', deliverable: 'Debt Priority Comparison Sheet', milestone: 'Select and document a comparison plan to test.' },
      { title: 'Monthly 15-Minute Money Check-In', objective: 'Maintain visibility through a brief monthly review ritual.', deliverable: 'Monthly 15-Minute Review Protocol', milestone: 'Run one monthly cashflow reconciliation check-in.' },
    ],
  },
  freelance_career: {
    title: 'Structured Client Proposal & Scope Playbook',
    subtitle: 'Scope architecture, discovery checklists, and 3-tier proposal templates for independent operators',
    targetAudienceHypothesis: 'Independent freelancers and consultants looking to standardize project scoping (validate demand directly)',
    coreProblem: 'Unclear scope definitions and ad-hoc proposals frequently create revision friction and under-scoped engagements.',
    bigPromise: 'Present structured 3-tier scope options, run consistent discovery checklists, and document clear revision boundaries.',
    suggestedFormat: 'template_bundle',
    priceTestRange: { test: 19, regular: 39, premium: 59 },
    differentiationAngle: 'Focuses on transparent project scoping workflows, boundary clauses, and reusable 3-tier proposal templates.',
    potentialCompanions: ['3-Tier Proposal Template', 'Discovery Qualification Checklist', 'Scope-Change Addendum Template', 'Client Milestone Sign-Off Sheet'],
    chapters: [
      { title: 'Framing Deliverables Around Client Objectives', objective: 'Translate technical tasks into clearly scoped client deliverables and criteria.', deliverable: 'Offer Scope & Deliverable Matrix', milestone: 'Draft 3 clearly bounded service tiers.' },
      { title: 'Structured Discovery Call Question Trees', objective: 'Surface project constraints, timelines, and decision criteria before quoting.', deliverable: 'Discovery Call Scorecard', milestone: 'Test the checklist before preparing the next proposal.' },
      { title: 'Building Clear 3-Tier Proposals', objective: 'Present Essential, Core, and Extended scopes cleanly without ambiguity.', deliverable: 'Reusable 3-Tier Proposal Blueprint', milestone: 'Assemble one master proposal template.' },
      { title: 'Scope Boundaries, Revisions & Milestones', objective: 'Document revision limits and milestone sign-off rules upfront.', deliverable: 'Scope Guardrail Checklist', milestone: 'Update proposal terms with explicit acceptance milestones.' },
      { title: 'Post-Delivery Review & Wrap-Up Kit', objective: 'Close engagements cleanly with organized handoff checklists.', deliverable: 'Project Handoff & Review Sheet', milestone: 'Execute the wrap-up checklist on a completed engagement.' },
    ],
  },
  budget_living: {
    title: 'Budget Family Meal System & Pantry Matrix',
    subtitle: 'Weekly dinner planning grids, grocery comparison sheets, and batch-prep checklists',
    targetAudienceHypothesis: 'Busy households looking to reduce weekly grocery waste and organize weeknight cooking (validate buyer pricing)',
    coreProblem: 'Last-minute takeout and unused groceries increase weekly food spending and daily planning stress.',
    bigPromise: 'Organize modular pantry-first dinner rotations and consolidated weekly shopping lists with printable checklists.',
    suggestedFormat: 'ebook_toolkit',
    priceTestRange: { test: 9, regular: 19, premium: 29 },
    differentiationAngle: 'Emphasizes interchangeable ingredient cross-utilization worksheets built around common grocery staples.',
    potentialCompanions: ['Pantry-First Inventory Sheet', 'Weekly 5-Dinner Cross-Utilization Planner', 'Unit-Price Comparison Sheet', 'Weekend Batch Prep Sequence Card'],
    chapters: [
      { title: 'Pantry Audit & Food Waste Baseline', objective: 'Inventory existing staples and identify common sources of spoiled produce.', deliverable: 'Freezer & Pantry Inventory Map', milestone: 'Build a 1-week menu starting from existing pantry staples.' },
      { title: 'Interchangeable Ingredient Menu Architecture', objective: 'Plan varied dinners that share core proteins, grains, and vegetables across the week.', deliverable: 'Cross-Utilization Meal Matrix', milestone: 'Draft a 7-day plan consolidating overlapping ingredients.' },
      { title: 'Unit-Price Shopping & Substitution Lists', objective: 'Compare per-unit cost and seasonal alternatives cleanly.', deliverable: 'Per-Serving Cost & Substitution Guide', milestone: 'Compare two consecutive weekly grocery receipts.' },
      { title: 'Weekend Prep Checklists for Weeknights', objective: 'Pre-wash, portion, and store foundational ingredients safely.', deliverable: 'Weekend Prep Sequence Card', milestone: 'Complete one timed weekend prep checklist.' },
      { title: 'Planned Leftovers & Monthly Review', objective: 'Repurpose surplus cooked items and track monthly grocery spend.', deliverable: 'Monthly Grocery & Favorite Meals Log', milestone: 'Review 4 weeks of shopping logs and favorite recipes.' },
    ],
  },
};

function buildAudienceTopicHypotheses(
  category: string,
  qualifiedSources: MarketplaceObservation[]
): AudienceTopicHypothesis[] {
  const sourceRef =
    qualifiedSources
      .slice(0, 3)
      .map((s) => `${s.marketplace}${s.observedRank ? ` #${s.observedRank}` : ''}`)
      .join(', ') || 'linked Gate A observations';

  switch (category) {
    case 'productivity_systems':
      return [
        {
          id: `${category}-hyp-solo-consultants`,
          audienceLabel: 'Solo service operators & independent consultants standardizing client delivery',
          productAngle: 'Client onboarding SOP templates, scope triage matrices, and weekly cadence logs',
          evidenceBasis: `Informed by category signals (${sourceRef}); assumes buyers prefer repeatable SOP checklists over vague theory.`,
          uncertainty: 'Hypothesis only — creator has not verified solo consultant willingness to pay or channel CAC.',
        },
        {
          id: `${category}-hyp-creators`,
          audienceLabel: 'Digital creators managing multi-channel research, production, and release calendars',
          productAngle: 'Single-source capture boards, release checklists, and editorial quality gates',
          evidenceBasis: `Informed by workflow signals (${sourceRef}); emphasizes operational organization rather than creator income claims.`,
          uncertainty: 'Hypothesis only — template vs playbook format preference must be validated directly.',
        },
        {
          id: `${category}-hyp-ops-generalists`,
          audienceLabel: 'Self-employed generalists reducing administrative time-leaks each week',
          productAngle: '20-minute Friday audit playbook & recurring routine scorecard',
          evidenceBasis: `Broad domain pattern (${sourceRef}); lowest niche specificity until buyer interviews narrow pain points.`,
          uncertainty: 'Broad segment may require tighter problem framing to avoid generic productivity saturation.',
        },
      ];
    case 'wellness_habits':
      return [
        {
          id: `${category}-hyp-overworked-professionals`,
          audienceLabel: 'Full-time desk workers recovering from scattered focus and evening burnout',
          productAngle: 'Workday shutdown scripts, minimum-viable daily baselines, and 14-day sleep hygiene log',
          evidenceBasis: `Aligned with habit & burnout topic signals (${sourceRef}); avoids medical claims by sticking to behavioral checklists.`,
          uncertainty: 'Educational habit design only; not clinical therapy. Willingness to pay at $12–$24 untested.',
        },
        {
          id: `${category}-hyp-caregivers`,
          audienceLabel: 'Busy caregivers seeking 10-minute flexible routines that survive unpredictable schedules',
          productAngle: 'Fallback habit tiers, energy trigger audit sheets, and zero-guilt reset logs',
          evidenceBasis: `Grounded in self-help/habit category attention (${sourceRef}) focusing on resilient minimum routines.`,
          uncertainty: 'Assumes printable/GoodNotes format appeal; validate format preference before workbook production.',
        },
      ];
    case 'personal_finance':
      return [
        {
          id: `${category}-hyp-early-career`,
          audienceLabel: 'Early-career earners organizing fixed bills, irregular annual costs, and debt sequences',
          productAngle: '30-day cashflow baseline table, sinking-fund calculator sheet, and monthly 15-minute check-in',
          evidenceBasis: `Informed by budgeting & personal finance signals (${sourceRef}); strictly educational template tools.`,
          uncertainty: 'Not licensed financial advice. Price sensitivity and spreadsheet vs ebook preference require buyer checks.',
        },
        {
          id: `${category}-hyp-first-home`,
          audienceLabel: 'Prospective first-time homebuyers comparing closing fees and maintenance reserves',
          productAngle: 'Pre-purchase hidden-cost audit workbook and mortgage readiness checklist',
          evidenceBasis: `Inspired by real-estate & personal finance signals (${sourceRef}); targets concrete financial preparation tasks.`,
          uncertainty: 'Regional mortgage rules vary widely; educational checklists require clear jurisdiction disclaimers.',
        },
      ];
    case 'freelance_career':
      return [
        {
          id: `${category}-hyp-independent-creatives`,
          audienceLabel: 'Independent designers, writers, and developers formalizing 3-tier proposals',
          productAngle: 'Discovery call question tree, Essential/Core/Extended proposal templates, and revision guardrails',
          evidenceBasis: `Backed by freelance/career observations (${sourceRef}); solves concrete scoping friction without income promises.`,
          uncertainty: 'Validate whether buyers expect Google Docs/Notion templates or editable PDF scripts.',
        },
        {
          id: `${category}-hyp-new-consultants`,
          audienceLabel: 'Mid-career specialists transitioning into fractional or project-based consulting',
          productAngle: 'Scope-of-work matrix, milestone sign-off checklist, and post-delivery handoff kit',
          evidenceBasis: `Supported by career/consulting demand signals (${sourceRef}); structured execution focus.`,
          uncertainty: 'Consult B2B/freelance communities directly to verify pricing elasticity ($19–$59).',
        },
      ];
    case 'budget_living':
      return [
        {
          id: `${category}-hyp-busy-families`,
          audienceLabel: 'Working households cutting weeknight takeout and spoiled produce waste',
          productAngle: 'Pantry-first inventory map, 5-dinner cross-utilization grid, and batch-prep cards',
          evidenceBasis: `Grounded in budget-cooking category signals (${sourceRef}); avoids unverified grocery savings claims.`,
          uncertainty: 'Dietary preferences (vegetarian, gluten-free, family size) may alter worksheet utility.',
        },
        {
          id: `${category}-hyp-solo-budgeters`,
          audienceLabel: 'Single/couple renters managing inflation with 30-minute batch-prepped staples',
          productAngle: 'Small-batch ingredient matrix, unit-price comparison table, and leftover remix checklists',
          evidenceBasis: `Informed by budget food planning context (${sourceRef}); targets low food waste for 1–2 person kitchens.`,
          uncertainty: 'Check competing sub-$15 Etsy/Amazon printables before locking bundle scope.',
        },
      ];
    default:
      return [
        {
          id: `${category}-hyp-default-a`,
          audienceLabel: 'Practical learners seeking structured worksheets and worked examples in this domain',
          productAngle: 'Step-by-step execution playbook plus printable checklists',
          evidenceBasis: `Derived from linked Gate A records (${sourceRef}).`,
          uncertainty: 'Audience definition and willingness to pay remain unvalidated hypotheses.',
        },
        {
          id: `${category}-hyp-default-b`,
          audienceLabel: 'Self-directed organizers comparing existing tools and documented trade-offs',
          productAngle: 'Decision matrices, baseline audits, and progress tracking logs',
          evidenceBasis: `Derived from linked Gate A records (${sourceRef}).`,
          uncertainty: 'Conduct buyer interviews before finalizing format and pricing.',
        },
      ];
  }
}

export function compareCandidateEvidence(
  allObservations: MarketplaceObservation[],
  category: string,
  now = Date.now()
): {
  multiSourceStatus: MultiSourceStatus;
  evidenceComparison: CandidateEvidenceComparisonRow[];
  qualifiedObservations: MarketplaceObservation[];
  qualifiedChainIds: string[];
} {
  const domainObs = allObservations.filter(
    (o) => !o.isSample && observationCategory(o) === category
  );

  // Track dataset chain memberships across all non-sample domain records
  const byChain = new Map<string, MarketplaceObservation[]>();
  for (const obs of domainObs) {
    const chain = (obs.evidenceChainId || obs.id).trim();
    byChain.set(chain, [...(byChain.get(chain) || []), obs]);
  }

  const qualified = domainObs.filter((o) => isGateAQualifiedEvidence(o, now));
  const qualifiedChainIds = Array.from(
    new Set(qualified.map((o) => (o.evidenceChainId || o.id).trim()))
  );

  // Count distinct evidence natures across qualified independent chains
  const hasPrimaryOrLiveRanking = qualified.some((o) => {
    const d = inferObservationDefaults(o);
    return (
      isCurrentMarketEvidence(o, now) ||
      d.evidenceType === 'official_ranking' ||
      d.evidenceType === 'reported_ranking'
    );
  });
  const hasInterestOrEstimate = qualified.some((o) => {
    const d = inferObservationDefaults(o);
    return d.evidenceType === 'interest_signal' || d.evidenceType === 'estimate' || d.evidenceType === 'featured_collection';
  });
  const rejectedOrMismatchInDomain = domainObs.some(
    (o) =>
      o.reviewStatus === 'rejected' ||
      o.reviewStatus === 'blocked' ||
      o.reviewAssessment?.dateScopeProductMatch === 'mismatch'
  );

  const evidenceComparison: CandidateEvidenceComparisonRow[] = domainObs.map((obs) => {
    const defaults = inferObservationDefaults(obs);
    const chain = (obs.evidenceChainId || obs.id).trim();
    const peersInChain = (byChain.get(chain) || []).filter((p) => p.id !== obs.id).map((p) => p.id);
    const live = isCurrentMarketEvidence(obs, now);
    const manualValid = isReviewedFallbackEvidence(obs);
    const stale = isObservationReviewStale(obs);
    const rejectedOrBlocked = obs.reviewStatus === 'rejected' || obs.reviewStatus === 'blocked';
    const historicalAged = isHistoricalOrAgedRanking(obs, now);

    const reviewState: CandidateEvidenceComparisonRow['reviewState'] = live
      ? 'valid_live'
      : manualValid
      ? 'valid_manual'
      : stale
      ? 'stale_review'
      : rejectedOrBlocked
      ? 'rejected_blocked'
      : 'unverified';

    let relationship: EvidenceRelationshipKind = 'standalone';
    if (peersInChain.length > 0) {
      relationship = 'duplicates_dataset';
    } else if (rejectedOrBlocked || obs.reviewAssessment?.dateScopeProductMatch === 'mismatch') {
      relationship = 'contradicts';
    } else if (rejectedOrMismatchInDomain && qualifiedChainIds.length >= 1) {
      relationship = 'complements';
    } else if (
      qualifiedChainIds.length >= 2 &&
      (defaults.evidenceType === 'interest_signal' || defaults.evidenceType === 'estimate') &&
      hasPrimaryOrLiveRanking
    ) {
      relationship = 'complements';
    } else if (qualifiedChainIds.length >= 2 && hasPrimaryOrLiveRanking && hasInterestOrEstimate && defaults.evidenceType !== 'official_ranking') {
      relationship = 'complements';
    } else if (qualifiedChainIds.length >= 2) {
      relationship = 'corroborates';
    }

    const supports =
      obs.reviewAssessment?.establishes ||
      (live
        ? `Live chart #${obs.observedRank} snapshot in ${obs.rankScope || obs.category}`
        : rejectedOrBlocked
        ? `Excluded (${obs.reviewStatus}): ${obs.reviewerRationale || 'Marked invalid during human review'}`
        : stale
        ? 'Evidentiary fields edited since last review — prior approval invalidated'
        : defaults.evidenceType === 'reported_ranking'
        ? `Reported ranking (#${obs.observedRank ?? '—'}) in ${obs.rankScope || obs.category}`
        : defaults.evidenceType === 'interest_signal'
        ? `Topic attention signal (${obs.metricName || 'Index'}: ${obs.metricValue ?? '—'} ${obs.metricUnit || ''})`
        : defaults.evidenceType === 'estimate'
        ? `Third-party historical/estimate observation (${obs.keepaProvenance || 'estimate'})`
        : obs.evidenceExcerpt?.slice(0, 110) || defaults.evidenceType);

    const cannotEstablish =
      defaults.evidenceType === 'interest_signal'
        ? 'Search/topic interest does NOT establish unit sales, revenue, or willingness to pay.'
        : /combined|print/i.test(`${obs.rankScope || ''} ${obs.productFormat || ''}`)
        ? 'Combined print/ebook ranking does not isolate digital-only sales.'
        : historicalAged
        ? 'Historical or aged snapshot (>14d / Keepa archive) does NOT establish current bestseller status.'
        : 'Does not measure unit sales volume, net margin, conversion rate, or creator-audience fit.';

    let conflictOrLimitationNote = obs.dataLimitations;
    if (peersInChain.length > 0) {
      conflictOrLimitationNote = `Shares evidenceChainId "${chain}" with [${peersInChain.join(', ')}] — collapsed into 1 chain to avoid double-counting. ${obs.dataLimitations}`;
    } else if (stale) {
      const curr = computeObservationEvidenceHash(obs);
      conflictOrLimitationNote = `STALE REVIEW (${obs.reviewedEvidenceHash || 'prior'} -> ${curr}): Re-review required before counting toward Gate A.`;
    } else if (rejectedOrBlocked) {
      conflictOrLimitationNote = `CONTRADICTION / EXCLUDED: ${obs.reviewerRationale || obs.dataLimitations}`;
    } else if (relationship === 'complements') {
      conflictOrLimitationNote = `Complementary signal (different evidence type from primary chart; does not independently verify unit sales). ${obs.dataLimitations}`;
    }

    return {
      observationId: obs.id,
      productTitle: obs.productTitle,
      marketplace: obs.marketplace,
      sourceURL: obs.sourceURL || obs.productURL,
      dataAsOfDate: obs.dataAsOfDate || obs.observedAt,
      evidenceChainId: chain,
      sourceClass: defaults.sourceClass,
      acquisitionMethod: defaults.acquisitionMethod,
      evidenceType: defaults.evidenceType,
      reviewState,
      supports,
      cannotEstablish,
      relationship,
      sharesDatasetWithIds: peersInChain,
      conflictOrLimitationNote,
    };
  });

  const multiSourceStatus: MultiSourceStatus =
    qualifiedChainIds.length >= 2
      ? 'REVIEWED_MULTI_SOURCE'
      : qualifiedChainIds.length === 1
      ? 'SINGLE_SOURCE'
      : 'NEEDS_EVIDENCE';

  return {
    multiSourceStatus,
    evidenceComparison,
    qualifiedObservations: qualified,
    qualifiedChainIds,
  };
}

function computeCandidateEvidenceAssessment(
  sources: MarketplaceObservation[],
  category: string,
  now: number
): {
  evidenceStatus: 'CURRENT_CHART' | 'REVIEWED_FALLBACK';
  evidenceLabel: CandidateEvidenceLabel;
  evidenceStrength: CandidateEvidenceStrength;
  productSuitability: CandidateProductSuitability;
  factorAssessments: ScoreFactorAssessment[];
  independentChainIds: string[];
  scoreBreakdown: TopicCandidate['scoreBreakdown'];
  confidenceRating: TopicCandidate['confidenceRating'];
  canReceiveVerifiedBadge: boolean;
  recommendationReason: string;
} {
  const sorted = [...sources].sort((a, b) => (a.observedRank || 999) - (b.observedRank || 999));
  const collectorVerified = sorted.filter((s) => isCurrentMarketEvidence(s, now));
  const manualReviewed = sorted.filter((s) => isReviewedFallbackEvidence(s));

  // Deduplicate overlapping reports sharing an underlying dataset chain
  const independentChainIds = Array.from(
    new Set(sorted.map((s) => (s.evidenceChainId || s.id).trim()))
  );

  // Representative top observation per independent chain so duplicate articles cannot double-count
  const bestPerChain = independentChainIds.map((chainId) => {
    const matching = sorted.filter((s) => (s.evidenceChainId || s.id).trim() === chainId);
    return matching[0];
  });

  const bestLive = collectorVerified[0];
  const hasPrimaryManual = manualReviewed.some(
    (s) =>
      inferObservationDefaults(s).sourceClass === 'primary_marketplace' &&
      inferObservationDefaults(s).evidenceType === 'official_ranking'
  );
  const hasHistoricalManualRanking = manualReviewed.some((s) => isHistoricalOrAgedRanking(s, now));
  const hasReportedRank = manualReviewed.some(
    (s) => inferObservationDefaults(s).evidenceType === 'reported_ranking'
  );

  let evidenceLabel: CandidateEvidenceLabel;
  let evidenceStatus: 'CURRENT_CHART' | 'REVIEWED_FALLBACK';
  let demandSignal = 0;
  let demandBasis = '';
  let demandStatus: ScoreFactorAssessment['status'] = 'UNMEASURED';
  let demandUncertainty = '';

  if (collectorVerified.length > 0 && bestLive) {
    evidenceLabel = 'CURRENT_OFFICIAL_CHART';
    evidenceStatus = 'CURRENT_CHART';
    const rankScore = bestLive.observedRank ? Math.max(4, 26 - Math.ceil(bestLive.observedRank / 4)) : 10;
    const chainBonus = Math.min(3, Math.max(0, independentChainIds.length - 1));
    demandSignal = Math.min(25, rankScore + chainBonus);
    demandStatus = 'MEASURED';
    demandBasis = `${collectorVerified.length} collector-verified official chart position(s) across ${independentChainIds.length} independent evidence chain(s); top rank #${bestLive.observedRank} (${bestLive.marketplace}).`;
    demandUncertainty = 'Point-in-time chart position only; unit sales volume, revenue, pricing elasticity, and conversion are NOT measured.';
  } else if (hasPrimaryManual) {
    evidenceLabel = 'MANUALLY_REVIEWED_PRIMARY';
    evidenceStatus = 'REVIEWED_FALLBACK';
    const ranked = manualReviewed.filter((s) => s.observedRank && s.observedRank > 0);
    const topRank = ranked[0]?.observedRank;
    demandSignal = topRank ? Math.min(18, Math.max(6, 20 - Math.ceil(topRank / 5))) : 10;
    demandStatus = 'REVIEWED_SIGNAL';
    demandBasis = hasHistoricalManualRanking
      ? `Manually reviewed historical primary observation(s) (${manualReviewed.length} record(s), ${independentChainIds.length} chain(s)). Historical snapshot only — NOT current bestseller status.`
      : `Manually reviewed primary marketplace observation(s) (${manualReviewed.length} record(s), ${independentChainIds.length} independent chain(s)). Not collector-verified.`;
    demandUncertainty = hasHistoricalManualRanking
      ? 'Historical or aged snapshot (>14 days old or Keepa historical archive); reflects past visibility only, not active velocity.'
      : 'Captured via manual observation or import; verify currency and marketplace scope before assuming active velocity.';
  } else if (hasReportedRank) {
    evidenceLabel = 'SECONDARY_REPORTED_RANKING';
    evidenceStatus = 'REVIEWED_FALLBACK';
    const ranked = manualReviewed.filter((s) => s.observedRank && s.observedRank > 0);
    const topRank = ranked[0]?.observedRank;
    demandSignal = topRank ? Math.min(14, Math.max(5, 16 - Math.ceil(topRank / 6))) : 8;
    demandStatus = 'REVIEWED_SIGNAL';
    demandBasis = `Secondary reported ranking (${manualReviewed.length} record(s), ${independentChainIds.length} unique chain(s)). Editorial or combined print/ebook scopes do not isolate digital marketplace rank.`;
    demandUncertainty = 'Secondary report / combined-format scope; cannot be treated as a current digital bestseller proof.';
  } else {
    evidenceLabel = 'SUPPORTING_INTEREST_SIGNAL';
    evidenceStatus = 'REVIEWED_FALLBACK';
    demandSignal = Math.min(10, 4 + independentChainIds.length * 2);
    demandStatus = 'REVIEWED_SIGNAL';
    demandBasis = `Supporting interest or estimate signal (${manualReviewed.length} reviewed record(s), ${independentChainIds.length} unique chain(s)).`;
    demandUncertainty = 'Interest indices or third-party estimates indicate topic attention only, not verified purchasing demand.';
  }

  const oldestDataDate = sorted
    .map((s) => Date.parse(s.dataAsOfDate || s.observedAt))
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b)[0];
  const ageHours = Number.isFinite(oldestDataDate)
    ? Math.max(0, Math.round((now - oldestDataDate) / (60 * 60 * 1000)))
    : null;

  const hasCombinedPrintScope = sorted.some((s) =>
    /combined|print/i.test(`${s.rankScope || ''} ${s.productFormat || ''}`)
  );

  const evidenceStrength: CandidateEvidenceStrength = {
    overallLevel:
      collectorVerified.length > 0 && independentChainIds.length >= 1
        ? 'STRONG_CURRENT'
        : hasPrimaryManual || hasReportedRank
        ? 'MODERATE_REVIEWED'
        : 'LIMITED_SUPPORTING',
    collectorVerifiedCount: collectorVerified.length,
    manuallyReviewedCount: manualReviewed.length,
    independentChainCount: independentChainIds.length,
    credibilityBasis:
      collectorVerified.length > 0
        ? `Live collector-verified official chart feed (${[...new Set(collectorVerified.map((s) => s.marketplace))].join(', ')})`
        : manualReviewed.length > 0
        ? `Human-inspected ${evidenceLabel.toLowerCase().replaceAll('_', ' ')} (${[...new Set(manualReviewed.map((s) => s.marketplace))].join(', ')})`
        : 'Unverified',
    methodologySummary: [...new Set(bestPerChain.map((s) => s.collectionMethodology || s.collector || s.acquisitionMethod || 'manual_observation'))].join('; '),
    recencySummary:
      ageHours === null
        ? 'Data-as-of date unavailable'
        : hasHistoricalManualRanking
        ? `Historical / aged observation (~${Math.round(ageHours / 24)}d old or archive curve; NOT current chart)`
        : ageHours <= 48
        ? `Data within ${ageHours}h window of retrieval`
        : `Data age ~${Math.round(ageHours / 24)}d (review recency before relying on snapshot)`,
    scopeFitSummary: hasCombinedPrintScope
      ? `Includes combined print/ebook or curated report scope mapped to ${category.replaceAll('_', ' ')} — isolate digital applicability carefully.`
      : `Educational category match (${category.replaceAll('_', ' ')}); general store ranks do not measure niche buyer conversion.`,
    corroborationSummary:
      independentChainIds.length < sorted.length
        ? `${sorted.length} record(s) collapsed into ${independentChainIds.length} independent evidence chain(s) so shared datasets are not double-counted.`
        : `${independentChainIds.length} distinct evidence chain(s) linked without duplicate dataset inflation.`,
  };

  const blueprint = NICHE_BLUEPRINTS[category];
  const productSuitability: CandidateProductSuitability = {
    readinessStatus: 'HYPOTHESIS_NEEDS_VALIDATION',
    audienceProblemClarity: blueprint
      ? `Draft concept hypothesis addresses: ${blueprint.coreProblem}`
      : 'Educational concept hypothesis drafted; target problem needs direct reader validation.',
    differentiationHypothesis: blueprint
      ? blueprint.differentiationAngle
      : 'Original worked examples, cited explanations, and companion worksheets.',
    creatorFitStatus: 'UNMEASURED',
    creatorFitNote:
      'Creator workflow capability is production coordination; domain expertise, credentials, and customer outcomes are NOT pre-assumed and must be supplied or researched intentionally.',
    productionEffort: 'MODERATE',
    nextValidationStep:
      collectorVerified.length > 0
        ? 'Inspect top 3 ranked listings manually for pricing, table-of-contents gaps, and negative reader reviews before locking Project Brief.'
        : 'Capture at least one primary digital marketplace chart or run direct buyer interviews to validate willingness to pay before committing production time.',
  };

  // Strict honesty rubric: ONLY directly measured/reviewed demand receives numeric points.
  // Unmeasured dimensions remain 0 with explicit UNMEASURED status & uncertainty disclosures.
  const factorAssessments: ScoreFactorAssessment[] = [
    {
      key: 'demandSignal',
      label: 'Demand signal',
      score: demandSignal,
      maxScore: 25,
      status: demandStatus,
      basis: demandBasis,
      uncertainty: demandUncertainty,
    },
    {
      key: 'problemUrgency',
      label: 'Problem urgency',
      score: null,
      maxScore: 15,
      status: 'UNMEASURED',
      basis: 'No customer interview, survey, or conversion dataset recorded yet.',
      uncertainty: 'Unmeasured — confirm problem urgency directly with target readers.',
    },
    {
      key: 'competitionEntry',
      label: 'Competition entry',
      score: null,
      maxScore: 15,
      status: 'UNMEASURED',
      basis: 'Competitor pricing distribution, review depth, and saturation are not systematically measured.',
      uncertainty: 'Unmeasured — manually inspect competing listings and reviews before positioning.',
    },
    {
      key: 'differentiation',
      label: 'Differentiation',
      score: null,
      maxScore: 15,
      status: 'UNMEASURED',
      basis: 'Proposed differentiation angle is an unvalidated editorial hypothesis.',
      uncertainty: 'Unmeasured — verify whether buyers value the proposed companion toolkit angle.',
    },
    {
      key: 'creatorFit',
      label: 'Creator fit',
      score: null,
      maxScore: 10,
      status: 'UNMEASURED',
      basis: 'Creator coordinates production workflows; subject expertise is not pre-assumed.',
      uncertainty: 'Unmeasured — assess source availability and review capacity in Reference Library.',
    },
    {
      key: 'audienceReach',
      label: 'Audience reach',
      score: null,
      maxScore: 10,
      status: 'UNMEASURED',
      basis: 'No existing owned audience, distribution channel, or ad CAC test recorded.',
      uncertainty: 'Unmeasured — no audience has been approved or measured yet.',
    },
    {
      key: 'digitalFit',
      label: 'Digital-product fit',
      score: null,
      maxScore: 5,
      status: 'UNMEASURED',
      basis: 'Format suitability inferred conceptually only; digital delivery willingness untested.',
      uncertainty: 'Unmeasured — validate preferred format (ebook vs templates/worksheets) with buyers.',
    },
    {
      key: 'costRisk',
      label: 'Cost / risk',
      score: null,
      maxScore: 5,
      status: 'UNMEASURED',
      basis: 'Time, licensing, and acquisition cost risk not yet quantified.',
      uncertainty: 'Unmeasured — estimate production budget and price elasticity directly.',
    },
  ];

  const scoreBreakdown: TopicCandidate['scoreBreakdown'] = {
    demandSignal,
    problemUrgency: 0,
    competitionEntry: 0,
    differentiation: 0,
    creatorFit: 0,
    audienceReach: 0,
    digitalFit: 0,
    costRisk: 0,
  };

  const canReceiveVerifiedBadge = collectorVerified.length > 0;
  const confidenceRating: TopicCandidate['confidenceRating'] =
    collectorVerified.length > 0 && independentChainIds.length >= 2
      ? 'HIGH'
      : 'MEDIUM';

  const recommendationReason =
    collectorVerified.length > 0
      ? `${collectorVerified.length} collector-verified official chart record(s) across ${independentChainIds.length} independent evidence chain(s) (top observed rank #${bestLive.observedRank}). Only demand signal is scored from observed rank; urgency, competition, differentiation, creator fit, audience reach, and cost risk remain unmeasured hypotheses.`
      : `${manualReviewed.length} manually reviewed fallback evidence record(s) across ${independentChainIds.length} chain(s) (${evidenceLabel.toLowerCase().replaceAll('_', ' ')}). Not collector-verified and not a proven current bestseller; validate pricing and buyer demand directly before publishing.`;

  return {
    evidenceStatus,
    evidenceLabel,
    evidenceStrength,
    productSuitability,
    factorAssessments,
    independentChainIds,
    scoreBreakdown,
    confidenceRating,
    canReceiveVerifiedBadge,
    recommendationReason,
  };
}

export function deriveSynchronizedCandidates(
  observations: MarketplaceObservation[] = [],
  options?: MarketSyncOptions,
  now = Date.now()
): TopicCandidate[] {
  const eligible = observations
    .filter((o) => isGateAQualifiedEvidence(o, now) && observationCategory(o) !== 'other')
    .filter((o) => !options?.focusMarketplace || options.focusMarketplace === 'ALL' || o.marketplace === options.focusMarketplace)
    .filter((o) => !options?.category || options.category === 'ALL' || observationCategory(o) === options.category)
    .filter(
      (o) =>
        !options?.searchQuery ||
        `${o.productTitle} ${o.category} ${o.sellerOrAuthor}`
          .toLowerCase()
          .includes(options.searchQuery.toLowerCase())
    );

  const groups = new Map<string, MarketplaceObservation[]>();
  for (const obs of eligible) {
    const category = observationCategory(obs);
    groups.set(category, [...(groups.get(category) || []), obs]);
  }

  const badgeEligibility = new Map<string, boolean>();

  const candidates: TopicCandidate[] = [...groups.entries()].map(([category, sources]) => {
    const sortedSources = [...sources].sort((a, b) => (a.observedRank || 999) - (b.observedRank || 999));
    const label = MARKET_CATEGORIES.find((c) => c.id === category)?.labelEn || category;
    const blueprint = NICHE_BLUEPRINTS[category];
    const assessment = computeCandidateEvidenceAssessment(sortedSources, category, now);
    const comparison = compareCandidateEvidence(observations, category, now);
    const audienceTopicHypotheses = buildAudienceTopicHypotheses(category, sortedSources);
    const id = `NICHE-${category}`;
    badgeEligibility.set(id, assessment.canReceiveVerifiedBadge);

    return {
      id,
      marketCategory: category,
      evidenceStatus: assessment.evidenceStatus,
      evidenceLabel: assessment.evidenceLabel,
      multiSourceStatus: comparison.multiSourceStatus,
      evidenceComparison: comparison.evidenceComparison,
      audienceTopicHypotheses,
      evidenceStrength: assessment.evidenceStrength,
      productSuitability: assessment.productSuitability,
      factorAssessments: assessment.factorAssessments,
      independentChainIds: assessment.independentChainIds,
      title: blueprint?.title || `${label}: Practical Learning Toolkit`,
      subtitle: blueprint?.subtitle || 'Original product hypothesis informed by linked Gate A evidence',
      targetAudience:
        blueprint?.targetAudienceHypothesis ||
        `Readers researching ${label.toLowerCase()}; audience remains a hypothesis until validated directly.`,
      coreProblem:
        blueprint?.coreProblem || `Define and validate a concrete learner bottleneck in ${label.toLowerCase()}.`,
      bigPromise:
        blueprint?.bigPromise || 'Practice and evaluate a clearly scoped workflow; buyer outcomes require direct validation.',
      suggestedFormat: blueprint?.suggestedFormat || 'ebook_toolkit',
      priceTestRange: blueprint?.priceTestRange || { test: 9, regular: 19, premium: 29 },
      marketEvidenceSummary: sortedSources
        .slice(0, 6)
        .map((o) => {
          const rankPart = o.observedRank ? `#${o.observedRank}` : o.metricValue ? `${o.metricName || 'Metric'}: ${o.metricValue} ${o.metricUnit || ''}`.trim() : 'Manual note';
          return `[${o.id}] ${o.marketplace}: ${rankPart} — ${o.productTitle} (as of ${o.dataAsOfDate || o.observedAt}; ${o.rankScope || o.category})`;
        })
        .join(' · '),
      competitiveDensity: 'MEDIUM',
      differentiationAngle:
        blueprint?.differentiationAngle ||
        'Develop original worked examples, cited explanations, and practical exercises; do not reproduce marketplace books.',
      creationComplexity: 'MODERATE',
      potentialCompanions: blueprint?.potentialCompanions || [
        `${label} practice workbook`,
        'Decision worksheet',
        'Progress and reflection log',
      ],
      confidenceRating: assessment.confidenceRating,
      opportunityScore: 0,
      scoreBreakdown: assessment.scoreBreakdown,
      recommendationReason: assessment.recommendationReason,
      researchGapNote:
        assessment.evidenceStatus === 'CURRENT_CHART'
          ? 'Observed chart ranks establish marketplace visibility, not unit economics or creator-audience fit.'
          : 'Based on manually reviewed fallback records rather than a current live collector chart; review source scope and validate buyer willingness.',
      sourceObservationIds: sortedSources.map((o) => o.id),
    };
  });

  // Ranking preserves transparent scoreBreakdown, and NEVER grants verified badge without collector-verified evidence
  const ranked = rankAndBadgeCandidates(candidates).map((c) => ({
    ...c,
    badge: c.badge === 'BEST_OVERALL' && badgeEligibility.get(c.id) ? c.badge : undefined,
  }));

  // User display preference changes display sort order ONLY — never scores, evidenceStrength, or badges!
  if (options?.prioritizedObservationId) {
    ranked.sort(
      (a, b) =>
        Number(b.sourceObservationIds.includes(options.prioritizedObservationId!)) -
        Number(a.sourceObservationIds.includes(options.prioritizedObservationId!))
    );
  }

  return ranked;
}

export function getLinkedObservationForCandidate(
  candidate: TopicCandidate,
  observations: MarketplaceObservation[] = []
): MarketplaceObservation | null {
  return observations.find((o) => candidate.sourceObservationIds.includes(o.id)) || null;
}

export async function runAutomatedMarketDiscovery(options?: MarketSyncOptions) {
  const response = await apiFetch('/api/market/research');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Marketplace research could not be loaded.');
  }
  const data = await response.json();
  const observations: MarketplaceObservation[] = data.observations || [];
  const resourceDirectory: GateAResourceEntry[] = mergeResourceDirectory(data.resourceDirectory);
  return {
    observations,
    candidates: deriveSynchronizedCandidates(observations, options),
    sources: data.sources || [],
    resourceDirectory,
    checkedAt: data.checkedAt,
  };
}

export async function checkSeedResourceDirectory(): Promise<{
  checkedAt: string;
  resources: GateAResourceEntry[];
}> {
  const response = await apiFetch('/api/market/resources/check', { method: 'POST' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Resource accessibility check failed.');
  }
  return response.json();
}

export function propagateTopicToDownstream(
  project: DigitalProductProject,
  selectedTopicId: string,
  lang: Language = 'en',
  selectedAudienceHypothesisId?: string
): DigitalProductProject {
  const candidate = project.marketResearch.topicCandidates.find((c) => c.id === selectedTopicId);
  if (!candidate) return project;
  const chosenHypothesis = candidate.audienceTopicHypotheses?.find(
    (h) => h.id === (selectedAudienceHypothesisId || candidate.selectedAudienceHypothesisId)
  );
  if (
    project.marketResearch.selectedTopicId === selectedTopicId &&
    project.charter.productTitle === candidate.title &&
    (!selectedAudienceHypothesisId || candidate.selectedAudienceHypothesisId === selectedAudienceHypothesisId)
  ) {
    return project;
  }

  const next = structuredClone(BLANK_PROJECT);
  const blueprint = candidate.marketCategory ? NICHE_BLUEPRINTS[candidate.marketCategory] : undefined;
  const defaultChapters = [
    {
      title: 'Foundations and learning goals',
      objective: `Establish baseline clarity and measurable outcomes in ${candidate.marketCategory?.replaceAll('_', ' ') || 'this domain'}.`,
      deliverable: 'Baseline Readiness Worksheet',
      milestone: 'Document starting metrics and key goals.',
    },
    {
      title: 'Core concepts and evidence',
      objective: 'Examine evidence-backed principles and common misconceptions before implementation.',
      deliverable: 'Evidence & Myth-Busting Checklist',
      milestone: 'Map core principles to verified research sources.',
    },
    {
      title: 'Worked example and guided practice',
      objective: 'Walk through a realistic end-to-end scenario step by step.',
      deliverable: 'Guided Scenario Workbook',
      milestone: 'Complete the worked example using your own inputs.',
    },
    {
      title: 'Independent application and review',
      objective: 'Apply the method independently and evaluate results against clear criteria.',
      deliverable: 'Self-Audit & Calibration Scorecard',
      milestone: 'Complete the exercise and compare it with the stated learning objective.',
    },
  ];
  const chapterSpecs = blueprint?.chapters || defaultChapters;
  const structuralPillars = chapterSpecs.map((c) => c.title);

  // Preserve creator's real self-reported background if already provided; NEVER invent expertise or customer results
  const existingCreatorName = (project.intake?.creatorName || '').trim();
  const existingExperience = (project.intake?.relevantExperience || '').trim();
  const existingExpertise = (project.intake?.expertise || '').trim();

  const effectiveAudience = chosenHypothesis ? chosenHypothesis.audienceLabel : candidate.targetAudience;
  const updatedCandidates = project.marketResearch.topicCandidates.map((c) =>
    c.id === selectedTopicId && selectedAudienceHypothesisId
      ? { ...c, selectedAudienceHypothesisId }
      : c
  );

  return {
    ...next,
    projectId: project.projectId,
    createdAt: project.createdAt,
    updatedAt: new Date().toISOString(),
    name: candidate.title,
    isBlankProject: false,
    preferences: { ...project.preferences, language: lang === 'en' ? 'English' : '繁體中文' },
    aiSettings: project.aiSettings,
    brand: project.brand,
    marketResearch: { ...project.marketResearch, selectedTopicId, topicCandidates: updatedCandidates },
    intake: {
      ...next.intake,
      projectName: candidate.title,
      creatorName: existingCreatorName,
      relevantExperience: existingExperience,
      expertise: existingExpertise,
      productIdea: chosenHypothesis
        ? `${candidate.title} — ${chosenHypothesis.productAngle}`
        : `${candidate.title} — ${candidate.subtitle}`,
      targetAudience: effectiveAudience,
      problemsSolved: candidate.coreProblem,
      desiredTransformation: candidate.bigPromise,
      recommendedPrice: {
        ...next.intake.recommendedPrice,
        introductoryTest: candidate.priceTestRange.test,
        regular: candidate.priceTestRange.regular,
        premiumBundle: candidate.priceTestRange.premium,
        currency: 'USD',
        rationale: `Draft 3-tier price test range for ${candidate.suggestedFormat}; validate buyer willingness directly before launch.`,
      },
    },
    uvz: {
      ...next.uvz,
      buyerProblems: [candidate.coreProblem],
      potentialSolutions: [candidate.bigPromise, candidate.differentiationAngle],
      creatorExpertiseFit:
        'Workflow and production coordination led by the creator; factual claims must be grounded in retrieved Gate B research sources rather than assumed expertise.',
      differentiationOpportunities: candidate.potentialCompanions,
    },
    transformationMap: {
      ...next.transformationMap,
      beforeState: {
        ...next.transformationMap.beforeState,
        currentPains: [candidate.coreProblem],
        anxietiesAndFrustrations: ['Unstructured workflow or scattered instructions without companion worksheets'],
      },
      bridgeProcess: {
        ...next.transformationMap.bridgeProcess,
        coreMethodology: candidate.differentiationAngle,
        signatureFrameworkName: candidate.title,
        keyMilestones: chapterSpecs.map((c) => `${c.title}: ${c.deliverable}`),
        practicalTools: candidate.potentialCompanions,
      },
      afterState: {
        ...next.transformationMap.afterState,
        tangibleOutcomes: [candidate.bigPromise],
        completedDeliverables: chapterSpecs.map((c) => c.deliverable),
      },
      bigPromise: candidate.bigPromise,
    },
    pricingReport: {
      ...next.pricingReport,
      introductoryPrice: candidate.priceTestRange.test,
      regularPrice: candidate.priceTestRange.regular,
      bundlePrice: candidate.priceTestRange.premium,
      currency: 'USD',
      rationale: `Hypothesis test pricing ($${candidate.priceTestRange.test} / $${candidate.priceTestRange.regular} / $${candidate.priceTestRange.premium}); subject to market and margin calibration.`,
    },
    charter: {
      ...next.charter,
      productTitle: candidate.title,
      subtitle: candidate.subtitle,
      targetAudience: effectiveAudience,
      primaryProblemSolved: candidate.coreProblem,
      centralPromise: candidate.bigPromise,
      deliveryFormat: candidate.suggestedFormat,
      structuralPillars,
      learningObjectives: chapterSpecs.map((c) => c.objective),
      explicitDisclaimers: [
        'Educational material; validate source claims and consult qualified professionals where needed.',
        'Market research informs this concept hypothesis; no sales or buyer outcomes are guaranteed.',
      ],
      isApproved: false,
    },
    outline: chapterSpecs.map((spec, index) => ({
      id: `CH-${index + 1}`,
      order: index + 1,
      title: spec.title,
      objective: spec.objective,
      subtopics: ['Core framework & evidence', 'Step-by-step worked example', 'Practical execution checklist'],
      targetWordCount: 1200,
      practicalDeliverable: spec.deliverable,
      mappedReferenceIds: [],
      exampleScenarios: [],
      completionMilestone: spec.milestone,
      contentMarkdown: '',
      actualWordCount: 0,
      isCompleted: false,
      isLocked: false,
    })),
    workflow: {
      ...next.workflow,
      activeStage: 'topic_selection',
      stageStatuses: {
        ...next.workflow.stageStatuses,
        market_research: 'COMPLETED',
        topic_selection: 'NEEDS_REVIEW',
        product_charter: 'NEEDS_REVIEW',
        outline_builder: 'PARTIAL',
      },
    },
  };
}
