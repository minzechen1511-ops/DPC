import React, { useState, useEffect } from 'react';
import { Palette, Type, Save, CheckCircle2, Sparkles, BookOpen } from 'lucide-react';
import { DigitalProductProject } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { StudioLogo } from '../StudioLogo.tsx';
import {
  ActiveStudioProvider,
  DEFAULT_OPENROUTER_MODEL,
  generateTextWithAi,
  normalizeStudioProvider,
} from '../../services/aiService.ts';
import { buildBrandDirectionPrompt, parseBrandDirectionResponse } from '../../utils/stageSynthesis.ts';
import { generationError } from '../../utils/gateAJourney.ts';
import { AiEngineQuickControl, useOpenRouterConnected } from '../AiEngineQuickControl.tsx';
import { AiRateLimitNotice } from '../AiRateLimitNotice.tsx';

interface BrandDesignViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onUpdateBrand: (brand: DigitalProductProject['brand'], finish?:boolean) => void;
  onUpdateAiSettings?: (settings: any) => void;
  onRecordAiUsage?: (usage?: { total_tokens?: number; estimatedCostUsd?: number }, model?: string, provider?: ActiveStudioProvider) => void;
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
    secondaryHex: '#0F766E',
    accentHex: '#D97706',
    neutralBgHex: '#F8FAFC',
    fontDisplay: 'Fraunces',
    fontBody: 'Plus Jakarta Sans',
  },
  {
    id: 'navy',
    profileName: 'Executive Navy Advisory',
    primaryHex: '#1E293B',
    secondaryHex: '#0284C7',
    accentHex: '#F59E0B',
    neutralBgHex: '#F8FAFC',
    fontDisplay: 'Playfair Display',
    fontBody: 'Plus Jakarta Sans',
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
    fontBody: 'Source Sans 3',
  },
];

const DISPLAY_FONTS = ['Fraunces', 'Playfair Display', 'Plus Jakarta Sans', 'Space Grotesk', 'Merriweather'];
const BODY_FONTS = ['Plus Jakarta Sans', 'Source Sans 3', 'Merriweather', 'JetBrains Mono'];

