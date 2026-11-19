import type {DigitalProductProject, StageId} from '../types/project.ts';
import {gateAApproved, selectedPositioning, setupStage, usableBrief, usableMap} from './gateAJourney.ts';
import {gateIssues} from './gatePolicy.ts';
import {isRetrievedSource} from './sourceEvidence.ts';
import {computeOutlineStageStatus, getStageMetadata} from './workflowEngine.ts';
import {countManuscriptWords} from './textMetrics.ts';

// Two legacy discovery IDs share one surface. Stored IDs and evidence stay intact.
export const JOURNEY_STAGES: StageId[] = ['topic_selection','project_brief','uvz','transformation_map','reference_library','product_charter','outline_builder','content_studio','workbook_studio','quality_assurance','brand_design','pricing_launch','export_center'];
export const JOURNEY_PHASES = [JOURNEY_STAGES.slice(0,4), JOURNEY_STAGES.slice(4,7), JOURNEY_STAGES.slice(7,10), JOURNEY_STAGES.slice(10)];
export function journeyStage(view: string): StageId | undefined {
  const stage = setupStage(view) as StageId;
  return JOURNEY_STAGES.includes(stage) ? stage : undefined;
}
export function nextJourneyStage(stage: StageId) {return JOURNEY_STAGES[JOURNEY_STAGES.indexOf(journeyStage(stage)!) + 1];}
export function handoffContextCurrent(request:{projectId:string;stage:StageId;navigation:number}, current:{projectId:string;view:string;navigation:number}) {
  return request.projectId===current.projectId && request.stage===journeyStage(current.view) && request.navigation===current.navigation;
}
export function stageName(stage: StageId, lang: 'en'|'zh') {return getStageMetadata(stage,lang)?.title.replace(/^\d+\.\s*/, '') || stage;}

