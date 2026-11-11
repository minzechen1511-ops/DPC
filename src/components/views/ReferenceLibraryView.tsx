import React, { useState } from 'react';
import { BookOpen, Search, Download, ExternalLink, ShieldCheck, CheckCircle2, Filter, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { DigitalProductProject, ReferenceCard } from '../../types/project.ts';
import { compileReferenceLibraryMarkdown } from '../../utils/markdownCompiler.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface ReferenceLibraryViewProps {
  onAddSource: (source: ReferenceCard, chapterIds: string[]) => void;
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  lang?: Language;
}

export const ReferenceLibraryView: React.FC<ReferenceLibraryViewProps> = ({
  onAddSource,
  project,
  setActiveView,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { referenceLibrary } = project;
  const cards = referenceLibrary?.cards || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPillar, setSelectedPillar] = useState('ALL');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(cards[0]?.id || null);

  const [source, setSource] = useState({ title: '', publisher: '', url: '', summary: '', claim: '', quote: '', locator: '', confirmed: false });
  const [sourceChapters, setSourceChapters] = useState<string[]>([]);
  const [sourceMessage, setSourceMessage] = useState('');
  const addSource = (event: React.FormEvent) => {
    event.preventDefault();
    const id = `REF-${Date.now()}`;
    const card: ReferenceCard = { id, title: source.title, sourceTitle: source.title, publisherOrOrg: source.publisher, sourceURL: source.url, retrievedAt: new Date().toISOString(), status: source.confirmed ? 'VERIFIED_FULL_TEXT' : 'NEEDS_REVIEW', qualityScore: 0, description: source.summary, researchSummary: source.summary, contentOutline: [source.claim], supportedClaims: [source.claim], verificationQuote: source.quote, verificationLocator: source.locator, verifiedAt: source.confirmed ? new Date().toISOString() : undefined, practicalFramework: { name: 'Editorial application', editorialOrigin: 'Author synthesis; review against the quoted source.', actionSteps: [] }, editorialNotes: { targetChapters: sourceChapters, exerciseSuggestions: [], worksheetIntegration: '', verificationNotes: `${source.locator}: ${source.quote}` }, brandGuidelines: { toneApplication: 'Accurate attribution and qualified claims', visualDirection: 'Cited tables and original diagrams', audienceFraming: project.charter.targetAudience }, pillars: [], rightsNotes: 'Link and brief attributed quotation only; source copyright remains with its owner.' };
    onAddSource(card, sourceChapters); setSourceMessage(`Saved ${id}; downstream approvals require review.`);
    setSource({ title: '', publisher: '', url: '', summary: '', claim: '', quote: '', locator: '', confirmed: false });
  };
  const pillars = ['ALL', ...Object.keys(referenceLibrary?.coveragePillars || {})];

  const filteredCards = cards.filter((c) => {
    const matchesPillar = selectedPillar === 'ALL' || c.pillars.includes(selectedPillar);
    const matchesSearch =
      searchQuery.trim() === '' ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sourceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.publisherOrOrg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.researchSummary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPillar && matchesSearch;
  });

  const handleDownloadMarkdown = () => {
    const md = compileReferenceLibraryMarkdown(project);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reference-library-${project.projectId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(referenceLibrary?.cards || [], null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `references-${project.projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <details className="p-5 bg-white border border-slate-200 rounded-lg">
        <summary className="font-semibold cursor-pointer">{lang === 'en' ? 'Add a researched source and map it to chapters' : '新增已研究的來源並配置章節'}</summary>
        <form onSubmit={addSource} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
          {([['title','Source title'],['publisher','Author / publisher'],['url','Original source URL'],['locator','Page / section / paragraph locator']] as const).map(([key,label]) => <label key={key} className="space-y-1">{label}<input required type={key === 'url' ? 'url' : 'text'} pattern={key === 'url' ? 'https?://.*' : undefined} value={source[key]} onChange={e => setSource({...source,[key]:e.target.value})} className="block w-full border p-2 rounded" /></label>)}
          {([['summary','Substantive research summary'],['claim','Specific supported claim'],['quote','Exact supporting excerpt']] as const).map(([key,label]) => <label key={key} className="space-y-1 md:col-span-2">{label}<textarea required minLength={key === 'summary' ? 50 : 20} rows={3} value={source[key]} onChange={e => setSource({...source,[key]:e.target.value})} className="block w-full border p-2 rounded" /></label>)}
          <fieldset className="md:col-span-2 flex flex-wrap gap-3"><legend className="mb-2">Map to relevant chapters</legend>{project.outline.map(ch => <label key={ch.id} className="flex gap-2 items-center"><input type="checkbox" checked={sourceChapters.includes(ch.id)} onChange={e => setSourceChapters(e.target.checked ? [...sourceChapters,ch.id] : sourceChapters.filter(id => id !== ch.id))} />{ch.title}</label>)}</fieldset>
          <label className="md:col-span-2 flex gap-2 items-start"><input type="checkbox" checked={source.confirmed} onChange={e => setSource({...source,confirmed:e.target.checked})} />I read the full source and checked that this excerpt and locator support the stated claim. Otherwise save for review.</label>
          <button className="px-4 py-2 bg-indigo-700 text-white rounded-lg" type="submit">Save source</button><p role="status">{sourceMessage}</p>
        </form>
      </details>
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>ARCE — Automated Reference Collection Engine</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{t.refTitle}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{t.refSubtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              JSON
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Markdown</span>
            </button>
            <button
              onClick={() => setActiveView('product_charter')}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              {lang === 'en' ? 'Product Charter (Gate B) →' : '進入產品憲章 (Gate B) →'}
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <span>
              {t.verifiedCardsCount}: <strong className="font-mono text-emerald-600">{referenceLibrary?.verifiedCount || cards.length} / {referenceLibrary?.targetCount || 20}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>{t.sevenPartStandard}</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchRefPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* Pillars Filter */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 overflow-x-auto">
          <span className="text-[11px] text-slate-400 shrink-0 mr-1">{lang === 'en' ? 'Pillars:' : '研究主軸:'}</span>
          {pillars.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPillar(p)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors whitespace-nowrap ${
                selectedPillar === p
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p === 'ALL' ? t.allPillars : p}
            </button>
          ))}
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {filteredCards.map((card) => {
          const isExpanded = expandedCardId === card.id;

          return (
            <div
              key={card.id}
              className={`bg-white border rounded-xl transition-all ${
                isExpanded ? 'border-indigo-500 ring-1 ring-indigo-500/20 shadow-xs' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Summary Header */}
              <div
                onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                className="p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {card.id}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {card.status}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500 font-medium">{card.publisherOrOrg}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{card.title}</h3>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-slate-400">Score: {card.qualityScore}/100</span>
                  <div className="text-indigo-600 text-xs font-semibold flex items-center gap-1">
                    <span>{isExpanded ? (lang === 'en' ? 'Collapse' : '收合') : (lang === 'en' ? 'Inspect 7 Parts' : '檢視 7 大結構')}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              {/* 7-Part Detailed Content */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 text-xs text-slate-700 bg-slate-50/30">
                  {/* Part A & B */}
                  <div className="space-y-1">
                    <strong className="text-slate-900 block font-semibold">B. {lang === 'en' ? 'Description & Core Context' : '描述與脈絡'}:</strong>
                    <p className="text-slate-600 leading-relaxed">{card.description}</p>
                  </div>

                  {/* Part C: Content Outline */}
                  <div className="space-y-1">
                    <strong className="text-slate-900 block font-semibold">C. {lang === 'en' ? 'Content Outline' : '內容大綱'}:</strong>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                      {card.contentOutline.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Part D: Practical Framework */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-indigo-700 font-semibold">
                        D. {lang === 'en' ? 'Practical Framework' : '實作框架'}: {card.practicalFramework.name}
                      </strong>
                      <span className="text-[10px] text-slate-400">{card.practicalFramework.editorialOrigin}</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600">
                      {card.practicalFramework.actionSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Part E: Research Summary */}
                  <div className="space-y-1">
                    <strong className="text-slate-900 block font-semibold">E. {lang === 'en' ? 'Research Summary' : '文獻與實證摘要'}:</strong>
                    <p className="text-slate-600 leading-relaxed">{card.researchSummary}</p>
                  </div>

                  {/* Part F & G: Editorial Notes & Brand Guidelines */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                      <strong className="text-slate-800 block">F. {lang === 'en' ? 'Editorial Notes' : '編輯指引'}:</strong>
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div><strong>Target Chapters:</strong> {card.editorialNotes.targetChapters.join(', ')}</div>
                        <div><strong>Worksheet:</strong> {card.editorialNotes.worksheetIntegration}</div>
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                      <strong className="text-slate-800 block">G. {lang === 'en' ? 'Brand Guidelines' : '品牌與視覺規範'}:</strong>
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div><strong>Tone:</strong> {card.brandGuidelines.toneApplication}</div>
                        <div><strong>Framing:</strong> {card.brandGuidelines.audienceFraming}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
