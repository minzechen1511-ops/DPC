import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { DigitalProductProject, ModelInfo } from '../../types/project.ts';
import {
  DEFAULT_GEMINI_MODEL,
  testAiConnection,
  fetchModels,
} from '../../services/aiService.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface AISettingsViewProps {
  project: DigitalProductProject;
  onUpdateAiSettings: (settings: any) => void;
  lang?: Language;
}

const FALLBACK_GEMINI_MODELS: ModelInfo[] = [
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen (Default Studio Engine)',
    description:
      'Recommended all-around Gemini 4 model for market synthesis, chapter drafting, and launch copy.',
    context_length: 1048576,
    pricing: { prompt: '0.15', completion: '0.60' },
    isFree: false,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite (Fast Low-Latency)',
    description:
      'High-throughput lightweight model for quick outlines, checklists, and summaries.',
    context_length: 1048576,
    pricing: { prompt: '0.08', completion: '0.30' },
    isFree: false,
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon (Advanced Reasoning · Paid Tier)',
    description:
      'Complex synthesis, technical frameworks, and analytical editing (requires paid Gemini key).',
    context_length: 1048576,
    pricing: { prompt: '1.25', completion: '5.00' },
    isFree: false,
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon (Deep Architecture · Paid Tier)',
    description:
      'Maximum reasoning depth for multi-chapter synthesis and high-stakes QA (requires paid Gemini key).',
    context_length: 1048576,
    pricing: { prompt: '2.50', completion: '10.00' },
    isFree: false,
  },
];

