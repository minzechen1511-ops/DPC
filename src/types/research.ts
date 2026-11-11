export interface ResearchResult {
  id: string;
  provider: 'Crossref' | 'Europe PMC';
  title: string;
  authors: string[];
  publisher: string;
  publicationDate?: string;
  doi?: string;
  sourceURL: string;
  abstract?: string;
  pmcid?: string;
  fullTextURL?: string;
  isRetracted: boolean;
  relevance: { matchedTerms: string[]; query: string };
}
export interface ResearchParagraph { locator: string; text: string }
export interface RetrievedResearchDocument {
  provider: 'Europe PMC' | 'Trusted public page';
  documentId: string;
  title: string;
  canonicalUrl: string;
  authors: string[];
  publisher: string;
  publicationDate?: string;
  doi?: string;
  retrievedAt: string;
  contentHash: string;
  kind: 'full_text' | 'page_text';
  paragraphs: ResearchParagraph[];
  license?: string;
}
export interface RetrievedSourceEvidence {
  authors: string[];
  publisher: string;
  publicationDate?: string;
  doi?: string;
  provider: RetrievedResearchDocument['provider'];
  documentId: string;
  title: string;
  canonicalUrl: string;
  retrievedAt: string;
  contentHash: string;
  kind: RetrievedResearchDocument['kind'];
  excerpt: string;
  locator: string;
}
export interface ReferenceVerificationReport {
  valid: boolean;
  checkedAt: string;
  checks: Array<{ id: string; valid: boolean; message: string; sourceFingerprint: string }>;
}
