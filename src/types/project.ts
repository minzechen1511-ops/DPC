import type { RetrievedSourceEvidence } from './research.ts';
/**
 * Digital Product Studio (V4.0 Full Autopilot & OpenRouter Edition)
 * Core Data Models & Schemas
 */

export type StageId =
  | 'market_research'
  | 'topic_selection'
  | 'project_brief'
  | 'uvz'
  | 'transformation_map'
  | 'reference_library'
  | 'product_charter'
  | 'outline_builder'
  | 'content_studio'
  | 'workbook_studio'
  | 'quality_assurance'
  | 'brand_design'
  | 'pricing_launch'
  | 'export_center';

export type StageStatus =
  | 'NOT_STARTED'
  | 'READY'
  | 'QUEUED'
  | 'RUNNING'
  | 'NEEDS_REVIEW'
  | 'PARTIAL'
  | 'COMPLETED'
  | 'PAUSED'
  | 'FAILED'
  | 'BLOCKED';

export type AutomationLevel = 'AUTO' | 'SUGGEST' | 'APPROVAL' | 'MANUAL_OVERRIDE' | 'BLOCKED';

export type ProductFormat =
  | 'ebook_toolkit'
  | 'ebook'
  | 'workbook'
  | 'template_bundle'
  | 'mini_course'
  | 'challenge'
  | 'lead_magnet';

export type MarketRegion = 'US' | 'UK' | 'CA' | 'AU' | 'TW' | 'GLOBAL_EN' | 'CUSTOM';

export interface UserPreferences {
  market: MarketRegion;
  language: string;
  productFormat: ProductFormat;
  automationMode: 'selection_autopilot' | 'manual_review' | 'guided_until_gate';
  referenceTarget: 8 | 20 | 30;
  autoApproveNonCritical: boolean;
}

export type MarketSourceClass =
  | 'primary_marketplace'
  | 'secondary_report'
  | 'supporting_context';

export type MarketAcquisitionMethod =
  | 'public_page_capture'
  | 'live_collector'
  | 'manual_observation'
  | 'file_import';

export type MarketEvidenceType =
  | 'listing_details'
  | 'published_research'
  | 'official_ranking'
  | 'reported_ranking'
  | 'estimate'
  | 'interest_signal'
  | 'search_result'
  | 'featured_collection'
  | 'seller_claim';

export type MarketReviewStatus =
  | 'unverified'
  | 'retrieved_checked'
  | 'manually_reviewed'
  | 'blocked'
  | 'rejected';

export type ResourceCollectionMethod =
  | 'supported_collector'
  | 'manual_review'
  | 'import'
  | 'unavailable';

export type ResourceScopeKind = 'official_chart' | 'published_report' | 'supporting_discovery';

export interface GateAResourceEntry {
  id: string;
  publisher: string;
  resourceName: string;
  originalURL: string;
  resolvedURL?: string;
  scopeKind: ResourceScopeKind;
  purpose: string;
  geography: string;
  categoryCoverage: string;
  formatCoverage: string;
  whatItSupports: string;
  importantLimitations: string;
  accessStatus: 'unchecked' | 'accessible' | 'redirected' | 'blocked' | 'unavailable';
  httpStatus?: number | null;
  lastCheckedAt?: string;
  lastCheckNote?: string;
  collectionMethod: ResourceCollectionMethod;
}

export interface ObservationReviewAssessment {
  establishes: string;
  dateScopeProductMatch: 'exact_match' | 'partial_scope_match' | 'mismatch';
  metricNature: 'observed' | 'reported' | 'estimated';
  limitationsSummary: string;
  liveRetrievalUnavailableDisclosed?: boolean;
  relationship?: 'corroborates' | 'complements' | 'contradicts';
  relationshipRationale?: string;
}

export interface ObservationReviewHistoryEntry {
  timestamp: string;
  status: MarketReviewStatus;
  outcome: 'accepted' | 'qualified' | 'rejected' | 'blocked' | 'invalidated';
  rationale: string;
  evidenceVersionHash: string;
  establishes?: string;
}

