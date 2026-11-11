import React, { useState } from 'react';
import { Layers, Download, CheckCircle2, Copy, FileText, ArrowRight } from 'lucide-react';
import { DigitalProductProject, ResourceAsset } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface WorkbookStudioViewProps {
  onSaveResource: (resource: ResourceAsset) => void;
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  lang?: Language;
}

export const WorkbookStudioView: React.FC<WorkbookStudioViewProps> = ({
  onSaveResource,
  project,
  setActiveView,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [draft, setDraft] = useState({ id: '', title: '', purpose: '', instructions: '', contentMarkdown: '', completionCriteria: '', associatedChapterId: '' });
  const [saveMessage, setSaveMessage] = useState('');
  const { resources } = project;
  const items = resources || [];
  const [selectedResourceId, setSelectedResourceId] = useState<string>(items[0]?.id || 'RES-01');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentResource = items.find((r) => r.id === selectedResourceId) || items[0];

  const handleCopyMarkdown = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <details className="p-5 bg-white border border-slate-200 rounded-xl">
        <summary className="font-semibold cursor-pointer">{lang === 'en' ? 'Create or edit a practical learning resource' : '新增或編輯實作學習資源'}</summary>
        <form className="mt-4 space-y-3 text-sm" onSubmit={e => { e.preventDefault(); onSaveResource({...draft,id:draft.id || `RESOURCE-${Date.now()}`,category:'WORKSHEET',fieldsOrColumns:[],sampleEntries:[]}); setSaveMessage('Learning resource saved; Gate C requires a new review.'); }}>
          <label className="block">Existing resource<select className="block w-full border rounded p-2" value={draft.id} onChange={e => { const resource=items.find(r=>r.id===e.target.value); setDraft(resource ? {...resource,associatedChapterId:resource.associatedChapterId || ''} : {id:'',title:'',purpose:'',instructions:'',contentMarkdown:'',completionCriteria:'',associatedChapterId:''}); }}><option value="">New resource</option>{items.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
          {(['title','purpose','instructions','completionCriteria'] as const).map(key=><label key={key} className="block">{key}<input required className="w-full block border rounded p-2 mt-1" value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
          <label className="block">Related chapter<select className="block w-full border rounded p-2" value={draft.associatedChapterId} onChange={e=>setDraft({...draft,associatedChapterId:e.target.value})}><option value="">Whole book</option>{project.outline.map(ch=><option key={ch.id} value={ch.id}>{ch.title}</option>)}</select></label>
          <label className="block">Resource content (Markdown)<textarea required minLength={150} rows={9} className="block border rounded p-3 w-full font-mono text-xs" value={draft.contentMarkdown} onChange={e=>setDraft({...draft,contentMarkdown:e.target.value})}/></label>
          <button className="px-4 py-2 rounded bg-indigo-700 text-white">Save learning resource</button><p role="status">{saveMessage}</p>
        </form>
      </details>
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>{t.navWorkbookStudio}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.workbookTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'en'
              ? `${items.length} companion resources included to maximize customer implementation and perceived bundle value.`
              : `共收錄 ${items.length} 套高價值伴隨套件，隨書附贈以提升數位產品客單價與買家實際執行力`}
          </p>
        </div>

        <button
          onClick={() => setActiveView('quality_assurance')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
        >
          <span>{lang === 'en' ? 'Proceed to Quality Assurance (Gate C) →' : '進入品質審查 (Gate C) →'}</span>
        </button>
      </div>

      {/* Resource Selector & Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: List of Resources */}
        <div className="space-y-2">
          {items.map((res) => {
            const isSelected = selectedResourceId === res.id;
            return (
              <div
                key={res.id}
                onClick={() => setSelectedResourceId(res.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                    {res.id}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {res.category}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{res.title}</h3>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{res.purpose}</p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Template Preview */}
        {currentResource && (
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded mr-2">
                  {currentResource.id}
                </span>
                <span className="text-sm font-bold text-slate-900">{currentResource.title}</span>
              </div>

              <button
                onClick={() => handleCopyMarkdown(currentResource.contentMarkdown, currentResource.id)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedId === currentResource.id ? (lang === 'en' ? 'Copied!' : '已複製') : (lang === 'en' ? 'Copy Template' : '複製範本')}</span>
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <strong>Purpose:</strong>
                <p className="text-slate-600">{currentResource.purpose}</p>
                <strong className="block pt-1">Instructions:</strong>
                <p className="text-slate-600">{currentResource.instructions}</p>
              </div>

              <div>
                <strong className="block mb-1 text-slate-800">Template Markdown:</strong>
                <pre className="p-4 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[380px]">
                  {currentResource.contentMarkdown}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
