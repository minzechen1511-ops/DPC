import React, { useState } from 'react';
import { Target, CheckCircle2, Plus, Edit3, Save, X } from 'lucide-react';
import { DigitalProductProject, UVZAnalysis } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface UVZViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onSelectOption: (optionId: string) => void;
  onUpdateUvz: (uvz: UVZAnalysis) => void;
  lang?: Language;
}

export const UVZView: React.FC<UVZViewProps> = ({
  project,
  setActiveView,
  onSelectOption,
  onUpdateUvz,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { uvz } = project;
  const options = uvz?.positioningOptions || [];

  const [showAddOption, setShowAddOption] = useState(false);
  const [newOpt, setNewOpt] = useState({ name: '', angle: '', targetPersona: '', promise: '', pros: '', risks: '' });
  const [editingProblems, setEditingProblems] = useState(false);
  const [problemsText, setProblemsText] = useState((uvz?.buyerProblems || []).join('\n'));
  const [solutionsText, setSolutionsText] = useState((uvz?.potentialSolutions || []).join('\n'));

  const handleCreateOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpt.name.trim()) return;
    const id = `UVZ-${String(options.length + 1).padStart(2, '0')}`;
    const updated: UVZAnalysis = {
      ...uvz,
      positioningOptions: [
        ...options,
        {
          id,
          name: newOpt.name.trim(),
          angle: newOpt.angle.trim(),
          targetPersona: newOpt.targetPersona.trim(),
          promise: newOpt.promise.trim(),
          pros: newOpt.pros.trim() || 'Clear buyer focus',
          risks: newOpt.risks.trim() || 'Requires evidence validation',
          isRecommended: options.length === 0,
        },
      ],
      selectedOptionId: id,
    };
    onUpdateUvz(updated);
    setNewOpt({ name: '', angle: '', targetPersona: '', promise: '', pros: '', risks: '' });
    setShowAddOption(false);
  };

  const handleSaveProblems = () => {
    onUpdateUvz({
      ...uvz,
      buyerProblems: problemsText.split('\n').map((s) => s.trim()).filter(Boolean),
      potentialSolutions: solutionsText.split('\n').map((s) => s.trim()).filter(Boolean),
    });
    setEditingProblems(false);
  };

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

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddOption((v) => !v)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {showAddOption ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showAddOption ? (lang === 'en' ? 'Cancel' : '取消') : (lang === 'en' ? 'Add Custom Positioning' : '新增自訂定位')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('transformation_map')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <span>{t.approveUvzCta}</span>
          </button>
        </div>
      </div>

      {showAddOption && (
        <form onSubmit={handleCreateOption} className="bg-white border border-indigo-200 rounded-xl p-6 space-y-3 text-xs">
          <h2 className="text-sm font-bold text-slate-900">{lang === 'en' ? 'New Custom UVZ Positioning Angle' : '新增專屬價值定位切角'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input required placeholder={lang === 'en' ? 'Positioning Name (e.g. Zero-Friction SOP Kit)' : '定位名稱'} value={newOpt.name} onChange={(e) => setNewOpt({ ...newOpt, name: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2" />
            <input required placeholder={lang === 'en' ? 'Target Buyer Persona' : '目標客群輪廓'} value={newOpt.targetPersona} onChange={(e) => setNewOpt({ ...newOpt, targetPersona: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2" />
            <input required placeholder={lang === 'en' ? 'Competitive Differentiation Angle' : '競爭差異化切入點'} value={newOpt.angle} onChange={(e) => setNewOpt({ ...newOpt, angle: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2" />
            <input required placeholder={lang === 'en' ? 'Core Transformation Promise' : '核心價值承諾'} value={newOpt.promise} onChange={(e) => setNewOpt({ ...newOpt, promise: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg">
            {lang === 'en' ? 'Save Positioning Option' : '儲存定位方案'}
          </button>
        </form>
      )}

      {/* Positioning Alternatives */}
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
                      <span className="text-[11px] font-semibold text-emerald-700">
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
                  type="button"
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
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold text-slate-900">
            {lang === 'en' ? 'Buyer Pain Matrix & Core Solution Architecture' : '買家痛點與核心解方架構'}
          </h2>
          {editingProblems ? (
            <button
              type="button"
              onClick={handleSaveProblems}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Save' : '儲存'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setProblemsText((uvz?.buyerProblems || []).join('\n'));
                setSolutionsText((uvz?.potentialSolutions || []).join('\n'));
                setEditingProblems(true);
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Edit Lists' : '編輯清單'}</span>
            </button>
          )}
        </div>

        {editingProblems ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">{t.buyerProblemsTitle} (one per line)</span>
              <textarea rows={5} value={problemsText} onChange={(e) => setProblemsText(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5" />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">{t.solutionsTitle} (one per line)</span>
              <textarea rows={5} value={solutionsText} onChange={(e) => setSolutionsText(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5" />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
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

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
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
        )}
      </div>
    </div>
  );
};
