import React from 'react';
import { Compass, CheckCircle2, ShieldCheck, Award, ArrowRight, AlertTriangle } from 'lucide-react';
import { DigitalProductProject } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface ProductCharterViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onApproveGateB: () => void;
  lang?: Language;
}

export const ProductCharterView: React.FC<ProductCharterViewProps> = ({
  project,
  setActiveView,
  onApproveGateB,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { charter, workflow } = project;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
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

        <button
          onClick={() => {
            onApproveGateB();
            setActiveView('outline_builder');
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap ${
            workflow?.gates?.gateB?.isApproved
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{workflow?.gates?.gateB?.isApproved ? t.gateBApprovedBadge : t.approveGateBCta}</span>
        </button>
      </div>

      {/* 17 Charter Items Container */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        {/* Row 1: Title, Subtitle, Promise */}
        <div className="space-y-2 pb-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              1. Title & 2. Subtitle
            </span>
            <span className="text-xs text-slate-400 font-mono">Format: {charter?.deliveryFormat}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{charter?.productTitle}</h2>
          <p className="text-sm font-medium text-slate-600">{charter?.subtitle}</p>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 mt-2">
            <strong>Central Promise:</strong> {charter?.centralPromise}
          </div>
        </div>

        {/* Row 2: Target Audience & Primary Problem */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5 border-b border-slate-100 text-xs">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <strong className="text-slate-800 font-bold block">3. Target Audience:</strong>
            <p className="text-slate-600 leading-relaxed">{charter?.targetAudience}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <strong className="text-slate-800 font-bold block">4. Primary Problem Solved:</strong>
            <p className="text-slate-600 leading-relaxed">{charter?.primaryProblemSolved}</p>
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
            <h4 className="text-sm font-bold text-indigo-700">{charter?.signatureFramework}</h4>
            <p className="text-[11px] text-indigo-800 mt-1">
              Target Depth: {charter?.contentDepthTarget} ({charter?.targetWordCount.toLocaleString()} words minimum)
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
    </div>
  );
};
