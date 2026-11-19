import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { journeyFixture } from '../../tests/gateAJourneyFixture.ts';
import { GateAJourneyNav } from '../components/GateAJourneyNav.tsx';
import { gateAJourney, gateAApproved, selectJourneyTopic, usableBrief, GUIDED_GENERATION_AVAILABLE, generationError } from './gateAJourney.ts';
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
  assert.equal(gateAJourney(initial).next, 'market_research');
  assert.deepEqual(gateAJourney(initial).available, [true,false,false,false,false]);
  assert.equal(approveGate(initial,'gateA').workflow.gates.gateA.isApproved,false);
  const collected = journeyFixture();
  assert.equal(gateAJourney(collected).next,'topic_selection');
  collected.marketResearch.platformEvidence[0].isSample = true;
  assert.equal(gateAJourney(collected).next,'market_research');
});

test('selection and explicit approval are separate; prefill preserves creator unknowns and existing product work', () => {
  const before = journeyFixture();
  before.outline = [{id:'KEEP', title:'Existing manuscript', contentMarkdown:'Preserve authored work'} as any];
  const selected = selectJourneyTopic(before,before.marketResearch.topicCandidates[0].id,'en');
  assert.equal(selected.workflow.gates.gateA.isApproved,false);
  assert.deepEqual(selected.outline,before.outline);
  const approved = approveGate(selected,'gateA');
  assert.equal(gateAApproved(approved),true);
  assert.equal(gateAJourney(approved).next,'project_brief');
  assert.equal(usableBrief(approved),true);
  for (const field of ['creatorName','expertise','relevantExperience','experienceLevel'] as const) assert.equal(approved.intake[field],'');
  assert.equal(approved.workflow.gates.gateB.isApproved,false);
  assert.equal(approved.workflow.gates.gateC.isApproved,false);
});

test('optional brief polish cannot manufacture creator credentials or experience', () => {
  const project = approvedFixture();
  const polished = parseBriefSynthesisResponse(JSON.stringify({creatorName:'Invented person',expertise:'Fake credential',relevantExperience:'20 years',experienceLevel:'EXPERT',problemsSolved:'A refined hypothesis'}),project.intake);
  assert.equal(polished.creatorName,''); assert.equal(polished.expertise,'');
  assert.equal(polished.relevantExperience,''); assert.equal(polished.experienceLevel,'');
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
  assert.equal(result.selectedOptionId,'UVZ-02');
  assert.match(buildUvzSynthesisPrompt(project,'en').userPrompt,/Unknown — do not invent/);
  assert.equal(GUIDED_GENERATION_AVAILABLE,false);
  assert.match(generationError(new Error('Unexpected end of JSON input'),'en'), /retry/);
  assert.match(generationError(new Error('fetch failed'),'zh'), /重試/);
});

test('five-step navigation exposes current, blocked and completed semantics in both languages', () => {
  const initial=journeyFixture(false);
  for (const lang of ['en','zh'] as const) {
    const html=renderToStaticMarkup(React.createElement(GateAJourneyNav,{project:initial,current:'market_research',onNavigate:()=>{},lang}));
    assert.equal((html.match(/<li>/g)||[]).length,5);
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
