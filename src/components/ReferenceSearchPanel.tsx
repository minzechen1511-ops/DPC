import React, { useState } from 'react';
import { Search, ExternalLink, BookOpen, Loader2 } from 'lucide-react';
import type { DigitalProductProject } from '../types/project.ts';
import type { ResearchResult, RetrievedResearchDocument, ResearchParagraph } from '../types/research.ts';
import { normalizeEvidenceText } from '../utils/sourceEvidence.ts';
import {accessibleResult, publicResearchLead, suggestedPassage, suggestedSearch} from '../utils/researchPlanning.ts';
import type {Language} from '../utils/i18n.ts';
import { apiFetch } from '../services/apiClient.ts';

interface Props {
  project: DigitalProductProject;
  lang?: Language;
  onSelect: (document: RetrievedResearchDocument, paragraph: ResearchParagraph) => void;
}

export const ReferenceSearchPanel: React.FC<Props> = ({ project, onSelect, lang='en' }) => {
  const topic = suggestedSearch(project);
  const en = lang === 'en';
  const [activity, setActivity] = useState('');
  const [leadFailure, setLeadFailure] = useState('');
  const [query, setQuery] = useState(topic.slice(0, 250));
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [reports, setReports] = useState<Array<{ provider: string; state: string; message: string }>>([]);
  const [document, setDocument] = useState<RetrievedResearchDocument | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const search = async (event?: React.FormEvent, guided=false) => {
    event?.preventDefault();
    if (busy || query.trim().length < 3) return;
    setBusy(true);
    setError('');
    setLeadFailure('');
    setResults([]);
    setReports([]);
    setDocument(null);
    try {
      const lead = guided && publicResearchLead(query);
      if (lead) {
        setActivity(en ? 'Retrieving the public spending guide…' : '正在取回公開支出指南…');
        try {
          await loadDocument({url:lead}, undefined, true);
          return;
        } catch (err) { setLeadFailure(err instanceof Error ? err.message : String(err)); }
      }
      setActivity(en ? 'Searching research providers…' : '正在搜尋研究來源…');
      const response = await apiFetch(`/api/references/search?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search failed.');
      setResults(data.results || []);
      setReports(data.sources || []);
      if (guided) {
        const candidate = accessibleResult(data.results || []);
        if (!candidate) {
          setError(en ? 'No matching accessible text was found. Try different search terms or provide an original public page below.' : '尚未找到符合主題的可讀內文。請調整搜尋詞，或在下方提供公開來源網址。');
          return;
        }
        setActivity(en ? 'Retrieving original text…' : '正在取回原始內文…');
        await loadDocument(candidate.pmcid ? {pmcid:candidate.pmcid} : {url:candidate.fullTextURL}, candidate, true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reference search failed.');
    } finally {
      setBusy(false);
    }
  };

  const loadDocument = async (input: { pmcid?: string; url?: string }, selected?: ResearchResult, suggest=false) => {
      const response = await apiFetch('/api/references/retrieve', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Source text could not be retrieved.');
      if (selected) {
        const doiMatches = selected.doi && data.doi && selected.doi.toLowerCase() === data.doi.toLowerCase();
        const titleMatches =
          normalizeEvidenceText(selected.title).replace(/[^\p{L}\p{N}]/gu, '').toLowerCase() ===
          normalizeEvidenceText(data.title).replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
        if (!doiMatches && !titleMatches) {
          throw new Error(
            'Retrieved text does not match the selected bibliographic record. Inspect the original source before using it.'
          );
        }
      }
      setDocument(data);
      if (suggest) {
        const passage = suggestedPassage(data.paragraphs, query);
        if (passage) onSelect(data, passage);
        else setError(en ? 'Text retrieved. Choose a relevant passage below to prepare your review.' : '已取得內文，請選取相關段落以開始覆核。');
      }
  };
  const retrieve = async (input: {pmcid?: string; url?: string}, selected?: ResearchResult) => {
    setBusy(true);
    setError('');
    setDocument(null);
    setActivity(en ? 'Retrieving original text…' : '正在取回原始內文…');
    try {
      await loadDocument(input, selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrieval failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="p-6 lg:p-7 bg-white border border-slate-200 rounded-2xl space-y-5">
      <div>
        <h2 className="text-xl font-bold flex gap-2.5 items-center text-slate-900">
          <Search size={22} className="text-teal-700" />
          {en ? 'Find a source for your product' : '為產品尋找參考來源'}
        </h2>
        <p className="text-sm text-slate-600 mt-1 max-w-4xl">
          {en ? 'Start with your topic. The studio looks for accessible original text and suggests a passage for you to review.' : '從已選題材開始，工作室會尋找可讀原文，並建議一段內文供您覆核。'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || query.trim().length < 3} onClick={() => void search(undefined, true)} className="rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {en ? 'Find a passage to review' : '尋找可覆核的段落'}
        </button>
        <span className="text-sm text-slate-600">{query}</span>
      </div>
      {busy && <p role="status" className="text-sm text-teal-900">{activity}</p>}
      {leadFailure && <p role="status" className="text-sm text-amber-900">{en ? 'Public page retrieval failed' : '公開頁面取回失敗'} · {leadFailure}</p>}
      <details><summary className="cursor-pointer text-sm font-semibold text-teal-800">{en ? 'Change search terms or browse results manually' : '調整搜尋詞或手動瀏覽結果'}</summary>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        <form onSubmit={search} className="lg:col-span-8 flex flex-col sm:flex-row gap-3">
          <label className="flex-1 min-w-0 text-sm font-semibold text-slate-800">
            Research question or topic
            <input
              minLength={3}
              maxLength={250}
              required
              className="mt-1.5 border border-slate-300 rounded-xl px-4 py-2.5 w-full bg-slate-50 font-normal"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            disabled={busy}
            className="self-start sm:self-end px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-sm rounded-xl flex gap-2 items-center whitespace-nowrap"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search literature
          </button>
        </form>

        {project.outline.length > 0 && <label className="lg:col-span-4 block text-sm font-semibold text-slate-800">
          Focus on a chapter
          <select
            className="block mt-1.5 border border-slate-300 rounded-xl px-4 py-2.5 w-full bg-slate-50 font-normal"
            defaultValue=""
            onChange={(e) => {
              const chapter = project.outline.find((ch) => ch.id === e.target.value);
              setQuery(chapter ? `${topic} ${chapter.objective}`.slice(0, 250) : topic.slice(0, 250));
            }}
          >
            <option value="">Whole product</option>
            {project.outline.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.title}
              </option>
            ))}
          </select>
        </label>}
      </div>

      </details>
      {reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {reports.map((report) => (
            <p key={report.provider} className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <strong>
                {report.provider} · {report.state}:
              </strong>{' '}
              {report.message}
            </p>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-900 bg-red-50 border border-red-200 rounded-xl p-3.5 font-medium">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {results.map((result) => (
            <article key={result.id} className="border border-slate-200 bg-slate-50/70 rounded-xl p-4 space-y-2.5">
              <h3 className="font-bold text-base text-slate-900">{result.title}</h3>
              <p className="text-xs text-slate-600">
                {result.authors.join(', ') || 'Author not supplied'} · {result.publisher} ·{' '}
                {result.publicationDate || 'Date not supplied'}
                {result.doi ? ` · DOI ${result.doi}` : ''}
              </p>
              <p className="text-xs text-slate-600 font-mono">
                Search terms found: {result.relevance.matchedTerms.join(', ') || 'none'} · {result.provider} metadata only
              </p>
              {result.abstract && (
                <details className="text-sm text-slate-700">
                  <summary className="cursor-pointer font-medium">
                    Read supplied abstract (not full-text verification)
                  </summary>
                  <p className="mt-2 leading-relaxed">{result.abstract}</p>
                </details>
              )}
              {result.isRetracted && (
                <p className="text-sm font-semibold text-red-800">
                  Retraction-related record: excluded from evidence retrieval.
                </p>
              )}
              <div className="flex flex-wrap gap-3 items-center pt-1">
                <a
                  href={result.sourceURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-sky-700 font-semibold underline inline-flex gap-1.5 items-center"
                >
                  Open original record
                  <ExternalLink size={14} />
                </a>
                {(result.pmcid || result.fullTextURL) && (
                  <button
                    disabled={busy || result.isRetracted}
                    onClick={() => retrieve(result.pmcid ? { pmcid: result.pmcid } : { url: result.fullTextURL }, result)}
                    className="text-sm px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold rounded-xl"
                  >
                    Retrieve accessible text
                  </button>
                )}
                {!result.pmcid && !result.fullTextURL && (
                  <span className="text-xs text-amber-900">
                    No supported full-text link supplied; this record cannot be marked validated.
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <details className="border-t border-slate-200 pt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-800">
          Retrieve a government, university or supported public research page
        </summary>
        <p className="text-xs text-slate-600 mt-2">
          Use the exact HTTPS source page. PDFs, redirects, paywalls and inaccessible sources remain unverified; no text is invented.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <label className="flex-1 min-w-0 font-semibold text-slate-800">
            Original public research URL
            <input
              type="url"
              className="border border-slate-300 px-3.5 py-2.5 rounded-xl w-full block mt-1.5 bg-slate-50 font-normal"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <button
            disabled={busy || !url.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-semibold self-end"
            onClick={() => retrieve({ url })}
          >
            Retrieve public page
          </button>
        </div>
      </details>

      {document && (
        <section className="p-5 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-3">
          <h3 className="text-base font-bold flex gap-2 items-center text-slate-900">
            <BookOpen size={18} className="text-sky-700" />
            {document.title}
          </h3>
          <p className="text-xs font-mono text-slate-600">
            Retrieved {document.kind === 'full_text' ? 'article body' : 'public page text'} · {document.retrievedAt} · SHA-256{' '}
            {document.contentHash.slice(0, 16)}…
          </p>
          <a
            href={document.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sky-800 font-semibold underline inline-block"
          >
            Inspect original source
          </a>
          <p className="text-sm text-slate-700">
            Read the relevant passage and select it for your source record. You still need to explain its relevance and review its support for each manuscript claim.
          </p>
          <div className="max-h-[480px] overflow-y-auto space-y-4 pr-1">
            {document.paragraphs.map((paragraph) => (
              <article key={paragraph.locator} className="border border-sky-200 bg-white rounded-xl p-4">
                <h4 className="text-xs font-mono font-bold text-sky-800">{paragraph.locator}</h4>
                <p className="text-sm text-slate-800 my-2.5 whitespace-pre-wrap leading-relaxed">{paragraph.text}</p>
                <button
                  onClick={() => onSelect(document, paragraph)}
                  className="text-xs font-semibold px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg"
                >
                  Use this exact source paragraph
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
};
