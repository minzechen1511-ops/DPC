import React, { useState, useEffect } from 'react';
import { Palette, Type, Save, CheckCircle2, Sparkles, BookOpen } from 'lucide-react';
import { DigitalProductProject } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { StudioLogo } from '../StudioLogo.tsx';

interface BrandDesignViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onUpdateBrand: (brand: DigitalProductProject['brand']) => void;
  lang?: Language;
}

const BRAND_PRESETS: Array<{
  id: string;
  profileName: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  neutralBgHex: string;
  fontDisplay: string;
  fontBody: string;
}> = [
  {
    id: 'mineral',
    profileName: 'Mineral Editorial Studio',
    primaryHex: '#162B32',
    secondaryHex: '#146B5D',
    accentHex: '#D97706',
    neutralBgHex: '#F8FAFC',
    fontDisplay: 'Fraunces',
    fontBody: 'Plus Jakarta Sans',
  },
  {
    id: 'navy',
    profileName: 'Executive Navy Advisory',
    primaryHex: '#1E293B',
    secondaryHex: '#2563EB',
    accentHex: '#F59E0B',
    neutralBgHex: '#F8FAFC',
    fontDisplay: 'Playfair Display',
    fontBody: 'Inter',
  },
  {
    id: 'botanical',
    profileName: 'Botanical Wellness Studio',
    primaryHex: '#1B4332',
    secondaryHex: '#2D6A4F',
    accentHex: '#B45309',
    neutralBgHex: '#FAF9F6',
    fontDisplay: 'Fraunces',
    fontBody: 'Plus Jakarta Sans',
  },
  {
    id: 'obsidian',
    profileName: 'Obsidian Craft Press',
    primaryHex: '#18181B',
    secondaryHex: '#0F766E',
    accentHex: '#E11D48',
    neutralBgHex: '#F4F4F5',
    fontDisplay: 'Space Grotesk',
    fontBody: 'Inter',
  },
];

const DISPLAY_FONTS = ['Fraunces', 'Playfair Display', 'Plus Jakarta Sans', 'Space Grotesk', 'Merriweather'];
const BODY_FONTS = ['Plus Jakarta Sans', 'Inter', 'Merriweather', 'Source Sans 3', 'JetBrains Mono'];

