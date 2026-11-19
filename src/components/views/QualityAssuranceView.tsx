import { countManuscriptWords } from '../../utils/textMetrics.ts';
import React from 'react';
import { ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import type { DigitalProductProject } from '../../types/project.ts';
import { gateIssues } from '../../utils/gatePolicy.ts';
import { auditChapter } from '../../utils/styledBook.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { RadialTelemetryGauge } from '../ScientificVisuals.tsx';

interface Props {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onApproveGateC: () => Promise<boolean>;
  checkingReferences?: boolean;
  lang?: Language;
}

export const QualityAssuranceView: React.FC<Props> = ({
  project,
  setActiveView,
  onApproveGateC,
  checkingReferences = false,
  lang = 'en',
}) => {
  const t = translations[lang];
  const blockers = gateIssues(project, 'gateC');
  const totalWords = project.outline.reduce((sum, ch) => sum + countManuscriptWords(ch.contentMarkdown || ''), 0);

  const audits = project.outline.map((ch) => ({ ch, audit: auditChapter(ch, project.referenceLibrary.cards) }));
  const totalPassages = audits.reduce((s, a) => s + a.audit.passages, 0);
  const totalCited = audits.reduce((s, a) => s + a.audit.cited, 0);
  const coveragePct = totalPassages > 0 ? Math.round((totalCited / totalPassages) * 100) : 0;

  return (
    <div className="w-full space-y-5 pb-3">
      <section className="p-6 lg:p-7 bg-white border border-slate-200 rounded-2xl flex flex-wrap justify-between gap-6 items-center">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-teal-700">
            <ShieldCheck size={16} />
            <span>GATE C — QUALITY & EVIDENCE VERIFICATION</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t.qaTitle}</h1>
          <p className="text-sm text-slate-600 max-w-4xl leading-relaxed">
            {lang === 'en'
              ? 'Gate C checks current project data, retrieved references, per-passage support decisions, substantive chapters and companion materials. It does not certify scientific validity.'
              : 'Gate C 檢查目前專案、引用、實質章節、來源配置與學習資源，不代表獨立科學認證。'}
          </p>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <RadialTelemetryGauge
            value={coveragePct}
            label={lang === 'en' ? 'Citation Coverage' : '引用審核覆蓋'}
            size={96}
          />
          <button
            disabled={blockers.length > 0 || checkingReferences}
            onClick={async () => {
              if (blockers.length) return;
              if (await onApproveGateC()) setActiveView('brand_design');
            }}
            className="px-5 py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-sm rounded-xl flex gap-2 items-center whitespace-nowrap"
          >
            <CheckCircle2 size={18} />
            {t.approveGateCCta}
          </button>
        </div>
      </section>

      <section className="p-6 lg:p-7 bg-white border border-slate-200 rounded-2xl space-y-4">
        <h2 className="font-bold text-lg text-slate-900">
          {blockers.length ? `${blockers.length} publication requirements need attention` : 'Current publication checks pass'}
        </h2>
        <p className="text-sm font-mono text-slate-600">
          {project.outline.length} chapters · {totalWords.toLocaleString()} words counted from the manuscript · {project.resources.length} companion resources
        </p>
        {blockers.length > 0 && (
          <ol className="list-disc pl-5 text-sm space-y-2 text-amber-950 bg-amber-50 border border-amber-200 rounded-xl p-4">
            {blockers.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap gap-3 text-sm pt-1">
          {[
            ['market_research', 'Market signals & Gate A niche'],
            ['reference_library', 'Research and source mappings'],
            ['content_studio', 'Manuscript and figures'],
            ['workbook_studio', 'Companion learning materials'],
          ].map(([route, label]) => (
            <button
              key={route}
              className="px-4 py-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-semibold rounded-xl flex items-center gap-2"
              onClick={() => setActiveView(route)}
            >
              {label}
              <ArrowRight size={15} />
            </button>
          ))}
        </div>
      </section>

      <section className="p-6 lg:p-7 bg-white border border-slate-200 rounded-2xl space-y-4">
        <h2 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3">Chapter evidence review</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {audits.map(({ ch, audit }) => {
            const pct = audit.passages > 0 ? Math.round((audit.cited / audit.passages) * 100) : 0;
            return (
              <div key={ch.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="font-bold text-teal-800">{ch.id}</span>
                  <span className="font-bold text-slate-700">{pct}% reviewed</span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{ch.title}</h3>
                <div className="w-full h-2 bg-slate-200 rounded-sm overflow-hidden">
                  <div className="h-full bg-teal-600" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-600">
                  {audit.cited}/{audit.passages} passages with reviewed source support · {audit.needsReview} need review · {ch.illustrations?.length || 0} illustrations
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
