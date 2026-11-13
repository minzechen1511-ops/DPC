import React, { useState } from 'react';
import { GitFork, Plus, Edit3, Save, X } from 'lucide-react';
import { DigitalProductProject, TransformationMap } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface TransformationMapViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onSelectTitle: (titleId: string) => void;
  onUpdateTransformationMap: (map: TransformationMap) => void;
  lang?: Language;
}

export const TransformationMapView: React.FC<TransformationMapViewProps> = ({
  project,
  setActiveView,
  onSelectTitle,
  onUpdateTransformationMap,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { transformationMap } = project;
  const titleOptions = transformationMap?.titleOptions || [];
  const beforeState = transformationMap?.beforeState;
  const bridgeProcess = transformationMap?.bridgeProcess;
  const afterState = transformationMap?.afterState;

  const [showAddTitle, setShowAddTitle] = useState(false);
  const [newTitle, setNewTitle] = useState({ title: '', subtitle: '', rationale: '' });
  const [editingMap, setEditingMap] = useState(false);
  const [painsText, setPainsText] = useState((beforeState?.currentPains || []).join('\n'));
  const [milestonesText, setMilestonesText] = useState((bridgeProcess?.keyMilestones || []).join('\n'));
  const [outcomesText, setOutcomesText] = useState((afterState?.tangibleOutcomes || []).join('\n'));
  const [frameworkName, setFrameworkName] = useState(bridgeProcess?.signatureFrameworkName || '');

  const handleAddTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.title.trim()) return;
    const id = `TITLE-${String(titleOptions.length + 1).padStart(2, '0')}`;
    const updated: TransformationMap = {
      ...transformationMap,
      titleOptions: [
        ...titleOptions,
        {
          id,
          title: newTitle.title.trim(),
          subtitle: newTitle.subtitle.trim(),
          rationale: newTitle.rationale.trim() || 'Custom commercial positioning',
          isRecommended: titleOptions.length === 0,
        },
      ],
      selectedTitleId: id,
    };
    onUpdateTransformationMap(updated);
    setNewTitle({ title: '', subtitle: '', rationale: '' });
    setShowAddTitle(false);
  };

  const handleSavePillars = () => {
    onUpdateTransformationMap({
      ...transformationMap,
      beforeState: {
        ...transformationMap.beforeState,
        currentPains: painsText.split('\n').map((s) => s.trim()).filter(Boolean),
      },
      bridgeProcess: {
        ...transformationMap.bridgeProcess,
        signatureFrameworkName: frameworkName.trim(),
        keyMilestones: milestonesText.split('\n').map((s) => s.trim()).filter(Boolean),
      },
      afterState: {
        ...transformationMap.afterState,
        tangibleOutcomes: outcomesText.split('\n').map((s) => s.trim()).filter(Boolean),
      },
    });
    setEditingMap(false);
  };

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

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddTitle((v) => !v)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {showAddTitle ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showAddTitle ? (lang === 'en' ? 'Cancel' : '取消') : (lang === 'en' ? 'Add Title Option' : '新增書名備選')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('reference_library')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <span>{t.approveMapCta}</span>
          </button>
        </div>
      </div>

      {showAddTitle && (
        <form onSubmit={handleAddTitle} className="bg-white border border-indigo-200 rounded-xl p-6 space-y-3 text-xs">
          <h2 className="text-sm font-bold text-slate-900">{lang === 'en' ? 'Add Custom Product Title & Subtitle' : '新增自訂商品書名與副標題'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder={lang === 'en' ? 'Book / Product Title' : '主標題'} value={newTitle.title} onChange={(e) => setNewTitle({ ...newTitle, title: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2" />
            <input required placeholder={lang === 'en' ? 'Outcome-oriented Subtitle' : '成果導向副標題'} value={newTitle.subtitle} onChange={(e) => setNewTitle({ ...newTitle, subtitle: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2" />
            <input placeholder={lang === 'en' ? 'Hook / Conversion Rationale' : '轉換訴求說明'} value={newTitle.rationale} onChange={(e) => setNewTitle({ ...newTitle, rationale: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg">
            {lang === 'en' ? 'Save & Select Title' : '儲存並選定此書名'}
          </button>
        </form>
      )}

      {/* Title Options Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">{t.titleOptionsTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {titleOptions.map((item) => {
            const isSelected = transformationMap.selectedTitleId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTitle(item.id)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-slate-400">{item.id}</span>
                    {item.isRecommended && (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {lang === 'en' ? 'Recommended' : '推薦'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1 leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-600 mb-2">{item.subtitle}</p>
                  <p className="text-[11px] text-slate-500">{item.rationale}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <span className={isSelected ? 'text-indigo-600' : 'text-slate-400'}>
                    {isSelected ? (lang === 'en' ? '✓ Selected' : '✓ 已選定') : t.selectTitleBtn}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Pillars: Before, Bridge, After */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold text-slate-900">
            {lang === 'en' ? 'Before → Bridge → After Transformation Matrix' : 'Before → Bridge → After 轉變架構矩陣'}
          </h2>
          {editingMap ? (
            <button
              type="button"
              onClick={handleSavePillars}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Save Matrix' : '儲存矩陣'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPainsText((beforeState?.currentPains || []).join('\n'));
                setMilestonesText((bridgeProcess?.keyMilestones || []).join('\n'));
                setOutcomesText((afterState?.tangibleOutcomes || []).join('\n'));
                setFrameworkName(bridgeProcess?.signatureFrameworkName || '');
                setEditingMap(true);
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Edit Pillars' : '編輯三階段內容'}</span>
            </button>
          )}
        </div>

        {editingMap ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <label className="block space-y-1">
              <span className="font-semibold text-rose-700">{t.beforeStateTitle} (one per line)</span>
              <textarea rows={5} value={painsText} onChange={(e) => setPainsText(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5" />
            </label>
            <div className="space-y-2">
              <label className="block space-y-1">
                <span className="font-semibold text-indigo-700">Signature Framework Name</span>
                <input type="text" value={frameworkName} onChange={(e) => setFrameworkName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
              </label>
              <label className="block space-y-1">
                <span className="font-semibold text-indigo-700">{t.bridgeProcessTitle} (one per line)</span>
                <textarea rows={3} value={milestonesText} onChange={(e) => setMilestonesText(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5" />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="font-semibold text-emerald-700">{t.afterStateTitle} (one per line)</span>
              <textarea rows={5} value={outcomesText} onChange={(e) => setOutcomesText(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5" />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Before State */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="text-rose-700 text-xs font-bold uppercase tracking-wide">{t.beforeStateTitle}</div>
              <div className="space-y-2 text-xs text-slate-700">
                <span className="font-semibold text-slate-800 block">{lang === 'en' ? 'Daily Pains & Friction:' : '日常痛點：'}</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  {(beforeState?.currentPains || []).map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
                <div className="p-2.5 bg-rose-50/70 rounded border border-rose-100 text-[11px] text-rose-800 mt-2">
                  <strong>{lang === 'en' ? 'Daily Drain Cost:' : '每日消耗代價：'}</strong> {beforeState?.dailyDrainCost || '—'}
                </div>
              </div>
            </div>

            {/* Bridge Process */}
            <div className="bg-indigo-50/30 border border-indigo-200 rounded-xl p-5 space-y-3">
              <div className="text-indigo-700 text-xs font-bold uppercase tracking-wide">{t.bridgeProcessTitle}</div>
              <div className="space-y-2 text-xs text-slate-700">
                <span className="font-semibold text-slate-800 block">{bridgeProcess?.signatureFrameworkName || '—'}</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  {(bridgeProcess?.keyMilestones || []).map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* After State */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="text-emerald-700 text-xs font-bold uppercase tracking-wide">{t.afterStateTitle}</div>
              <div className="space-y-2 text-xs text-slate-700">
                <span className="font-semibold text-slate-800 block">{lang === 'en' ? 'Measurable Outcomes:' : '實質收穫：'}</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  {(afterState?.tangibleOutcomes || []).map((o, idx) => (
                    <li key={idx}>{o}</li>
                  ))}
                </ul>
                <div className="p-2.5 bg-emerald-50/70 rounded border border-emerald-100 text-[11px] text-emerald-800 mt-2">
                  <strong>{lang === 'en' ? 'Metrics:' : '關鍵指標：'}</strong> {(afterState?.measurableMetrics || []).join(' · ') || '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