export interface MarketplaceObservation {
  evidenceCapture?: { content: string; mediaType: string; sha256: string; retrievedAt: string; sourceURL: string };
  isSample?: boolean;
  priceKnown?: boolean;
  collector?: 'apple-chart-v1' | 'amazon-chart-v1';
  sourceURL?: string;
  evidenceExcerpt?: string;
  id: string;
  marketplace:
    | 'Amazon Kindle'
    | 'Apple Books'
    | 'Google Play Books'
    | 'Kobo'
    | 'Gumroad'
    | 'Whop'
    | 'Payhip'
    | 'Etsy'
    | 'NYT Best Sellers'
    | 'Keepa'
    | 'Google Trends'
    | 'Other Research Source';
  publisher?: string;
  country?: string;
  category: string;
  productTitle: string;
  sellerOrAuthor: string;
  productURL: string;
  currentPrice: number;
  pricingTerms?: string;
  currency: string;
  observedRank?: number;
  rankScope?: string;
  metricName?: string;
  metricValue?: number | string;
  metricUnit?: string;
  reviewCount?: number;
  rating?: number;
  productFormat: string;
  observedAt: string;
  dataAsOfDate?: string;
  publicationDate?: string;
  retrievedAt?: string;
  excerptLocator?: string;
  evidenceAttachmentRef?: string;
  attachmentHash?: string;
  importFileName?: string;
  importRowNumber?: number;
  rawImportedPayload?: Record<string, unknown>;
  collectionMethodology?: string;
  keepaProvenance?: 'historical' | 'estimated' | 'subscription_only' | 'authorized_api' | 'not_applicable';
  evidenceChainId?: string;
  evidenceVersionHash?: string;
  reviewedEvidenceHash?: string;
  sourceClass?: MarketSourceClass;
  acquisitionMethod?: MarketAcquisitionMethod;
  evidenceType?: MarketEvidenceType;
  reviewStatus?: MarketReviewStatus;
  reviewOutcome?: 'accepted' | 'qualified' | 'rejected' | 'blocked';
  reviewAssessment?: ObservationReviewAssessment;
  reviewHistory?: ObservationReviewHistoryEntry[];
  reviewerRationale?: string;
  reviewedAt?: string;
  evidenceLevel: 'VERIFIED_RANKING' | 'FEATURED_COLLECTION' | 'SEARCH_RESULT' | 'SELLER_CLAIM' | 'PUBLIC_MARKET_INDEX' | 'PUBLIC_LISTING';
  dataLimitations: string;
}

export type CandidateEvidenceLabel =
  | 'CURRENT_OFFICIAL_CHART'
  | 'MANUALLY_REVIEWED_PRIMARY'
  | 'SECONDARY_REPORTED_RANKING'
  | 'SUPPORTING_INTEREST_SIGNAL'
  | 'OPPORTUNITY_HYPOTHESIS'
  | 'NEEDS_VALIDATION'
  | 'SAMPLE_DATA';

export interface ScoreFactorAssessment {
  key: keyof TopicCandidate['scoreBreakdown'];
  label: string;
  score: number | null;
  maxScore: number;
  status: 'MEASURED' | 'REVIEWED_SIGNAL' | 'UNMEASURED';
  basis: string;
  uncertainty: string;
}

export interface CandidateEvidenceStrength {
  overallLevel: 'STRONG_CURRENT' | 'MODERATE_REVIEWED' | 'LIMITED_SUPPORTING' | 'INSUFFICIENT';
  collectorVerifiedCount: number;
  manuallyReviewedCount: number;
  independentChainCount: number;
  credibilityBasis: string;
  methodologySummary: string;
  recencySummary: string;
  scopeFitSummary: string;
  corroborationSummary: string;
}

export interface CandidateProductSuitability {
  readinessStatus: 'HYPOTHESIS_NEEDS_VALIDATION' | 'PARTIALLY_ASSESSED';
  audienceProblemClarity: string;
  differentiationHypothesis: string;
  creatorFitStatus: 'UNMEASURED' | 'USER_DEFINED';
  creatorFitNote: string;
  productionEffort: 'LOW' | 'MODERATE' | 'COMPLEX';
  nextValidationStep: string;
}

export type MultiSourceStatus =
  | 'REVIEWED_MULTI_SOURCE'
  | 'SINGLE_SOURCE'
  | 'NEEDS_EVIDENCE';

export type EvidenceRelationshipKind =
  | 'corroborates'
  | 'complements'
  | 'contradicts'
  | 'duplicates_dataset'
  | 'excluded'
  | 'standalone';

export interface CandidateEvidenceComparisonRow {
  observationId: string;
  productTitle: string;
  marketplace: string;
  sourceURL: string;
  dataAsOfDate: string;
  evidenceChainId: string;
  sourceClass: MarketSourceClass;
  acquisitionMethod: MarketAcquisitionMethod;
  evidenceType: MarketEvidenceType;
  reviewState: 'valid_live' | 'valid_manual' | 'stale_review' | 'unverified' | 'rejected_blocked';
  supports: string;
  cannotEstablish: string;
  relationship: EvidenceRelationshipKind;
  sharesDatasetWithIds: string[];
  conflictOrLimitationNote: string;
}

