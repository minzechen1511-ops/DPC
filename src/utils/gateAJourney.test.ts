import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { journeyFixture } from '../../tests/gateAJourneyFixture.ts';
import { GateAJourneyNav } from '../components/GateAJourneyNav.tsx';
import { MarketIntelligenceView } from '../components/views/MarketIntelligenceView.tsx';
import { UVZView } from '../components/views/UVZView.tsx';
import { TransformationMapView } from '../components/views/TransformationMapView.tsx';
import { ProjectBriefView } from '../components/views/ProjectBriefView.tsx';
import { parseImportedObservations, applyManualReviewDecision, SAMPLE_IMPORT_CSV_TEMPLATE } from './manualEvidenceReview.ts';
import { deriveSynchronizedCandidates } from './marketDiscoveryEngine.ts';
import { gateAJourney, gateAApproved, selectJourneyTopic, usableBrief, GUIDED_GENERATION_AVAILABLE, generationError, discoveryAction, setupStage, mapDraftReady, usableMap } from './gateAJourney.ts';
import { approveGate, revokeApprovals } from './gatePolicy.ts';
import { parseBriefSynthesisResponse } from './stageSynthesis.ts';
import { parseUvzSynthesisResponse, buildUvzSynthesisPrompt, parseTransformationSynthesisResponse, buildTransformationSynthesisPrompt } from './strategySynthesis.ts';
import { sanitizeProjectForStorage } from './projectStorage.ts';
import { checkStagePrerequisites } from './workflowEngine.ts';

function approvedFixture() {
  const initial = journeyFixture();
  assert.ok(initial.marketResearch.topicCandidates.length);
  const selected = selectJourneyTopic(initial, initial.marketResearch.topicCandidates[0].id, 'en');
  assert.equal(selected.workflow.gates.gateA.isApproved, false);
  return approveGate(selected, 'gateA');
}

test('fresh journey scans first; samples and failed/unavailable collection never unlock topic approval', () => {
  const initial = journeyFixture(false);
  assert.equal(gateAJourney(initial).next, 'topic_selection');
  assert.deepEqual(gateAJourney(initial).available, [true,false,false,false]);
  assert.equal(approveGate(initial,'gateA').workflow.gates.gateA.isApproved,false);
  assert.equal(discoveryAction(initial), 'scan');
  assert.equal(checkStagePrerequisites('topic_selection', initial).canRun, true);
  assert.equal(setupStage('market_research'), 'topic_selection');
  const collected = journeyFixture();
  assert.equal(gateAJourney(collected).next,'topic_selection');
  assert.equal(discoveryAction(collected), 'choose');
  collected.marketResearch.platformEvidence[0].isSample = true;
  assert.equal(gateAJourney(collected).next,'topic_selection');
});

test('selection and explicit approval are separate; prefill preserves creator unknowns and existing product work', () => {
  const before = journeyFixture();
  before.outline = [{id:'KEEP', title:'Existing manuscript', contentMarkdown:'Preserve authored work'} as any];
  const selected = selectJourneyTopic(before,before.marketResearch.topicCandidates[0].id,'en');
  assert.equal(selected.workflow.gates.gateA.isApproved,false);
  assert.deepEqual(selected.outline,before.outline);
  assert.equal(discoveryAction(selected), 'approve');
  const approved = approveGate(selected,'gateA');
  assert.equal(gateAApproved(approved),true);
  assert.equal(discoveryAction(approved), 'continue');
  assert.equal(gateAJourney(approved).next,'project_brief');
  assert.equal(usableBrief(approved),true);
  for (const field of ['creatorName','expertise','relevantExperience','experienceLevel'] as const) assert.equal(approved.intake[field],'');
  assert.equal(approved.workflow.gates.gateB.isApproved,false);
  assert.equal(approved.workflow.gates.gateC.isApproved,false);
  approved.intake.productIdea='My edited concept';
  assert.equal(selectJourneyTopic(approved, approved.marketResearch.selectedTopicId!, 'en'), approved);
  assert.equal(approved.intake.productIdea,'My edited concept');
});

