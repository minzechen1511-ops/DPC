import React, { useState, useEffect } from 'react';
import { CheckCircle2, Save, Sliders } from 'lucide-react';
import type { DigitalProductProject, MarketRegion, ProductFormat, UserPreferences } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface Props {
  project: DigitalProductProject;
  onSavePreferences: (prefs: UserPreferences) => void;
  lang?: Language;
}

export const AutomationSettingsView: React.FC<Props> = ({ project, onSavePreferences, lang = 'en' }) => {
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences>(project.preferences);
  const t = translations[lang];

  useEffect(() => {
    setPrefs(project.preferences);
  }, [project.projectId, project.preferences]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePreferences({
      ...prefs,
      automationMode: 'manual_review',
      autoApproveNonCritical: false,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Sliders className="w-3.5 h-3.5" />
            <span>{t.navAutomationSettings}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {lang === 'en' ? 'Workflow & Review Settings' : '工作流程與審查設定'}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {lang === 'en'
              ? 'Complete each stage deliberately. Research, selections, chapter drafts, and evidence reviews remain explicit actions. Gates A, B, and C require your approval.'
              : '請逐階段完成研究、選項、稿件與證據審查。Gate A、B、C 都需要您明確核准，不會自動執行或略過品質門檻。'}
          </p>
        </div>

        {/* Editable Commercial Workspace Defaults */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100">
          <label className="block space-y-1">
            <span className="font-semibold text-slate-700">{lang === 'en' ? 'Target Market' : '目標銷售市場'}</span>
            <select
              value={prefs.market}
              onChange={(e) => setPrefs({ ...prefs, market: e.target.value as MarketRegion })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
            >
              <option value="US">United States (US)</option>
              <option value="UK">United Kingdom (UK)</option>
              <option value="CA">Canada (CA)</option>
              <option value="AU">Australia (AU)</option>
              <option value="TW">Taiwan (TW)</option>
              <option value="GLOBAL_EN">Global English</option>
              <option value="CUSTOM">Custom Region</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-700">{lang === 'en' ? 'Publication Language' : '出版語言方向'}</span>
            <select
              value={prefs.language}
              onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
            >
              <option value="English">English</option>
              <option value="Traditional Chinese">Traditional Chinese (繁體中文)</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-700">{lang === 'en' ? 'Product Deliverable Format' : '預設產品交付形式'}</span>
            <select
              value={prefs.productFormat}
              onChange={(e) => setPrefs({ ...prefs, productFormat: e.target.value as ProductFormat })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
            >
              <option value="ebook_toolkit">E-Book + Companion Toolkit</option>
              <option value="ebook">Flagship E-Book Only</option>
              <option value="workbook">Interactive Workbook</option>
              <option value="template_bundle">Template & SOP Bundle</option>
              <option value="mini_course">Self-Paced Mini Course</option>
              <option value="challenge">Guided 28-Day Challenge</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-700">{lang === 'en' ? 'Evidence Source Target' : '目標參考文獻篇數'}</span>
            <select
              value={prefs.referenceTarget}
              onChange={(e) => setPrefs({ ...prefs, referenceTarget: Number(e.target.value) as 8 | 20 | 30 })}
              className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
            >
              <option value={8}>8 sources (Compact Guide)</option>
              <option value={20}>20 sources (Standard Flagship)</option>
              <option value={30}>30 sources (Authoritative Edition)</option>
            </select>
          </label>
        </div>

        {/* Bilingual Gate Protocol Checklist */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {lang === 'en' ? 'Publication Gate Governance' : '三道人類品質閘門審查規範'}
          </h2>
          <ol className="space-y-2 text-xs text-slate-700 list-decimal pl-5">
            <li>
              {lang === 'en'
                ? 'Gate A: Inspect live marketplace signals and explicitly approve a product niche.'
                : 'Gate A：審查多平台市場排行與消費者信號後，核准明確的選題方向。'}
            </li>
            <li>
              {lang === 'en'
                ? 'Gate B: Define the 13-field brief, research primary sources, inspect retrieved excerpts, and approve the Product Charter.'
                : 'Gate B：定義 13 項簡報、建立具備原文擷取證據的來源庫，並核准不可更動產品憲章。'}
            </li>
            <li>
              {lang === 'en'
                ? 'Manuscript & Toolkit: Draft each chapter and companion resource; verify passage-level support in Content Studio.'
                : '內容與工具套件：撰寫各章內文與伴隨工具模板，逐段落審查引用與來源對應。'}
            </li>
            <li>
              {lang === 'en'
                ? 'Gate C: Resolve citation and quality issues, customize brand & pricing, approve final review, and export the buyer ZIP.'
                : 'Gate C：解決所有品質檢查項目、配置品牌識別與商業定價後，核准出口並打包完整買家套件。'}
            </li>
          </ol>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <Save size={15} />
            <span>{t.saveSettings}</span>
          </button>

          {saved && (
            <p role="status" className="text-xs font-medium text-emerald-700 inline-flex gap-1.5 items-center">
              <CheckCircle2 size={15} />
              <span>
                {lang === 'en'
                  ? 'Workflow & workspace preferences saved.'
                  : '工作流程與專案偏好設定已儲存。'}
              </span>
            </p>
          )}
        </div>
      </form>
    </div>
  );
};
