import type { DigitalProductProject } from '../types/project.ts';
type Gate = 'gateA'|'gateB'|'gateC';
const order: Gate[] = ['gateA','gateB','gateC'];
const canonical = (value:unknown):unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value==='object' ? Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a < b ? -1 : a > b ? 1 : 0).map(([k,v])=>[k,canonical(v)])) : value;

/** Change detector for approval inputs, not a signature or authentication token. */
export function approvalFingerprint(project:DigitalProductProject,gate:Gate):string {
  const {isApproved:_approved,approvedAt:_at,...charter}=project.charter;
  const selected=project.marketResearch.topicCandidates.find(c=>c.id===project.marketResearch.selectedTopicId);
  const a=[project.marketResearch.selectedTopicId,selected?.sourceObservationIds,selected?.selectedAudienceHypothesisId,project.marketResearch.platformEvidence];
  const b=[a,project.intake,project.uvz,project.transformationMap,charter,project.referenceLibrary.cards,project.outline.map(ch=>[ch.id,ch.title,ch.objective,ch.subtopics,ch.mappedReferenceIds,ch.practicalDeliverable,ch.completionMilestone])];
  const c=[b,project.outline,project.resources,project.productBible,project.brand,project.pricingReport,project.salesAssets];
  const raw=JSON.stringify(canonical(gate==='gateA'?a:gate==='gateB'?b:c));
  let h1=0x811c9dc5,h2=0xdeadbeef;
  for(let i=0;i<raw.length;i++){h1=Math.imul(h1^raw.charCodeAt(i),0x01000193);h2=Math.imul(h2^(raw.charCodeAt(i)+i),0x85ebca6b);}
  return `approval-v1-${(h1>>>0).toString(16)}${(h2>>>0).toString(16)}`;
}

/** Persisted API/Firestore writes must invalidate approvals even outside App handlers. */
export function invalidateChangedApprovals(previous:DigitalProductProject,next:DigitalProductProject):DigitalProductProject {
  const changed=order.findIndex(g=>previous.workflow.gates[g].isApproved && approvalFingerprint(previous,g)!==approvalFingerprint(next,g));
  if(changed<0)return next;
  const gates={...next.workflow.gates};
  for(const g of order.slice(changed))gates[g]={...gates[g],isApproved:false,approvedAt:undefined,approvedFingerprint:undefined};
  return {...next,charter:changed<2?{...next.charter,isApproved:false,approvedAt:undefined}:next.charter,workflow:{...next.workflow,gates,stageStatuses:{...next.workflow.stageStatuses,quality_assurance:'NEEDS_REVIEW',export_center:'BLOCKED'}}};
}
