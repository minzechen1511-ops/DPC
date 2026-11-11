import type { ReferenceVerificationReport } from '../types/research.ts';
import type { DigitalProductProject } from '../types/project.ts';
import { isRetrievedSource } from '../utils/sourceEvidence.ts';
import { evidencePassages, resourceEvidenceDocument } from '../utils/citationEvidence.ts';
export async function verifyProjectReferences(project: DigitalProductProject): Promise<{ valid:boolean; message:string; report?:ReferenceVerificationReport }> {
 const requiredIds=new Set([...project.outline.flatMap(ch=>[...ch.mappedReferenceIds,...evidencePassages(ch).flatMap(p=>p.referenceIds)]),...project.resources.flatMap(resource=>evidencePassages(resourceEvidenceDocument(resource)).flatMap(p=>p.referenceIds))]);
 const cards=project.referenceLibrary.cards.filter(card=>requiredIds.has(card.id)&&isRetrievedSource(card));
 if(!cards.length)return {valid:false,message:'Retrieve and review relevant source text before approving this gate.'};
 try{
  const response=await fetch('/api/references/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cards})});
  const data=await response.json();
  if(!response.ok)return {valid:false,message:data.error || 'Source verification could not be completed.'};
  return {valid:data.valid===true,report:data,message:data.valid?'Source identity and retained excerpts checked.':(data.checks || []).filter((check:any)=>!check.valid).map((check:any)=>`${check.id}: ${check.message}`).join(' ') || 'Source checking failed.'};
 }catch{return {valid:false,message:'Could not check original source records. Restore research-service access; no validated publication approval was granted.'};}
}
