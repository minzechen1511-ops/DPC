/**
 * Digital Product Creator 2.0 (V4.0 Full Autopilot & OpenRouter Edition)
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
  automationMode: 'selection_autopilot' | 'manual_review';
  referenceTarget: 8 | 20 | 30;
  autoApproveNonCritical: boolean;
}

export interface MarketplaceObservation {
  id: string;
  marketplace: 'Amazon Kindle' | 'Apple Books' | 'Google Play Books' | 'Kobo' | 'Gumroad' | 'Payhip' | 'Etsy';
  category: string;
  productTitle: string;
  sellerOrAuthor: string;
  productURL: string;
  currentPrice: number;
  currency: string;
  observedRank?: number;
  rankScope?: string;
  reviewCount?: number;
  rating?: number;
  productFormat: string;
  observedAt: string;
  evidenceLevel: 'VERIFIED_RANKING' | 'FEATURED_COLLECTION' | 'SEARCH_RESULT' | 'SELLER_CLAIM' | 'PUBLIC_MARKET_INDEX';
  dataLimitations: string;
}

export interface TopicCandidate {
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
  confidenceRating: 'VERY_HIGH' | 'HIGH' | 'MEDIUM';
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

export interface ChapterOutlineItem {
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