export interface AudienceTopicHypothesis {
  id: string;
  audienceLabel: string;
  productAngle: string;
  evidenceBasis: string;
  uncertainty: string;
}

export interface TopicCandidate {
  marketCategory?: string;
  evidenceStatus?: 'CURRENT_CHART' | 'REVIEWED_FALLBACK' | 'SAMPLE';
  evidenceLabel?: CandidateEvidenceLabel;
  multiSourceStatus?: MultiSourceStatus;
  evidenceComparison?: CandidateEvidenceComparisonRow[];
  audienceTopicHypotheses?: AudienceTopicHypothesis[];
  selectedAudienceHypothesisId?: string;
  evidenceStrength?: CandidateEvidenceStrength;
  productSuitability?: CandidateProductSuitability;
  factorAssessments?: ScoreFactorAssessment[];
  independentChainIds?: string[];
  researchGapNote?: string;
  id: string;
  title: string;
  subtitle: string;
  targetAudience: string;
  coreProblem: string;
  bigPromise: string;
  suggestedFormat: ProductFormat;
  priceTestRange: {
    test: number;
    regular: number;
    premium: number;
  };
  marketEvidenceSummary: string;
  competitiveDensity: 'LOW' | 'MEDIUM' | 'HIGH';
  differentiationAngle: string;
  creationComplexity: 'LOW' | 'MODERATE' | 'COMPLEX';
  potentialCompanions: string[];
  confidenceRating: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  opportunityScore: number; // 0-100 calculated by rubric
  scoreBreakdown: {
    demandSignal: number; // max 25
    problemUrgency: number; // max 15
    competitionEntry: number; // max 15
    differentiation: number; // max 15
    creatorFit: number; // max 10
    audienceReach: number; // max 10
    digitalFit: number; // max 5
    costRisk: number; // max 5
  };
  badge?: 'BEST_OVERALL' | 'EASIEST_TO_LAUNCH' | 'HIGH_DIFFERENTIATION';
  recommendationReason: string;
  sourceObservationIds: string[];
}

export interface ProjectIntake {
  projectName: string; // 1
  creatorName: string; // 2
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'; // 3
  relevantExperience: string; // 4
  expertise: string; // 5
  interests: string; // 6
  targetAudience: string; // 7
  problemsSolved: string; // 8
  productIdea: string; // 9
  desiredTransformation: string; // 10
  brandStyleAndVoice: {
    personality: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    typographyDirection: string;
    writingVoice: string;
    emotionalPositioning: string;
    stylesToAvoid: string;
  }; // 11
  constraintsAndExclusions: {
    productBoundaries: string;
    accuracyStandards: string;
    safetyRules: string;
    copyrightAttribution: string;
    claimsToAvoid: string;
    verificationRequirements: string;
  }; // 12
  recommendedPrice: {
    introductoryTest: number;
    regular: number;
    premiumBundle: number;
    currency: string;
    rationale: string;
    validationMethod: string;
  }; // 13
}

export interface UVZAnalysis {
  buyerProblems: string[];
  potentialSolutions: string[];
  creatorExpertiseFit: string;
  commercialFeasibility: string;
  differentiationOpportunities: string[];
  positioningOptions: Array<{
    id: string;
    name: string;
    angle: string;
    targetPersona: string;
    promise: string;
    pros: string;
    risks: string;
    isRecommended: boolean;
  }>;
  selectedOptionId: string;
}

export interface TransformationMap {
  beforeState: {
    currentPains: string[];
    anxietiesAndFrustrations: string[];
    flawedAlternatives: string[];
    dailyDrainCost: string;
  };
  bridgeProcess: {
    coreMethodology: string;
    signatureFrameworkName: string;
    keyMilestones: string[];
    practicalTools: string[];
    obstacleBypasses: string[];
  };
  afterState: {
    tangibleOutcomes: string[];
    acquiredCapabilities: string[];
    completedDeliverables: string[];
    measurableMetrics: string[];
  };
  titleOptions: Array<{
    id: string;
    title: string;
    subtitle: string;
    rationale: string;
    isRecommended: boolean;
  }>;
  selectedTitleId: string;
  bigPromise: string;
  uniqueSellingProposition: string;
}

export type ReferenceVerificationStatus =
  | 'VERIFIED_FULL_TEXT'
  | 'VERIFIED_PARTIAL_TEXT'
  | 'METADATA_ONLY'
  | 'RETRIEVAL_BLOCKED'
  | 'REJECTED_DUPLICATE'
  | 'REJECTED_LOW_QUALITY'
  | 'NEEDS_REVIEW';

