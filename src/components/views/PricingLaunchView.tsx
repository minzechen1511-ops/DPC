import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Mail,
  Calculator,
  Copy,
  CheckCircle2,
  Save,
  Sparkles,
  Plus,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { DigitalProductProject, SalesAssets } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { calculateProfitability, PLATFORM_FEE_PRESETS } from '../../utils/commercialMath.ts';
import {
  ActiveStudioProvider,
  DEFAULT_OPENROUTER_MODEL,
  generateTextWithAi,
  normalizeStudioProvider,
} from '../../services/aiService.ts';
import { UnitEconomicsChart } from '../ScientificVisuals.tsx';
import { generationError } from '../../utils/gateAJourney.ts';
import { AiEngineQuickControl, useOpenRouterConnected } from '../AiEngineQuickControl.tsx';
import { AiRateLimitNotice } from '../AiRateLimitNotice.tsx';

interface PricingLaunchViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onUpdatePricingAndSales: (
    pricingReport: DigitalProductProject['pricingReport'],
    salesAssets: SalesAssets
  ) => void;
  onUpdateAiSettings?: (settings: any) => void;
  onRecordAiUsage?: (usage?: { total_tokens?: number; estimatedCostUsd?: number }, model?: string, provider?: ActiveStudioProvider) => void;
  lang?: Language;
}

