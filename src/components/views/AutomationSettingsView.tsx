import React, { useState } from 'react';
import { Sliders, CheckCircle2, ShieldCheck, Zap, AlertTriangle, Save } from 'lucide-react';
import { DigitalProductProject, StageId, AutomationLevel } from '../../types/project.ts';
import { STAGE_METADATA } from '../../utils/workflowEngine.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface AutomationSettingsViewProps {
  project: DigitalProductProject;
  onSavePreferences: (prefs: any) => void;
  lang?: Language;
}

export const AutomationSettingsView: React.FC<AutomationSettingsViewProps> = ({
  project,
  onSavePreferences,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [autoApproveNonCritical, setAutoApproveNonCritical] = useState<boolean>(
    project.preferences?.autoApproveNonCritical ?? true
  );

  const [automationMode, setAutomationMode] = useState<string>(
    project.preferences?.automationMode || 'selection_autopilot'
  );

  const stageAutomationMap: Record<StageId, AutomationLevel> = {
    market_research: 'AUTO',
    topic_selection: 'SUGGEST',
    project_brief: 'AUTO',
    uvz: 'AUTO',
    transformation_map: 'AUTO',
    reference_library: 'AUTO',
    product_charter: 'APPROVAL',
    outline_builder: 'SUGGEST',
    content_studio: 'AUTO',
    workbook_studio: 'AUTO',
    quality_assurance: 'APPROVAL',
    brand_design: 'AUTO',
    pricing_launch: 'AUTO',
    export_center: 'AUTO',
  };

  const handleSave = () => {
    onSavePreferences({
      ...project.preferences,
      autoApproveNonCritical,
      automationMode,
    });
    alert(lang === 'en' ? 'Automation governance settings saved successfully!' : '自動化門檻與工作流設定已成功儲存！');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Sliders className="w-3.5 h-3.5" />
            <span>{t.navAutomationSettings}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {lang === 'en' ? 'Automation Governance & Gate Approval Thresholds' : '自動化等級、人機協同門檻與審核策略'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'en'
              ? 'Selection-Driven Autopilot: System autonomously executes intermediate stages while human operators control Gate A, Gate B, and Gate C.'
              : '落實「Selection-Driven Autopilot」核心精神：系統自主推進工作，人類掌握三大必要決策門檻 (Gate A / B / C)'}
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{t.saveSettings}</span>
        </button>
      </div>

      {/* Mode Toggle Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          {lang === 'en' ? 'Core Autopilot Mode' : '主要推進模式'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setAutomationMode('selection_autopilot')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              automationMode === 'selection_autopilot'
                ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">
                {lang === 'en' ? 'Selection-Driven Autopilot (Recommended)' : '智慧選題驅動自動化 (推薦)'}
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Default
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {lang === 'en'
                ? 'Selecting a topic candidate in Gate A immediately cascades and auto-populates downstream briefs, UVZ, transformation map, 20 reference cards, outline, and toolkits.'
                : '在 Gate A 選題後，系統立即自動級聯生成後續 13 欄位、UVZ、轉變地圖、20 篇文獻、大綱與套件。'}
            </p>
          </div>

          <div
            onClick={() => setAutomationMode('manual_review')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              automationMode === 'manual_review'
                ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">
                {lang === 'en' ? 'Step-by-Step Manual Review' : '逐步人工審核模式'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {lang === 'en'
                ? 'Pause at every single stage for manual parameter tuning before proceeding.'
                : '在每一個個別階段停頓，等待使用者手動微調參數後再前進。'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
