import { ReferenceSearchPanel } from '../ReferenceSearchPanel.tsx';
import type { RetrievedSourceEvidence } from '../../types/research.ts';
import { isRetrievedSource, chapterResearchFingerprint } from '../../utils/sourceEvidence.ts';
import React, { useState } from 'react';
import { BookOpen, Search, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { DigitalProductProject, ReferenceCard } from '../../types/project.ts';
import { compileReferenceLibraryMarkdown } from '../../utils/markdownCompiler.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface ReferenceLibraryViewProps {
  onAddSource: (source: ReferenceCard, chapterIds: string[], continueToCharter: boolean) => void;
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

  const emptySource = { title: '', author: '', publisher: '', date: '', doi: '', url: '', summary: '', claim: '', quote: '', locator: '', relevance: '', confirmed: false };
  const [source, setSource] = useState(emptySource);
  const [retrieval, setRetrieval] = useState<RetrievedSourceEvidence | undefined>();
  const [sourceFormOpen, setSourceFormOpen] = useState(false);
  const [sourceChapters, setSourceChapters] = useState<string[]>([]);
  const [sourceMessage, setSourceMessage] = useState('');

  const addSource = (event: React.FormEvent) => {
    event.preventDefault();
    const id = `REF-${Date.now()}`;
    const card: ReferenceCard = {
      id,
      author: source.author || undefined,
      publicationDate: source.date || undefined,
      doi: source.doi || undefined,
      retrieval,
      chapterRelevance: sourceChapters.map((chapterId) => ({
        chapterId,
        rationale: source.relevance,
        reviewedAt: new Date().toISOString(),
        chapterFingerprint: chapterResearchFingerprint(project.outline.find((ch) => ch.id === chapterId)!),
      })),
      title: source.title,
      sourceTitle: source.title,
      publisherOrOrg: source.publisher,
      sourceURL: source.url,
      retrievedAt: new Date().toISOString(),
      status: source.confirmed && retrieval ? 'VERIFIED_FULL_TEXT' : 'NEEDS_REVIEW',
      qualityScore: 0,
      description: source.summary,
      researchSummary: source.summary,
      contentOutline: [source.claim],
      supportedClaims: [source.claim],
      verificationQuote: source.quote,
      verificationLocator: source.locator,
      verifiedAt: source.confirmed ? new Date().toISOString() : undefined,
      practicalFramework: { name: 'Editorial application', editorialOrigin: 'Author synthesis; review against the quoted source.', actionSteps: [] },
      editorialNotes: { targetChapters: sourceChapters, exerciseSuggestions: [], worksheetIntegration: '', verificationNotes: `${source.locator}: ${source.quote}` },
      brandGuidelines: { toneApplication: 'Accurate attribution and qualified claims', visualDirection: 'Cited tables and original diagrams', audienceFraming: project.charter.targetAudience },
      pillars: [],
      rightsNotes: 'Link and brief attributed quotation only; source copyright remains with its owner.',
    };
    if (card.status === 'VERIFIED_FULL_TEXT' && !isRetrievedSource(card)) {
      setSourceMessage('The quote or bibliography does not match the retrieved text. Correct it or save an unverified note.');
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    onAddSource(card, sourceChapters, isRetrievedSource(card) && submitter?.getAttribute('value') !== 'stay');
    setSourceMessage(lang === 'en' ? `Added ${id} to the project draft.` : `已將 ${id} 加入專案草稿。`);
    setSource(emptySource);
    setRetrieval(undefined);
    setSourceChapters([]);
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
    <div className="w-full space-y-5 pb-3">
      <ReferenceSearchPanel
        project={project}
        onSelect={(document, paragraph) => {
          const { paragraphs: _p, license: _l, ...metadata } = document;
          setRetrieval({ ...metadata, excerpt: paragraph.text, locator: paragraph.locator });
          setSource({
            ...emptySource,
            title: document.title,
            author: document.authors.join(', '),
            publisher: document.publisher,
            date: document.publicationDate || '',
            doi: document.doi || '',
            url: document.canonicalUrl,
            quote: paragraph.text.slice(0, 1200),
            locator: paragraph.locator,
          });
          setSourceFormOpen(true);
          setSourceMessage('Source text retrieved. Explain the supported claim and chapter relevance before saving.');
        }}
      />

      <details open={sourceFormOpen} onToggle={(e) => setSourceFormOpen(e.currentTarget.open)} className="p-6 bg-white border border-slate-200 rounded-2xl">
        <summary className="text-base font-bold cursor-pointer text-slate-900">
          {lang === 'en' ? 'Review source evidence and map chapter relevance' : '審查來源證據並配置章節關聯'}
        </summary>
        <p className="text-sm text-slate-600 mt-3">
          {retrieval
            ? 'Bibliography is supplied by the retrieved document. Keep the quote verbatim and explain what it supports.'
            : 'No source text retrieved. You may save research notes, but a checkbox cannot validate them or unlock Gate B.'}
        </p>
        <form onSubmit={addSource} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
          {(
            [
              ['title', 'Source title'],
              ['author', 'Author (as supplied)'],
              ['publisher', 'Publisher / journal'],
              ['date', 'Publication date (as supplied)'],
              ['doi', 'DOI (if supplied)'],
              ['url', 'Original source URL'],
              ['locator', 'Page / section / paragraph locator'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="space-y-1.5 font-semibold text-slate-800">
              {label}
              <input
                required={['title', 'publisher', 'url', 'locator'].includes(key)}
                readOnly={Boolean(retrieval)}
                type={key === 'url' ? 'url' : 'text'}
                pattern={key === 'url' ? 'https?://.*' : undefined}
                value={source[key]}
                onChange={(e) => setSource({ ...source, [key]: e.target.value })}
                className="block w-full border border-slate-300 px-3.5 py-2.5 rounded-xl bg-slate-50 font-normal"
              />
            </label>
          ))}
          {(
            [
              ['summary', 'Substantive research summary'],
              ['claim', 'Specific supported claim'],
              ['quote', 'Exact supporting excerpt'],
              ['relevance', 'Why this source is relevant to the selected chapter objectives'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="space-y-1.5 md:col-span-2 font-semibold text-slate-800">
              {label}
              <textarea
                required
                minLength={key === 'summary' ? 50 : 20}
                rows={4}
                value={source[key]}
                onChange={(e) => setSource({ ...source, [key]: e.target.value })}
                className="block w-full border border-slate-300 p-3 rounded-xl bg-slate-50 font-normal"
              />
            </label>
          ))}
          <fieldset className="md:col-span-2 flex flex-wrap gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <legend className="px-2 font-bold text-slate-800">Map to relevant chapters</legend>
            {project.outline.map((ch) => (
              <label key={ch.id} className="flex gap-2.5 items-center text-sm">
                <input
                  type="checkbox"
                  checked={sourceChapters.includes(ch.id)}
                  onChange={(e) =>
                    setSourceChapters(
                      e.target.checked ? [...sourceChapters, ch.id] : sourceChapters.filter((id) => id !== ch.id)
                    )
                  }
                />
                {ch.title}
              </label>
            ))}
          </fieldset>
          <label className="md:col-span-2 flex gap-3 items-start p-3 rounded-xl bg-teal-50/50 border border-teal-200 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={source.confirmed}
              onChange={(e) => setSource({ ...source, confirmed: e.target.checked })}
            />
            <span>
              I inspected the retrieved source and checked this exact excerpt and its relevance. Per-passage support decisions are reviewed later in Content Studio. Without retrieved text this remains an unverified note.
            </span>
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-4">
            <button className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-xl" type="submit">
              {retrieval && source.confirmed
                ? (lang === 'en' ? 'Save reviewed source & open charter' : '儲存已覆核來源並開啟憲章')
                : (lang === 'en' ? 'Save research note' : '儲存研究筆記')}
            </button>
            {retrieval && source.confirmed && <button type="submit" value="stay" className="rounded-lg px-3 py-2 font-semibold text-teal-800 underline focus-visible:outline-2">
              {lang === 'en' ? 'Save & add another source' : '儲存並新增下一個來源'}
            </button>}
            <p role="status" className="text-sm font-medium text-teal-800">
              {sourceMessage}
            </p>
          </div>
        </form>
      </details>

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-teal-700 mb-1.5">
              <BookOpen className="w-4 h-4" />
              <span>GATE B — SOURCE RESEARCH & EVIDENCE REVIEW</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">{t.refTitle}</h1>
            <p className="text-sm text-slate-600 mt-1">{t.refSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadJson}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              JSON
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Markdown</span>
            </button>
            <button
              disabled={!cards.some(isRetrievedSource)}
              onClick={() => setActiveView('product_charter')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm whitespace-nowrap"
            >
              {lang === 'en' ? 'Product Charter (Gate B) →' : '進入產品憲章 (Gate B) →'}
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 text-sm">
          <div className="flex items-center gap-4 text-slate-700">
            <span>
              {t.verifiedCardsCount}:{' '}
              <strong className="font-mono text-emerald-700 text-base">
                {cards.filter(isRetrievedSource).length} / {referenceLibrary?.targetCount || 20}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>{t.sevenPartStandard}</span>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchRefPlaceholder}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl bg-white"
            />
          </div>
        </div>

        {/* Pillars Filter */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1">
            {lang === 'en' ? 'Pillars:' : '研究主軸:'}
          </span>
          {pillars.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPillar(p)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors whitespace-nowrap ${
                selectedPillar === p ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'text-slate-600 hover:text-slate-900'
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
              className={`bg-white border rounded-2xl transition-all ${
                isExpanded ? 'border-indigo-500 ring-1 ring-indigo-500/20 shadow-xs' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                className="p-5 lg:p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                      {card.id}
                    </span>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      {isRetrievedSource(card) ? 'Retrieved text and bibliography reviewed' : 'Unverified notes / retrieval review needed'}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-600 font-semibold">{card.publisherOrOrg}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-500">Claim support reviewed per passage</span>
                  <div className="text-sky-700 text-sm font-semibold flex items-center gap-1">
                    <span>{isExpanded ? (lang === 'en' ? 'Collapse' : '收合') : (lang === 'en' ? 'Inspect 7 Parts' : '檢視 7 大結構')}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 pt-3 border-t border-slate-100 space-y-4 text-sm text-slate-700 bg-slate-50/40">
                  <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
                    <h4 className="font-bold text-slate-900">Retrieved source evidence</h4>
                    <p className="text-xs text-slate-600">
                      {card.author || 'Author not supplied'} · {card.publicationDate || 'Date not supplied'} · {card.doi || 'DOI not supplied'}
                    </p>
                    <blockquote className="whitespace-pre-wrap p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                      {card.verificationQuote || 'No retrieved supporting excerpt.'}
                    </blockquote>
                    <p className="text-xs font-mono text-slate-600">
                      Locator: {card.verificationLocator || 'not supplied'} · Retrieval: {card.retrieval?.kind || 'not retrieved'} ·{' '}
                      {card.retrieval?.retrievedAt || 'not available'}
                    </p>
                    {card.chapterRelevance?.map((link) => (
                      <p key={link.chapterId} className="text-xs">
                        <strong>{project.outline.find((ch) => ch.id === link.chapterId)?.title || link.chapterId}:</strong> {link.rationale}
                      </p>
                    ))}
                  </section>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1.5">
                      <strong className="text-slate-900 block">B. {lang === 'en' ? 'Description & Core Context' : '描述與脈絡'}:</strong>
                      <p className="text-slate-600 leading-relaxed">{card.description}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1.5">
                      <strong className="text-slate-900 block">E. {lang === 'en' ? 'Research Summary' : '文獻與實證摘要'}:</strong>
                      <p className="text-slate-600 leading-relaxed">{card.researchSummary}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1.5">
                      <strong className="text-slate-900 block">C. {lang === 'en' ? 'Content Outline' : '內容大綱'}:</strong>
                      <ul className="list-disc list-inside space-y-1 text-slate-600">
                        {card.contentOutline.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-teal-800">
                          D. {lang === 'en' ? 'Practical Framework' : '實作框架'}: {card.practicalFramework.name}
                        </strong>
                        <span className="text-xs text-slate-500">{card.practicalFramework.editorialOrigin}</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600">
                        {card.practicalFramework.actionSteps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
                      <strong className="text-slate-800 block">F. {lang === 'en' ? 'Editorial Notes' : '編輯指引'}:</strong>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>
                          <strong>Target Chapters:</strong> {card.editorialNotes.targetChapters.join(', ')}
                        </div>
                        <div>
                          <strong>Worksheet:</strong> {card.editorialNotes.worksheetIntegration}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
                      <strong className="text-slate-800 block">G. {lang === 'en' ? 'Brand Guidelines' : '品牌與視覺規範'}:</strong>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>
                          <strong>Tone:</strong> {card.brandGuidelines.toneApplication}
                        </div>
                        <div>
                          <strong>Framing:</strong> {card.brandGuidelines.audienceFraming}
                        </div>
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
