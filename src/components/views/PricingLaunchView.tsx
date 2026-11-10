import React, { useState } from 'react';
import { Tag, Mail, Calendar, HelpCircle, ArrowRight, Copy, CheckCircle2 } from 'lucide-react';
import { DigitalProductProject } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface PricingLaunchViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  lang?: Language;
}

export const PricingLaunchView: React.FC<PricingLaunchViewProps> = ({
  project,
  setActiveView,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { pricingReport, salesAssets } = project;
  const [copiedEmailDay, setCopiedEmailDay] = useState<number | null>(null);

  const handleCopyEmail = (body: string, day: number) => {
    navigator.clipboard.writeText(body);
    setCopiedEmailDay(day);
    setTimeout(() => setCopiedEmailDay(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Tag className="w-3.5 h-3.5" />
            <span>{t.navPricingLaunch}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.pricingTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.pricingSubtitle}</p>
        </div>

        <button
          onClick={() => setActiveView('export_center')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
        >
          <span>{lang === 'en' ? 'Download Assets in Export Center →' : '前往匯出中心下載全套檔案 →'}</span>
        </button>
      </div>

      {/* Pricing Tiers Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          {lang === 'en' ? '3-Tier Value-Based Pricing Ladder' : '市場對照與三階梯定價策略'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
              {lang === 'en' ? 'Early Bird Test Price' : '首發限時測試價'}
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mb-2">
              ${pricingReport?.introductoryPrice || 19} <span className="text-xs text-slate-400 font-normal">USD</span>
            </div>
            <p className="text-xs text-slate-600">
              {lang === 'en'
                ? 'Rapid friction reduction for the first 100 buyers to collect immediate positive reviews and testimonials.'
                : '用於前 100 份早鳥測試，大幅降低阻力以獲取首批真實讀者好評與回饋。'}
            </p>
          </div>

          <div className="p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50/20 relative">
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full absolute top-3 right-3">
              {lang === 'en' ? 'Recommended Core' : '標準定價'}
            </span>
            <span className="text-[11px] font-bold text-indigo-700 uppercase block mb-1">
              {lang === 'en' ? 'Standard Core Guide' : '常態標準售價'}
            </span>
            <div className="text-2xl font-bold font-mono text-indigo-700 mb-2">
              ${pricingReport?.regularPrice || 29} <span className="text-xs text-slate-400 font-normal">USD</span>
            </div>
            <p className="text-xs text-slate-600">
              {lang === 'en'
                ? 'Standard commercial price point matching buyer value benchmarks across Amazon and Etsy categories.'
                : '常態銷售基準點，對齊主流電子書與自出版中位數定價。'}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
              {lang === 'en' ? 'Complete Toolkit Bundle' : '全套工具包旗艦價'}
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 mb-2">
              ${pricingReport?.bundlePrice || 49} <span className="text-xs text-slate-400 font-normal">USD</span>
            </div>
            <p className="text-xs text-slate-600">
              {lang === 'en'
                ? 'Core guide bundled with all fillable spreadsheets, printable checklists, and automated calculators.'
                : '核心指南搭配所有試算表、採購清單與伴隨工具，大幅拉高平均客單價。'}
            </p>
          </div>
        </div>
      </div>

      {/* Sales Page Pitch & Copy */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          {lang === 'en' ? 'High-Converting Sales Page Copy' : '高轉換銷售頁核心文案'}
        </h2>
        <div className="space-y-3 text-xs">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-indigo-600">Hero Headline</span>
            <h3 className="text-base font-bold text-slate-900">{salesAssets?.salesPageHeadline}</h3>
            <p className="text-slate-600">{salesAssets?.salesPageSubheadline}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-600">What is included (Deliverable Bullets)</span>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              {(salesAssets?.productDescriptionBullets || []).map((bullet, idx) => (
                <li key={idx}>{bullet}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
