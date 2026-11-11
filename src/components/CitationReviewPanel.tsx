import React, { useState } from 'react';
import type { CitationReview, ReferenceCard } from '../types/project.ts';
import { auditChapter, assessPassage, evidencePassages, makeSupportReview, type EvidenceDocument } from '../utils/citationEvidence.ts';
import { isRetrievedSource, normalizeEvidenceText } from '../utils/sourceEvidence.ts';
interface Props { document: EvidenceDocument; cards: ReferenceCard[]; onChange: (reviews: CitationReview[]) => void; disabled?: boolean }
export const CitationReviewPanel: React.FC<Props> = ({document,cards,onChange,disabled=false}) => {
 const [drafts,setDrafts]=useState<Record<string,{relationship:string;rationale:string}>>({});
 const [message,setMessage]=useState('');
 const passages=evidencePassages(document); const audit=auditChapter(document,cards);
 const save=(review:CitationReview)=>{if(disabled)return;onChange([...(document.citationReviews || []).filter(item=>!(item.passageKey===review.passageKey&&item.referenceId===review.referenceId)),review]);setMessage('Evidence review saved. Passage, bibliography or source-excerpt changes require a new review.');};
 return <details className="border border-slate-200 rounded-lg bg-white p-4">
  <summary className="font-semibold text-sm cursor-pointer">Review claim-to-source support ({audit.reviewed}/{audit.passages} passages reviewed)</summary>
  <p className="text-sm text-slate-600 mt-3">A citation points to a source; it does not prove that the source supports the sentence. Compare each passage with the exact retrieved excerpt. Review every cited source. Use editorial classification only for original instructions or examples containing no empirical claim.</p>
  {disabled&&<p className="text-sm text-amber-900 mt-2">Save the current manuscript before reviewing evidence. Unsaved text cannot receive a support decision.</p>}
  {message&&<p role="status" className="text-xs text-indigo-800 mt-2">{message}</p>}
  <div className="space-y-5 mt-4">{passages.map((passage,index)=>{
   const state=assessPassage(passage,document,cards);const editorialKey=`${passage.key}:editorial`;
   return <article key={`${passage.key}:${index}`} className="border-t border-slate-200 pt-4 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-2 text-xs"><h3 className="font-semibold">Passage {index+1} · {passage.kind} · {passage.heading || 'Introduction'}</h3><span className={state.valid?'text-indigo-800':'text-amber-900'}>{state.valid?(state.editorial?'Reviewed original instruction / example':'Source support reviewed'):'Review needed'}</span></div>
    <p className="text-sm text-slate-800 whitespace-pre-wrap">{passage.text}</p>
    {passage.referenceIds.map(id=>{
     const card=cards.find(source=>source.id===id);const key=`${passage.key}:${id}`;const saved=document.citationReviews?.find(review=>review.passageKey===passage.key&&review.referenceId===id);
     const draft=drafts[key] || {relationship:saved?.relationship || '',rationale:saved?.rationale || ''};
     return <section key={id} className="p-3 bg-slate-50 rounded-md space-y-2">
      <h4 className="text-xs font-semibold">[{id}] {card?.sourceTitle || 'Unknown source — correct the citation ID'}</h4>
      {card&&<><p className="text-xs text-slate-600">{card.author || card.publisherOrOrg} · {card.publicationDate || 'Date not supplied'}{card.doi?` · DOI ${card.doi}`:''}</p><blockquote className="text-sm text-slate-700 whitespace-pre-wrap">{card.verificationQuote || 'No retrieved supporting excerpt.'}</blockquote>{card.retrieval && normalizeEvidenceText(card.retrieval.excerpt) !== normalizeEvidenceText(card.verificationQuote || '') && <details className="text-sm text-slate-700"><summary className="cursor-pointer">Read the complete retrieved paragraph for context</summary><p className="mt-2 whitespace-pre-wrap">{card.retrieval.excerpt}</p></details>}<p className="text-xs text-slate-600">Locator: {card.verificationLocator || 'not supplied'} · {isRetrievedSource(card)?'Source text and bibliography match the retrieval record':'Source retrieval or bibliography is not verified'}</p><a href={card.sourceURL} target="_blank" rel="noopener noreferrer" className="text-xs underline text-indigo-700">Inspect original source</a></>}
      <label className="block text-xs">Relationship to this exact passage<select disabled={disabled||!isRetrievedSource(card)} value={draft.relationship} onChange={e=>setDrafts({...drafts,[key]:{...draft,relationship:e.target.value}})} className="block w-full mt-1 border rounded p-2"><option value="">Choose after inspecting the evidence</option><option value="supports">The excerpt supports the claim as written</option><option value="qualifies">The excerpt supports the qualified statement and its limits</option><option value="unsupported">Unsupported, contradictory or insufficient evidence</option></select></label>
      <label className="block text-xs">Explain how the excerpt supports every factual statement, or explain the limitation. Split or qualify an overbroad passage.<textarea disabled={disabled||!isRetrievedSource(card)} minLength={20} rows={2} className="block w-full mt-1 border rounded p-2" value={draft.rationale} onChange={e=>setDrafts({...drafts,[key]:{...draft,rationale:e.target.value}})}/></label>
      <button disabled={disabled||!card||!isRetrievedSource(card)||!draft.relationship||draft.rationale.trim().length<20} onClick={()=>{if(card)save(makeSupportReview(passage,card,draft.relationship as CitationReview['relationship'],draft.rationale));}} className="px-3 py-2 bg-indigo-700 text-white text-xs rounded">Save support decision for {id}</button>
     </section>;
    })}
    {!passage.referenceIds.length&&<div className="space-y-2 p-3 bg-amber-50 rounded-md"><p className="text-xs text-amber-950">For a factual statement, add the relevant [REF-ID] next to the claim in the editor and save. If this is solely an original exercise or instruction, explain that classification explicitly.</p><label className="text-xs block">Why this contains no empirical claim<textarea disabled={disabled} rows={2} className="block w-full mt-1 border rounded p-2" value={drafts[editorialKey]?.rationale || ''} onChange={e=>setDrafts({...drafts,[editorialKey]:{relationship:'editorial',rationale:e.target.value}})}/></label><button disabled={disabled||(drafts[editorialKey]?.rationale.trim().length || 0)<20} onClick={()=>save({passageKey:passage.key,relationship:'editorial',rationale:drafts[editorialKey].rationale.trim(),reviewedAt:new Date().toISOString()})} className="px-3 py-2 text-xs bg-white text-amber-950 border border-amber-300 rounded">Confirm original instruction / example</button></div>}
   </article>;
  })}</div>
  {!passages.length&&<p className="text-sm text-slate-600 mt-3">Write and save this document before reviewing its claims.</p>}
 </details>;
};