export interface ReferenceCard {
  doi?: string;
  retrieval?: RetrievedSourceEvidence;
  chapterRelevance?: Array<{ chapterId: string; rationale: string; reviewedAt: string; chapterFingerprint: string }>;
  verificationQuote?: string;
  verificationLocator?: string;
  verifiedAt?: string;
  id: string; // e.g. "REF-01"
  // Mandatory 7-Part Structure:
  title: string; // A. Title
  description: string; // B. Description
  contentOutline: string[]; // C. Content Outline
  practicalFramework: {
    name: string;
    editorialOrigin: string; // Note: editorial synthesis, not author's proprietary claim
    actionSteps: string[];
  }; // D. Practical Framework
  researchSummary: string; // E. Research Summary
  editorialNotes: {
    targetChapters: string[];
    exerciseSuggestions: string[];
    worksheetIntegration: string;
    verificationNotes: string;
  }; // F. Editorial Notes
  brandGuidelines: {
    toneApplication: string;
    visualDirection: string;
    audienceFraming: string;
  }; // G. Brand Guidelines

  // Provenance & Quality Metadata:
  sourceTitle: string;
  publisherOrOrg: string;
  author?: string;
  sourceURL: string;
  publicationDate?: string;
  retrievedAt: string;
  status: ReferenceVerificationStatus;
  qualityScore: number; // 0-100
  pillars: string[];
  supportedClaims: string[];
  rightsNotes: string;
}

export interface ProductCharter {
  productTitle: string;
  subtitle: string;
  targetAudience: string;
  primaryProblemSolved: string;
  centralPromise: string;
  explicitDisclaimers: string[]; // Non-guaranteed assertions
  signatureFramework: string;
  deliveryFormat: ProductFormat;
  contentDepthTarget: 'COMPACT' | 'STANDARD' | 'EXTENDED';
  targetWordCount: number;
  learningObjectives: string[];
  structuralPillars: string[];
  companionResourcePlan: string[];
  brandVoiceSummary: string;
  pricingStrategy: string;
  evidenceStandards: string;
  qualityAcceptanceCriteria: string[];
  isApproved: boolean;
  approvedAt?: string;
}

export interface ChapterIllustration {
  id: string;
  dataUri: string;
  alt: string;
  caption: string;
  paragraphAnchor: string;
  sourceReferenceIds: string[];
  credit: string;
  license: string;
}
export interface CitationReview {
  passageKey: string;
  referenceId?: string;
  relationship: 'supports' | 'qualifies' | 'unsupported' | 'editorial';
  rationale: string;
  reviewedAt: string;
  sourceFingerprint?: string;
}
export interface ChapterOutlineItem {
  citationReviews?: CitationReview[];
  illustrations?: ChapterIllustration[];
  id: string;
  order: number;
  title: string;
  objective: string;
  subtopics: string[];
  targetWordCount: number;
  practicalDeliverable: string;
  mappedReferenceIds: string[];
  exampleScenarios: string[];
  completionMilestone: string;
  contentMarkdown?: string;
  actualWordCount?: number;
  isCompleted: boolean;
  isLocked: boolean;
  lastGeneratedAt?: string;
  usedModel?: string;
}

export interface ProductBible {
  productTitle: string;
  audiencePersona: string;
  centralPromise: string;
  signatureFramework: string;
  brandVoiceKeywords: string[];
  keyTerminology: Record<string, string>;
  introducedConcepts: string[];
  usedExamples: string[];
  activeReferenceMap: Record<string, string[]>;
  unresolvedClaims: string[];
  continuityHandoffNotes: string[];
}

export interface ResourceAsset {
  citationReviews?: CitationReview[];
  id: string;
  title: string;
  category: 'WORKSHEET' | 'CHECKLIST' | 'TRACKER' | 'CALENDAR' | 'TEMPLATE' | 'GUIDE';
  purpose: string;
  instructions: string;
  fieldsOrColumns: string[];
  sampleEntries: string[];
  completionCriteria: string;
  associatedChapterId?: string;
  contentMarkdown: string;
}

export interface QualityIssue {
  id: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  category:
    | 'EVIDENCE_GROUNDING'
    | 'FACTUAL_CLAIM'
    | 'STRUCTURE_COMPLETENESS'
    | 'PRACTICAL_UTILITY'
    | 'SAFETY_DISCLAIMER'
    | 'AUDIENCE_FIT'
    | 'REPETITION'
    | 'COPYRIGHT';
  location: string;
  description: string;
  suggestedFix: string;
  isResolved: boolean;
  autoFixAvailable: boolean;
}

