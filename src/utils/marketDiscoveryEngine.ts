import type { DigitalProductProject, MarketplaceObservation, TopicCandidate } from '../types/project.ts';
import { rankAndBadgeCandidates } from './scoring.ts';
import { BLANK_PROJECT } from '../data/demoProject.ts';
import { Language } from './i18n.ts';

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
export function isCurrentMarketEvidence(observation: MarketplaceObservation, now = Date.now()): boolean {
  const age = now - Date.parse(observation.observedAt);
  const rank = observation.observedRank;
  const source = observation.sourceURL || '';
  const allowedSource = (observation.collector === 'apple-chart-v1' && source === 'https://rss.applemarketingtools.com/api/v2/us/books/top-paid/100/books.json' && /^https:\/\/books\.apple\.com\//.test(observation.productURL)) ||
    (observation.collector === 'amazon-chart-v1' && source === 'https://www.amazon.com/Best-Sellers-Kindle-Store/zgbs/digital-text' && /^https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}$/.test(observation.productURL));
  return Boolean(!observation.isSample && allowedSource && observation.evidenceLevel === 'VERIFIED_RANKING' && Number.isInteger(rank) && rank! > 0 && rank! <= 100 && age >= 0 && age <= EVIDENCE_MAX_AGE_MS && observation.evidenceExcerpt);
}
export function observationCategory(observation: MarketplaceObservation): string {
  const text = `${observation.category} ${observation.productTitle}`.toLowerCase();
  if (/cook|meal|food|budget living/.test(text)) return 'budget_living';
  if (/health|habit|wellness|psychology|burnout/.test(text)) return 'wellness_habits';
  if (/finance|money|invest|real estate/.test(text)) return 'personal_finance';
  if (/freelance|career|proposal/.test(text)) return 'freelance_career';
  if (/business|productiv|notion|management/.test(text)) return 'productivity_systems';
  return 'other';
}
export function deriveSynchronizedCandidates(observations: MarketplaceObservation[] = [], options?: MarketSyncOptions): TopicCandidate[] {
  const eligible = observations.filter(o => isCurrentMarketEvidence(o) && observationCategory(o) !== 'other')
    .filter(o => !options?.focusMarketplace || options.focusMarketplace === 'ALL' || o.marketplace === options.focusMarketplace)
    .filter(o => !options?.category || options.category === 'ALL' || observationCategory(o) === options.category)
    .filter(o => !options?.searchQuery || `${o.productTitle} ${o.category} ${o.sellerOrAuthor}`.toLowerCase().includes(options.searchQuery.toLowerCase()));
  const groups = new Map<string, MarketplaceObservation[]>();
  for (const obs of eligible) { const category = observationCategory(obs); groups.set(category, [...(groups.get(category) || []), obs]); }
  const candidates: TopicCandidate[] = [...groups.entries()].map(([category, sources]) => {
    const best = [...sources].sort((a,b) => a.observedRank! - b.observedRank!)[0];
    const label = MARKET_CATEGORIES.find(c => c.id === category)?.labelEn || category;
    return { id: `NICHE-${category}`, marketCategory: category, evidenceStatus: 'CURRENT_CHART', title: `${label}: Practical Learning Toolkit`, subtitle: 'Original product concept informed by current marketplace chart observations', targetAudience: `Readers researching ${label.toLowerCase()}; validate the specific buyer with interviews.`, coreProblem: `Identify and validate a specific learning obstacle in ${label.toLowerCase()}.`, bigPromise: 'Learn, practice, and evaluate a clearly scoped skill; outcomes require validation.', suggestedFormat: 'ebook_toolkit', priceTestRange: { test: 9, regular: 19, premium: 29 }, marketEvidenceSummary: sources.map(o => `${o.marketplace}: #${o.observedRank} — ${o.productTitle} (${o.observedAt}; ${o.rankScope})`).join(' · '), competitiveDensity: 'MEDIUM', differentiationAngle: 'Develop original worked examples, cited explanations, and practical exercises; do not reproduce marketplace books.', creationComplexity: 'MODERATE', potentialCompanions: [`${label} practice workbook`, 'Decision worksheet', 'Progress and reflection log'], confidenceRating: 'MEDIUM', opportunityScore: 0, scoreBreakdown: { demandSignal: Math.max(1, 26 - Math.ceil(best.observedRank! / 4)), problemUrgency: 0, competitionEntry: 0, differentiation: 0, creatorFit: 0, audienceReach: 0, digitalFit: 0, costRisk: 0 }, recommendationReason: `${sources.length} current chart observation(s). Only demand is scored; competition, creator fit, pricing and outcome claims are unvalidated. A new concept is not itself a bestseller.`, sourceObservationIds: sources.map(o => o.id) };
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
  const response = await fetch('/api/market/research');
  if (!response.ok) throw new Error('Marketplace research could not be loaded.');
  const data = await response.json();
  const observations: MarketplaceObservation[] = data.observations || [];
  return { observations, candidates: deriveSynchronizedCandidates(observations, options), sources: data.sources || [], checkedAt: data.checkedAt };
}
export function propagateTopicToDownstream(project: DigitalProductProject, selectedTopicId: string, lang: Language = 'en'): DigitalProductProject {
  const candidate = project.marketResearch.topicCandidates.find(c => c.id === selectedTopicId);
  if (!candidate) return project;
  if (project.marketResearch.selectedTopicId === selectedTopicId && project.charter.productTitle === candidate.title) return project;
  const next = structuredClone(BLANK_PROJECT);
  const topics = ['Foundations and learning goals', 'Core concepts and evidence', 'Worked example and guided practice', 'Independent application and review'];
  return {
    ...next, projectId: project.projectId, createdAt: project.createdAt, updatedAt: new Date().toISOString(), name: candidate.title, isBlankProject: false,
    preferences: { ...project.preferences, language: lang === 'en' ? 'English' : '繁體中文' }, aiSettings: project.aiSettings, brand: project.brand,
    marketResearch: { ...project.marketResearch, selectedTopicId },
    intake: { ...project.intake, projectName: candidate.title, productIdea: candidate.title, targetAudience: candidate.targetAudience, problemsSolved: candidate.coreProblem, desiredTransformation: candidate.bigPromise },
    charter: { ...next.charter, productTitle: candidate.title, subtitle: candidate.subtitle, targetAudience: candidate.targetAudience, primaryProblemSolved: candidate.coreProblem, centralPromise: candidate.bigPromise, deliveryFormat: candidate.suggestedFormat, structuralPillars: topics, learningObjectives: topics.map(t => `Apply ${t.toLowerCase()} to ${candidate.marketCategory?.replaceAll('_', ' ')}.`), explicitDisclaimers: ['Educational material; validate source claims and consult qualified professionals where needed.'], isApproved: false },
    outline: topics.map((title,index) => ({ id: `CH-${index+1}`, order: index+1, title: `${candidate.marketCategory?.replaceAll('_', ' ')} — ${title}`, objective: `Understand and apply ${title.toLowerCase()} in ${candidate.marketCategory?.replaceAll('_', ' ')}.`, subtopics: ['Evidence and concepts', 'Worked example', 'Practice and reflection'], targetWordCount: 1200, practicalDeliverable: `${title} worksheet`, mappedReferenceIds: [], exampleScenarios: [], completionMilestone: 'Complete the exercise and compare it with the stated learning objective.', contentMarkdown: '', actualWordCount: 0, isCompleted: false, isLocked: false })),
    workflow: { ...next.workflow, activeStage: 'topic_selection', stageStatuses: { ...next.workflow.stageStatuses, market_research: 'COMPLETED', topic_selection: 'NEEDS_REVIEW', product_charter: 'NEEDS_REVIEW', outline_builder: 'PARTIAL' } },
  };
}