test('Topic Discovery renders scan status, source tools and selectable recommendations on one screen', () => {
  const project=journeyFixture();
  project.marketResearch.sourceReports=[{marketplace:'Amazon Kindle',url:'https://www.amazon.com/Best-Sellers-Kindle-Store/zgbs/digital-text',status:'blocked',message:'Synthetic access challenge',checkedAt:new Date().toISOString(),count:0}];
  const html=renderToStaticMarkup(React.createElement(MarketIntelligenceView,{
    project, setActiveView:()=>{}, onRefreshResearch:async()=>{}, lang:'en',
  }));
  assert.match(html, /<h1[^>]*>Topic Discovery<\/h1>/);
  assert.match(html, /Market scan status/);
  assert.match(html, /Partial \/ unavailable collection/);
  assert.match(html, /Amazon Kindle: blocked/);
  assert.match(html, /Chart\/report signal/);
  assert.match(html, /discovery-recommendations/);
  assert.match(html, /Select This Niche/);
  assert.match(html, /Sources, evidence review &amp; advanced research/);
  assert.match(html, /Manual Evidence Review/);
  assert.equal((html.match(/id="discovery-primary-action"/g)||[]).length, 1);
});

test('manual import fallback stays unverified until an explicit evidence review, then still requires Gate A approval', () => {
  // Explicit synthetic contract input; not actual market research.
  const project=journeyFixture(false);
  const result=parseImportedObservations(SAMPLE_IMPORT_CSV_TEMPLATE, 'TEST-ONLY-import.csv');
  assert.ok(result.imported.length);
  const imported=result.imported[0];
  assert.equal(imported.reviewStatus,'unverified');
  project.marketResearch.platformEvidence=[imported];
  project.marketResearch.topicCandidates=deriveSynchronizedCandidates([imported]);
  assert.equal(discoveryAction(project),'scan');
  assert.equal(approveGate(project,'gateA').workflow.gates.gateA.isApproved,false);
  const reviewed=applyManualReviewDecision(imported,{
    status:'manually_reviewed', inspectedConfirmed:true,
    rationale:'Synthetic contract review: inspect the attached dated report, retain the reported scope and limitations; no collector verification is asserted.',
  }).observation!;
  assert.ok(reviewed);
  assert.equal(reviewed.acquisitionMethod,'file_import');
  assert.equal(reviewed.evidenceType,imported.evidenceType);
  assert.notEqual(reviewed.reviewStatus,'retrieved_checked');
  project.marketResearch.platformEvidence=[reviewed];
  project.marketResearch.topicCandidates=deriveSynchronizedCandidates([reviewed]);
  assert.ok(project.marketResearch.topicCandidates.length);
  assert.equal(discoveryAction(project),'choose');
  const selected=selectJourneyTopic(project,project.marketResearch.topicCandidates[0].id,'en');
  assert.equal(selected.workflow.gates.gateA.isApproved,false);
  assert.equal(discoveryAction(selected),'approve');
});

test('brief acceptance is usable with blank creator facts and preserves supplied interests and boundaries', () => {
  const project=approvedFixture();
  const html=renderToStaticMarkup(React.createElement(ProjectBriefView,{
    project, setActiveView:()=>{}, onUpdateIntake:()=>{},lang:'en',
  }));
  assert.match(html, /Continue with this brief/);
  assert.match(html, /Creator knowledge and credibility/);
  assert.match(html, /Unknown creator facts stay blank/);
  assert.match(html, /<details[^>]*><summary/);
  assert.doesNotMatch(html, /Mandatory Fields/);
  const before=journeyFixture();
  before.intake.interests='Actual creator-supplied interest';
  before.intake.experienceLevel='INTERMEDIATE';
  before.intake.constraintsAndExclusions.claimsToAvoid='Preserve my actual editorial restriction';
  const selected=selectJourneyTopic(before,before.marketResearch.topicCandidates[0].id,'en');
  assert.equal(selected.intake.interests,before.intake.interests);
  assert.equal(selected.intake.experienceLevel,before.intake.experienceLevel);
  assert.deepEqual(selected.intake.constraintsAndExclusions,before.intake.constraintsAndExclusions);
});

test('optional brief polish cannot manufacture creator credentials or experience', () => {
  const project = approvedFixture();
  const polished = parseBriefSynthesisResponse(JSON.stringify({creatorName:'Invented person',expertise:'Fake credential',relevantExperience:'20 years',experienceLevel:'EXPERT',interests:'Invented interest',problemsSolved:'A refined hypothesis'}),project.intake);
  assert.equal(polished.creatorName,''); assert.equal(polished.expertise,'');
  assert.equal(polished.relevantExperience,''); assert.equal(polished.experienceLevel,''); assert.equal(polished.interests,'');
});

