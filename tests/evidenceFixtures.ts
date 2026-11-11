import { sourceFingerprint } from '../src/utils/sourceEvidence.ts';
import type { ReferenceVerificationReport } from '../src/types/research.ts';
// Synthetic test data only. This is not a publication or verified real-world source.
import type { ReferenceCard, ChapterOutlineItem } from '../src/types/project.ts';
import { evidencePassages, makeSupportReview, type EvidenceDocument } from '../src/utils/citationEvidence.ts';
import { chapterResearchFingerprint } from '../src/utils/sourceEvidence.ts';
export function retrievedCardFixture(id='REF-test'): ReferenceCard {
 const now=new Date().toISOString();
 const title='Synthetic fixture research on learning';
 const quote='Synthetic fixture excerpt for testing claim review, including example values 10 and 20. This is not scientific advice.';
 return {id,title,sourceTitle:title,author:'Test Author',publisherOrOrg:'Fixture Journal',publicationDate:'2026',doi:'10.9999/fixture',sourceURL:'https://europepmc.org/articles/PMC123',retrievedAt:now,status:'VERIFIED_FULL_TEXT',qualityScore:0,description:'Synthetic source fixture',researchSummary:'Synthetic source fixture for testing evidence retention and review workflows.',contentOutline:['Fixture claim'],supportedClaims:['Synthetic fixture claim'],verificationQuote:quote,verificationLocator:'Test section · p1',verifiedAt:now,practicalFramework:{name:'Test practice',editorialOrigin:'Test synthesis',actionSteps:[]},editorialNotes:{targetChapters:[],exerciseSuggestions:[],worksheetIntegration:'',verificationNotes:'Test fixture only.'},brandGuidelines:{toneApplication:'Factual fixture',visualDirection:'None',audienceFraming:'Tests'},pillars:[],rightsNotes:'Synthetic test data',retrieval:{provider:'Europe PMC',documentId:'PMC123',title,canonicalUrl:'https://europepmc.org/articles/PMC123',authors:['Test Author'],publisher:'Fixture Journal',publicationDate:'2026',doi:'10.9999/fixture',retrievedAt:now,contentHash:'a'.repeat(64),kind:'full_text',excerpt:quote,locator:'Test section · p1'}};
}
export function relevanceFixture(card: ReferenceCard, chapters: ChapterOutlineItem[]) {
 card.chapterRelevance=chapters.map(ch=>({chapterId:ch.id,rationale:'Synthetic test author reviewed relevance to this chapter objective.',reviewedAt:new Date().toISOString(),chapterFingerprint:chapterResearchFingerprint(ch)}));return card;
}
export function reviewsFixture(document: EvidenceDocument, cards: ReferenceCard[], includeEditorial=false) {
 return evidencePassages(document).flatMap(passage=>passage.referenceIds.length?passage.referenceIds.flatMap(id=>{const card=cards.find(c=>c.id===id);return card?[makeSupportReview(passage,card,'supports','Synthetic test decision comparing this passage with the retained fixture excerpt.')]:[];}):includeEditorial?[{passageKey:passage.key,relationship:'editorial' as const,rationale:'Original synthetic exercise instructions, with no empirical claims.',reviewedAt:new Date().toISOString()}]:[]);
}

export const sourceCheckFixture = (cards: ReferenceCard[]): ReferenceVerificationReport => ({valid:true,checkedAt:new Date().toISOString(),checks:cards.map(card=>({id:card.id,valid:true,message:'Synthetic source-check fixture only.',sourceFingerprint:sourceFingerprint(card)}))});
