import { countManuscriptWords } from '../../utils/textMetrics.ts';
import React from 'react';
import { ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import type { DigitalProductProject } from '../../types/project.ts';
import { gateIssues } from '../../utils/gatePolicy.ts';
import { auditChapter } from '../../utils/styledBook.ts';
import { Language, translations } from '../../utils/i18n.ts';
interface Props { project: DigitalProductProject; setActiveView: (view: any) => void; onApproveGateC: () => void; lang?: Language }
export const QualityAssuranceView: React.FC<Props> = ({project,setActiveView,onApproveGateC,lang='en'}) => {
 const t=translations[lang];
 const blockers=gateIssues(project,'gateC');
 const totalWords=project.outline.reduce((sum,ch)=>sum+countManuscriptWords(ch.contentMarkdown || ''),0);
 return <div className="space-y-6 max-w-7xl mx-auto pb-12">
  <section className="p-6 bg-white border border-slate-200 rounded-xl flex flex-wrap justify-between gap-4 items-center">
   <div><h1 className="text-xl font-bold flex gap-2 items-center"><ShieldCheck size={22}/>{t.qaTitle}</h1><p className="text-sm text-slate-600 mt-2">{lang==='en'?'Gate C checks current project data, citations, substantive chapters, source mappings and learning resources. It does not certify scientific validity.':'Gate C 檢查目前專案、引用、實質章節、來源配置與學習資源，不代表獨立科學認證。'}</p></div>
   <button disabled={blockers.length>0} onClick={()=>{if(blockers.length)return;onApproveGateC();setActiveView('export_center');}} className="px-4 py-3 bg-indigo-700 text-white rounded-lg flex gap-2 items-center"><CheckCircle2 size={16}/>{t.approveGateCCta}</button>
  </section>
  <section className="p-6 bg-white border border-slate-200 rounded-xl space-y-4"><h2 className="font-semibold text-lg">{blockers.length?`${blockers.length} publication requirements need attention`:'Current publication checks pass'}</h2><p className="text-sm text-slate-600">{project.outline.length} chapters · {totalWords.toLocaleString()} words counted from the manuscript · {project.resources.length} companion resources</p><ol className="list-disc pl-5 text-sm space-y-2 text-amber-900">{blockers.map(issue=><li key={issue}>{issue}</li>)}</ol><div className="flex flex-wrap gap-3 text-sm">{[['market_research','Review marketplace evidence'],['reference_library','Research and source mappings'],['content_studio','Manuscript and figures'],['workbook_studio','Companion learning materials']].map(([route,label])=><button key={route} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded flex items-center gap-2" onClick={()=>setActiveView(route)}>{label}<ArrowRight size={14}/></button>)}</div></section>
  <section className="p-6 bg-white border border-slate-200 rounded-xl space-y-3"><h2 className="font-semibold">Chapter evidence review</h2>{project.outline.map(ch=>{const audit=auditChapter(ch,project.referenceLibrary.cards);return <div key={ch.id} className="py-3 border-t border-slate-200"><h3 className="font-medium">{ch.title}</h3><p className="text-sm text-slate-600">{audit.cited}/{audit.passages} passages cited to full-text source records · {audit.needsReview} need review · {ch.illustrations?.length || 0} author-supplied illustrations</p></div>})}</section>
 </div>;
};