export const BrandDesignView: React.FC<BrandDesignViewProps> = ({
  project,
  setActiveView,
  onUpdateBrand,
  onUpdateAiSettings,
  onRecordAiUsage,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [draft, setDraft] = useState(project.brand);
  const [savedNotice, setSavedNotice] = useState(false);
  const [focusNote, setFocusNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState('');
  const openrouterConnected = useOpenRouterConnected();

  useEffect(() => {
    setDraft(project.brand);
  }, [project.projectId, project.brand]);

  const handleSave = () => {
    onUpdateBrand(draft, true);
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

  const handleRecommendBrandWithAi = async (overrideModel?: string, overrideProvider?: ActiveStudioProvider) => {
    if (aiBusy) return;
    setAiBusy(true);
    setAiError('');
    setFallbackNotice('');
    const activeProvider =
      overrideProvider ||
      normalizeStudioProvider(project.aiSettings?.provider, project.aiSettings?.defaultModel);
    const activeModel =
      overrideModel ||
      project.aiSettings?.defaultModel ||
      (activeProvider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL : 'gemini-4-hydrogen');
    try {
      const { systemPrompt, userPrompt } = buildBrandDirectionPrompt(project, lang, focusNote);
      const res = await generateTextWithAi({
        provider: activeProvider,
        model: activeModel,
        tokenSaverMode: project.aiSettings?.tokenSaverMode || 'economy',
        allowRateLimitFallback: project.aiSettings?.allowRateLimitFallback ?? true,
        systemPrompt,
        userPrompt,
        maxTokens: 1200,
        projectId: project.projectId,
      });
      onRecordAiUsage?.(res?.usage, res?.model, res?.provider);
      if (res?.fallbackUsed) {
        setFallbackNotice(
          lang === 'en'
            ? `Auto-switched from ${res.primaryModel} to ${res.model} to avoid 429 quota block.`
            : `已自動從 ${res.primaryModel} 切換至 ${res.model} 以避開限流。`
        );
      }
      const recommended = parseBrandDirectionResponse(res?.content || '', draft);
      setDraft(recommended);
      onUpdateBrand(recommended);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err: any) {
      setAiError(generationError(err, lang));
    } finally {
      setAiBusy(false);
    }
  };

  const handleSwitchToFlashLiteAndRetry = () => {
    if (onUpdateAiSettings) {
      onUpdateAiSettings({
        ...project.aiSettings,
        provider: 'gemini',
        apiKey: '',
        baseUrl: '',
        apiKeys: { openrouter: '', gemini: '', openai: '', claude: '' },
        defaultModel: 'gemini-3.1-flash-lite',
        tokenSaverMode: 'economy',
        providerModels: {
          ...project.aiSettings?.providerModels,
          gemini: 'gemini-3.1-flash-lite',
        },
      });
    }
    void handleRecommendBrandWithAi('gemini-3.1-flash-lite', 'gemini');
  };

  const handleSwitchToOpenRouterAndRetry = () => {
    const nextModel = project.aiSettings?.providerModels?.openrouter || DEFAULT_OPENROUTER_MODEL;
    if (onUpdateAiSettings) {
      onUpdateAiSettings({
        ...project.aiSettings,
        provider: 'openrouter',
        apiKey: '',
        baseUrl: '',
        apiKeys: { openrouter: '', gemini: '', openai: '', claude: '' },
        defaultModel: nextModel,
        providerModels: {
          ...project.aiSettings?.providerModels,
          openrouter: nextModel,
        },
      });
    }
    void handleRecommendBrandWithAi(nextModel, 'openrouter');
  };

  return (
    <div className="w-full space-y-5 pb-3">
      {/* Top Banner */}
      <div className="lab-panel p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-indigo-700 mb-1">
            <Palette className="w-4 h-4" />
            <span>{t.navBrandDesign}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.brandTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {lang === 'en'
              ? `Customize the "${draft?.profileName || 'Digital Product Studio'}" imprint, 60-30-10 palette, and typography applied to your exported HTML e-book.`
              : `自訂「${draft?.profileName || 'Digital Product Studio'}」品牌識別、60-30-10 色票與字體，並即時套用至精裝 HTML 電子書匯出。`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={aiBusy}
            onClick={() => void handleRecommendBrandWithAi()}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Sparkles className={`w-4 h-4 ${aiBusy ? 'animate-spin' : ''}`} />
            <span>
              {aiBusy
                ? lang === 'en' ? 'Designing Brand...' : '正在規劃品牌視覺...'
                : lang === 'en' ? 'AI Recommend Brand & Cover' : 'AI 推薦主題配色與封面'}
            </span>
          </button>



          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span>{lang === 'en' ? 'Save styling & continue' : '儲存視覺設定並繼續'}</span>
          </button>
        </div>
      </div>

      {/* Synthesise.ai Art Direction Guidance */}
      <div className="lab-panel p-4 sm:p-5 bg-gradient-to-r from-teal-50/60 via-white to-sky-50/50 space-y-3">
        <AiEngineQuickControl
          project={project}
          onUpdateAiSettings={onUpdateAiSettings}
          onOpenAiSettings={() => setActiveView('ai_settings')}
          disabled={aiBusy}
          fallbackNotice={fallbackNotice}
          lang={lang}
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-teal-800 whitespace-nowrap">
            {lang === 'en' ? 'Art Direction Style Hint:' : '品牌美學偏好提示：'}
          </span>
          <input
            type="text"
            value={focusNote}
            onChange={(e) => setFocusNote(e.target.value)}
            placeholder={
              lang === 'en'
                ? 'Optional aesthetic note (e.g., Warm luxury editorial serif, calm botanical sage, bold Swiss SaaS look...)'
                : '選填美學風格方向（例如：溫暖奢華書刊風、沉穩自然草本系、俐落瑞士商業雜誌感...）'
            }
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800"
          />
        </div>
      </div>

      {aiError && (
        <AiRateLimitNotice
          errorMessage={aiError}
          currentModel={project.aiSettings?.defaultModel || 'gemini-4-hydrogen'}
          busy={aiBusy}
          openrouterConnected={openrouterConnected}
          onRetry={() => void handleRecommendBrandWithAi()}
          onSwitchToFlashLiteAndRetry={handleSwitchToFlashLiteAndRetry}
          onSwitchToOpenRouterAndRetry={handleSwitchToOpenRouterAndRetry}
          onOpenAiSettings={() => setActiveView('ai_settings')}
          lang={lang}
        />
      )}

      {savedNotice && (
        <p role="status" className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {lang === 'en'
              ? 'Brand identity saved and synced to the Styled HTML e-book compiler.'
              : '品牌識別已儲存，並同步套用至精裝電子書排版引擎。'}
          </span>
        </p>
      )}

      {/* Curated Studio Brand Presets */}
      <div className="lab-panel p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>{lang === 'en' ? 'Commercial Imprint Presets (1-Click Apply)' : '精選商業出版品牌預設 (一鍵套用)'}</span>
          </h2>
          <span className="text-xs font-mono font-semibold text-slate-600">{draft.profileName}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {BRAND_PRESETS.map((preset) => {
            const isActive = draft.profileName === preset.profileName && draft.primaryHex.toLowerCase() === preset.primaryHex.toLowerCase();
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-5 h-5 rounded-sm border border-black/15" style={{ background: preset.primaryHex }} />
                  <span className="w-5 h-5 rounded-sm border border-black/15" style={{ background: preset.secondaryHex }} />
                  <span className="w-5 h-5 rounded-sm border border-black/15" style={{ background: preset.accentHex }} />
                  <span className="w-5 h-5 rounded-sm border border-slate-300" style={{ background: preset.neutralBgHex }} />
                </div>
                <strong className="block text-sm font-bold text-slate-900">{preset.profileName}</strong>
                <span className="text-xs text-slate-600 block mt-1">{preset.fontDisplay} + {preset.fontBody}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wide 12-Col Editor Grid + Live E-Book Cover Specimen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Controls Column */}
        <div className="lg:col-span-8 space-y-5">
          {/* Colors */}
          <div className="lab-panel p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">{lang === 'en' ? '60-30-10 Brand Color System' : '60-30-10 品牌色彩配置系統'}</h2>
              </div>
              <label className="text-sm flex items-center gap-2.5">
                <span className="text-slate-600 font-medium whitespace-nowrap">{lang === 'en' ? 'Profile Name:' : '識別名稱：'}</span>
                <input
                  type="text"
                  value={draft.profileName}
                  onChange={(e) => setDraft({ ...draft, profileName: e.target.value })}
                  className="font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 min-w-[220px]"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {colorFields.map(({ key, label, role }) => (
                <div key={key} className="p-4 rounded-xl border border-slate-200 bg-slate-50/90 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm font-bold text-slate-900">{label}</strong>
                    <input
                      type="color"
                      aria-label={label}
                      value={/^#[0-9a-f]{6}$/i.test(draft[key]) ? draft[key] : '#162B32'}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value.toUpperCase() })}
                      className="w-9 h-9 rounded-md cursor-pointer border border-slate-300 bg-white p-0.5 shrink-0"
                    />
                  </div>
                  <input
                    type="text"
                    aria-label={`${label} hex`}
                    value={draft[key]}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    className="w-full font-mono text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                  />
                  <span className="text-xs text-slate-600 block">{role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Typography & Editorial Brief */}
          <div className="lab-panel p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Type className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">{lang === 'en' ? 'Typography & Cover Direction' : '字體系統與封面排版規範'}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-800 font-semibold">{lang === 'en' ? 'Display / Headings Font' : '主標題字體'}</span>
                <select
                  value={draft.fontDisplay}
                  onChange={(e) => setDraft({ ...draft, fontDisplay: e.target.value })}
                  className="w-full font-medium bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900"
                >
                  {!DISPLAY_FONTS.includes(draft.fontDisplay) && (
                    <option value={draft.fontDisplay}>{draft.fontDisplay}</option>
                  )}
                  {DISPLAY_FONTS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm text-slate-800 font-semibold">{lang === 'en' ? 'Body / Prose Font' : '內文字體'}</span>
                <select
                  value={draft.fontBody}
                  onChange={(e) => setDraft({ ...draft, fontBody: e.target.value })}
                  className="w-full font-medium bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-800 font-semibold">{lang === 'en' ? 'Cover Art Brief' : '封面視覺設計摘要'}</span>
                <textarea
                  rows={5}
                  value={draft.coverBrief}
                  onChange={(e) => setDraft({ ...draft, coverBrief: e.target.value })}
                  placeholder={lang === 'en' ? 'Describe geometric motif, contrast ratio, and badge placement...' : '描述封面幾何構圖、色彩對比與副標排列...'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm text-slate-800 font-semibold">{lang === 'en' ? 'Manuscript Layout Notes' : '內文版型與留白規範'}</span>
                <textarea
                  rows={5}
                  value={draft.manuscriptLayoutNotes}
                  onChange={(e) => setDraft({ ...draft, manuscriptLayoutNotes: e.target.value })}
                  placeholder={lang === 'en' ? 'Specify generous line spacing, callout boxes, and data table hierarchy...' : '設定行距比例、提示框與實證數據表格階層...'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Live Styled Cover Specimen Column */}
        <div className="lg:col-span-4 lab-panel p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'en' ? 'Live Imprint Cover Preview' : '即時出版封面預覽'}</span>
              </h2>
              <span className="text-xs font-mono text-slate-500">60-30-10</span>
            </div>

            <div
              className="rounded-xl overflow-hidden border border-slate-200 shadow-sm p-6 sm:p-7 flex flex-col justify-between min-h-[400px]"
              style={{
                backgroundColor: draft.neutralBgHex || '#F8FAFC',
                borderTop: `10px solid ${draft.primaryHex || '#162B32'}`,
                fontFamily: draft.fontBody || 'Plus Jakarta Sans, sans-serif',
              }}
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <StudioLogo size={28} />
                    <span
                      className="text-xs font-bold tracking-wider uppercase"
                      style={{ color: draft.primaryHex || '#162B32' }}
                    >
                      Digital Product Studio
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md"
                    style={{
                      backgroundColor: `${draft.secondaryHex || '#0F766E'}18`,
                      color: draft.secondaryHex || '#0F766E',
                    }}
                  >
                    {draft.profileName}
                  </span>
                </div>

                <div className="pt-3 space-y-3">
                  <div
                    className="w-12 h-1.5 rounded-xs"
                    style={{ backgroundColor: draft.accentHex || '#D97706' }}
                  />
                  <h3
                    className="text-2xl font-bold leading-snug"
                    style={{
                      color: draft.primaryHex || '#162B32',
                      fontFamily: `"${draft.fontDisplay || 'Fraunces'}", Georgia, serif`,
                    }}
                  >
                    {productTitle}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                    {productSubtitle}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-700 font-semibold">
                  {project.intake?.creatorName || 'Editorial Studio'}
                </span>
                <span
                  className="font-mono font-bold text-sm"
                  style={{ color: draft.secondaryHex || '#0F766E' }}
                >
                  {project.pricingReport?.currency || 'USD'} ${project.pricingReport?.regularPrice || 29}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {lang === 'en'
              ? 'Changes saved here dynamically update the CSS variables, cover imprint, and accent system inside Export Center’s Styled HTML edition.'
              : '儲存後將即時驅動「匯出下載中心」精裝 HTML 電子書的色彩變數與出版視覺外觀。'}
          </p>
        </div>
      </div>
    </div>
  );
};
