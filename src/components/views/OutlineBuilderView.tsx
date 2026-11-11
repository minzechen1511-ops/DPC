import React, { useState } from 'react';
import { ListTree, CheckCircle2, ArrowRight, BookOpen, Layers, Feather, Edit3 } from 'lucide-react';
import { DigitalProductProject, ChapterOutlineItem } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface OutlineBuilderViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onUpdateOutline: (outline: ChapterOutlineItem[]) => void;
  lang?: Language;
}

export const OutlineBuilderView: React.FC<OutlineBuilderViewProps> = ({
  project,
  setActiveView,
  onUpdateOutline,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { outline } = project;
  const chapters = outline || [];

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.actualWordCount || ch.targetWordCount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <ListTree className="w-3.5 h-3.5" />
            <span>{t.navOutlineBuilder}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.outlineTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'en'
              ? `${chapters.length} chapters structured, ~${totalWords.toLocaleString()} total target words, with ${project.referenceLibrary.cards.length} source records available for chapter mapping.`
              : `共 ${chapters.length} 個章節，預計總字數約 ${totalWords.toLocaleString()} 字，目前有 ${project.referenceLibrary.cards.length} 篇來源紀錄可配置章節與實作交付檢核`}
          </p>
        </div>

        <button
          onClick={() => setActiveView('content_studio')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
        >
          <span>{t.generateAllChaptersCta}</span>
        </button>
      </div>

      {/* Chapters Accordion / List */}
      <div className="space-y-3">
        {chapters.map((ch, idx) => (
          <div key={ch.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all space-y-3 shadow-2xs">
            <details className="text-sm border-b border-slate-200 pb-3">
              <summary className="font-medium cursor-pointer">Edit this chapter research plan</summary>
              <form className="mt-3 space-y-3" onSubmit={event=>{event.preventDefault();const values=new FormData(event.currentTarget);onUpdateOutline(chapters.map(item=>item.id===ch.id?{...item,title:String(values.get('title')).trim(),objective:String(values.get('objective')).trim(),subtopics:String(values.get('subtopics')).split('\n').map(text=>text.trim()).filter(Boolean),targetWordCount:Number(values.get('targetWordCount'))}:item));}}>
                <label className="block">Chapter title<input required name="title" defaultValue={ch.title} className="block w-full border rounded p-2 mt-1"/></label>
                <label className="block">Learning objective<textarea required name="objective" defaultValue={ch.objective} className="block w-full border rounded p-2 mt-1"/></label>
                <label className="block">Subtopics (one per line)<textarea required name="subtopics" defaultValue={ch.subtopics.join('\n')} className="block w-full border rounded p-2 mt-1"/></label>
                <label className="block">Target length<input required type="number" min={100} max={20000} name="targetWordCount" defaultValue={ch.targetWordCount} className="block border rounded p-2 mt-1"/></label>
                <p className="text-xs text-slate-600">Changing the title, objective or subtopics requires a new Gate B relevance review. Changing target length requires Gate C review.</p>
                <button className="px-3 py-2 rounded bg-indigo-700 text-white">Save chapter plan</button>
              </form>
            </details>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                  {ch.id}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{ch.title}</h3>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                <span>{ch.targetWordCount} {lang === 'en' ? 'words' : '字'}</span>
                {ch.isCompleted ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {lang === 'en' ? 'Completed' : '已完稿'}
                  </span>
                ) : (
                  <span className="text-slate-400">{lang === 'en' ? 'Pending' : '待生成'}</span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{ch.objective}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[11px] font-semibold text-slate-700 block">{lang === 'en' ? 'Key Subtopics:' : '子章節規劃：'}</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  {(ch.subtopics || []).map((sub, sIdx) => (
                    <li key={sIdx}>{sub}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[11px] font-semibold text-slate-700 block">{lang === 'en' ? 'Practical Deliverable:' : '實作交付物：'}</span>
                <p className="text-slate-800 font-medium">{ch.practicalDeliverable}</p>
                <div className="text-[11px] text-slate-400 mt-2">
                  <span>Mapped Refs: {(ch.mappedReferenceIds || []).join(', ')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