export const BrandDesignView: React.FC<BrandDesignViewProps> = ({
  project,
  setActiveView,
  onUpdateBrand,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [draft, setDraft] = useState(project.brand);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setDraft(project.brand);
  }, [project.projectId, project.brand]);

  const handleSave = () => {
    onUpdateBrand(draft);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const applyPreset = (preset: (typeof BRAND_PRESETS)[number]) => {
    const next = {
      ...draft,
      profileName: preset.profileName,
      primaryHex: preset.primaryHex,
      secondaryHex: preset.secondaryHex,
      accentHex: preset.accentHex,
      neutralBgHex: preset.neutralBgHex,
      fontDisplay: preset.fontDisplay,
      fontBody: preset.fontBody,
    };
    setDraft(next);
    onUpdateBrand(next);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const colorFields: Array<{
    key: 'primaryHex' | 'secondaryHex' | 'accentHex' | 'neutralBgHex';
    label: string;
    role: string;
  }> = [
    { key: 'primaryHex', label: lang === 'en' ? 'Primary (60%)' : '主色 (60%)', role: lang === 'en' ? 'Covers & Headings' : '封面與主標題' },
    { key: 'secondaryHex', label: lang === 'en' ? 'Secondary (30%)' : '輔助色 (30%)', role: lang === 'en' ? 'Subheads & Tables' : '次標與表格' },
    { key: 'accentHex', label: lang === 'en' ? 'Accent (10%)' : '點綴色 (10%)', role: lang === 'en' ? 'Callouts & CTAs' : '重點框與按鈕' },
    { key: 'neutralBgHex', label: lang === 'en' ? 'Paper Canvas' : '紙張底色', role: lang === 'en' ? 'Reader Surface' : '閱讀頁面底色' },
  ];

  const productTitle = project.charter?.productTitle || project.name || t.untitledProject;
  const productSubtitle =
    project.charter?.subtitle ||
    project.charter?.centralPromise ||
    (lang === 'en'
      ? 'Commercial digital publication & implementation toolkit'
      : '高價值商業數位出版品與實作工具套件');

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
              ? `Customize the "${draft?.profileName || 'Digital Product Studio'}" imprint, 60-30-10 palette, and typography applied to your exported HTML e-book.`
              : `自訂「${draft?.profileName || 'Digital Product Studio'}」品牌識別、60-30-10 色票與字體，並即時套用至精裝 HTML 電子書匯出。`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Save Brand Styling' : '儲存品牌視覺設定'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('pricing_launch')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <span>{lang === 'en' ? 'Pricing & Launch Suite →' : '前往定價與上市行銷套件 →'}</span>
          </button>
        </div>
      </div>

      {savedNotice && (
        <p role="status" className="px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {lang === 'en'
              ? 'Brand identity saved and synced to the Styled HTML e-book compiler.'
              : '品牌識別已儲存，並同步套用至精裝電子書排版引擎。'}
          </span>
        </p>
      )}

      {/* Curated Studio Brand Presets */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>{lang === 'en' ? 'Commercial Imprint Presets (1-Click Apply)' : '精選商業出版品牌預設 (一鍵套用)'}</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-500">{draft.profileName}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BRAND_PRESETS.map((preset) => {
            const isActive = draft.profileName === preset.profileName && draft.primaryHex.toLowerCase() === preset.primaryHex.toLowerCase();
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-4 h-4 rounded-sm border border-black/10" style={{ background: preset.primaryHex }} />
                  <span className="w-4 h-4 rounded-sm border border-black/10" style={{ background: preset.secondaryHex }} />
                  <span className="w-4 h-4 rounded-sm border border-black/10" style={{ background: preset.accentHex }} />
                  <span className="w-4 h-4 rounded-sm border border-slate-300" style={{ background: preset.neutralBgHex }} />
                </div>
                <strong className="block text-xs font-bold text-slate-900">{preset.profileName}</strong>
                <span className="text-[11px] text-slate-500 block mt-0.5">{preset.fontDisplay} + {preset.fontBody}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor Grid + Live E-Book Cover Specimen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Colors */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">{lang === 'en' ? '60-30-10 Brand Color System' : '60-30-10 品牌色彩配置系統'}</h2>
              </div>
              <label className="text-xs flex items-center gap-2">
                <span className="text-slate-500">{lang === 'en' ? 'Profile Name:' : '識別名稱：'}</span>
                <input
                  type="text"
                  value={draft.profileName}
                  onChange={(e) => setDraft({ ...draft, profileName: e.target.value })}
                  className="text-xs font-medium bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {colorFields.map(({ key, label, role }) => (
                <div key={key} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900">{label}</strong>
                    <input
                      type="color"
                      aria-label={label}
                      value={/^#[0-9a-f]{6}$/i.test(draft[key]) ? draft[key] : '#162B32'}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value.toUpperCase() })}
                      className="w-7 h-7 rounded cursor-pointer border border-slate-300 bg-white p-0.5"
                    />
                  </div>
                  <input
                    type="text"
                    aria-label={`${label} hex`}
                    value={draft[key]}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    className="w-full font-mono text-[11px] bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
                  />
                  <span className="text-[11px] text-slate-500 block">{role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Typography & Editorial Brief */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Type className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">{lang === 'en' ? 'Typography & Cover Direction' : '字體系統與封面排版規範'}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label className="block space-y-1">
                <span className="text-slate-700 font-semibold">{lang === 'en' ? 'Display / Headings Font' : '主標題字體'}</span>
                <select
                  value={draft.fontDisplay}
                  onChange={(e) => setDraft({ ...draft, fontDisplay: e.target.value })}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  {!DISPLAY_FONTS.includes(draft.fontDisplay) && (
                    <option value={draft.fontDisplay}>{draft.fontDisplay}</option>
                  )}
                  {DISPLAY_FONTS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-slate-700 font-semibold">{lang === 'en' ? 'Body / Prose Font' : '內文字體'}</span>
                <select
                  value={draft.fontBody}
                  onChange={(e) => setDraft({ ...draft, fontBody: e.target.value })}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  {!BODY_FONTS.includes(draft.fontBody) && (
                    <option value={draft.fontBody}>{draft.fontBody}</option>
                  )}
                  {BODY_FONTS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label className="block space-y-1">
                <span className="text-slate-700 font-semibold">{lang === 'en' ? 'Cover Art Brief' : '封面視覺設計摘要'}</span>
                <textarea
                  rows={3}
                  value={draft.coverBrief}
                  onChange={(e) => setDraft({ ...draft, coverBrief: e.target.value })}
                  placeholder={lang === 'en' ? 'Describe geometric motif, contrast ratio, and badge placement...' : '描述封面幾何構圖、色彩對比與副標排列...'}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-slate-700 font-semibold">{lang === 'en' ? 'Manuscript Layout Notes' : '內文版型與留白規範'}</span>
                <textarea
                  rows={3}
                  value={draft.manuscriptLayoutNotes}
                  onChange={(e) => setDraft({ ...draft, manuscriptLayoutNotes: e.target.value })}
                  placeholder={lang === 'en' ? 'Specify generous line spacing, callout boxes, and data table hierarchy...' : '設定行距比例、提示框與實證數據表格階層...'}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Live Styled Cover Specimen Column */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'en' ? 'Live Imprint Cover Preview' : '即時出版封面預覽'}</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">60-30-10</span>
            </div>

            <div
              className="rounded-xl overflow-hidden border border-slate-200 shadow-sm p-6 flex flex-col justify-between min-h-[320px]"
              style={{
                backgroundColor: draft.neutralBgHex || '#F8FAFC',
                borderTop: `8px solid ${draft.primaryHex || '#162B32'}`,
                fontFamily: draft.fontBody || 'Plus Jakarta Sans, sans-serif',
              }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StudioLogo size={24} />
                    <span
                      className="text-[11px] font-bold tracking-wider uppercase"
                      style={{ color: draft.primaryHex || '#162B32' }}
                    >
                      Digital Product Studio
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${draft.secondaryHex || '#146B5D'}18`,
                      color: draft.secondaryHex || '#146B5D',
                    }}
                  >
                    {draft.profileName}
                  </span>
                </div>

                <div className="pt-2 space-y-2">
                  <div
                    className="w-10 h-1 rounded-full"
                    style={{ backgroundColor: draft.accentHex || '#D97706' }}
                  />
                  <h3
                    className="text-xl font-bold leading-snug"
                    style={{
                      color: draft.primaryHex || '#162B32',
                      fontFamily: `"${draft.fontDisplay || 'Fraunces'}", Georgia, serif`,
                    }}
                  >
                    {productTitle}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {productSubtitle}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">
                  {project.intake?.creatorName || 'Editorial Studio'}
                </span>
                <span
                  className="font-mono font-bold"
                  style={{ color: draft.secondaryHex || '#146B5D' }}
                >
                  {project.pricingReport?.currency || 'USD'} ${project.pricingReport?.regularPrice || 29}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            {lang === 'en'
              ? 'Changes saved here dynamically update the CSS variables, cover imprint, and accent system inside Export Center’s Styled HTML edition.'
              : '儲存後將即時驅動「匯出下載中心」精裝 HTML 電子書的色彩變數與出版視覺外觀。'}
          </p>
        </div>
      </div>
    </div>
  );
};
