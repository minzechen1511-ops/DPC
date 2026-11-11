import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { MarketplaceObservation, ReferenceCard } from '../types/project.ts';
import { BLANK_PROJECT, DEMO_PROJECT } from '../data/demoProject.ts';
import { deriveSynchronizedCandidates, isCurrentMarketEvidence, propagateTopicToDownstream } from './marketDiscoveryEngine.ts';
import { approveGate, gateIssues, revokeApprovals } from './gatePolicy.ts';
import { buildLearningBundle } from './learningBundle.ts';
import { compileStyledHtml } from './styledBook.ts';
const now = () => new Date().toISOString();
export function chartFixture(id='1',category='Food & Cooking',rank=3): MarketplaceObservation {
 return {id:`apple-${id}`,marketplace:'Apple Books',category,productTitle:`Test fixture ${category}`,sellerOrAuthor:'Fixture author',productURL:`https://books.apple.com/us/book/id${id}`,currentPrice:0,priceKnown:false,currency:'USD',observedRank:rank,rankScope:'US overall paid chart',productFormat:'Ebook',observedAt:now(),evidenceLevel:'VERIFIED_RANKING',dataLimitations:'Test fixture, not real marketplace data.',collector:'apple-chart-v1',sourceURL:'https://rss.applemarketingtools.com/api/v2/us/books/top-paid/100/books.json',evidenceExcerpt:`Position ${rank}`};
}
const reviewedSource = (): ReferenceCard => ({...structuredClone(DEMO_PROJECT.referenceLibrary.cards[0]),id:'REF-test',verificationQuote:'An exact supporting excerpt retained as a test fixture.',verificationLocator:'Test section, paragraph 1',verifiedAt:now()});
function topicProject() {
 const project=structuredClone(BLANK_PROJECT);
 project.marketResearch.platformEvidence=[chartFixture()];
 project.marketResearch.topicCandidates=deriveSynchronizedCandidates(project.marketResearch.platformEvidence);
 return propagateTopicToDownstream(project,project.marketResearch.topicCandidates[0].id);
}
function completeProject() {
 let project=approveGate(topicProject(),'gateA');
 project.referenceLibrary.cards=[reviewedSource()];
 project=approveGate(project,'gateB');
 for(const chapter of project.outline){chapter.targetWordCount=200;chapter.contentMarkdown=`## Test learning section\n\n${'Documented fixture discussion '.repeat(55)} [REF-test]`;chapter.isCompleted=true;chapter.mappedReferenceIds=['REF-test'];}
 project.resources=[{id:'resource-test',title:'Practice worksheet',category:'WORKSHEET',purpose:'Apply a chapter method',instructions:'Read the chapter and record your work.',fieldsOrColumns:[],sampleEntries:[],completionCriteria:'Compare the result to the chapter goal.',contentMarkdown:'## Practice\n'+ 'Record inputs and evaluate your result. '.repeat(12)}];
 return project;
}
test('only supported, current source provenance can qualify; search pages and stale records cannot',()=>{
 const valid=chartFixture();assert.equal(isCurrentMarketEvidence(valid),true);
 for(const patch of [{isSample:true},{collector:undefined},{sourceURL:'https://example.com'},{evidenceLevel:'SEARCH_RESULT' as const},{observedAt:new Date(Date.now()-49*3600_000).toISOString()},{observedAt:new Date(Date.now()+3600_000).toISOString()},{observedRank:0},{productURL:'https://www.amazon.com/s?k=fixture'}])assert.equal(isCurrentMarketEvidence({...valid,...patch}),false);
});
test('MTRE filters and source IDs pass exactly to original niche proposals without invented candidates',()=>{
 const observations=[chartFixture('1','Food & Cooking',3),chartFixture('2','Business & Management',20),chartFixture('3','Romance',1)];
 const candidates=deriveSynchronizedCandidates(observations);
 assert.equal(candidates.length,2);assert.deepEqual(candidates[0].sourceObservationIds,['apple-1']);
 const before=candidates.find(c=>c.marketCategory==='productivity_systems')!;
 const prioritized=deriveSynchronizedCandidates(observations,{prioritizedObservationId:'apple-2'});
 assert.equal(prioritized[0].marketCategory,'productivity_systems');assert.deepEqual(prioritized[0].scoreBreakdown,before.scoreBreakdown);
 assert.equal(deriveSynchronizedCandidates(observations,{focusMarketplace:'Etsy'}).length,0);
 assert.equal(deriveSynchronizedCandidates(observations,{category:'budget_living'}).length,1);
 assert.equal(deriveSynchronizedCandidates(observations,{searchQuery:'no matching phrase'}).length,0);
});
test('topic propagation never manufactures research, completed prose or approvals',()=>{
 const project=topicProject();
 assert.equal(project.referenceLibrary.cards.length,0);assert.equal(project.resources.length,0);
 assert.ok(project.outline.every(ch=>!ch.contentMarkdown&&!ch.isCompleted));
 for(const gate of Object.values(project.workflow.gates))assert.equal(gate.isApproved,false);
 assert.equal(project.charter.isApproved,false);
});
test('A → B → C enforces evidence, substantive chapters and resources; editing revokes downstream approvals',()=>{
 let project=topicProject();
 assert.equal(approveGate(project,'gateB').workflow.gates.gateB.isApproved,false);
 project=approveGate(project,'gateA');assert.equal(project.workflow.gates.gateA.isApproved,true);
 assert.ok(gateIssues(project,'gateB').some(issue=>issue.includes('supporting excerpt')));
 project=completeProject();assert.deepEqual(gateIssues(project,'gateC'),[]);
 project=approveGate(project,'gateC');assert.equal(project.workflow.gates.gateC.isApproved,true);
 const edited=revokeApprovals(project,'gateC');assert.equal(edited.workflow.gates.gateA.isApproved,true);assert.equal(edited.workflow.gates.gateB.isApproved,true);assert.equal(edited.workflow.gates.gateC.isApproved,false);
 const strategy=revokeApprovals(project,'gateB');assert.equal(strategy.charter.isApproved,false);assert.equal(strategy.workflow.gates.gateC.isApproved,false);
 project.outline[0].contentMarkdown+='\n\nAn uncited new claim.';
 assert.ok(gateIssues(project,'gateC').some(issue=>issue.includes('citations')));
});
test('stale evidence blocks a previously approved buyer bundle and incomplete imports cannot bypass gates',()=>{
 let project=approveGate(completeProject(),'gateC');
 project.marketResearch.platformEvidence[0].observedAt=new Date(Date.now()-49*3600_000).toISOString();
 assert.ok(gateIssues(project,'gateC').some(issue=>issue.includes('48 hours')));
 assert.ok(gateIssues(DEMO_PROJECT,'gateC').length>0);
});
test('offline bundle includes chapter readers, usable worksheets, companions and correct integrity hashes',async()=>{
 const project=approveGate(completeProject(),'gateC');
 project.outline[0].title='=HYPERLINK("https://example.com")';
 const {zip,manifest}=await buildLearningBundle(project);
 for(const path of ['START-HERE.html','book/executive-ebook.html','chapters/chapter-1.html','resources/worksheet-1.html','resources/companion-1.html','resources/learning-progress.csv','research/reading-room.html','research/marketplace-evidence.json','publisher/project-backup.json','review/publication-review.json','manifest.json'])assert.ok(zip.file(path),path);
 assert.equal(JSON.parse(await zip.file('review/publication-review.json')!.async('string')).reviewed,true);
 for(const entry of manifest){const bytes=await zip.file(entry.path)!.async('uint8array');assert.equal(bytes.length,entry.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);}
 assert.match(await zip.file('resources/learning-progress.csv')!.async('string'),/"'=HYPERLINK/);
 const draft=await buildLearningBundle(topicProject());assert.match(await draft.zip.file('START-HERE.html')!.async('string'),/AUTHOR REVIEW EDITION/);
});
test('licensed pictures are embedded beside matching text, cited, credited and included as actual files',async()=>{
 const project=completeProject();
 const image={id:'image-test',dataUri:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=',alt:'Test pixel for layout fixture',caption:'Original test figure',paragraphAnchor:'Documented fixture',sourceReferenceIds:['REF-test'],credit:'Test author',license:'Owned by the author'};
 project.outline[0].illustrations=[image];
 const html=compileStyledHtml(project);assert.match(html,/class="reading-section"/);assert.match(html,/class="supporting-image"/);assert.match(html,/Original test figure/);assert.match(html,/Rights: Owned by the author/);
 const {zip}=await buildLearningBundle(project);assert.ok(zip.file('figures/chapter-1-image-1.png'));
 project.outline[0].illustrations[0].dataUri='data:image/svg+xml;base64,PHN2Zz4=';assert.ok(!compileStyledHtml(project).includes('data:image/svg+xml'));
 assert.ok(gateIssues(project,'gateC').some(issue=>issue.includes('picture rights')));
});

test('substantial Chinese manuscripts are counted as word-like segments rather than one whitespace token', async()=>{
 const {countManuscriptWords}=await import('./textMetrics.ts');
 assert.ok(countManuscriptWords('這是有明確學習目標和引用來源的中文段落。')>5);
 assert.equal(countManuscriptWords('A clear practical learning guide.'),5);
});