test('recommended and manual positioning survive storage, feed the map, and cannot silently approve gates', () => {
  let project = approvedFixture();
  project.workflow.stageStatuses.project_brief = 'COMPLETED';
  assert.equal(gateAJourney(project).next,'uvz');
  assert.equal(checkStagePrerequisites('transformation_map',project).canRun,false);
  const options = Array.from({length:3},(_,index)=>({id:`UVZ-${index+1}`,name:`Option ${index+1}`,angle:`Approach ${index+1}`,targetPersona:'Unvalidated audience',promise:'Complete a planning exercise',pros:'Limited scope',risks:'Requires validation',isRecommended:index===1}));
  project.uvz = {...project.uvz,positioningOptions:options,selectedOptionId:options[1].id};
  project.workflow.stageStatuses.uvz = 'COMPLETED';
  assert.equal(gateAJourney(project).next,'transformation_map');
  project = sanitizeProjectForStorage(JSON.parse(JSON.stringify(project)));
  assert.equal(project.uvz.selectedOptionId,options[1].id);
  const prompt = buildTransformationSynthesisPrompt(project,'en');
  assert.match(prompt.userPrompt,/Option 2|Approach 2/);
  project.uvz.positioningOptions.push({...options[0],id:'MANUAL',name:'Creator edited positioning'});
  project.uvz.selectedOptionId='MANUAL';
  assert.match(buildTransformationSynthesisPrompt(project,'en').userPrompt,/Creator edited positioning/);
  assert.equal(project.workflow.gates.gateB.isApproved,false);
  assert.equal(project.workflow.gates.gateC.isApproved,false);
  const revoked = revokeApprovals(project,'gateA');
  assert.equal(gateAJourney(revoked).next,'topic_selection');
});

test('generation failure leaves saved work intact and a valid retry requires three comparable options', () => {
  const project = approvedFixture();
  const before = JSON.stringify(project.uvz);
  assert.throws(()=>parseUvzSynthesisResponse('{"positioningOptions":[]}',project.uvz),/retry/);
  assert.equal(JSON.stringify(project.uvz),before);
  const response={positioningOptions:[1,2,3].map(i=>({name:`Choice ${i}`,angle:`Approach ${i}`,targetPersona:'Hypothesis',promise:'Practice a workflow',isRecommended:i===2}))};
  const result=parseUvzSynthesisResponse(JSON.stringify(response),project.uvz);
  assert.equal(result.positioningOptions.length,3);
  assert.equal(result.selectedOptionId,'');
  assert.equal(result.positioningOptions[1].isRecommended,true);
  assert.match(buildUvzSynthesisPrompt(project,'en').userPrompt,/Unknown — do not invent/);
  assert.equal(GUIDED_GENERATION_AVAILABLE,false);
  assert.match(generationError(new Error('Unexpected end of JSON input'),'en'), /retry/);
  assert.match(generationError(new Error('fetch failed'),'zh'), /重試/);
});

test('four-step navigation exposes current, blocked and completed semantics in both languages', () => {
  const initial=journeyFixture(false);
  for (const lang of ['en','zh'] as const) {
    const html=renderToStaticMarkup(React.createElement(GateAJourneyNav,{project:initial,current:'market_research',onNavigate:()=>{},lang}));
    assert.equal((html.match(/<li>/g)||[]).length,4);
    assert.match(html,/aria-current="step"/);
    assert.match(html,/disabled/);
    assert.match(html,lang==='en'?/Blocked/:/尚未開放/);
  }
});