/** Readiness never changes reviews or approvals. Generated suggestions alone cannot finish a gate. */
export function stageRequirements(p: DigitalProductProject, stage: StageId, lang: 'en'|'zh' = 'en'): string[] {
  const text = (en: string, zh: string) => lang === 'en' ? en : zh;
  const need = (valid: boolean, en: string, zh: string) => valid ? [] : [text(en,zh)];
  if (stage === 'topic_selection') return need(gateAApproved(p), 'Select a topic and explicitly approve Gate A above.', '請選擇題材，並在上方明確核准 Gate A。');
  if (!gateAApproved(p)) return [text('Return to Topic Discovery and review Gate A.','請返回題材探索並覆核 Gate A。')];
  switch (stage) {
    case 'project_brief': return need(usableBrief(p),'Accept a brief with an audience, problem, concept and realistic outcome. Creator facts are optional.','請接受含受眾、問題、概念與合理成果的簡報；創作者資料為選填。');
    case 'uvz': return need(Boolean(selectedPositioning(p)) && p.workflow.stageStatuses.uvz !== 'NEEDS_REVIEW','Explicitly choose a current positioning option above.','請在上方明確選擇目前的定位方案。');
    case 'transformation_map': return need(usableMap(p) && p.workflow.stageStatuses.transformation_map !== 'NEEDS_REVIEW','Review Before, Bridge and After, then select a title above.','請覆核 Before、Bridge、After，並在上方選定書名。');
    case 'reference_library': return need(p.referenceLibrary.cards.some(isRetrievedSource),'Retrieve and review at least one source with a matching supporting excerpt. Search results alone are insufficient.','請取回並覆核至少一個具有相符支持摘錄的來源；搜尋結果本身不足以通過。');
    case 'product_charter': return need(p.workflow.gates.gateB.isApproved && !gateIssues(p,'gateB').length,'Explicitly approve Gate B after the source checks above.','請在上方完成來源查核後明確核准 Gate B。');
    case 'quality_assurance': return need(p.workflow.gates.gateC.isApproved && !gateIssues(p,'gateC').length,'Resolve the quality checks and explicitly approve Gate C above.','請完成品質查核，並在上方明確核准 Gate C。');
    case 'export_center': return [];
  }
  if (!p.workflow.gates.gateB.isApproved || gateIssues(p,'gateB').length) return [text('Review and approve the current Product Charter at Gate B.','請覆核目前的產品憲章，並核准 Gate B。')];
  switch(stage) {
    case 'outline_builder': return need(computeOutlineStageStatus(p.outline,p.referenceLibrary.cards) === 'COMPLETED','Complete chapter titles, objectives, subtopics, word budgets and source mappings.','請完成章節標題、目標、子題、字數配置與來源對應。');
    case 'content_studio': return need(p.outline.length > 0 && p.outline.every(ch => ch.isCompleted && countManuscriptWords(ch.contentMarkdown || '') >= Math.max(100, Math.floor(ch.targetWordCount / 2))),'Finish every chapter with substantive content. Passage support is reviewed at Gate C.','請完成每章實質內容；逐段支持將於 Gate C 覆核。');
    case 'workbook_studio': return need(p.resources.some(r => r.contentMarkdown.trim().length > 150 && r.instructions.trim().length > 0),'Save a substantive companion resource with usable instructions.','請儲存包含實質內容與實作說明的伴隨資源。');
    case 'brand_design': return need(Boolean(p.brand.coverBrief.trim() && p.brand.fontBody.trim() && /^#[\da-f]{6}$/i.test(p.brand.primaryHex)),'Save your palette, typography and cover direction.','請儲存色票、字體與封面方向。');
    case 'pricing_launch': return need(p.pricingReport.regularPrice > 0 && Boolean(p.pricingReport.rationale.trim() && p.salesAssets.salesPageHeadline.trim() && p.salesAssets.heroPitch.trim()),'Save a proposed price, its assumptions, a headline and a product pitch. Prices remain validation hypotheses.','請儲存建議價格、假設、主標與產品介紹；價格仍屬待驗證假設。');
    default: return [];
  }
}
export function stageFinished(p: DigitalProductProject, stage: StageId) {
  return p.workflow.stageStatuses[stage] === 'COMPLETED' && !stageRequirements(p,stage).length;
}
export function recommendedJourneyStage(p: DigitalProductProject) {return JOURNEY_STAGES.find(stage => !stageFinished(p,stage)) || 'export_center';}
export function prepareStageHandoff(p: DigitalProductProject, stage: StageId) {
  const destination = nextJourneyStage(stage);
  if (!destination || stageRequirements(p,stage).length) return null;
  // Earlier decisions must be current. No stage completion can manufacture an approval.
  if (JOURNEY_STAGES.slice(0,JOURNEY_STAGES.indexOf(stage)).some(id => !stageFinished(p,id))) return null;
  return {...p, updatedAt:new Date().toISOString(), workflow:{...p.workflow, activeStage:destination,
    stageStatuses:{...p.workflow.stageStatuses,[stage]:'COMPLETED' as const}}};
}

/** A failed save, superseded edit, changed project or manual navigation cannot move the user. */
export async function saveStageHandoff(snapshot: DigitalProductProject, persist: (p:DigitalProductProject)=>Promise<boolean>, isCurrent:()=>boolean) {
  return await persist(snapshot) && isCurrent();
}
export function workflowSaveError(error:unknown, lang:'en'|'zh') {
  let message=error instanceof Error?error.message:String(error || '');
  // Firestore's wrapper can include account metadata. Show the cause, not that payload.
  try {const detail=JSON.parse(message);if(typeof detail.error==='string') message=detail.error;} catch { /* ordinary message */ }
  if (/quota|resource.exhausted/i.test(message)) return lang==='en'
    ? 'Cloud storage has reached its daily write limit. Your draft remains open. Keep this tab open or download a recovery backup, then retry after the quota resets.'
    : '雲端儲存已達每日寫入上限，已保留目前草稿。請保持此分頁開啟或下載復原備份，額度重設後再重試。';
  return message || (lang==='en'?'Cloud saving failed. Keep your draft open and retry.':'雲端儲存失敗，請保留草稿並重試。');
}

export const stageHandoffCopy: Record<'en'|'zh', Record<string,string>> = {
  en:{topic_selection:'Your approved topic and evidence links prefill the brief.',project_brief:'Your audience, problem, outcome and constraints guide three UVZ suggestions.',uvz:'Your chosen positioning guides Before → Bridge → After and title options.',transformation_map:'Your selected title, positioning and intended outcomes guide source research.',reference_library:'Reviewed source records carry into your charter. Gate B remains your decision.',product_charter:'Your approved strategy and reviewed sources guide the chapter outline.',outline_builder:'Chapter goals, word budgets and source mappings carry into writing.',content_studio:'Your manuscript guides the companion tools. Passage reviews remain required.',workbook_studio:'Your manuscript and resources carry into explicit quality review at Gate C.',quality_assurance:'Your approved content continues to Brand Design, then Pricing and Export.',brand_design:'Your saved palette, typography and cover direction carry into packaging.',pricing_launch:'Proposed pricing and launch copy join the bundle. Export still checks current approvals.'},
  zh:{topic_selection:'已核准題材與證據連結會預填簡報。',project_brief:'受眾、問題、成果與限制將用於三個 UVZ 定位建議。',uvz:'所選定位將用於 Before → Bridge → After 與書名選項。',transformation_map:'所選書名、定位與預期成果將指引來源研究。',reference_library:'已覆核來源會帶入產品憲章；Gate B 仍由您決定。',product_charter:'已核准策略與覆核來源將指引章節大綱。',outline_builder:'章節目標、字數配置與來源對應會帶入寫作。',content_studio:'正文將指引伴隨工具製作；逐段覆核仍須完成。',workbook_studio:'正文與資源會帶入 Gate C 明確品質覆核。',quality_assurance:'已核准內容將進入品牌設計，再前往定價與匯出。',brand_design:'已儲存的色票、字體與封面方向會帶入商品組裝。',pricing_launch:'建議價格與上市文案會納入套件；匯出仍會查核目前核准狀態。'},
};
