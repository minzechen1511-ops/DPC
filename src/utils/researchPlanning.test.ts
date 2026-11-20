import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReferenceLibraryView} from '../components/views/ReferenceLibraryView.tsx';
import {ProductCharterView} from '../components/views/ProductCharterView.tsx';
import {OutlineBuilderView} from '../components/views/OutlineBuilderView.tsx';
import assert from 'node:assert/strict';
import {journeyFixture} from '../../tests/gateAJourneyFixture.ts';
import {accessibleResult, charterFromSetup, outlineFromCharter, publicResearchLead, suggestedPassage, suggestedReferences, suggestedSearch} from './researchPlanning.ts';
import {isRetrievedSource} from './sourceEvidence.ts';
import {checkStagePrerequisites} from './workflowEngine.ts';
import {DEMO_PROJECT} from '../data/demoProject.ts';
import type {ReferenceCard} from '../types/project.ts';
import type {ResearchResult} from '../types/research.ts';

const quote = 'This synthetic paragraph describes a pantry inventory for the fixture recipe worksheet.';
function source(): ReferenceCard {
  const now = new Date().toISOString();
  return {...structuredClone(DEMO_PROJECT.referenceLibrary.cards[0]), author:'',doi:undefined,publicationDate:undefined,chapterRelevance:undefined,id:'TEST-REF',sourceTitle:'Fixture pantry inventory',publisherOrOrg:'Test Publisher',sourceURL:'https://example.gov/pantry',
    verificationQuote:quote,verificationLocator:'Paragraph 2',verifiedAt:now,status:'VERIFIED_FULL_TEXT',
    retrieval:{canonicalUrl:'https://example.gov/pantry',title:'Fixture pantry inventory',publisher:'Test Publisher',authors:[],
      locator:'Paragraph 2',excerpt:quote,contentHash:'a'.repeat(64),retrievedAt:now,kind:'page_text',provider:'Trusted public page',documentId:'example'}};
}
test('guided search uses the project, excludes retractions and metadata-only leads, and suggests only an actual matching paragraph',()=>{
  const p=journeyFixture();
  p.charter.productTitle='Pantry inventory workbook';
  assert.match(suggestedSearch(p),/pantry inventory/);
  assert.equal(publicResearchLead('pantry inventory'),undefined);
  const lead = {pmcid:'PMC123',isRetracted:false,relevance:{matchedTerms:['pantry']}} as ResearchResult;
  assert.equal(accessibleResult([{...lead,isRetracted:true},{...lead,pmcid:undefined},lead]),lead);
  const passage={locator:'Paragraph 2',text:quote};
  assert.equal(suggestedPassage([{locator:'A',text:'Short.'},passage],'pantry inventory'),passage);
  assert.equal(suggestedPassage([passage],'astronomy telescope'),undefined);
});
test('charter defaults preserve user edits and take objectives and reader tools from the actual transformation map',()=>{
  const p=journeyFixture();
  p.charter.productTitle='My edited title';
  p.intake.targetAudience='Home cooks';
  p.transformationMap.afterState.tangibleOutcomes=['Complete a pantry inventory'];
  p.transformationMap.bridgeProcess.keyMilestones=['Audit the pantry inventory','Plan the menu'];
  p.transformationMap.bridgeProcess.practicalTools=['Inventory sheet','Menu planner'];
  const proposal=charterFromSetup(p);
  assert.equal(proposal.productTitle,'My edited title');
  assert.equal(proposal.targetAudience,'Home cooks');
  assert.deepEqual(proposal.learningObjectives,['Complete a pantry inventory']);
  assert.deepEqual(proposal.companionResourcePlan,['Inventory sheet','Menu planner']);
  assert.deepEqual(p.charter.learningObjectives,[]);
  assert.equal(proposal.isApproved,false);
  p.charter.learningObjectives=['Editorial choice'];
  assert.deepEqual(charterFromSetup(p).learningObjectives,['Editorial choice']);
});
test('reading suggestions and charter readiness depend on reviewed excerpts, while an unmatched chapter stays unmapped',()=>{
  const p=journeyFixture();
  p.workflow.gates.gateA.isApproved=true;
  p.referenceLibrary.verifiedCount=30;
  assert.equal(checkStagePrerequisites('product_charter',p).canRun,false);
  const card=source();
  assert.equal(isRetrievedSource(card),true);
  p.referenceLibrary.cards=[card];p.referenceLibrary.verifiedCount=0;
  assert.equal(checkStagePrerequisites('product_charter',p).canRun,true);
  assert.deepEqual(suggestedReferences('pantry inventory',[{...card,status:'NEEDS_REVIEW'}]),[]);
  p.charter.structuralPillars=['Pantry inventory','Kitchen lighting'];
  p.charter.learningObjectives=['Complete a pantry inventory','Position the lamps'];
  p.charter.companionResourcePlan=['Pantry worksheet','Lighting sketch'];
  const chapters=outlineFromCharter(p,'en');
  assert.deepEqual(chapters.map(c=>c.mappedReferenceIds),[['TEST-REF'],[]]);
  assert.equal(chapters[1].practicalDeliverable,'Lighting sketch');
  assert.equal(chapters[0].isCompleted,false);
  assert.equal(card.chapterRelevance,undefined);
  assert.equal(p.workflow.gates.gateB.isApproved,false);
  assert.deepEqual(p.outline,[]);
});

test('the three planning screens offer the guided action, preserve manual controls, and keep an unapproved outline blocked',()=>{
  const project=journeyFixture();
  project.intake.productIdea='Pantry inventory';
  const props={project,setActiveView:()=>{},lang:'en' as const};
  const research=renderToStaticMarkup(React.createElement(ReferenceLibraryView,{...props,onAddSource:()=>{}}));
  assert.match(research,/Find a passage to review/);
  assert.match(research,/Change search terms/);
  assert.match(research,/Save research note/);
  const charter=renderToStaticMarkup(React.createElement(ProductCharterView,{...props,onUpdateCharter:()=>{},onApproveGateB:async()=>false}));
  assert.match(charter,/Recommended product plan/);
  assert.match(charter,/Optional AI refinement/);
  const outline=renderToStaticMarkup(React.createElement(OutlineBuilderView,{...props,onUpdateOutline:()=>{}}));
  assert.match(outline,/disabled=""[^>]*>Use this outline &amp; open Content Studio/);
  assert.match(outline,/Add a chapter manually/);
  assert.equal(project.workflow.gates.gateB.isApproved,false);
});
