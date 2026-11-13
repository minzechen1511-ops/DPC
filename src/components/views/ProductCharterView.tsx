import { gateIssues } from '../../utils/gatePolicy.ts';
import React, { useState, useEffect } from 'react';
import { Compass, CheckCircle2, AlertTriangle, Edit3, Save, X } from 'lucide-react';
import { DigitalProductProject, ProductCharter, ProductFormat } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface ProductCharterViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onApproveGateB: () => Promise<boolean>;
  onUpdateCharter: (charter: ProductCharter) => void;
  checkingReferences?: boolean;
  lang?: Language;
}

export const ProductCharterView: React.FC<ProductCharterViewProps> = ({
  project,
  setActiveView,
  onApproveGateB,
  onUpdateCharter,
  checkingReferences = false,
  lang = 'en',
}) => {
  const t = translations[lang];
  const blockers = gateIssues(project, 'gateB');
  const { charter, workflow } = project;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProductCharter>(charter);
  const [disclaimersText, setDisclaimersText] = useState((charter?.explicitDisclaimers || []).join('\n'));
  const [pillarsText, setPillarsText] = useState((charter?.structuralPillars || []).join('\n'));
  const [objectivesText, setObjectivesText] = useState((charter?.learningObjectives || []).join('\n'));
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setDraft(project.charter);
    setDisclaimersText((project.charter?.explicitDisclaimers || []).join('\n'));
    setPillarsText((project.charter?.structuralPillars || []).join('\n'));
    setObjectivesText((project.charter?.learningObjectives || []).join('\n'));
  }, [project.projectId, project.charter]);

  const handleSaveCharter = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ProductCharter = {
      ...draft,
      explicitDisclaimers: disclaimersText.split('\n').map((s) => s.trim()).filter(Boolean),
      structuralPillars: pillarsText.split('\n').map((s) => s.trim()).filter(Boolean),
      learningObjectives: objectivesText.split('\n').map((s) => s.trim()).filter(Boolean),
      isApproved: false,
      approvedAt: undefined,
    };
    onUpdateCharter(updated);
    setEditing(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {blockers.length > 0 && (
        <details open className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-950">
          <summary className="font-semibold cursor-pointer">
            {lang === 'en' ? 'Review requirements before approval' : '核准前請完成審查要求'}
          </summary>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Gate B — {t.charterTitle}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.charterTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.charterSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {editing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>
              {editing
                ? lang === 'en' ? 'Cancel Edit' : '取消編輯'
                : lang === 'en' ? 'Edit Charter' : '編輯產品憲章'}
            </span>
          </button>

          <button
            type="button"
            disabled={blockers.length > 0 || checkingReferences}
            title={blockers.join(' ')}
            onClick={async () => {
              if (blockers.length) return;
              if (await onApproveGateB()) setActiveView('outline_builder');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap ${
              workflow?.gates?.gateB?.isApproved
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{workflow?.gates?.gateB?.isApproved ? t.gateBApprovedBadge : t.approveGateBCta}</span>
          </button>
        </div>
      </div>

      {savedNotice && (
        <p role="status" className="px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
          {lang === 'en' ? 'Product Charter updated. Review Gate B requirements and approve when ready.' : '產品憲章已更新。請審查 Gate B 要求並進行核准。'}
        </p>
      )}

      {editing ? (
        <form onSubmit={handleSaveCharter} className="bg-white border border-indigo-200 rounded-xl p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900">
              {lang === 'en' ? 'Edit Product Charter Architecture' : '編輯產品憲章核心架構'}
            </h2>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Save Charter' : '儲存憲章'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">1. Product Title</span>
              <input
                required
                type="text"
                value={draft.productTitle}
                onChange={(e) => setDraft({ ...draft, productTitle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">2. Subtitle</span>
              <input
                type="text"
                value={draft.subtitle}
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-700">Central Transformation Promise</span>
            <textarea
              rows={2}
              value={draft.centralPromise}
              onChange={(e) => setDraft({ ...draft, centralPromise: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">3. Target Audience</span>
              <textarea
                rows={2}
                value={draft.targetAudience}
                onChange={(e) => setDraft({ ...draft, targetAudience: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">4. Primary Problem Solved</span>
              <textarea
                rows={2}
                value={draft.primaryProblemSolved}
                onChange={(e) => setDraft({ ...draft, primaryProblemSolved: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="block space-y-1 md:col-span-2">
              <span className="font-semibold text-slate-700">6. Signature Framework</span>
              <input
                type="text"
                value={draft.signatureFramework}
                onChange={(e) => setDraft({ ...draft, signatureFramework: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">Delivery Format</span>
              <select
                value={draft.deliveryFormat}
                onChange={(e) => setDraft({ ...draft, deliveryFormat: e.target.value as ProductFormat })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2"
              >
                <option value="ebook_toolkit">ebook_toolkit</option>
                <option value="ebook">ebook</option>
                <option value="workbook">workbook</option>
                <option value="template_bundle">template_bundle</option>
                <option value="mini_course">mini_course</option>
                <option value="challenge">challenge</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">Target Word Count</span>
              <input
                type="number"
                min={500}
                step={500}
                value={draft.targetWordCount}
                onChange={(e) => setDraft({ ...draft, targetWordCount: Number(e.target.value) })}
                className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">5. Explicit Disclaimers (one per line)</span>
              <textarea
                rows={4}
                value={disclaimersText}
                onChange={(e) => setDisclaimersText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">7. Structural Pillars (one per line)</span>
              <textarea
                rows={4}
                value={pillarsText}
                onChange={(e) => setPillarsText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">8. Learning Objectives (one per line)</span>
              <textarea
                rows={4}
                value={objectivesText}
                onChange={(e) => setObjectivesText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
              />
            </label>
          </div>
        </form>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          {/* Row 1: Title, Subtitle, Promise */}
          <div className="space-y-2 pb-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                1. Title & 2. Subtitle
              </span>
              <span className="text-xs text-slate-400 font-mono">Format: {charter?.deliveryFormat}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{charter?.productTitle || t.untitledProject}</h2>
            <p className="text-sm font-medium text-slate-600">{charter?.subtitle}</p>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 mt-2">
              <strong>Central Promise:</strong> {charter?.centralPromise || '—'}
            </div>
          </div>

          {/* Row 2: Target Audience & Primary Problem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5 border-b border-slate-100 text-xs">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <strong className="text-slate-800 font-bold block">3. Target Audience:</strong>
              <p className="text-slate-600 leading-relaxed">{charter?.targetAudience || '—'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <strong className="text-slate-800 font-bold block">4. Primary Problem Solved:</strong>
              <p className="text-slate-600 leading-relaxed">{charter?.primaryProblemSolved || '—'}</p>
            </div>
          </div>

          {/* Row 3: Disclaimers & Signature Framework */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5 border-b border-slate-100 text-xs">
            <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-200 space-y-2">
              <strong className="text-amber-900 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>5. Explicit Disclaimers (Non-guarantees):</span>
              </strong>
              <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
                {(charter?.explicitDisclaimers || []).map((disc, idx) => (
                  <li key={idx}>{disc}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-200 space-y-1">
              <strong className="text-indigo-900 font-bold block">6. Signature Framework Name:</strong>
              <h4 className="text-sm font-bold text-indigo-700">{charter?.signatureFramework || '—'}</h4>
              <p className="text-[11px] text-indigo-800 mt-1 tabular-nums">
                Target Depth: {charter?.contentDepthTarget} ({(charter?.targetWordCount || 0).toLocaleString()} words minimum)
              </p>
            </div>
          </div>

          {/* Row 4: Structural Pillars & Learning Objectives */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <strong className="text-slate-900 font-bold block">7. Four Structural Pillars:</strong>
              <div className="space-y-1.5">
                {(charter?.structuralPillars || []).map((pillar, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-200 font-medium text-slate-800">
                    {pillar}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <strong className="text-slate-900 font-bold block">8. Core Learning Objectives:</strong>
              <div className="space-y-1.5">
                {(charter?.learningObjectives || []).map((obj, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700">
                    {idx + 1}. {obj}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
