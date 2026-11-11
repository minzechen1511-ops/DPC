import React, { useState } from 'react';
import { Search, ExternalLink, BookOpen, Loader2 } from 'lucide-react';
import type { DigitalProductProject } from '../types/project.ts';
import type { ResearchResult, RetrievedResearchDocument, ResearchParagraph } from '../types/research.ts';
import { normalizeEvidenceText } from '../utils/sourceEvidence.ts';
interface Props {
 project: DigitalProductProject;
 onSelect: (document: RetrievedResearchDocument, paragraph: ResearchParagraph) => void;
}
export const ReferenceSearchPanel: React.FC<Props> = ({project,onSelect}) => {
 const topic=(project.charter.productTitle || project.intake.productIdea || '').replace(/practical learning toolkit|foundations and learning goals/gi,'').replace(/[:—]/g,' ').trim();
 const [query,setQuery]=useState(topic.slice(0,250));
 const [results,setResults]=useState<ResearchResult[]>([]);
 const [reports,setReports]=useState<Array<{provider:string;state:string;message:string}>>([]);
 const [document,setDocument]=useState<RetrievedResearchDocument|null>(null);
 const [url,setUrl]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const search=async(event:React.FormEvent)=>{
  event.preventDefault();setBusy(true);setError('');setResults([]);setReports([]);setDocument(null);
  try { const response=await fetch(`/api/references/search?q=${encodeURIComponent(query.trim())}`);const data=await response.json();if(!response.ok)throw new Error(data.error || 'Search failed.');setResults(data.results || []);setReports(data.sources || []); }
  catch(error){setError(error instanceof Error?error.message:'Reference search failed.');}
  finally{setBusy(false);}
 };
 const retrieve=async(input:{pmcid?:string;url?:string},selected?:ResearchResult)=>{
  setBusy(true);setError('');setDocument(null);
  try {
   const response=await fetch('/api/references/retrieve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
   const data=await response.json();if(!response.ok)throw new Error(data.error || 'Source text could not be retrieved.');
   if(selected){
    const doiMatches=selected.doi&&data.doi&&selected.doi.toLowerCase()===data.doi.toLowerCase();
    const titleMatches=normalizeEvidenceText(selected.title).replace(/[^\p{L}\p{N}]/gu,'').toLowerCase()===normalizeEvidenceText(data.title).replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
    if(!doiMatches&&!titleMatches)throw new Error('Retrieved text does not match the selected bibliographic record. Inspect the original source before using it.');
   }
   setDocument(data);
  }catch(error){setError(error instanceof Error?error.message:'Retrieval failed.');}
  finally{setBusy(false);}
 };
 return <section className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
  <h2 className="text-lg font-semibold flex gap-2 items-center"><Search size={20}/>Research sources for Gate B</h2>
  <p className="text-sm text-slate-600">Search the actual literature, inspect the original text, and choose an exact supporting paragraph. Metadata, abstracts and keyword matches are discovery aids; they do not validate a chapter claim.</p>
  <form onSubmit={search} className="flex flex-col sm:flex-row gap-3">
   <label className="flex-1 min-w-0 text-sm">Research question or topic<input minLength={3} maxLength={250} required className="mt-1 border rounded-md p-2 w-full" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <button disabled={busy} className="self-start sm:self-end px-4 py-2 bg-indigo-700 text-white rounded-lg flex gap-2 items-center">{busy?<Loader2 size={16} className="animate-spin"/>:<Search size={16}/>}Search literature</button>
  </form>
  <label className="block text-sm">Focus on a chapter<select className="block mt-1 border rounded-md p-2 w-full" defaultValue="" onChange={e=>{const chapter=project.outline.find(ch=>ch.id===e.target.value);setQuery(chapter?`${topic} ${chapter.objective}`.slice(0,250):topic.slice(0,250));}}><option value="">Whole product</option>{project.outline.map(ch=><option key={ch.id} value={ch.id}>{ch.title}</option>)}</select></label>
  <div className="space-y-2">{reports.map(report=><p key={report.provider} className="text-xs text-slate-600"><strong>{report.provider} · {report.state}:</strong> {report.message}</p>)}</div>
  {error&&<p role="alert" className="text-sm text-red-900 bg-red-50 rounded p-3">{error}</p>}
  <div className="space-y-3">{results.map(result=><article key={result.id} className="border-t border-slate-200 pt-4 space-y-2">
   <h3 className="font-semibold">{result.title}</h3>
   <p className="text-xs text-slate-600">{result.authors.join(', ') || 'Author not supplied'} · {result.publisher} · {result.publicationDate || 'Date not supplied'}{result.doi?` · DOI ${result.doi}`:''}</p>
   <p className="text-xs text-slate-600">Search terms found: {result.relevance.matchedTerms.join(', ') || 'none'} · {result.provider} metadata only</p>
   {result.abstract&&<details className="text-sm text-slate-700"><summary className="cursor-pointer">Read supplied abstract (not full-text verification)</summary><p className="mt-2">{result.abstract}</p></details>}
   {result.isRetracted&&<p className="text-sm font-semibold text-red-800">Retraction-related record: excluded from evidence retrieval.</p>}
   <div className="flex flex-wrap gap-3 items-center"><a href={result.sourceURL} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-700 underline inline-flex gap-1 items-center">Open original record<ExternalLink size={14}/></a>
   {(result.pmcid||result.fullTextURL)&&<button disabled={busy||result.isRetracted} onClick={()=>retrieve(result.pmcid?{pmcid:result.pmcid}:{url:result.fullTextURL},result)} className="text-sm px-3 py-2 bg-indigo-50 text-indigo-800 rounded">Retrieve accessible text</button>}
   {!result.pmcid&&!result.fullTextURL&&<span className="text-xs text-amber-900">No supported full-text link supplied; this record cannot be marked validated.</span>}</div>
  </article>)}</div>
  <details className="border-t border-slate-200 pt-3 text-sm"><summary className="cursor-pointer font-medium">Retrieve a government, university or supported public research page</summary><p className="text-xs text-slate-600 mt-2">Use the exact HTTPS source page. PDFs, redirects, paywalls and inaccessible sources remain unverified; no text is invented.</p><div className="flex flex-col sm:flex-row gap-2 mt-3"><label className="flex-1 min-w-0">Original public research URL<input type="url" className="border p-2 rounded w-full block mt-1" value={url} onChange={e=>setUrl(e.target.value)}/></label><button disabled={busy||!url.trim()} className="px-3 py-2 rounded bg-indigo-700 text-white self-end" onClick={()=>retrieve({url})}>Retrieve public page</button></div></details>
  {document&&<section className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg space-y-3">
   <h3 className="font-semibold flex gap-2 items-center"><BookOpen size={18}/>{document.title}</h3>
   <p className="text-xs text-slate-600">Retrieved {document.kind==='full_text'?'article body':'public page text'} · {document.retrievedAt} · SHA-256 {document.contentHash.slice(0,16)}…</p>
   <a href={document.canonicalUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-700 underline">Inspect original source</a>
   <p className="text-sm text-slate-700">Read the relevant passage and select it for your source record. You still need to explain its relevance and review its support for each manuscript claim.</p>
   <div className="max-h-[440px] overflow-y-auto space-y-4">{document.paragraphs.map(paragraph=><article key={paragraph.locator} className="border-t border-indigo-200 pt-3"><h4 className="text-xs font-semibold">{paragraph.locator}</h4><p className="text-sm text-slate-700 my-2 whitespace-pre-wrap">{paragraph.text}</p><button onClick={()=>onSelect(document,paragraph)} className="text-xs px-3 py-2 bg-indigo-700 text-white rounded">Use this exact source paragraph</button></article>)}</div>
  </section>}
 </section>;
};
