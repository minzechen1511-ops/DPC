import React from 'react';
import { Palette, Type, Image as ImageIcon, Layout, ArrowRight } from 'lucide-react';
import { DigitalProductProject } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface BrandDesignViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  lang?: Language;
}

export const BrandDesignView: React.FC<BrandDesignViewProps> = ({
  project,
  setActiveView,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { brand, charter, intake } = project;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Palette className="w-3.5 h-3.5" />
            <span>{t.navBrandDesign}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.brandTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'en'
              ? `Anchored on the "${brand?.profileName || 'Modern Minimalist'}" design profile with 60-30-10 color discipline and editorial typography.`
              : `以「${brand?.profileName || '現代極簡'}」品牌風格為基準，落實 60-30-10 配色紀律與精裝出版排版水準`}
          </p>
        </div>

        <button
          onClick={() => setActiveView('pricing_launch')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
        >
          <span>{lang === 'en' ? 'Pricing & Launch Suite →' : '前往定價與上市行銷套件 →'}</span>
        </button>
      </div>

      {/* Visual Palette & Typography */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colors */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Palette className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">{lang === 'en' ? '60-30-10 Brand Color Palette' : '60-30-10 品牌色彩配置系統'}</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
              <span className="w-10 h-10 rounded-lg mx-auto block mb-2 shadow-xs" style={{ background: brand?.primaryHex || '#2563EB' }} />
              <strong className="block text-slate-900">Primary</strong>
              <span className="font-mono text-slate-500 text-[11px]">{brand?.primaryHex}</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
              <span className="w-10 h-10 rounded-lg mx-auto block mb-2 shadow-xs" style={{ background: brand?.secondaryHex || '#059669' }} />
              <strong className="block text-slate-900">Secondary</strong>
              <span className="font-mono text-slate-500 text-[11px]">{brand?.secondaryHex}</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
              <span className="w-10 h-10 rounded-lg mx-auto block mb-2 shadow-xs" style={{ background: brand?.accentHex || '#F59E0B' }} />
              <strong className="block text-slate-900">Accent</strong>
              <span className="font-mono text-slate-500 text-[11px]">{brand?.accentHex}</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
              <span className="w-10 h-10 rounded-lg mx-auto block mb-2 shadow-xs border border-slate-300" style={{ background: brand?.neutralBgHex || '#F8FAFC' }} />
              <strong className="block text-slate-900">Neutral</strong>
              <span className="font-mono text-slate-500 text-[11px]">{brand?.neutralBgHex}</span>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Type className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">{lang === 'en' ? 'Typography Direction' : '字體搭配規範'}</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-400 block">{lang === 'en' ? 'Display / Headings Font:' : '主標題字體：'}</span>
              <strong className="text-sm font-bold text-slate-900">{brand?.fontDisplay}</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-400 block">{lang === 'en' ? 'Body / Prose Font:' : '正文字體：'}</span>
              <strong className="text-sm font-bold text-slate-900">{brand?.fontBody}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