export const PricingLaunchView: React.FC<PricingLaunchViewProps> = ({
  project,
  setActiveView,
  onUpdatePricingAndSales,
  onUpdateAiSettings,
  onRecordAiUsage,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [pricing, setPricing] = useState(project.pricingReport);
  const [sales, setSales] = useState<SalesAssets>(project.salesAssets);
  const [bulletsText, setBulletsText] = useState((project.salesAssets?.productDescriptionBullets || []).join('\n'));
  const [copiedEmailDay, setCopiedEmailDay] = useState<number | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState('');
  const openrouterConnected = useOpenRouterConnected();

  // Profitability Simulator state
  const [selectedPresetId, setSelectedPresetId] = useState<string>('lemonsqueezy');
  const [monthlyVisitors, setMonthlyVisitors] = useState<number>(2500);
  const [conversionRatePercent, setConversionRatePercent] = useState<number>(2.5);
  const [bundleSharePercent, setBundleSharePercent] = useState<number>(25);
  const [introSharePercent] = useState<number>(15);
  const [monthlyOverheadUsd, setMonthlyOverheadUsd] = useState<number>(150);
  const [monthlyAcquisitionCostUsd, setMonthlyAcquisitionCostUsd] = useState<number>(0);

  useEffect(() => {
    setPricing(project.pricingReport);
    setSales(project.salesAssets);
    setBulletsText((project.salesAssets?.productDescriptionBullets || []).join('\n'));
  }, [project.projectId]);

  const activePreset = useMemo(
    () => PLATFORM_FEE_PRESETS.find((p) => p.id === selectedPresetId) || PLATFORM_FEE_PRESETS[1],
    [selectedPresetId]
  );

  const metrics = useMemo(
    () =>
      calculateProfitability({
        introductoryPrice: Number(pricing?.introductoryPrice || 0),
        regularPrice: Number(pricing?.regularPrice || 0),
        bundlePrice: Number(pricing?.bundlePrice || 0),
        monthlyVisitors,
        conversionRatePercent,
        bundleSharePercent,
        introSharePercent,
        platformFeePercent: activePreset.feePercent,
        fixedFeePerSale: activePreset.fixedFeePerSale,
        monthlyOverheadUsd,
        monthlyAcquisitionCostUsd,
      }),
    [pricing, monthlyVisitors, conversionRatePercent, bundleSharePercent, introSharePercent, activePreset, monthlyOverheadUsd, monthlyAcquisitionCostUsd]
  );

  const commitChanges = (nextPricing = pricing, nextSales = sales) => {
    const cleanBullets = bulletsText
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);
    const mergedSales: SalesAssets = {
      ...nextSales,
      productDescriptionBullets: cleanBullets,
    };
    setSales(mergedSales);
    onUpdatePricingAndSales(nextPricing, mergedSales);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleCopyEmail = (subject: string, body: string, day: number) => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopiedEmailDay(day);
    setTimeout(() => setCopiedEmailDay(null), 2000);
  };

  const handleGenerateAiLaunchCopy = async (overrideModel?: string, overrideProvider?: ActiveStudioProvider) => {
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
      const outputLang = lang === 'en' ? 'English' : 'Traditional Chinese';
      const userPrompt = `Generate high-converting, truthful commercial launch assets in ${outputLang} for this digital product as valid JSON ONLY (no markdown fences):
Title: ${project.charter?.productTitle || project.name}
Subtitle: ${project.charter?.subtitle}
Target Audience: ${project.charter?.targetAudience}
Primary Problem: ${project.charter?.primaryProblemSolved}
Central Promise: ${project.charter?.centralPromise}
Signature Framework: ${project.charter?.signatureFramework}
Pricing: Intro $${pricing.introductoryPrice}, Regular $${pricing.regularPrice}, Bundle $${pricing.bundlePrice} ${pricing.currency}
Deliverable Chapters: ${(project.outline || []).map((c) => c.title).join('; ')}

Return JSON with exact keys:
{
  "salesPageHeadline": "string",
  "salesPageSubheadline": "string",
  "heroPitch": "string",
  "productDescriptionBullets": ["string", "string", "string", "string"],
  "targetBuyerNotice": "string",
  "notForBuyerNotice": "string",
  "emailLaunchSequence": [
    {"day": 1, "subject": "string", "preview": "string", "goal": "Launch announcement", "bodyMarkdown": "string"},
    {"day": 2, "subject": "string", "preview": "string", "goal": "Framework deep dive", "bodyMarkdown": "string"},
    {"day": 3, "subject": "string", "preview": "string", "goal": "Bundle close", "bodyMarkdown": "string"}
  ],
  "faqList": [
    {"question": "string", "answer": "string"},
    {"question": "string", "answer": "string"}
  ]
}`;

      const res = await generateTextWithAi({
        provider: activeProvider,
        model: activeModel,
        tokenSaverMode: project.aiSettings?.tokenSaverMode || 'economy',
        allowRateLimitFallback: project.aiSettings?.allowRateLimitFallback ?? true,
        systemPrompt:
          'You are a senior digital product launch strategist. Output concise, non-hyped, accurate JSON strictly matching the requested schema.',
        userPrompt,
        maxTokens: 2000,
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
      const raw = String(res?.content || '').trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI response did not return structured JSON.');
      const parsed = JSON.parse(jsonMatch[0]);

      const nextSales: SalesAssets = {
        ...sales,
        salesPageHeadline: parsed.salesPageHeadline || sales.salesPageHeadline,
        salesPageSubheadline: parsed.salesPageSubheadline || sales.salesPageSubheadline,
        heroPitch: parsed.heroPitch || sales.heroPitch,
        productDescriptionBullets: Array.isArray(parsed.productDescriptionBullets)
          ? parsed.productDescriptionBullets
          : sales.productDescriptionBullets,
        targetBuyerNotice: parsed.targetBuyerNotice || sales.targetBuyerNotice,
        notForBuyerNotice: parsed.notForBuyerNotice || sales.notForBuyerNotice,
        emailLaunchSequence: Array.isArray(parsed.emailLaunchSequence)
          ? parsed.emailLaunchSequence
          : sales.emailLaunchSequence,
        faqList: Array.isArray(parsed.faqList) ? parsed.faqList : sales.faqList,
      };
      setSales(nextSales);
      setBulletsText((nextSales.productDescriptionBullets || []).join('\n'));
      onUpdatePricingAndSales(pricing, nextSales);
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
    void handleGenerateAiLaunchCopy('gemini-3.1-flash-lite', 'gemini');
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
    void handleGenerateAiLaunchCopy(nextModel, 'openrouter');
  };

  return (
    <div className="w-full space-y-5 pb-3">
      {/* Top Banner */}
      <div className="lab-panel p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-indigo-700 mb-1">
            <Tag className="w-4 h-4" />
            <span>{t.navPricingLaunch}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.pricingTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.pricingSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={aiBusy}
            onClick={() => void handleGenerateAiLaunchCopy()}
            className="px-4 py-2.5 text-sm font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${aiBusy ? 'animate-spin' : ''}`} />
            <span>
              {aiBusy
                ? lang === 'en' ? 'Drafting Copy...' : '正在生成文案...'
                : lang === 'en' ? 'Draft Launch Copy with AI' : 'AI 生成上市銷售文案'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => commitChanges()}
            className="px-4 py-2.5 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{lang === 'en' ? 'Save Pricing & Copy' : '儲存定價與文案'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('export_center')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span>{lang === 'en' ? 'Export Center →' : '前往匯出中心 →'}</span>
          </button>
        </div>
      </div>

      <AiEngineQuickControl
        project={project}
        onUpdateAiSettings={onUpdateAiSettings}
        onOpenAiSettings={() => setActiveView('ai_settings')}
        disabled={aiBusy}
        fallbackNotice={fallbackNotice}
        lang={lang}
      />

      {savedNotice && (
        <p role="status" className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{lang === 'en' ? 'Pricing ladder and launch assets saved to project.' : '三階梯定價與商業行銷文案已儲存至專案。'}</span>
        </p>
      )}

      {aiError && (
        <AiRateLimitNotice
          errorMessage={aiError}
          currentModel={project.aiSettings?.defaultModel || 'gemini-4-hydrogen'}
          busy={aiBusy}
          openrouterConnected={openrouterConnected}
          onRetry={() => void handleGenerateAiLaunchCopy()}
          onSwitchToFlashLiteAndRetry={handleSwitchToFlashLiteAndRetry}
          onSwitchToOpenRouterAndRetry={handleSwitchToOpenRouterAndRetry}
          onOpenAiSettings={() => setActiveView('ai_settings')}
          lang={lang}
        />
      )}

      {/* Editable 3-Tier Value-Based Pricing Ladder */}
      <div className="lab-panel p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            {lang === 'en' ? '3-Tier Value-Based Pricing Ladder' : '市場對照與三階梯定價策略'}
          </h2>
          <label className="flex items-center gap-2.5 text-sm">
            <span className="text-slate-600 font-semibold">{lang === 'en' ? 'Currency:' : '幣別：'}</span>
            <select
              value={pricing.currency || 'USD'}
              onChange={(e) => setPricing({ ...pricing, currency: e.target.value })}
              className="font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="TWD">TWD (NT$)</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/90 space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {lang === 'en' ? '1. Early Bird / Test Price' : '1. 首發限時測試價'}
            </label>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-base font-bold text-slate-500">{pricing.currency || 'USD'}</span>
              <input
                type="number"
                min={0}
                step="1"
                value={pricing.introductoryPrice}
                onChange={(e) => setPricing({ ...pricing, introductoryPrice: Number(e.target.value) })}
                className="w-full text-2xl font-bold font-mono tabular-nums bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900"
              />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === 'en'
                ? 'Frictionless entry point for the first 50–100 buyers to validate conversion and gather testimonials.'
                : '用於前 50–100 位早鳥買家快速驗證轉換率並蒐集真實口碑。'}
            </p>
          </div>

          <div className="p-5 rounded-xl border-2 border-indigo-600 bg-indigo-50/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                {lang === 'en' ? '2. Standard Core Guide' : '2. 常態標準核心價'}
              </label>
              <span className="text-xs font-mono font-semibold text-indigo-700">
                {lang === 'en' ? 'Primary Anchor' : '主力定價'}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-base font-bold text-indigo-700">{pricing.currency || 'USD'}</span>
              <input
                type="number"
                min={0}
                step="1"
                value={pricing.regularPrice}
                onChange={(e) => setPricing({ ...pricing, regularPrice: Number(e.target.value) })}
                className="w-full text-2xl font-bold font-mono tabular-nums bg-white border border-indigo-300 rounded-lg px-3.5 py-2 text-indigo-900"
              />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === 'en'
                ? 'Core commercial price point anchored to category benchmarks and documented transformation ROI.'
                : '對齊市場同類暢銷品價值中位數與轉變投資報酬率之標準定價。'}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/90 space-y-3">
            <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
              {lang === 'en' ? '3. Complete Toolkit Bundle' : '3. 全套工具包旗艦價'}
            </label>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-base font-bold text-emerald-700">{pricing.currency || 'USD'}</span>
              <input
                type="number"
                min={0}
                step="1"
                value={pricing.bundlePrice}
                onChange={(e) => setPricing({ ...pricing, bundlePrice: Number(e.target.value) })}
                className="w-full text-2xl font-bold font-mono tabular-nums bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-emerald-800"
              />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === 'en'
                ? 'Full guide + fillable workbooks, progress trackers, CSV templates, and interactive HTML study room.'
                : '核心指南搭配所有填空工作表、進度追蹤、CSV 範本與互動閱讀套件。'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Pricing Rationale' : '定價策略依據'}</span>
            <input
              type="text"
              value={pricing.rationale}
              onChange={(e) => setPricing({ ...pricing, rationale: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-800"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Market Comparison Benchmark' : '競品價格對照摘要'}</span>
            <input
              type="text"
              value={pricing.marketComparisonSummary}
              onChange={(e) => setPricing({ ...pricing, marketComparisonSummary: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-800"
            />
          </label>
        </div>
      </div>

      {/* Unit-Economics & Commercial Profitability Simulator */}
      <div className="lab-panel p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              {lang === 'en' ? 'Commercial Unit-Economics & Profit Simulator' : '商業收益與獲利試算引擎'}
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-600">
            {lang === 'en' ? 'Modeled net margin after checkout & platform fees' : '扣除平台抽成與固定維運支出之淨收益預測'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
          <label className="block space-y-1.5 lg:col-span-2">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Distribution Channel' : '銷售通路費率預設'}</span>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900"
            >
              {PLATFORM_FEE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Monthly Visitors' : '月訪客數'}</span>
            <input
              type="number"
              min={0}
              step={100}
              value={monthlyVisitors}
              onChange={(e) => setMonthlyVisitors(Number(e.target.value))}
              className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Conversion (%)' : '轉換率 (%)'}</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={conversionRatePercent}
              onChange={(e) => setConversionRatePercent(Number(e.target.value))}
              className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Bundle Mix (%)' : '旗艦組佔比 (%)'}</span>
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={bundleSharePercent}
              onChange={(e) => setBundleSharePercent(Number(e.target.value))}
              className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Fixed Costs ($)' : '月固定成本 ($)'}</span>
            <input
              type="number"
              min={0}
              step={10}
              value={monthlyOverheadUsd}
              onChange={(e) => setMonthlyOverheadUsd(Number(e.target.value))}
              className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Monthly Ad / CAC ($)' : '月獲客投放 ($)'}</span>
            <input
              type="number"
              min={0}
              step={25}
              value={monthlyAcquisitionCostUsd}
              onChange={(e) => setMonthlyAcquisitionCostUsd(Number(e.target.value))}
              className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900"
            />
          </label>
        </div>

        {/* Tabular-Nums Profit Projections */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-medium text-slate-600 block">{lang === 'en' ? 'Monthly Units' : '預估月銷量'}</span>
            <strong className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">{metrics.monthlyUnits}</strong>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-medium text-slate-600 block">{lang === 'en' ? 'Blended AOV' : '平均客單價'}</span>
            <strong className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">${metrics.blendedAverageOrderValue.toFixed(2)}</strong>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-medium text-slate-600 block">{lang === 'en' ? 'Gross Revenue' : '月總營收'}</span>
            <strong className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">
              ${metrics.grossMonthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
          <div className="p-4 rounded-xl bg-violet-50/70 border border-violet-200">
            <span className="text-xs font-semibold text-violet-900 block">{lang === 'en' ? 'Effective CAC / Sale' : '單筆獲客成本'}</span>
            <strong className="text-xl font-bold font-mono tabular-nums text-violet-800 mt-0.5 block">
              {metrics.effectiveCacPerSale === null ? '—' : `$${metrics.effectiveCacPerSale.toFixed(2)}`}
            </strong>
          </div>
          <div className={`p-4 rounded-xl border ${metrics.netMonthlyProfit < 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
            <span className={`text-xs font-semibold block ${metrics.netMonthlyProfit < 0 ? 'text-rose-800' : 'text-emerald-800'}`}>
              {lang === 'en' ? 'Net Monthly Profit' : '月淨利潤'}
            </span>
            <strong className={`text-xl font-bold font-mono tabular-nums mt-0.5 block ${metrics.netMonthlyProfit < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {metrics.netMonthlyProfit < 0 ? '-' : ''}$
              {Math.abs(metrics.netMonthlyProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
          <div className={`p-4 rounded-xl border ${metrics.annualizedNetProfit < 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-sky-50/70 border-sky-200'}`}>
            <span className={`text-xs font-semibold block ${metrics.annualizedNetProfit < 0 ? 'text-rose-800' : 'text-sky-800'}`}>
              {lang === 'en' ? 'Annualized Net' : '年化淨利預測'}
            </span>
            <strong className={`text-xl font-bold font-mono tabular-nums mt-0.5 block ${metrics.annualizedNetProfit < 0 ? 'text-rose-700' : 'text-sky-700'}`}>
              {metrics.annualizedNetProfit < 0 ? '-' : ''}$
              {Math.abs(metrics.annualizedNetProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
          <div className={`p-4 rounded-xl border ${metrics.breakEvenUnits === null ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-xs font-medium text-slate-600 block">{lang === 'en' ? 'Net Margin / Break-Even' : '淨利率 / 損益兩平'}</span>
            <strong className={`text-base font-bold font-mono tabular-nums block mt-1 ${metrics.breakEvenUnits === null ? 'text-rose-700' : 'text-slate-900'}`}>
              {metrics.profitMarginPercent}% ·{' '}
              {metrics.breakEvenUnits === null
                ? metrics.netPerSale < 0
                  ? lang === 'en'
                    ? 'Unattainable (loss/sale)'
                    : '無法損益兩平（單筆虧損）'
                  : lang === 'en'
                  ? 'N/A ($0 margin)'
                  : '不適用（零邊際利潤）'
                : `${metrics.breakEvenUnits} ${lang === 'en' ? 'sales' : '套'}`}
            </strong>
          </div>
        </div>

        {/* Integrated Unit Economics Visual Bar */}
        <UnitEconomicsChart
          metrics={metrics}
          monthlyOverheadUsd={monthlyOverheadUsd}
          monthlyAcquisitionCostUsd={monthlyAcquisitionCostUsd}
          lang={lang}
        />

        {/* Scenario Assumptions & Unverified Commercial Unknowns */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-950 space-y-1.5 leading-relaxed">
          <div className="font-bold uppercase tracking-wider text-amber-900">
            {lang === 'en'
              ? 'Scenario Assumptions & Commercial Unknowns (Not Empirical Sales Forecasts)'
              : '試算假設條件與未驗證商業未知數（非實測銷售保證）'}
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              {lang === 'en'
                ? `Explicit scenario inputs: ${monthlyVisitors.toLocaleString()} monthly visits, ${conversionRatePercent}% visitor-to-buyer conversion, ${introSharePercent}%/${100 - introSharePercent - bundleSharePercent}%/${bundleSharePercent}% tier mix, $${monthlyOverheadUsd}/mo overhead, and $${monthlyAcquisitionCostUsd}/mo paid acquisition spend ($0 assumes strictly organic traffic).`
                : `目前模型假設條件：月訪客 ${monthlyVisitors.toLocaleString()} 人、轉換率 ${conversionRatePercent}%、各階梯佔比 ${introSharePercent}%/${100 - introSharePercent - bundleSharePercent}%/${bundleSharePercent}%、月固定成本 $${monthlyOverheadUsd}、月廣告獲客投放 $${monthlyAcquisitionCostUsd}（$0 代表僅算自然流量）。`}
            </li>
            <li>
              {lang === 'en'
                ? 'Unmeasured commercial unknowns excluded from formula: actual refund/chargeback rate, price elasticity at launch vs regular tiers, regional VAT/sales-tax obligations outside MoR channels, and paid ad CPC/CAC fluctuations.'
                : '公式尚未納入且仍屬未知數的商業變因：實際退款與爭議率、首發與常態定價的價格彈性、非 MoR 通路之跨國稅負，以及付費廣告單次點擊/獲客波動。'}
            </li>
          </ul>
        </div>
      </div>

      {/* Editable Sales Page Copy */}
      <div className="lab-panel p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            {lang === 'en' ? 'Sales Page & Checkout Copy Editor' : '高轉換銷售頁核心文案編輯'}
          </h2>
          <button
            type="button"
            onClick={() => commitChanges()}
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 px-3 py-1.5 rounded-lg bg-indigo-50"
          >
            {lang === 'en' ? 'Apply Edits' : '套用修改'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Hero Headline' : '銷售頁主標題'}</span>
            <input
              type="text"
              value={sales.salesPageHeadline}
              onChange={(e) => setSales({ ...sales, salesPageHeadline: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 font-semibold"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Subheadline' : '副標題訴求'}</span>
            <input
              type="text"
              value={sales.salesPageSubheadline}
              onChange={(e) => setSales({ ...sales, salesPageSubheadline: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-800"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Hero Opening Pitch' : '核心開場說服文案'}</span>
            <textarea
              rows={5}
              value={sales.heroPitch}
              onChange={(e) => setSales({ ...sales, heroPitch: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3.5 text-slate-800"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Deliverable Bullets (one per line)' : '內含交付重點 (每行一項)'}</span>
            <textarea
              rows={5}
              value={bulletsText}
              onChange={(e) => setBulletsText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3.5 text-slate-800"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-emerald-800">{lang === 'en' ? 'Ideal For (Target Buyer)' : '最適合對象'}</span>
            <input
              type="text"
              value={sales.targetBuyerNotice}
              onChange={(e) => setSales({ ...sales, targetBuyerNotice: e.target.value })}
              className="w-full bg-emerald-50/40 border border-emerald-200 rounded-lg px-3.5 py-2.5 text-slate-800"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-amber-800">{lang === 'en' ? 'Not Intended For (Scope Exclusion)' : '不適用範圍說明'}</span>
            <input
              type="text"
              value={sales.notForBuyerNotice}
              onChange={(e) => setSales({ ...sales, notForBuyerNotice: e.target.value })}
              className="w-full bg-amber-50/40 border border-amber-200 rounded-lg px-3.5 py-2.5 text-slate-800"
            />
          </label>
        </div>
      </div>

      {/* Email Launch Sequence + FAQ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Email Launch Sequence */}
        <div className="lab-panel p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'en' ? '3-Day Email Launch Sequence' : '三日上市行銷電子報序列'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                setSales({
                  ...sales,
                  emailLaunchSequence: [
                    ...(sales.emailLaunchSequence || []),
                    {
                      day: (sales.emailLaunchSequence?.length || 0) + 1,
                      subject: 'New launch update',
                      preview: 'See inside the toolkit',
                      goal: 'Conversion',
                      bodyMarkdown: 'Share key takeaway and direct link to checkout.',
                    },
                  ],
                })
              }
              className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'en' ? 'Add Email' : '新增信件'}</span>
            </button>
          </div>

          {(sales.emailLaunchSequence || []).length === 0 ? (
            <p className="text-sm text-slate-500 py-3">
              {lang === 'en'
                ? 'No launch emails drafted yet. Click "Draft Launch Copy with AI" or "+ Add Email".'
                : '尚未撰寫上市電子報。可點擊上方 AI 生成文案或手動新增。'}
            </p>
          ) : (
            <div className="space-y-4">
              {sales.emailLaunchSequence.map((email, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-700">Day {email.day} · {email.goal}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(email.subject, email.bodyMarkdown, email.day)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                      >
                        {copiedEmailDay === email.day ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedEmailDay === email.day ? (lang === 'en' ? 'Copied' : '已複製') : (lang === 'en' ? 'Copy' : '複製')}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete Day ${email.day} email`}
                        onClick={() =>
                          setSales({
                            ...sales,
                            emailLaunchSequence: sales.emailLaunchSequence.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-2 text-slate-500 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={email.subject}
                    onChange={(e) =>
                      setSales({
                        ...sales,
                        emailLaunchSequence: sales.emailLaunchSequence.map((item, i) =>
                          i === idx ? { ...item, subject: e.target.value } : item
                        ),
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900"
                  />
                  <textarea
                    rows={4}
                    value={email.bodyMarkdown}
                    onChange={(e) =>
                      setSales({
                        ...sales,
                        emailLaunchSequence: sales.emailLaunchSequence.map((item, i) =>
                          i === idx ? { ...item, bodyMarkdown: e.target.value } : item
                        ),
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-700"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buyer FAQ Editor */}
        <div className="lab-panel p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'en' ? 'Buyer Objection FAQ List' : '常見購買疑慮與問答 (FAQ)'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                setSales({
                  ...sales,
                  faqList: [
                    ...(sales.faqList || []),
                    { question: 'What formats are included in the download?', answer: 'Instant ZIP access with styled HTML e-book, Markdown, and fillable trackers.' },
                  ],
                })
              }
              className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'en' ? 'Add FAQ' : '新增 FAQ'}</span>
            </button>
          </div>

          {(sales.faqList || []).length === 0 ? (
            <p className="text-sm text-slate-500 py-3">
              {lang === 'en' ? 'No FAQs added yet.' : '尚未建立買家 FAQ。'}
            </p>
          ) : (
            <div className="space-y-4">
              {sales.faqList.map((faq, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) =>
                        setSales({
                          ...sales,
                          faqList: sales.faqList.map((f, i) => (i === idx ? { ...f, question: e.target.value } : f)),
                        })
                      }
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900"
                    />
                    <button
                      type="button"
                      aria-label={`Delete FAQ ${idx + 1}`}
                      onClick={() =>
                        setSales({
                          ...sales,
                          faqList: sales.faqList.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-2 text-slate-500 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={faq.answer}
                    onChange={(e) =>
                      setSales({
                        ...sales,
                        faqList: sales.faqList.map((f, i) => (i === idx ? { ...f, answer: e.target.value } : f)),
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-700"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
