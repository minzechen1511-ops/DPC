import test from 'node:test';
import assert from 'node:assert/strict';
import { retrievedCardFixture, reviewsFixture, relevanceFixture } from '../../tests/evidenceFixtures.ts';
import { auditChapter, evidencePassages, makeSupportReview, resourceEvidenceDocument } from './citationEvidence.ts';
import { isRetrievedSource } from './sourceEvidence.ts';
import { compileStyledHtml } from './styledBook.ts';
import { DEMO_PROJECT } from '../data/demoProject.ts';
import { gateIssues } from './gatePolicy.ts';

test('a citation to an accessible source does not prove support without an exact passage review',()=>{
 const card=retrievedCardFixture();const document={contentMarkdown:'An alleged factual result. [REF-test]'};
 assert.equal(isRetrievedSource(card),true);assert.equal(auditChapter(document,[card]).cited,0);
 const passage=evidencePassages(document)[0];const reviews=[makeSupportReview(passage,card,'supports','The synthetic excerpt supports this fixture statement as written.')];
 assert.equal(auditChapter({...document,citationReviews:reviews},[card]).cited,1);
 assert.equal(auditChapter({...document,contentMarkdown:'A different asserted factual result. [REF-test]',citationReviews:reviews},[card]).needsReview,1);
});
test('source quote, bibliography and retrieval corrections invalidate previous support decisions',()=>{
 const card=retrievedCardFixture();const document={contentMarkdown:'A fixture claim. [REF-test]',citationReviews:[] as ReturnType<typeof reviewsFixture>};document.citationReviews=reviewsFixture(document,[card]);
 for(const patch of [{sourceTitle:'Unrelated title'},{author:'Invented author'},{publicationDate:'2000'},{doi:'10.9999/another'},{verificationQuote:'An invented excerpt that was not retrieved from the original paper.'},{verificationLocator:'An invented page number'}])assert.equal(auditChapter(document,[{...card,...patch}]).needsReview,1);
 const changed={...card,retrieval:{...card.retrieval!,contentHash:'b'.repeat(64)}};assert.equal(isRetrievedSource(changed),true);assert.equal(auditChapter(document,[changed]).needsReview,1);
});
test('manual verification flags and abstract-only records cannot unlock source validity',()=>{
 const card=retrievedCardFixture();assert.equal(isRetrievedSource({...card,retrieval:undefined}),false);assert.equal(isRetrievedSource({...card,status:'METADATA_ONLY'}),false);assert.equal(isRetrievedSource({...card,retrieval:{...card.retrieval!,kind:'abstract' as any}}),false);
 const project=structuredClone(DEMO_PROJECT);project.referenceLibrary.cards=[{...card,retrieval:undefined}];assert.ok(gateIssues(project,'gateB').some(issue=>issue.includes('manual verification checkbox')));
});
test('a reviewer must explicitly classify original instructions, and unsupported decisions remain blocking',()=>{
 const original={contentMarkdown:'Record your own observations in the worksheet.'};assert.equal(auditChapter(original,[]).needsReview,1);assert.equal(auditChapter({...original,citationReviews:reviewsFixture(original,[],true)},[]).editorial,1);
 const card=retrievedCardFixture();const cited={contentMarkdown:'A disputed assertion. [REF-test]'};const passage=evidencePassages(cited)[0];assert.equal(auditChapter({...cited,citationReviews:[makeSupportReview(passage,card,'unsupported','The excerpt does not substantiate this alleged result.')]},[card]).needsReview,1);
});
test('table header, row values and figure-caption changes invalidate the corresponding evidence review',()=>{
 const card=retrievedCardFixture();const table={contentMarkdown:'## Result\n\n| Group | Cost |\n|---|---|\n| A | 10 [REF-test] |',citationReviews:[] as ReturnType<typeof reviewsFixture>};table.citationReviews=reviewsFixture(table,[card]);assert.equal(auditChapter(table,[card]).needsReview,0);
 assert.equal(auditChapter({...table,contentMarkdown:table.contentMarkdown.replace('Cost','Risk')},[card]).needsReview,1);assert.equal(auditChapter({...table,contentMarkdown:table.contentMarkdown.replace('10','100')},[card]).needsReview,1);
});
test('mapped but uncited sources do not contaminate the e-book bibliography; repeated works share a number',()=>{
 const project=structuredClone(DEMO_PROJECT);const first=retrievedCardFixture('REF-01');const second={...retrievedCardFixture('REF-02'),verificationQuote:first.verificationQuote};const uncited={...retrievedCardFixture('REF-unused'),doi:'10.9999/uncited',sourceTitle:'Uncited mapped source'};
 project.referenceLibrary.cards=[first,second,uncited];project.outline=[{...project.outline[0],contentMarkdown:'One point. [REF-01]\n\nAnother point. [REF-02]',mappedReferenceIds:['REF-01','REF-02','REF-unused']}];project.outline[0].citationReviews=reviewsFixture(project.outline[0],project.referenceLibrary.cards);
 const html=compileStyledHtml(project);assert.equal((html.match(/id="reference-1"/g)||[]).length,1);assert.equal((html.match(/id="reference-2"/g)||[]).length,0);assert.ok(!html.includes('id="reference-3"'));
 assert.match(html,/not automatically cited evidence/);
});

test('e-book support markers match the audit across loose lists and blockquote headings',()=>{
 const project=structuredClone(DEMO_PROJECT);project.referenceLibrary.cards=[retrievedCardFixture('REF-01')];project.outline=[{...project.outline[0],illustrations:[],contentMarkdown:'## Main\n\n- First supported item. [REF-01]\n\n- Second supported item. [REF-01]\n\n> ### Nested quote heading\n>\n> Supported quoted point. [REF-01]\n\nA supported point after the quote. [REF-01]'}];
 project.outline[0].citationReviews=reviewsFixture(project.outline[0],project.referenceLibrary.cards);assert.equal(auditChapter(project.outline[0],project.referenceLibrary.cards).needsReview,0);
 const html=compileStyledHtml(project);assert.ok(!html.includes('Claim-to-source review needed'));assert.ok(!html.includes('Citation needed or explicit editorial review required'));
});
