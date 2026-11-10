import React from 'react';
import { GitFork, CheckCircle2, ArrowRight, ShieldCheck, Compass, Sparkles } from 'lucide-react';
import { DigitalProductProject } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface TransformationMapViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onSelectTitle: (titleId: string) => void;
  lang?: Language;
}

export const TransformationMapView: React.FC<TransformationMapViewProps> = ({
  project,
  setActiveView,
  onSelectTitle,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { transformationMap } = project;
  const titleOptions = transformationMap?.titleOptions || [];
  const beforeState = transformationMap?.beforeState;
  const bridgeProcess = transformationMap?.bridgeProcess;
  const afterState = transformationMap?.afterState;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <GitFork className="w-3.5 h-3.5" />
            <span>{t.navTransformationMap}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.mapTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.mapSubtitle}</p>
        </div>

        <button
          onClick={() => setActiveView('reference_library')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
        >
          <span>{t.approveMapCta}</span>
        </button>
      </div>

      {/* 3 Title Options Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">{t.titleOptionsTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {titleOptions.map((item) => {
            const isSelected = transformationMap.selectedTitleId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelectTitle(item.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-slate-400">{item.id}</span>
                    {item.isRecommended && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {lang === 'en' ? 'Recommended' : '推薦'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1 leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-600 mb-2">{item.subtitle}</p>
                  <p className="text-[11px] text-slate-400 italic">{item.rationale}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <span className={isSelected ? 'text-indigo-600' : 'text-slate-400'}>
                    {isSelected ? (lang === 'en' ? '✓ Selected' : '✓ 已選定') : t.selectTitleBtn}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 Pillars: Before, Bridge, After */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Before State */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>{t.beforeStateTitle}</span>
          </div>
          <div className="space-y-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-800 block">{lang === 'en' ? 'Daily Pains & Friction:' : '日常痛點：'}</span>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              {(beforeState?.currentPains || []).map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
            <div className="p-2.5 bg-rose-50/50 rounded border border-rose-100 text-[11px] text-rose-800 mt-2">
              <strong>{lang === 'en' ? 'Daily Drain Cost:' : '每日消耗代價：'}</strong> {beforeState?.dailyDrainCost}
            </div>
          </div>
        </div>

        {/* Bridge Process */}
        <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-3 bg-indigo-50/10">
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>{t.bridgeProcessTitle}</span>
          </div>
          <div className="space-y-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-800 block">
              {bridgeProcess?.signatureFrameworkName}
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              {(bridgeProcess?.keyMilestones || []).map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* After State */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{t.afterStateTitle}</span>
          </div>
          <div className="space-y-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-800 block">{lang === 'en' ? 'Measurable Outcomes:' : '實質收穫：'}</span>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              {(afterState?.tangibleOutcomes || []).map((o, idx) => (
                <li key={idx}>{o}</li>
              ))}
            </ul>
            <div className="p-2.5 bg-emerald-50/50 rounded border border-emerald-100 text-[11px] text-emerald-800 mt-2">
              <strong>{lang === 'en' ? 'Metrics:' : '關鍵指標：'}</strong> {(afterState?.measurableMetrics || []).join(' · ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