export interface QualityReport {
  overallStatus: 'DRAFT_COMPLETE' | 'NEEDS_VERIFICATION' | 'NEEDS_USER_REVIEW' | 'READY_FOR_EXPORT' | 'PUBLICATION_REVIEWED';
  overallScore: number; // 0-100
  issues: QualityIssue[];
  checksPassed: string[];
  disclaimersVerified: boolean;
  actualWordCount: number;
  verifiedReferenceCount: number;
  reviewedAt: string;
}

export interface SalesAssets {
  salesPageHeadline: string;
  salesPageSubheadline: string;
  heroPitch: string;
  productDescriptionBullets: string[];
  targetBuyerNotice: string;
  notForBuyerNotice: string;
  faqList: Array<{ question: string; answer: string }>;
  leadMagnetConcept: {
    title: string;
    hook: string;
    format: string;
    deliverable: string;
  };
  emailLaunchSequence: Array<{
    day: number;
    subject: string;
    preview: string;
    bodyMarkdown: string;
    goal: string;
  }>;
  socialPosts: Array<{ platform: string; postText: string }>;
  thirtyDayLaunchPlan: Array<{ week: number; focus: string; tasks: string[] }>;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing?: {
    prompt: string | number;
    completion: string | number;
  };
  isFree?: boolean;
}

export type AIProviderType = 'openrouter' | 'gemini' | 'openai' | 'claude';

export interface AISettings {
  provider: AIProviderType;
  apiKey: string; // active provider key
  baseUrl: string;
  defaultModel: string;
  freeOnly: boolean;
  allowPaidFallback: boolean;
  maxSpendPerRequest: number;
  dailyBudget: number;
  projectBudget: number;
  apiKeys: {
    openrouter: string;
    gemini: string;
    openai: string;
    claude: string;
  };
  providerModels: {
    openrouter: string;
    gemini: string;
    openai: string;
    claude: string;
  };
  stageModels: Partial<Record<StageId, string>>;
  fallbackModels: string[];
  usageStats: {
    totalRequests: number;
    totalTokens: number;
    estimatedCostUsd: number;
    lastRequestAt?: string;
    rateLimitCooldownUntil?: string;
  };
}

export interface WorkflowGate {
  gate: 'GATE_A_TOPIC' | 'GATE_B_STRATEGY' | 'GATE_C_QUALITY';
  isApproved: boolean;
  approvedAt?: string;
  approvedFingerprint?: string;
  requiredFor: StageId[];
}

export interface DigitalProductProject {
  schemaVersion: '4.0';
  projectId: string;
  name: string;
  isBlankProject?: boolean;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
  workflow: {
    activeStage: StageId;
    stageStatuses: Record<StageId, StageStatus>;
    gates: {
      gateA: WorkflowGate;
      gateB: WorkflowGate;
      gateC: WorkflowGate;
    };
    isAutopilotRunning: boolean;
    lastCheckpoint: string;
  };
  marketResearch: {
    researchDate: string;
    resourceDirectory?: GateAResourceEntry[];
    sourceReports?: Array<{ marketplace: string; url: string; status: string; message: string; checkedAt: string; count: number }>;
    platformEvidence: MarketplaceObservation[];
    topicCandidates: TopicCandidate[];
    selectedTopicId: string | null;
    confidence: 'HIGH' | 'MEDIUM' | 'LIMITED';
  };
  intake: ProjectIntake;
  uvz: UVZAnalysis;
  transformationMap: TransformationMap;
  referenceLibrary: {
    targetCount: number;
    verifiedCount: number;
    cards: ReferenceCard[];
    coveragePillars: Record<string, number>;
    status: StageStatus;
  };
  charter: ProductCharter;
  outline: ChapterOutlineItem[];
  productBible: ProductBible;
  resources: ResourceAsset[];
  qualityReport: QualityReport;
  brand: {
    profileName: string;
    primaryHex: string;
    secondaryHex: string;
    accentHex: string;
    neutralBgHex: string;
    fontDisplay: string;
    fontBody: string;
    coverBrief: string;
    manuscriptLayoutNotes: string;
  };
  pricingReport: {
    regularPrice: number;
    introductoryPrice: number;
    bundlePrice: number;
    currency: string;
    marketComparisonSummary: string;
    rationale: string;
  };
  salesAssets: SalesAssets;
  aiSettings: AISettings;
}
