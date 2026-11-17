import type { DigitalProductProject, MarketplaceObservation, ProductFormat, TopicCandidate } from '../types/project.ts';
import { rankAndBadgeCandidates } from './scoring.ts';
import { BLANK_PROJECT } from '../data/demoProject.ts';
import { Language } from './i18n.ts';
import { apiFetch } from '../services/apiClient.ts';

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
    descriptionEn: 'Broad scan across all digital product domains and commerce marketplaces',
    descriptionZh: '全面涵蓋知識手冊、實作工具、管理系統與數位規劃表',
    marketplaces: ['Amazon Kindle', 'Gumroad', 'Etsy', 'Apple Books', 'Payhip'],
  },
  {
    id: 'productivity_systems',
    labelEn: 'Notion & Solo Founder Systems',
    labelZh: 'Notion 系統與一人公司生產力',
    descriptionEn: 'Operating systems, client onboarding portals, SOPs, and creator dashboards',
    descriptionZh: '一人事業工作空間、客戶接案流程、SOP 與個人生產力管理庫',
    marketplaces: ['Gumroad', 'Payhip', 'Etsy'],
  },
  {
    id: 'wellness_habits',
    labelEn: 'Wellness, Habits & Mental Health',
    labelZh: '身心健康、微習慣與抗倦怠',
    descriptionEn: 'Burnout recovery journals, somatic trackers, GoodNotes reset workbooks',
    descriptionZh: '自律微習慣、抗倦怠自癒手冊、GoodNotes 可填寫數位筆記',
    marketplaces: ['Etsy', 'Amazon Kindle', 'Apple Books'],
  },
  {
    id: 'personal_finance',
    labelEn: 'Personal Finance & Real Estate',
    labelZh: '個人理財、房產與資產配置',
    descriptionEn: 'Mortgage calculators, first-time buyer blueprints, closing fee guides',
    descriptionZh: '首購族避坑指南、房貸精算工具表、資產配置與預算管理套件',
    marketplaces: ['Apple Books', 'Amazon Kindle', 'Gumroad'],
  },
  {
    id: 'freelance_career',
    labelEn: 'Freelance Growth & Client Proposals',
    labelZh: '接案變現、報價談判與合約工具',
    descriptionEn: 'Value pricing calculators, proposal decks, scope creep addendums',
    descriptionZh: '高報價談判話術、防合約扯皮條款、三層客戶提案範本',
    marketplaces: ['Payhip', 'Gumroad'],
  },
  {
    id: 'budget_living',
    labelEn: 'Budget Living & Family Meal Planning',
    labelZh: '平價生活、家庭餐桌與節流食譜',
    descriptionEn: 'Zero-waste dinner systems, grocery inflation sheets, pantry inventory guides',
    descriptionZh: '抗通膨食材輪替矩陣、每週採買精算表、零浪費省錢料理計畫',
    marketplaces: ['Amazon Kindle', 'Gumroad', 'Etsy'],
  },
];

