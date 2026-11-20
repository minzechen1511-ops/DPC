import type {DigitalProductProject, ChapterOutlineItem, ProductCharter, ReferenceCard} from '../types/project.ts';
import type {ResearchParagraph, ResearchResult} from '../types/research.ts';
import {isRetrievedSource} from './sourceEvidence.ts';
import type {Language} from './i18n.ts';

const filler = new Set('with this that from your their have will using into after before learn create make understanding toolkit template printable workbook practical method guide step complete recommended starter system clarity solution product examples reader chapter learning and the for how are use'.split(' '));
function terms(text: string) {
  const segments = new Intl.Segmenter(undefined, {granularity:'word'}).segment(text.toLowerCase());
  return [...new Set(Array.from(segments).filter(s => s.isWordLike).map(s => s.segment)
    .filter(word => !filler.has(word) && (/\p{Script=Han}/u.test(word) ? word.length >= 2 : word.length >= 3) && !/^\d+$/.test(word)))];
}
export function suggestedSearch(project: DigitalProductProject) {
  const title = project.charter.productTitle || project.intake.productIdea || project.name;
  const keywords = terms(title + ' ' + project.intake.problemsSolved);
  if (keywords.includes('cashflow') && keywords.includes('debt')) return 'cash flow spending budget debt';
  return keywords.slice(0, 5).join(' ');
}
export function publicResearchLead(query: string) {
  // A discovery link only. The backend must still retrieve matching source text at runtime.
  return /\b(debt|paycheck|budgeting|cashflow|cash flow)\b|債務|現金流/i.test(query)
    ? 'https://www.consumerfinance.gov/owning-a-home/prepare/assess-your-spending/' : undefined;
}
export function accessibleResult(results: ResearchResult[]) {
  return results.filter(record => !record.isRetracted && (record.pmcid || record.fullTextURL) && record.relevance.matchedTerms.length)
    .sort((a,b) => b.relevance.matchedTerms.length - a.relevance.matchedTerms.length)[0];
}
function overlap(text: string, keywords: string[]) {
  const words = new Set(terms(text));
  return keywords.filter(term => words.has(term)).length;
}
export function suggestedPassage(paragraphs: ResearchParagraph[], query: string) {
  const keywords = terms(query);
  return paragraphs.map(p => ({p, score:overlap(p.text, keywords)})).filter(x => x.p.text.trim().length >= 40 && x.score > 0)
    .sort((a,b) => b.score - a.score)[0]?.p;
}
export function charterFromSetup(project: DigitalProductProject): ProductCharter {
  const {charter, intake, transformationMap:map} = project;
  const title = map.titleOptions.find(t => t.id === map.selectedTitleId);
  return {...charter,
    productTitle:charter.productTitle || title?.title || intake.productIdea,
    subtitle:charter.subtitle || title?.subtitle || '',
    targetAudience:charter.targetAudience || intake.targetAudience,
    primaryProblemSolved:charter.primaryProblemSolved || intake.problemsSolved,
    centralPromise:charter.centralPromise || map.bigPromise || intake.desiredTransformation,
    signatureFramework:charter.signatureFramework || map.bridgeProcess.signatureFrameworkName,
    learningObjectives:charter.learningObjectives.length ? charter.learningObjectives : map.afterState.tangibleOutcomes.filter(Boolean),
    structuralPillars:charter.structuralPillars.length ? charter.structuralPillars : map.bridgeProcess.keyMilestones.filter(Boolean),
    companionResourcePlan:charter.companionResourcePlan.length ? charter.companionResourcePlan : map.bridgeProcess.practicalTools.filter(Boolean),
  };
}
// At planning time these are reading suggestions, never passage support or approved chapter relevance.
export function suggestedReferences(objective: string, cards: ReferenceCard[]) {
  const keywords = terms(objective);
  return cards.filter(isRetrievedSource).map(card => ({
    id:card.id, score:overlap(card.sourceTitle + ' ' + card.verificationQuote, keywords)
  })).filter(item => item.score >= 2).sort((a,b) => b.score-a.score).slice(0,2).map(item => item.id);
}
export function outlineFromCharter(project: DigitalProductProject, lang: Language): ChapterOutlineItem[] {
  const charter = project.charter;
  const steps = [...new Set((charter.structuralPillars.length ? charter.structuralPillars : charter.learningObjectives).map(s=>s.trim()).filter(Boolean))];
  return steps.map((title,i) => {
    const objective = charter.learningObjectives[i] || title;
    const tool = charter.companionResourcePlan[i] || (lang === 'en' ? `Practice sheet · ${title}` : `實作單 · ${title}`);
    return {id:`CH-${String(i+1).padStart(2,'0')}`, order:i+1,title,objective,
      subtopics: lang === 'en' ? [`Worked example · ${title}`, `Guided practice · ${tool}`, `Check your result · ${objective}`]
        : [`範例 · ${title}`, `動手做 · ${tool}`, `檢查成果 · ${objective}`],
      practicalDeliverable:tool, targetWordCount:Math.max(100,Math.round((charter.targetWordCount || 3000)/steps.length)),
      mappedReferenceIds:suggestedReferences(title + ' ' + objective, project.referenceLibrary.cards),
      exampleScenarios:[], completionMilestone:objective, isCompleted:false, isLocked:false};
  });
}