test('completed transformation and selected title survive refresh and hand off to Reference Library', () => {
  const project=approvedFixture();
  project.workflow.stageStatuses.project_brief='COMPLETED';
  project.uvz.positioningOptions=[{id:'MANUAL',name:'Manual scope',angle:'One planning workflow',targetPersona:'Hypothesis audience',promise:'Document one plan',pros:'Small scope',risks:'Unvalidated',isRecommended:false}];
  project.uvz.selectedOptionId='MANUAL';
  project.workflow.stageStatuses.uvz='COMPLETED';
  project.transformationMap=parseTransformationSynthesisResponse(JSON.stringify({
    beforeState:{currentPains:['Scattered planning']},
    bridgeProcess:{keyMilestones:['Record baseline','Draft a plan','Review assumptions']},
    afterState:{tangibleOutcomes:['One documented plan']},
    titleOptions:[{title:'Planning Workbook',subtitle:'A practice guide',rationale:'Aligned to selected scope',isRecommended:true}],
  }),project.transformationMap);
  assert.equal(project.transformationMap.selectedTitleId,'');
  assert.equal(mapDraftReady(project),true);
  assert.equal(usableMap(project),false);
  project.workflow.stageStatuses.transformation_map='PARTIAL';
  assert.equal(gateAJourney(project).next,'transformation_map');
  const draftHtml=renderToStaticMarkup(React.createElement(TransformationMapView,{project,setActiveView:()=>{},onSelectTitle:()=>{},onUpdateTransformationMap:()=>{},lang:'en'}));
  assert.match(draftHtml,/Use suggested title &amp; continue/);
  // Explicit creator acceptance, independent of generation.
  project.transformationMap.selectedTitleId=project.transformationMap.titleOptions[0].id;
  project.workflow.stageStatuses.transformation_map='COMPLETED';
  const restored=sanitizeProjectForStorage(JSON.parse(JSON.stringify(project)));
  assert.equal(gateAJourney(restored).next,'reference_library');
  assert.equal(restored.transformationMap.titleOptions.find(title=>title.id===restored.transformationMap.selectedTitleId)?.title,'Planning Workbook');
  assert.equal(restored.workflow.gates.gateB.isApproved,false);
  assert.equal(restored.workflow.gates.gateC.isApproved,false);
});

test('failure and interrupted scan states preserve evidence across storage and permit a new attempt', () => {
  const project=journeyFixture();
  const original=structuredClone(project.marketResearch.platformEvidence);
  project.marketResearch.scanState='error';
  project.marketResearch.lastScanError='Source request unavailable';
  let restored=sanitizeProjectForStorage(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.marketResearch.lastScanError,'Source request unavailable');
  const material = (observations: typeof original) => observations.map(item => [item.id,item.productURL,item.sourceURL,item.evidenceExcerpt,item.dataAsOfDate,item.retrievedAt,item.observedRank,item.dataLimitations]);
  assert.deepEqual(material(restored.marketResearch.platformEvidence),material(original));
  restored.marketResearch.scanState='running';
  restored=sanitizeProjectForStorage(JSON.parse(JSON.stringify(restored)));
  assert.equal(restored.marketResearch.scanState,'running');
  restored.marketResearch.scanState='complete';
  restored.marketResearch.lastScanError='';
  assert.equal(gateAJourney(restored).next,'topic_selection');
});

test('upstream changes expose old positioning and map as drafts, without changing stored decisions or gates', () => {
  const project=approvedFixture();
  project.uvz.positioningOptions=[{id:'OLD',name:'Old option',angle:'Old scope',targetPersona:'Hypothesis',promise:'Draft plan',pros:'Limited',risks:'Unvalidated',isRecommended:true}];
  project.transformationMap.titleOptions=[{id:'OLD',title:'Old title',subtitle:'Old scope',rationale:'Draft',isRecommended:true}];
  project.workflow.stageStatuses.uvz='NEEDS_REVIEW';
  project.workflow.stageStatuses.transformation_map='NEEDS_REVIEW';
  const before=JSON.stringify(project);
  const uvz=renderToStaticMarkup(React.createElement(UVZView,{project,setActiveView:()=>{},onSelectOption:()=>{},onUpdateUvz:()=>{},lang:'en'}));
  const map=renderToStaticMarkup(React.createElement(TransformationMapView,{project,setActiveView:()=>{},onSelectTitle:()=>{},onUpdateTransformationMap:()=>{},lang:'en'}));
  assert.match(uvz,/positioning options are older drafts/);
  assert.match(map,/map below is an older draft/);
  assert.match(map,/disabled[^>]*>.*?Generate 3 Title Ideas Only/s);
  assert.equal(JSON.stringify(project),before);
  assert.equal(project.workflow.gates.gateB.isApproved,false);
  assert.equal(project.workflow.gates.gateC.isApproved,false);
});

test('a partial map response cannot reuse old pillars and silently make a stale draft current', () => {
  const project=approvedFixture();
  project.transformationMap.beforeState.currentPains=['Old pain'];
  project.transformationMap.bridgeProcess.keyMilestones=['Old milestone'];
  project.transformationMap.afterState.tangibleOutcomes=['Old outcome'];
  const before=JSON.stringify(project.transformationMap);
  assert.throws(()=>parseTransformationSynthesisResponse(JSON.stringify({titleOptions:[{title:'New title'}]}),project.transformationMap),/Existing draft retained; retry/);
  assert.equal(JSON.stringify(project.transformationMap),before);
});
