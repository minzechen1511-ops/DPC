import React from 'react';
import { Target, CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { DigitalProductProject } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface UVZViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onSelectOption: (optionId: string) => void;
  lang?: Language;
}

export const UVZView: React.FC<UVZViewProps> = ({
  project,
  setActiveView,
  onSelectOption,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { uvz } = project;
  const options = uvz?.positioningOptions || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Target className="w-3.5 h-3.5" />
            <span>{t.navUvz}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.uvzTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.uvzSubtitle}</p>
        </div>

        <button
          onClick={() => setActiveView('transformation_map')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
        >
          <span>{t.approveUvzCta}</span>
        </button>
      </div>

      {/* 3 Major Positioning Alternatives */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">{t.positioningTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {options.map((opt) => {
            const isSelected = uvz.selectedOptionId === opt.id;
            return (
              <div
                key={opt.id}
                className={`bg-white border rounded-xl p-5 flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-700 font-mono">{opt.id}</span>
                    {opt.isRecommended && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {lang === 'en' ? 'Recommended' : '推薦方案'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-2 leading-snug">{opt.name}</h3>
                  <p className="text-xs text-slate-600 mb-3">{opt.angle}</p>

                  <div className="space-y-2 text-xs text-slate-700 py-3 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[11px] block">{t.targetAudienceLabel}:</span>
                      <strong className="text-slate-800">{opt.targetPersona}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">{t.bigPromiseLabel}:</span>
                      <span className="text-slate-700">{opt.promise}</span>
                    </div>
                    <div className="pt-2 text-[11px] text-emerald-700">
                      <strong>Pros:</strong> {opt.pros}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <strong>Risks:</strong> {opt.risks}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectOption(opt.id)}
                  className={`w-full mt-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSelected ? (lang === 'en' ? 'Selected' : '已選定') : t.selectPositioningBtn}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buyer Problems & Core Solutions Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">{t.buyerProblemsTitle}</h3>
          <ul className="space-y-2 text-xs text-slate-600">
            {(uvz?.buyerProblems || []).map((prob, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span>{prob}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">{t.solutionsTitle}</h3>
          <ul className="space-y-2 text-xs text-slate-600">
            {(uvz?.potentialSolutions || []).map((sol, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{sol}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