export const AISettingsView: React.FC<AISettingsViewProps> = ({
  project,
  onUpdateAiSettings,
  lang = 'en',
}) => {
  const t = translations[lang];

  const [testing, setTesting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [models, setModels] = useState<ModelInfo[]>(FALLBACK_GEMINI_MODELS);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [modelSearch, setModelSearch] = useState<string>('');

  const initialModel =
    FALLBACK_GEMINI_MODELS.some((m) => m.id === project.aiSettings?.defaultModel)
      ? project.aiSettings.defaultModel
      : DEFAULT_GEMINI_MODEL;

  const [selectedModel, setSelectedModel] = useState<string>(initialModel);
  const [maxSpendPerRequest, setMaxSpendPerRequest] = useState<number>(
    project.aiSettings?.maxSpendPerRequest ?? 0.5
  );
  const [dailyBudget, setDailyBudget] = useState<number>(
    project.aiSettings?.dailyBudget ?? 5
  );
  const [projectBudget, setProjectBudget] = useState<number>(
    project.aiSettings?.projectBudget ?? 20
  );
  const [allowPaidFallback, setAllowPaidFallback] = useState<boolean>(
    project.aiSettings?.allowPaidFallback ?? true
  );

  useEffect(() => {
    const valid = FALLBACK_GEMINI_MODELS.some((m) => m.id === project.aiSettings?.defaultModel)
      ? project.aiSettings.defaultModel
      : DEFAULT_GEMINI_MODEL;
    setSelectedModel(valid);
    setMaxSpendPerRequest(project.aiSettings?.maxSpendPerRequest ?? 0.5);
    setDailyBudget(project.aiSettings?.dailyBudget ?? 5);
    setProjectBudget(project.aiSettings?.projectBudget ?? 20);
    setAllowPaidFallback(project.aiSettings?.allowPaidFallback ?? true);
  }, [project.projectId]);

  const loadModelList = async () => {
    setLoadingModels(true);
    try {
      const res = await fetchModels();
      if (res && Array.isArray(res.models) && res.models.length > 0) {
        setModels(res.models);
      }
    } catch {
      // Fallback catalog already loaded
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    void loadModelList();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnection(selectedModel);
      if (res?.success) {
        setTestResult({
          success: true,
          message:
            lang === 'en'
              ? `Connected cleanly to server-side Gemini engine (${res.model || selectedModel}).`
              : `已成功連線至伺服器端 Gemini AI 引擎（${res.model || selectedModel}）。`,
        });
      } else {
        setTestResult({
          success: false,
          message:
            res?.error ||
            (lang === 'en'
              ? 'Gemini engine test failed. Check server GEMINI_API_KEY configuration.'
              : '無法連接伺服器端 Gemini 引擎，請確認伺服器 GEMINI_API_KEY 設定。'),
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message:
          err?.message ||
          (lang === 'en' ? 'Connection test failed.' : '連線測試失敗，請稍後重試。'),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = () => {
    setSaving(true);
    try {
      onUpdateAiSettings({
        ...project.aiSettings,
        provider: 'gemini',
        apiKey: '',
        baseUrl: '',
        apiKeys: { openrouter: '', gemini: '', openai: '', claude: '' },
        defaultModel: selectedModel,
        providerModels: {
          ...project.aiSettings?.providerModels,
          gemini: selectedModel,
        },
        freeOnly: false,
        allowPaidFallback,
        maxSpendPerRequest,
        dailyBudget,
        projectBudget,
      });

      setTestResult({
        success: true,
        message:
          lang === 'en'
            ? `Saved Gemini model & budget safeguards (${selectedModel}).`
            : `已儲存 Gemini 模型與預算防護設定（${selectedModel}）。`,
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredModels = models.filter((m) => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.id.toLowerCase().includes(q) ||
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full space-y-5 pb-3">
      {/* Header Banner */}
      <div className="lab-panel p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-indigo-700 mb-1">
            <Cpu className="w-4 h-4" />
            <span>
              {lang === 'en'
                ? 'Managed Server-Side Google Gemini Engine'
                : '伺服器端託管 Google Gemini AI 引擎'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'en'
              ? 'Gemini AI Model Selection & Usage Safeguards'
              : 'Gemini AI 模型切換與用量預算防護'}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-4xl">
            {lang === 'en'
              ? 'All AI generation runs through the studio server using the managed Gemini token linked to your verified Google session. No manual API key setup is required.'
              : '所有內容生成、市場情報與文案撰寫均由伺服器端透過託管 Gemini Token 安全執行，登入您的 Google 帳戶即可直接使用，無需手動輸入或管理 API 金鑰。'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? (lang === 'en' ? 'Testing...' : '測試中...') : t.testConnection}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
          >
            {saving ? (lang === 'en' ? 'Saving...' : '儲存中...') : t.saveSettings}
          </button>
        </div>
      </div>

      {/* Managed Engine Status Card */}
      <div className="bg-white border border-emerald-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'en'
                  ? 'Google Account + Managed Gemini Token Active'
                  : 'Google 帳戶驗證與託管 Gemini Token 已啟用'}
              </h2>
              <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                GEMINI API
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === 'en'
                ? 'Authenticated requests are signed with your Google session token and executed server-side via @google/genai.'
                : '您的工作區請求會經由已驗證的 Google 帳戶權杖授權，並於後端安全調用 @google/genai 生成內容。'}
            </p>
          </div>
        </div>

        <div className="text-sm font-mono text-slate-700 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 shrink-0">
          {lang === 'en' ? 'Active Model: ' : '目前模型：'}
          <strong className="text-indigo-700">{selectedModel}</strong>
        </div>
      </div>

      {testResult && (
        <div
          role={testResult.success ? 'status' : 'alert'}
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2.5 border ${
            testResult.success
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Gemini Model Catalog */}
      <div className="lab-panel p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'en' ? 'Google Gemini Model Suite' : 'Google Gemini 官方模型庫'}</span>
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {loadingModels
                ? lang === 'en'
                  ? 'Refreshing Gemini catalog...'
                  : '正在同步模型清單...'
                : lang === 'en'
                ? `${filteredModels.length} Gemini models available for studio workflows`
                : `共 ${filteredModels.length} 個 Gemini 模型可用於數位商品製作流程`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder={lang === 'en' ? 'Filter Gemini models...' : '搜尋 Gemini 模型...'}
                className="w-full pl-10 pr-3.5 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <button
              type="button"
              onClick={() => void loadModelList()}
              disabled={loadingModels}
              className="p-2.5 text-slate-600 hover:text-slate-900 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300"
              aria-label={lang === 'en' ? 'Refresh models' : '重新整理模型'}
            >
              <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
          {filteredModels.map((m) => {
            const isSelected = selectedModel === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModel(m.id)}
                className={`p-5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-mono font-bold text-slate-900 truncate" title={m.id}>
                      {m.id}
                    </span>
                    {m.pricing ? (
                      <span className="text-[11px] font-mono text-slate-600 shrink-0">
                        ${m.pricing.prompt}/M in
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-500 shrink-0">GEMINI</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{m.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {m.description}
                  </p>
                </div>

                <div className="w-full mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-500">
                    Context: {(m.context_length || 1048576).toLocaleString()}
                  </span>
                  <span className={isSelected ? 'text-indigo-700 font-bold' : 'text-slate-500 font-medium'}>
                    {isSelected
                      ? lang === 'en'
                        ? 'Selected'
                        : '已選取'
                      : lang === 'en'
                      ? 'Select'
                      : '選取'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget Safeguards */}
      <div className="lab-panel p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            {lang === 'en' ? 'Usage & Cost Safeguards' : '用量監控與預算上限防護'}
          </h2>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 px-3 py-1.5 rounded-lg bg-indigo-50"
          >
            {lang === 'en' ? 'Save Budget Limits' : '儲存預算設定'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block uppercase">Total Requests</span>
            <strong className="text-2xl text-slate-900 tabular-nums mt-1 block">
              {project.aiSettings?.usageStats?.totalRequests || 0}
            </strong>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block uppercase">Total Tokens</span>
            <strong className="text-2xl text-slate-900 tabular-nums mt-1 block">
              {(project.aiSettings?.usageStats?.totalTokens || 0).toLocaleString()}
            </strong>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block uppercase">Estimated Cost</span>
            <strong className="text-2xl text-emerald-700 tabular-nums mt-1 block">
              ${(project.aiSettings?.usageStats?.estimatedCostUsd || 0).toFixed(4)}
            </strong>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block uppercase">Active Engine</span>
            <strong className="text-sm text-indigo-700 uppercase block mt-2">
              GEMINI
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">Max Spend / Request ($)</span>
            <input
              type="number"
              min={0}
              step={0.05}
              value={maxSpendPerRequest}
              onChange={(e) => setMaxSpendPerRequest(Number(e.target.value))}
              className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">Daily Budget ($)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={dailyBudget}
              onChange={(e) => setDailyBudget(Number(e.target.value))}
              className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">Project Budget Cap ($)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={projectBudget}
              onChange={(e) => setProjectBudget(Number(e.target.value))}
              className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2.5 pt-6 text-sm font-medium text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPaidFallback}
              onChange={(e) => setAllowPaidFallback(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600"
            />
            <span>{lang === 'en' ? 'Allow higher-tier Gemini fallback' : '允許切換至高階 Gemini 備援模型'}</span>
          </label>
        </div>
      </div>
    </div>
  );
};
