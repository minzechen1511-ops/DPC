import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {journeyFixture} from '../../tests/gateAJourneyFixture.ts';
import {approveGate,revokeApprovals} from './gatePolicy.ts';
import {selectJourneyTopic} from './gateAJourney.ts';
import {sanitizeProjectForStorage} from './projectStorage.ts';
import {chapterDraftReady, updateChapterDraft, firstUnfinishedPrerequisite, JOURNEY_STAGES, handoffContextCurrent, journeyStage,nextJourneyStage,prepareStageHandoff,recommendedJourneyStage,saveStageHandoff,stageRequirements,workflowSaveError,StageHandoffRunner,markLaterStagesForReview,journeyStepState,nextActionableStage,preserveChapterDraftsOnOutlineEdit} from './stageJourney.ts';
import {WorkflowJourney,WorkflowHandoff} from '../components/WorkflowJourney.tsx';
import {getStageMetadata} from './workflowEngine.ts';
import {translations} from './i18n.ts';

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
test('visible metadata and translated navigation use one uninterrupted 13-step sequence',()=>{
  const navKeys=['navTopicSelection','navProjectBrief','navUvz','navTransformationMap','navReferenceLibrary','navProductCharter','navOutlineBuilder','navContentStudio','navWorkbookStudio','navQualityAssurance','navBrandDesign','navPricingLaunch','navExportCenter'];
  for(const lang of ['en','zh'] as const) JOURNEY_STAGES.forEach((stage,index)=>{
    assert.ok(getStageMetadata(stage,lang).title.startsWith(`${index+1}. `));
    assert.ok((translations[lang] as any)[navKeys[index]].startsWith(`${index+1}. `));
  });
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
  for(const key of ['creatorName','experienceLevel','relevantExperience','expertise','interests'] as const) assert.equal(restored.intake[key],'');
  assert.equal(prepareStageHandoff(revokeApprovals(p,'gateA'),'uvz'),null);
  assert.equal(prepareStageHandoff({...p,workflow:{...p.workflow,stageStatuses:{...p.workflow.stageStatuses,uvz:'NEEDS_REVIEW'}}},'uvz'),null);
});
test('source search metadata and an unreviewed note cannot complete Reference Library',()=>{
  const p=approvedTopic();
  p.referenceLibrary.cards=[{id:'TEST-ONLY-ref',status:'SEARCH_RESULT_ONLY'} as any];
  assert.ok(stageRequirements(p,'reference_library').length);
  assert.equal(prepareStageHandoff(p,'reference_library'),null);
});
test('cloud quota errors expose recovery guidance without embedded account metadata',()=>{
  const error=new Error(JSON.stringify({error:'Quota limit exceeded',authInfo:{email:'TEST-ONLY@example.invalid'},path:'private/test-only'}));
  for(const lang of ['en','zh'] as const) {
    const text=workflowSaveError(error,lang);
    assert.doesNotMatch(text,/authInfo|email|private|TEST-ONLY/);
    assert.match(text,lang==='en'?/daily write limit.*recovery backup/:/每日寫入上限/);
  }
  assert.equal(workflowSaveError(new Error(JSON.stringify({error:'Permission denied',authInfo:{token:'TEST'}})),'en'),'Permission denied');
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
test('a pending handoff cannot save or navigate twice and a failed attempt releases the runner for retry',async()=>{
  const runner=new StageHandoffRunner();
  const p=prepareStageHandoff(approvedTopic(),'topic_selection')!;
  let release!:(saved:boolean)=>void;
  let writes=0;
  const persist=()=>{writes++;return new Promise<boolean>(resolve=>{release=resolve;});};
  const first=runner.run(p,persist,()=>true);
  assert.equal(runner.busy,true);
  assert.equal(await runner.run(p,persist,()=>true),false);
  assert.equal(writes,1);
  release(false);assert.equal(await first,false);assert.equal(runner.busy,false);
  assert.equal(await runner.run(p,async()=>true,()=>true),true);
  assert.equal(runner.busy,false);
});
test('upstream edits preserve downstream drafts while marking completed stages for explicit review',()=>{
  const p=approvedTopic();
  p.workflow.stageStatuses.project_brief='COMPLETED';
  p.workflow.stageStatuses.uvz='COMPLETED';
  p.workflow.stageStatuses.content_studio='COMPLETED';
  p.outline=[{id:'TEST-ONLY-chapter',contentMarkdown:'Retained manuscript fixture'} as any];
  const changed=markLaterStagesForReview(revokeApprovals(p,'gateB'),'project_brief');
  assert.equal(changed.workflow.stageStatuses.uvz,'NEEDS_REVIEW');
  assert.equal(changed.workflow.stageStatuses.content_studio,'NEEDS_REVIEW');
  assert.equal(journeyStepState(changed,'content_studio'),'needs_review');
  assert.equal(changed.outline[0].contentMarkdown,p.outline[0].contentMarkdown);
  assert.equal(changed.workflow.gates.gateB.isApproved,false);
  assert.equal(changed.workflow.gates.gateC.isApproved,false);
  assert.equal(changed.workflow.stageStatuses.brand_design,p.workflow.stageStatuses.brand_design);
});
test('editing chapter objectives preserves manuscript text but removes stale completion',()=>{
  const old={id:'TEST-ONLY-ch',title:'Test chapter',objective:'Original objective',subtopics:['Original step'],targetWordCount:200,mappedReferenceIds:[],contentMarkdown:'Test-only manuscript to retain',isCompleted:true} as any;
  const [edited]=preserveChapterDraftsOnOutlineEdit([old],[{...old,objective:'Revised objective',contentMarkdown:''}]);
  assert.equal(edited.contentMarkdown,old.contentMarkdown);assert.equal(edited.isCompleted,false);
  assert.equal(preserveChapterDraftsOnOutlineEdit([old],[{...old}])[0].isCompleted,true);
});
test('revisiting an unchanged decision continues to the next incomplete step rather than repeating completed setup',()=>{
  const p=approvedTopic();
  p.workflow.stageStatuses.project_brief='COMPLETED';
  p.uvz.positioningOptions=[{id:'TEST-ONLY-option'} as any];p.uvz.selectedOptionId='TEST-ONLY-option';p.workflow.stageStatuses.uvz='COMPLETED';
  p.transformationMap.beforeState.currentPains=['Test-only pain'];
  p.transformationMap.bridgeProcess.keyMilestones=['Test-only action'];
  p.transformationMap.afterState.tangibleOutcomes=['Test-only outcome'];
  p.transformationMap.titleOptions=[{id:'TEST-ONLY-title',title:'Test-only title'} as any];p.transformationMap.selectedTitleId='TEST-ONLY-title';p.workflow.stageStatuses.transformation_map='COMPLETED';
  assert.equal(nextActionableStage(p,'project_brief'),'reference_library');
  assert.equal(prepareStageHandoff(p,'project_brief')?.workflow.activeStage,'reference_library');
  p.workflow.stageStatuses.transformation_map='NEEDS_REVIEW';
  assert.equal(nextActionableStage(p,'project_brief'),'transformation_map');
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

test('batch handoff uses the accumulated chapters, including an undersized legacy draft on retry', () => {
  const p = approvedTopic();
  p.outline = ['one', 'two'].map(id => ({id, title:id, targetWordCount:240, contentMarkdown:'', isCompleted:false} as any));
  const full = 'word '.repeat(120);
  const first = updateChapterDraft(p, 'one', full, 120);
  assert.equal(first.workflow.stageStatuses.content_studio, 'PARTIAL');
  const partial = updateChapterDraft(first, 'two', 'word '.repeat(110), 110);
  assert.equal(partial.outline[1].isCompleted, false);
  assert.equal(chapterDraftReady({...partial.outline[1], isCompleted:true}), false);
  assert.equal(partial.workflow.stageStatuses.content_studio, 'PARTIAL');
  const complete = updateChapterDraft(partial, 'two', full, 120);
  assert.equal(complete.workflow.stageStatuses.content_studio, 'COMPLETED');
  assert.equal(complete.qualityReport.actualWordCount, 240);
  assert.equal(complete.workflow.gates.gateC.isApproved, false);
  assert.equal(updateChapterDraft(complete, 'one', full, 120), complete);
  assert.equal(updateChapterDraft(complete, 'missing', full, 120), complete);
});

test('editing a completed manuscript reopens dependent work and preserves the other chapters', () => {
  const p = approvedTopic();
  const full = 'word '.repeat(100);
  p.outline = ['one','two'].map(id => ({id,targetWordCount:160,contentMarkdown:full,isCompleted:true,actualWordCount:100} as any));
  p.workflow.stageStatuses.workbook_studio = 'COMPLETED';
  p.workflow.gates.gateC.isApproved = true;
  const revised = updateChapterDraft(p, 'two', 'Short draft', 2);
  assert.equal(revised.workflow.stageStatuses.content_studio, 'PARTIAL');
  assert.equal(revised.workflow.stageStatuses.workbook_studio, 'NEEDS_REVIEW');
  assert.equal(revised.workflow.gates.gateC.isApproved, false);
  assert.equal(revised.outline[0], p.outline[0]);
});

test('the journey shows the saved handoff destination or a direct return to its first unresolved decision', () => {
  const p = approvedTopic();
  const render = (view: string) => renderToStaticMarkup(React.createElement(WorkflowJourney,{project:p,current:view,lang:'en',onNavigate:()=>{}}));
  assert.equal(firstUnfinishedPrerequisite(p, 'project_brief'), undefined);
  assert.match(render('project_brief'), /Step 2 of 13/);
  assert.match(render('project_brief'), /Opens after saving/);
  assert.equal(firstUnfinishedPrerequisite(p, 'reference_library'), 'project_brief');
  const blocked = render('reference_library');
  assert.match(blocked, /Finish first.*Recommended Project Brief/);
  assert.doesNotMatch(blocked, /Opens after saving/);
});
