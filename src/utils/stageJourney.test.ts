import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {journeyFixture} from '../../tests/gateAJourneyFixture.ts';
import {approveGate,revokeApprovals} from './gatePolicy.ts';
import {selectJourneyTopic} from './gateAJourney.ts';
import {sanitizeProjectForStorage} from './projectStorage.ts';
import {JOURNEY_STAGES, handoffContextCurrent, journeyStage,nextJourneyStage,prepareStageHandoff,recommendedJourneyStage,saveStageHandoff,stageRequirements} from './stageJourney.ts';
import {WorkflowJourney,WorkflowHandoff} from '../components/WorkflowJourney.tsx';

function approvedTopic() {
  const p=journeyFixture();
  return approveGate(selectJourneyTopic(p,p.marketResearch.topicCandidates[0].id,'en'),'gateA');
}
test('one visible journey links all stages, including QA → brand → pricing → export, with legacy discovery compatibility',()=>{
  assert.equal(JOURNEY_STAGES.length,13);
  assert.equal(journeyStage('market_research'),'topic_selection');
  for(let i=0;i<JOURNEY_STAGES.length-1;i++) assert.equal(nextJourneyStage(JOURNEY_STAGES[i]),JOURNEY_STAGES[i+1]);
  assert.equal(nextJourneyStage('export_center'),undefined);
  assert.equal(journeyStage('ai_settings'),undefined);
});
test('fresh discovery and drafts cannot silently approve gates, choose positioning, or advance through missing decisions',()=>{
  const p=journeyFixture();
  assert.equal(recommendedJourneyStage(p),'topic_selection');
  assert.equal(prepareStageHandoff(p,'topic_selection'),null);
  const approved=approvedTopic();
  assert.equal(prepareStageHandoff(approved,'topic_selection')?.workflow.activeStage,'project_brief');
  assert.equal(prepareStageHandoff(approved,'uvz'),null);
  assert.equal(prepareStageHandoff(approved,'product_charter'),null);
  assert.equal(prepareStageHandoff(approved,'quality_assurance'),null);
  assert.equal(approved.workflow.gates.gateB.isApproved,false);
  assert.equal(approved.workflow.gates.gateC.isApproved,false);
});
test('acceptance carries context and persists selections; revising upstream decisions blocks the old route',()=>{
  let p=approvedTopic();
  p.workflow.stageStatuses.project_brief='COMPLETED';
  p.uvz.positioningOptions=[{id:'TEST-ONLY-position',name:'Test positioning',targetPersona:'Test audience',promise:'A realistic test outcome',angle:'Test angle',rationale:'Test rationale'} as any];
  assert.equal(prepareStageHandoff(p,'uvz'),null);
  p.uvz.selectedOptionId='TEST-ONLY-position';
  p.workflow.stageStatuses.uvz='COMPLETED';
  const next=prepareStageHandoff(p,'uvz')!;
  assert.equal(next.workflow.activeStage,'transformation_map');
  const restored=sanitizeProjectForStorage(JSON.parse(JSON.stringify(next)));
  assert.equal(restored.uvz.selectedOptionId,'TEST-ONLY-position');
  assert.equal(restored.workflow.activeStage,'transformation_map');
  for(const key of ['creatorName','relevantExperience','expertise','interests'] as const) assert.equal(restored.intake[key],p.intake[key]);
  assert.equal(prepareStageHandoff(revokeApprovals(p,'gateA'),'uvz'),null);
  assert.equal(prepareStageHandoff({...p,workflow:{...p.workflow,stageStatuses:{...p.workflow.stageStatuses,uvz:'NEEDS_REVIEW'}}},'uvz'),null);
});
test('source search metadata and an unreviewed note cannot complete Reference Library',()=>{
  const p=approvedTopic();
  p.referenceLibrary.cards=[{id:'TEST-ONLY-ref',status:'SEARCH_RESULT_ONLY'} as any];
  assert.ok(stageRequirements(p,'reference_library').length);
  assert.equal(prepareStageHandoff(p,'reference_library'),null);
});
test('a handoff waits for the real save, retains the stage on failure and permits retry',async()=>{
  const p=prepareStageHandoff(approvedTopic(),'topic_selection')!;
  let release!:(value:boolean)=>void;
  let moved=false;
  const attempt=saveStageHandoff(p,()=>new Promise(resolve=>{release=resolve;}),()=>true).then(result=>{moved=result;});
  await Promise.resolve(); assert.equal(moved,false);
  release(false);await attempt;assert.equal(moved,false);
  assert.equal(await saveStageHandoff(p,async()=>true,()=>true),true);
});
test('navigation, a different project, or edits during a save suppress the late handoff',async()=>{
  const p=prepareStageHandoff(approvedTopic(),'topic_selection')!;
  const request={projectId:p.projectId,stage:'topic_selection' as const,navigation:2};
  const context={projectId:p.projectId,view:'topic_selection',navigation:2};
  assert.equal(handoffContextCurrent(request,context),true);
  assert.equal(handoffContextCurrent(request,{...context,view:'ai_settings'}),false);
  assert.equal(handoffContextCurrent(request,{...context,projectId:'another-project'}),false);
  assert.equal(handoffContextCurrent(request,{...context,navigation:3}),false);
  for(const reason of ['manual navigation','changed project','newer edits']) {
    let current=true;
    const result=await saveStageHandoff(p,async()=>{current=false;return true;},()=>current);
    assert.equal(result,false,reason);
  }
});
test('journey and finish controls expose real blocked/current states and bilingual handoffs without a timer',()=>{
  const p=journeyFixture();
  for(const lang of ['en','zh'] as const) {
    const nav=renderToStaticMarkup(React.createElement(WorkflowJourney,{project:p,current:'topic_selection',lang,onNavigate:()=>{}}));
    assert.match(nav,/aria-current="step"/);assert.match(nav,/disabled=""/);assert.match(nav,/grid-cols-2 lg:grid-cols-4/);
    const footer=renderToStaticMarkup(React.createElement(WorkflowHandoff,{project:p,current:'topic_selection',lang,onNavigate:()=>{},onFinish:()=>{},onRetry:()=>{},busy:false,error:''}));
    assert.match(footer,/disabled=""/);
    assert.match(footer,lang==='en'?/Gates and evidence reviews/:/關卡與證據覆核/);
  }
});
