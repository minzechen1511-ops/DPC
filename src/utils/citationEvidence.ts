import { Marked, type Token, type Tokens } from 'marked';
import type { ChapterOutlineItem, CitationReview, ReferenceCard, ResourceAsset } from '../types/project.ts';
import { isRetrievedSource, normalizeEvidenceText, sourceFingerprint } from './sourceEvidence.ts';
export type EvidenceDocument = Pick<ChapterOutlineItem,'contentMarkdown'|'citationReviews'|'illustrations'>;
export interface EvidencePassage { key: string; kind: string; heading: string; text: string; raw: string; referenceIds: string[] }
export const citationIds = (text: string) => [...text.replace(/`+[^`]*`+/g,'').replace(/<!--[\s\S]*?-->/g,'').matchAll(/\[(REF-[\w-]+(?:\s*[,;]\s*REF-[\w-]+)*)\]/g)].flatMap(match=>match[1].split(/\s*[,;]\s*/));
export function evidencePlainText(text: string): string {
 return normalizeEvidenceText(text.replace(/\[(REF-[\w-]+(?:\s*[,;]\s*REF-[\w-]+)*)\]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[*_`]/g,'').replace(/^\s*(?:[-+*>]|\d+\.)\s+/gm,''));
}
export function evidencePassage(raw: string, kind='paragraph', heading='', explicitIds?: string[]): EvidencePassage {
 const text=evidencePlainText(raw);const referenceIds=[...new Set(explicitIds || citationIds(raw))];
 return {raw,text,kind,heading,key:JSON.stringify([kind,evidencePlainText(heading),text,referenceIds]),referenceIds};
}
export function evidencePassages(document: EvidenceDocument): EvidencePassage[] {
 const parser=new Marked(); const result:EvidencePassage[]=[];
 const add=(raw:string,kind:string,heading:string)=>{const passage=evidencePassage(raw,kind,heading);if(passage.text)result.push(passage);};
 const visit=(tokens:Token[],initialHeading='')=>{
  let heading=initialHeading;
  for(const token of tokens){
   if(token.type==='heading'){heading=(token as Tokens.Heading).text;continue;}
   if(token.type==='paragraph'){add(token.raw,'paragraph',heading);continue;}
   if(token.type==='html'){add(token.raw,'html',heading);continue;}
   if(token.type==='blockquote'){visit((token as Tokens.Blockquote).tokens,heading);continue;}
   if(token.type==='list'){
    for(const item of (token as Tokens.List).items){add(item.tokens.filter(t=>t.type!=='list').map(t=>t.raw).join(''),'list-item',heading);for(const nested of item.tokens.filter(t=>t.type==='list'))visit([nested],heading);}
    continue;
   }
   if(token.type==='table'){
    const table=token as Tokens.Table; const header=table.header.map(cell=>cell.text).join(' | ');
    for(const row of table.rows){const raw=row.map(cell=>cell.text).join(' | ');const passage=evidencePassage(`${header}\n${raw}`,'table-row',heading,citationIds(raw));if(passage.text)result.push(passage);}
   }
  }
 };
 visit(parser.lexer(document.contentMarkdown || ''));
 for(const image of document.illustrations || [])result.push(evidencePassage(image.caption,'figure-caption',image.id,image.sourceReferenceIds));
 return result;
}
export function assessPassage(passage: EvidencePassage, document: EvidenceDocument, cards: ReferenceCard[]): {valid:boolean;editorial:boolean;issues:string[]} {
 const reviews=document.citationReviews || [];
 const editorial=reviews.find(review=>review.passageKey===passage.key&&review.relationship==='editorial'&&!review.referenceId&&review.rationale.trim().length>=20&&Boolean(review.reviewedAt));
 if(!passage.referenceIds.length)return {valid:Boolean(editorial),editorial:Boolean(editorial),issues:editorial?[]:['A factual passage needs a source citation; original instructions or examples need an explicit editorial review.']};
 const issues:string[]=[];
 for(const id of passage.referenceIds){
  const card=cards.find(source=>source.id===id);
  if(!card){issues.push(`Unknown source ${id}.`);continue;}
  if(!isRetrievedSource(card)){issues.push(`${id}: retrieved text, matching bibliography and exact excerpt are required.`);continue;}
  const review=reviews.find(item=>item.passageKey===passage.key&&item.referenceId===id);
  if(!review||!['supports','qualifies'].includes(review.relationship)||review.rationale.trim().length<20||!review.reviewedAt||review.sourceFingerprint!==sourceFingerprint(card))issues.push(`${id}: review whether its exact excerpt supports this specific passage; prior reviews expire when the passage or source changes.`);
 }
 return {valid:!issues.length,editorial:false,issues};
}
export interface EvidenceAudit { passages:number; cited:number; editorial:number; reviewed:number; needsReview:number; unresolvedIds:string[] }
export function auditChapter(document: EvidenceDocument, cards: ReferenceCard[]): EvidenceAudit {
 const passages=evidencePassages(document);const audit:EvidenceAudit={passages:passages.length,cited:0,editorial:0,reviewed:0,needsReview:0,unresolvedIds:[]};
 for(const passage of passages){
  const state=assessPassage(passage,document,cards);
  audit.unresolvedIds.push(...passage.referenceIds.filter(id=>!cards.some(card=>card.id===id)));
  if(state.valid){audit.reviewed++;if(state.editorial)audit.editorial++;else audit.cited++;}else audit.needsReview++;
 }
 audit.unresolvedIds=[...new Set(audit.unresolvedIds)];return audit;
}
export const resourceEvidenceDocument = (resource: ResourceAsset): EvidenceDocument => ({contentMarkdown:`## Resource purpose\n\n${resource.purpose}\n\n## Resource instructions\n\n${resource.instructions}\n\n## Resource content\n\n${resource.contentMarkdown}\n\n## Completion criteria\n\n${resource.completionCriteria}`,citationReviews:resource.citationReviews});
export function makeSupportReview(passage: EvidencePassage, card: ReferenceCard, relationship: CitationReview['relationship'], rationale: string): CitationReview {
 return {passageKey:passage.key,referenceId:card.id,relationship,rationale:rationale.trim(),reviewedAt:new Date().toISOString(),sourceFingerprint:sourceFingerprint(card)};
}