/**
 * Standard Multi-Platform Market Observations across Amazon Kindle, Gumroad, Etsy, Apple Books, and Payhip
 * Legacy illustrative fixtures. Never used by live research or accepted by gates.
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
    dataLimitations: 'Public ranking index reflects velocity, verified live on Amazon search index.',
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
    dataLimitations: 'Creator-reported sales tier benchmarked against category top decile on Gumroad Discover.',
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
    dataLimitations: 'Etsy Bestseller badge verified directly on Etsy live digital listings.',
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
    dataLimitations: 'Apple Books chart ranking reflects 7-day verified purchase velocity.',
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
    productFormat: 'Google Docs / Word Templates + Video Walkthrough',
    observedAt: '2026-11-06',
    evidenceLevel: 'FEATURED_COLLECTION',
    dataLimitations: 'Direct sales platform verified catalog item with active transaction records.',
  },
  {
    id: 'OBS-06',
    marketplace: 'Gumroad',
    category: 'Food & Cooking > Meal Planning Systems',
    productTitle: 'The $75 Weekly Family Dinner Matrix (Printable PDF + Notion)',
    sellerOrAuthor: 'Sarah Jenkins',
    productURL: 'https://gumroad.com/discover?query=family+dinner+meal+planner',
    currentPrice: 19.0,
    currency: 'USD',
    observedRank: 12,
    rankScope: 'Trending in Food',
    reviewCount: 520,
    rating: 4.9,
    productFormat: 'PDF Ebook + Notion + Printable Sheets',
    observedAt: '2026-11-08',
    evidenceLevel: 'FEATURED_COLLECTION',
    dataLimitations: 'Estimated annual recurring revenue verified via Gumroad seller analytics.',
  },
];

// Illustrative fixtures only. These are never accepted as live ranking evidence.
export const SAMPLE_OBSERVATIONS: MarketplaceObservation[] = DEMO_OBSERVATIONS.map(observation => ({ ...observation, isSample: true, evidenceLevel: 'SEARCH_RESULT', dataLimitations: 'Illustrative sample; product, rank, price and reviews are not live verified.' }));

export interface MarketSyncOptions {
  category?: string;
  prioritizedObservationId?: string;
  focusMarketplace?: string;
  searchQuery?: string;
}

export const EVIDENCE_MAX_AGE_MS = 48 * 60 * 60 * 1000;
export const ALLOWED_AMAZON_CHART_PATTERN = /^https:\/\/www\.amazon\.com\/Best-Sellers-Kindle-Store(?:-[A-Za-z-]+)?\/zgbs\/digital-text(?:\/[0-9]+)?$/;

export function isCurrentMarketEvidence(observation: MarketplaceObservation, now = Date.now()): boolean {
  const age = now - Date.parse(observation.observedAt);
  const rank = observation.observedRank;
  const source = observation.sourceURL || '';
  const allowedSource = (observation.collector === 'apple-chart-v1' && source === 'https://rss.applemarketingtools.com/api/v2/us/books/top-paid/100/books.json' && /^https:\/\/books\.apple\.com\//.test(observation.productURL)) ||
    (observation.collector === 'amazon-chart-v1' && ALLOWED_AMAZON_CHART_PATTERN.test(source) && /^https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}$/.test(observation.productURL));
  return Boolean(!observation.isSample && allowedSource && observation.evidenceLevel === 'VERIFIED_RANKING' && Number.isInteger(rank) && rank! > 0 && rank! <= 100 && age >= 0 && age <= EVIDENCE_MAX_AGE_MS && observation.evidenceExcerpt);
}
export function observationCategory(observation: MarketplaceObservation): string {
  const text = `${observation.category} ${observation.productTitle}`.toLowerCase();
  if (/cook|meal|food|recipe|kitchen|pantry|budget living/.test(text)) return 'budget_living';
  if (/health|habit|wellness|psychology|burnout|self-help|mindset|fitness|dieting|sleep|stress|anxiety|meditation/.test(text)) return 'wellness_habits';
  if (/finance|money|invest|real estate|wealth|retire|tax|mortgage|debt/.test(text)) return 'personal_finance';
  if (/freelance|career|proposal|education|teaching|coaching|negotiat|interview|resume|leadership|consulting/.test(text)) return 'freelance_career';
  if (/business|productiv|notion|management|computer|technology|software|system|workflow|automation|ai\b|operating/.test(text)) return 'productivity_systems';
  return 'other';
}

interface NicheBlueprint {
  title: string;
  subtitle: string;
  targetAudience: string;
  coreProblem: string;
  bigPromise: string;
  suggestedFormat: ProductFormat;
  formatNotes: string;
  priceTestRange: { test: number; regular: number; premium: number };
  differentiationAngle: string;
  potentialCompanions: string[];
  chapters: Array<{ title: string; objective: string; deliverable: string; milestone: string }>;
}

const NICHE_BLUEPRINTS: Record<string, NicheBlueprint> = {
  productivity_systems: {
    title: 'Solo Operator Systems & AI Workflow Playbook',
    subtitle: 'Original execution manual, SOP architecture, and decision toolkit for solo creators and lean operators',
    targetAudience: 'Solo founders, freelancers, and knowledge workers overwhelmed by fragmented tools and manual routines',
    coreProblem: 'Operators lose hours each week context-switching across unstandardized notes, tasks, and client handoffs without repeatable systems.',
    bigPromise: 'Build a lightweight, evidence-grounded operating rhythm that cuts weekly admin friction and standardizes repeatable delivery.',
    suggestedFormat: 'ebook_toolkit',
    formatNotes: 'Ebook + SOP Templates & Operating Checklist Bundle',
    priceTestRange: { test: 15, regular: 29, premium: 49 },
    differentiationAngle: 'Pairs concise architectural principles with copy-ready SOP checklists and measurable weekly cadence audits rather than generic productivity theory.',
    potentialCompanions: ['Weekly Operating Cadence Worksheet', 'Client Onboarding & Handoff SOP Pack', 'Time-Leak & Automation Audit Sheet', '30-Day Systems Implementation Tracker'],
    chapters: [
      { title: 'Diagnosing Operational Friction & Tool Sprawl', objective: 'Identify high-frequency workflow bottlenecks and quantify weekly time recovery opportunities.', deliverable: 'Workflow Friction Audit Worksheet', milestone: 'Document top 3 recurring operational bottlenecks with baseline weekly hours.' },
      { title: 'Single-Source Capture & Prioritization Architecture', objective: 'Design a minimal capture-to-action triage loop that prevents neglected backlogs.', deliverable: 'Daily Triage & Priority Matrix', milestone: 'Run 5 consecutive daily triage cycles without orphaned tasks.' },
      { title: 'Repeatable Client & Project SOP Standardization', objective: 'Convert complex recurring deliverables into checklist-driven standard operating procedures.', deliverable: 'Reusable 1-Page SOP Builder', milestone: 'Publish and test 2 core SOP checklists on active work.' },
      { title: 'Safe Automation & AI Delegation Guardrails', objective: 'Separate deterministic rules from assisted drafting while preserving human quality verification.', deliverable: 'Automation & Verification Guardrail Checklist', milestone: 'Automate or standardize 1 weekly recurring workflow with verified outputs.' },
      { title: 'Weekly Review, KPI Telemetry & Continuous Calibration', objective: 'Sustain long-term system reliability through a 20-minute Friday review protocol.', deliverable: '20-Minute Weekly Review Scoreboard', milestone: 'Complete a full 4-week operating calibration cycle.' },
    ],
  },
  wellness_habits: {
    title: 'Sustainable Energy & Habit Reset Workbook',
    subtitle: 'Practical behavioral routines, burnout recovery protocols, and daily self-tracking worksheets',
    targetAudience: 'High-output professionals and caregivers seeking steady focus and restorative routines without extreme willpower',
    coreProblem: 'All-or-nothing wellness plans collapse during busy workweeks, leaving readers cycling through exhaustion and guilt.',
    bigPromise: 'Install realistic keystone habits for sleep, focus, and stress recovery using gradual behavioral design and reflection logs.',
    suggestedFormat: 'workbook',
    formatNotes: 'Interactive Ebook + Fillable Habit & Energy Tracker',
    priceTestRange: { test: 12, regular: 24, premium: 39 },
    differentiationAngle: 'Centers on minimum-viable daily baselines, friction reduction, and cited behavioral science rather than rigid 5 a.m. perfectionism.',
    potentialCompanions: ['Energy & Stress Trigger Self-Audit', 'Minimum-Viable Daily Routine Builder', '14-Day Sleep & Focus Stabilization Log', 'Burnout Recovery Boundary Script Pack'],
    chapters: [
      { title: 'Mapping Energy Leaks & Nervous System Load', objective: 'Pinpoint hidden daily stressors and cognitive overload patterns before changing routines.', deliverable: '7-Day Energy & Stressor Audit Sheet', milestone: 'Establish baseline sleep, focus, and recovery scores across one full week.' },
      { title: 'Designing Minimum-Viable Keystone Habits', objective: 'Anchor tiny, resilient habits to existing cues so momentum survives hectic days.', deliverable: 'Habit Stacking & Cue Design Canvas', milestone: 'Maintain a 2-minute baseline version of 2 keystone habits for 7 days.' },
      { title: 'Attention Protection & Digital Wind-Down Boundaries', objective: 'Reduce fragmented attention and late-evening stimulation through environment redesign.', deliverable: 'Workday Shutdown & Evening Wind-Down Checklist', milestone: 'Execute a 5-day screen-taper protocol before sleep.' },
      { title: 'Sustainable Movement, Hydration & Midday Recovery', objective: 'Integrate brief physical resets between deep-work blocks to prevent afternoon crashes.', deliverable: '90-Minute Ultradian Reset Menu', milestone: 'Adopt 2 midday recovery micro-breaks per workday.' },
      { title: 'Relapse Prevention & 30-Day Habit Calibration', objective: 'Recover rapidly from missed days using pre-committed fallback rules.', deliverable: '30-Day Habit Continuity & Reflection Scoreboard', milestone: 'Complete a monthly review and adjust habit difficulty for the next cycle.' },
    ],
  },
  personal_finance: {
    title: 'Clarity-First Household Cashflow & Debt Reduction Guide',
    subtitle: 'Structured budgeting framework, expense audit sheets, and milestone calculators for resilient finances',
    targetAudience: 'Households and early-career earners wanting predictable monthly savings and debt payoff clarity without complex jargon',
    coreProblem: 'Rising living costs and fragmented subscriptions erode monthly savings while intimidating spreadsheets deter consistent tracking.',
    bigPromise: 'Build a transparent 30-day cashflow system, eliminate hidden leaks, and map a realistic emergency-fund and debt payoff runway.',
    suggestedFormat: 'ebook_toolkit',
    formatNotes: 'Ebook + Cashflow & Payoff Calculator Toolkit',
    priceTestRange: { test: 15, regular: 29, premium: 49 },
    differentiationAngle: 'Combines plain-language financial literacy with visual decision trees and printable cashflow audit worksheets (educational only, not licensed advice).',
    potentialCompanions: ['Zero-Guilt Monthly Cashflow Ledger', 'Subscription & Fixed-Cost Pruning Worksheet', 'Emergency Buffer & Debt Snowball Planner', 'Annual Irregular-Expense Sinking Fund Matrix'],
    chapters: [
      { title: 'The Honest 30-Day Cashflow Baseline', objective: 'Reconstruct real net inflow, fixed obligations, and variable spending without judgment.', deliverable: 'Baseline Cashflow Snapshot Table', milestone: 'Categorize 100% of the past 30 days of spending.' },
      { title: 'Pruning Silent Leaks & High-Impact Fixed Costs', objective: 'Identify recurring subscriptions, fee drains, and negotiable bills with immediate ROI.', deliverable: 'Expense Pruning & Negotiation Checklist', milestone: 'Document specific monthly recurring savings opportunities.' },
      { title: 'Resilient Sinking Funds & Emergency Reserves', objective: 'Smooth predictable annual expenses so car repairs and renewals never derail budgets.', deliverable: 'Sinking Fund Allocation Schedule', milestone: 'Automate or ring-fence starter reserves for top 3 irregular expenses.' },
      { title: 'Structured Debt Payoff vs. Savings Sequencing', objective: 'Compare avalanche and snowball math clearly to choose a sustainable payoff order.', deliverable: 'Debt Priority & Interest Comparison Sheet', milestone: 'Select and document a primary payoff sequence with target payoff dates.' },
      { title: 'Quarterly Money Check-In & Inflation Resilience', objective: 'Maintain financial alignment in 15 minutes a month through lightweight check-ins.', deliverable: 'Monthly 15-Minute Money Review Protocol', milestone: 'Run your first post-setup monthly review and rebalance targets.' },
    ],
  },
  freelance_career: {
    title: 'High-Trust Client Proposal & Value Pricing Playbook',
    subtitle: 'Scope architecture, discovery scripts, and 3-tier proposal templates for independent consultants',
    targetAudience: 'Independent freelancers, educators, and boutique consultants stuck in hourly pricing and endless scope revisions',
    coreProblem: 'Skilled independents undercharge and lose qualified leads because proposals emphasize hours instead of buyer outcomes and clear boundaries.',
    bigPromise: 'Present structured 3-tier options, qualify client budgets upfront, and protect margins with clear scope-change addendums.',
    suggestedFormat: 'template_bundle',
    formatNotes: 'Ebook + Proposal, Discovery & Scope Contract Templates',
    priceTestRange: { test: 19, regular: 39, premium: 59 },
    differentiationAngle: 'Delivers ready-to-adapt proposal structures, boundary clauses, and discovery question trees grounded in real client buying psychology.',
    potentialCompanions: ['3-Tier Value Proposal Template', '20-Minute Discovery Qualification Script', 'Scope-Creep Prevention & Change-Order Addendum', 'Client Onboarding & Milestone Sign-Off Checklist'],
    chapters: [
      { title: 'Shifting From Hourly Labor to Outcome Positioning', objective: 'Reframe technical deliverables into measurable business value for decision-makers.', deliverable: 'Offer Outcome & ROI Translation Worksheet', milestone: 'Rewrite your core service offer around 3 buyer outcomes.' },
      { title: 'Discovery Calls That Surface Real Budget & Urgency', objective: 'Use structured diagnostic questions to uncover cost of inaction before quoting.', deliverable: 'Structured Discovery Call Scorecard', milestone: 'Run the discovery script on your next 3 prospect conversations.' },
      { title: 'Structuring Irresistible 3-Tier Proposals', objective: 'Design Essential, Core, and Accelerated options that anchor value cleanly.', deliverable: 'Fill-in-the-Blank 3-Tier Proposal Blueprint', milestone: 'Assemble a reusable master proposal template for your niche.' },
      { title: 'Scope Boundaries, Revisions & Payment Milestones', objective: 'Eliminate unpaid scope creep with explicit exclusions and change-order triggers.', deliverable: 'Scope Guardrail & Change-Order Clause Sheet', milestone: 'Update your standard service agreement with milestone acceptance rules.' },
      { title: 'Post-Delivery Case Studies & Referral Flywheels', objective: 'Turn successful engagements into documented proof and warm repeat business.', deliverable: 'Client Wrap-Up & Testimonial Request Kit', milestone: 'Capture one structured outcome summary from a completed project.' },
    ],
  },
  budget_living: {
    title: 'Anti-Inflation Family Meal System & Pantry Matrix',
    subtitle: 'Zero-waste weekly dinner planning, unit-cost grocery shopping lists, and batch-prep guides',
    targetAudience: 'Busy households looking to cut weekly food waste and grocery spend while keeping weeknight dinners varied and nutritious',
    coreProblem: 'Impulsive midweek takeout and unused produce quietly inflate household food budgets and create daily dinner fatigue.',
    bigPromise: 'Cut grocery waste with a modular pantry rotation, 20-minute batch prep blocks, and repeatable budget-conscious family menus.',
    suggestedFormat: 'ebook_toolkit',
    formatNotes: 'Ebook + Printable Meal Matrix & Grocery Cost Sheets',
    priceTestRange: { test: 9, regular: 19, premium: 29 },
    differentiationAngle: 'Replaces rigid 100-ingredient gourmet recipes with interchangeable cross-utilization templates built around affordable staples.',
    potentialCompanions: ['Pantry-First Inventory & Rotation Sheet', 'Weekly 5-Dinner Cross-Utilization Planner', 'Unit-Price Grocery Comparison Cheat Sheet', '45-Minute Sunday Prep Workflow Card'],
    chapters: [
      { title: 'The Pantry-First Audit & Hidden Food Waste Reset', objective: 'Inventory existing staples and identify the top recurring causes of spoiled groceries.', deliverable: 'Freezer & Pantry Inventory Map', milestone: 'Build a 1-week menu using at least 50% existing pantry items.' },
      { title: 'The 5-Base Cross-Utilization Menu Architecture', objective: 'Plan varied dinners that share core proteins, produce, and aromatics across the week.', deliverable: 'Interchangeable Meal Matrix Template', milestone: 'Draft a 7-day plan with under 18 unique grocery line items.' },
      { title: 'Smart Store Navigation & Unit-Price Comparison', objective: 'Compare bulk, store-brand, and seasonal alternatives using true per-serving cost.', deliverable: 'Per-Serving Cost & Substitution Guide', milestone: 'Track receipt totals across two consecutive grocery trips.' },
      { title: '45-Minute Weekend Prep for 15-Minute Weeknights', objective: 'Batch-wash, portion, and pre-cook foundational components safely.', deliverable: '45-Minute Batch Prep Sequence Card', milestone: 'Complete one 45-minute prep session covering 3 weeknight meals.' },
      { title: 'Leftover Reinvention & Monthly Household Savings Review', objective: 'Turn surplus cooked ingredients into planned lunches and measure real monthly savings.', deliverable: 'Monthly Grocery Savings & Favorite Meals Log', milestone: 'Quantify 30-day spend reduction and lock top 10 family staple meals.' },
    ],
  },
};

export function deriveSynchronizedCandidates(observations: MarketplaceObservation[] = [], options?: MarketSyncOptions): TopicCandidate[] {
  const eligible = observations.filter(o => isCurrentMarketEvidence(o) && observationCategory(o) !== 'other')
    .filter(o => !options?.focusMarketplace || options.focusMarketplace === 'ALL' || o.marketplace === options.focusMarketplace)
    .filter(o => !options?.category || options.category === 'ALL' || observationCategory(o) === options.category)
    .filter(o => !options?.searchQuery || `${o.productTitle} ${o.category} ${o.sellerOrAuthor}`.toLowerCase().includes(options.searchQuery.toLowerCase()));
  const groups = new Map<string, MarketplaceObservation[]>();
  for (const obs of eligible) { const category = observationCategory(obs); groups.set(category, [...(groups.get(category) || []), obs]); }
  const candidates: TopicCandidate[] = [...groups.entries()].map(([category, sources]) => {
    const sortedSources = [...sources].sort((a, b) => (a.observedRank || 100) - (b.observedRank || 100));
    const best = sortedSources[0];
    const label = MARKET_CATEGORIES.find(c => c.id === category)?.labelEn || category;
    const blueprint = NICHE_BLUEPRINTS[category];
    return {
      id: `NICHE-${category}`,
      marketCategory: category,
      evidenceStatus: 'CURRENT_CHART',
      title: blueprint?.title || `${label}: Practical Learning Toolkit`,
      subtitle: blueprint?.subtitle || 'Original product concept informed by current marketplace chart observations',
      targetAudience: blueprint?.targetAudience || `Readers researching ${label.toLowerCase()}; validate the specific buyer with interviews.`,
      coreProblem: blueprint?.coreProblem || `Identify and validate a specific learning obstacle in ${label.toLowerCase()}.`,
      bigPromise: blueprint?.bigPromise || 'Learn, practice, and evaluate a clearly scoped skill; outcomes require validation.',
      suggestedFormat: blueprint?.suggestedFormat || 'ebook_toolkit',
      priceTestRange: blueprint?.priceTestRange || { test: 9, regular: 19, premium: 29 },
      marketEvidenceSummary: sortedSources.slice(0, 5).map(o => `${o.marketplace}: #${o.observedRank} — ${o.productTitle} (${o.observedAt}; ${o.rankScope})`).join(' · '),
      competitiveDensity: 'MEDIUM',
      differentiationAngle: blueprint?.differentiationAngle || 'Develop original worked examples, cited explanations, and practical exercises; do not reproduce marketplace books.',
      creationComplexity: 'MODERATE',
      potentialCompanions: blueprint?.potentialCompanions || [`${label} practice workbook`, 'Decision worksheet', 'Progress and reflection log'],
      confidenceRating: 'MEDIUM',
      opportunityScore: 0,
      scoreBreakdown: { demandSignal: Math.max(1, 26 - Math.ceil(best.observedRank! / 4)), problemUrgency: 0, competitionEntry: 0, differentiation: 0, creatorFit: 0, audienceReach: 0, digitalFit: 0, costRisk: 0 },
      recommendationReason: `${sources.length} current chart observation(s) captured across live charts (top signal #${best.observedRank}). Only demand is scored; competition, creator fit, pricing and outcome claims are unvalidated. A new concept is not itself a bestseller.`,
      sourceObservationIds: sortedSources.map(o => o.id),
    };
  });
  const ranked = rankAndBadgeCandidates(candidates).map(c => ({...c, badge: c.badge === 'BEST_OVERALL' ? c.badge : undefined}));
  // User preference changes display order only, never evidence scores or verification status.
  if (options?.prioritizedObservationId) ranked.sort((a,b) => Number(b.sourceObservationIds.includes(options.prioritizedObservationId!)) - Number(a.sourceObservationIds.includes(options.prioritizedObservationId!)));
  return ranked;
}
export function getLinkedObservationForCandidate(candidate: TopicCandidate, observations: MarketplaceObservation[] = []): MarketplaceObservation | null {
  return observations.find(o => candidate.sourceObservationIds.includes(o.id)) || null;
}
export async function runAutomatedMarketDiscovery(options?: MarketSyncOptions) {
  const response = await apiFetch('/api/market/research');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Marketplace research could not be loaded.');
  }
  const data = await response.json();
  const observations: MarketplaceObservation[] = data.observations || [];
  return { observations, candidates: deriveSynchronizedCandidates(observations, options), sources: data.sources || [], checkedAt: data.checkedAt };
}
export function propagateTopicToDownstream(project: DigitalProductProject, selectedTopicId: string, lang: Language = 'en'): DigitalProductProject {
  const candidate = project.marketResearch.topicCandidates.find(c => c.id === selectedTopicId);
  if (!candidate) return project;
  if (project.marketResearch.selectedTopicId === selectedTopicId && project.charter.productTitle === candidate.title) return project;
  const next = structuredClone(BLANK_PROJECT);
  const blueprint = candidate.marketCategory ? NICHE_BLUEPRINTS[candidate.marketCategory] : undefined;
  const defaultChapters = [
    { title: 'Foundations and learning goals', objective: `Establish baseline clarity and measurable outcomes in ${candidate.marketCategory?.replaceAll('_', ' ') || 'this domain'}.`, deliverable: 'Baseline Readiness Worksheet', milestone: 'Document starting metrics and key goals.' },
    { title: 'Core concepts and evidence', objective: 'Examine evidence-backed principles and common misconceptions before implementation.', deliverable: 'Evidence & Myth-Busting Checklist', milestone: 'Map core principles to verified research sources.' },
    { title: 'Worked example and guided practice', objective: 'Walk through a realistic end-to-end scenario step by step.', deliverable: 'Guided Scenario Workbook', milestone: 'Complete the worked example using your own inputs.' },
    { title: 'Independent application and review', objective: 'Apply the method independently and evaluate results against clear criteria.', deliverable: 'Self-Audit & Calibration Scorecard', milestone: 'Complete the exercise and compare it with the stated learning objective.' },
  ];
  const chapterSpecs = blueprint?.chapters || defaultChapters;
  const structuralPillars = chapterSpecs.map(c => c.title);
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
    marketResearch: { ...project.marketResearch, selectedTopicId },
    intake: {
      ...next.intake,
      projectName: candidate.title,
      productIdea: `${candidate.title} — ${candidate.subtitle}`,
      targetAudience: candidate.targetAudience,
      problemsSolved: candidate.coreProblem,
      desiredTransformation: candidate.bigPromise,
      recommendedPrice: {
        ...next.intake.recommendedPrice,
        introductoryTest: candidate.priceTestRange.test,
        regular: candidate.priceTestRange.regular,
        premiumBundle: candidate.priceTestRange.premium,
        currency: 'USD',
        rationale: `Pre-populated 3-tier launch ladder grounded in ${candidate.marketCategory?.replaceAll('_', ' ') || 'digital product'} packaging (${candidate.suggestedFormat}); adjust after buyer validation.`,
      },
    },
    uvz: {
      ...next.uvz,
      buyerProblems: [candidate.coreProblem, 'Overwhelm from scattered, non-actionable advice without templates'],
      potentialSolutions: [candidate.bigPromise, candidate.differentiationAngle],
      differentiationOpportunities: candidate.potentialCompanions,
    },
    transformationMap: {
      ...next.transformationMap,
      beforeState: {
        ...next.transformationMap.beforeState,
        currentPains: [candidate.coreProblem],
        anxietiesAndFrustrations: ['Piecing together generic tips without an actionable roadmap'],
      },
      bridgeProcess: {
        ...next.transformationMap.bridgeProcess,
        coreMethodology: candidate.differentiationAngle,
        signatureFrameworkName: candidate.title,
        keyMilestones: chapterSpecs.map(c => `${c.title}: ${c.deliverable}`),
        practicalTools: candidate.potentialCompanions,
      },
      afterState: {
        ...next.transformationMap.afterState,
        tangibleOutcomes: [candidate.bigPromise],
        completedDeliverables: chapterSpecs.map(c => c.deliverable),
      },
      bigPromise: candidate.bigPromise,
    },
    pricingReport: {
      ...next.pricingReport,
      introductoryPrice: candidate.priceTestRange.test,
      regularPrice: candidate.priceTestRange.regular,
      bundlePrice: candidate.priceTestRange.premium,
      currency: 'USD',
      rationale: `Entry test tier ($${candidate.priceTestRange.test}) lowers friction, Core ($${candidate.priceTestRange.regular}) anchors the main guide, and VIP Bundle ($${candidate.priceTestRange.premium}) monetizes companion templates & trackers.`,
    },
    charter: {
      ...next.charter,
      productTitle: candidate.title,
      subtitle: candidate.subtitle,
      targetAudience: candidate.targetAudience,
      primaryProblemSolved: candidate.coreProblem,
      centralPromise: candidate.bigPromise,
      deliveryFormat: candidate.suggestedFormat,
      structuralPillars,
      learningObjectives: chapterSpecs.map(c => c.objective),
      explicitDisclaimers: ['Educational material; validate source claims and consult qualified professionals where needed.'],
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
