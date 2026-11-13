import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  ShieldAlert,
  Sliders,
  DollarSign,
  Clock,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { DigitalProductProject, ModelInfo, AIProviderType } from '../../types/project.ts';
import {
  getStoredApiKey,
  setStoredApiKey,
  testAiConnection,
  fetchModels,
} from '../../services/aiService.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface AISettingsViewProps {
  project: DigitalProductProject;
  onUpdateAiSettings: (settings: any) => void;
  lang?: Language;
}

interface ProviderMeta {
  id: AIProviderType;
  name: string;
  badge: string;
  keyPrefix: string;
  placeholder: string;
  docUrl: string;
  descriptionEn: string;
  descriptionZh: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Multi-LLM & Free Tier',
    keyPrefix: 'sk-or-v1-',
    placeholder: 'sk-or-v1-xxxxxxxxxxxxxxxxxxxx',
    docUrl: 'https://openrouter.ai/keys',
    descriptionEn: 'Unified gateway to 100+ models with zero-cost free tiers (Llama 3.3, DeepSeek R1, Gemini Flash Free).',
    descriptionZh: '統一多模型閘道器，支援多種零成本免費模型（Llama 3.3、DeepSeek R1、Gemini Flash Free）。',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Google AI Studio',
    keyPrefix: 'AIzaSy',
    placeholder: 'AIzaSyxxxxxxxxxxxxxxxxxxxxxx',
    docUrl: 'https://aistudio.google.com/apikey',
    descriptionEn: 'Direct Google AI Studio connection. Fast reasoning with Gemini 2.5 Flash and Gemini 2.5 Pro.',
    descriptionZh: '直接連接 Google AI Studio，享有極速推理與大上下文視窗（Gemini 2.5 Flash / Pro）。',
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    badge: 'GPT-4o & Reasoning',
    keyPrefix: 'sk-proj-',
    placeholder: 'sk-proj-xxxxxxxxxxxxxxxxxxxx',
    docUrl: 'https://platform.openai.com/api-keys',
    descriptionEn: 'Use your OpenAI account token credits for GPT-4o, GPT-4o-mini, o1, and o3-mini.',
    descriptionZh: '使用你在 OpenAI 官方帳號購買的 Tokens 額度，調用 GPT-4o、GPT-4o-mini 及 o 系列模型。',
  },
  {
    id: 'claude',
    name: 'Anthropic (Claude)',
    badge: 'Claude 3.7 / 3.5 Sonnet',
    keyPrefix: 'sk-ant-',
    placeholder: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxx',
    docUrl: 'https://console.anthropic.com/settings/keys',
    descriptionEn: 'Top-tier nuanced writing and structural synthesis via Claude 3.7 Sonnet & Claude 3.5 Haiku.',
    descriptionZh: '卓越的長篇散文結構化寫作與批判審查（Claude 3.7 Sonnet 及 3.5 Haiku）。',
  },
];

export const AISettingsView: React.FC<AISettingsViewProps> = ({
  project,
  onUpdateAiSettings,
  lang = 'en',
}) => {
  const t = translations[lang];

  const [activeProvider, setActiveProvider] = useState<AIProviderType>(
    project.aiSettings.provider || 'openrouter'
  );

  const [apiKeys, setApiKeys] = useState<Record<AIProviderType, string>>({
    openrouter: getStoredApiKey('openrouter') || project.aiSettings.apiKeys?.openrouter || project.aiSettings.apiKey || '',
    gemini: getStoredApiKey('gemini') || project.aiSettings.apiKeys?.gemini || '',
    openai: getStoredApiKey('openai') || project.aiSettings.apiKeys?.openai || '',
    claude: getStoredApiKey('claude') || project.aiSettings.apiKeys?.claude || '',
  });

  const [showKey, setShowKey] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [modelSearch, setModelSearch] = useState<string>('');
  const [freeOnly, setFreeOnly] = useState<boolean>(project.aiSettings.freeOnly ?? false);

  const currentProviderKey = apiKeys[activeProvider];

  const [selectedModel, setSelectedModel] = useState<string>(
    project.aiSettings.providerModels?.[activeProvider] ||
    project.aiSettings.defaultModel ||
    (activeProvider === 'openrouter' ? 'openrouter/free' : activeProvider === 'gemini' ? 'gemini-2.5-flash' : activeProvider === 'openai' ? 'gpt-4o' : 'claude-3-7-sonnet-20250219')
  );
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(false);
  const [maxSpendPerRequest, setMaxSpendPerRequest] = useState<number>(project.aiSettings.maxSpendPerRequest ?? 0.5);
  const [dailyBudget, setDailyBudget] = useState<number>(project.aiSettings.dailyBudget ?? 5);
  const [projectBudget, setProjectBudget] = useState<number>(project.aiSettings.projectBudget ?? 20);
  const [allowPaidFallback, setAllowPaidFallback] = useState<boolean>(project.aiSettings.allowPaidFallback ?? false);

  const loadModelList = async (provider: AIProviderType = activeProvider, key?: string) => {
    setLoadingModels(true);
    try {
      const activeKey = key !== undefined ? key : apiKeys[provider];
      const res = await fetchModels(provider, activeKey);
      if (res && res.models) {
        setModels(res.models);
      }
    } catch (e: any) {
      console.error('Failed to load models for', provider, e);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    loadModelList(activeProvider);
    const existingModel = project.aiSettings.providerModels?.[activeProvider] || (
      activeProvider === 'openrouter' ? 'openrouter/free' :
      activeProvider === 'gemini' ? 'gemini-2.5-flash' :
      activeProvider === 'openai' ? 'gpt-4o' :
      'claude-3-7-sonnet-20250219'
    );
    setSelectedModel(existingModel);
  }, [activeProvider]);

  const handleKeyChange = (value: string) => {
    setApiKeys((prev) => ({ ...prev, [activeProvider]: value }));
  };

  const handleTestKey = async () => {
    const key = currentProviderKey.trim();
    if (!key && activeProvider !== 'openrouter') {
      setTestResult({
        success: false,
        message: lang === 'en' ? `Please enter a valid API key for ${activeProvider}.` : `請輸入有效的 ${activeProvider} API Key。`,
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await testAiConnection(activeProvider, key, project.aiSettings.baseUrl);
      if (res.success) {
        setStoredApiKey(activeProvider, key);
        setTestResult({
          success: true,
          message:
            lang === 'en'
              ? `Connected successfully to ${activeProvider.toUpperCase()}!`
              : `連線成功！${activeProvider.toUpperCase()} 帳戶憑證已驗證通過。`,
        });
        loadModelList(activeProvider, key);
      } else {
        setTestResult({
          success: false,
          message: res.error || (lang === 'en' ? 'Key validation failed.' : '金鑰驗證失敗，請檢查權限。'),
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || (lang === 'en' ? 'Connection test failed or timed out.' : '連線測試超時或失敗。'),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = () => {
    const key = currentProviderKey.trim();
    setStoredApiKey(activeProvider, key);

    const updatedProviderModels = {
      ...project.aiSettings.providerModels,
      [activeProvider]: selectedModel,
    };

    const updatedApiKeys = {
      ...project.aiSettings.apiKeys,
      ...apiKeys,
      [activeProvider]: key,
    };

    onUpdateAiSettings({
      ...project.aiSettings,
      provider: activeProvider,
      apiKey: key,
      defaultModel: selectedModel,
      apiKeys: updatedApiKeys,
      providerModels: updatedProviderModels,
      freeOnly,
      allowPaidFallback,
      maxSpendPerRequest,
      dailyBudget,
      projectBudget,
    });

    setTestResult({
      success: true,
      message:
        lang === 'en'
          ? `Settings saved. Active provider: ${activeProvider.toUpperCase()} (${selectedModel})`
          : `設定已儲存。啟用提供者：${activeProvider.toUpperCase()} (${selectedModel})`,
    });
  };

  const handleConfirmDeleteKey = () => {
    setApiKeys((prev) => ({ ...prev, [activeProvider]: '' }));
    setStoredApiKey(activeProvider, '');
    setTestResult({
      success: true,
      message: lang === 'en' ? `Removed stored API key for ${activeProvider.toUpperCase()}.` : `已移除 ${activeProvider.toUpperCase()} API 金鑰。`,
    });
    setConfirmDeleteKey(false);
    onUpdateAiSettings({
      ...project.aiSettings,
      apiKeys: {
        ...project.aiSettings.apiKeys,
        [activeProvider]: '',
      },
      apiKey: activeProvider === project.aiSettings.provider ? '' : project.aiSettings.apiKey,
    });
  };

  const filteredModels = models.filter((m) => {
    const matchesFree = !freeOnly || m.isFree;
    const matchesSearch =
      modelSearch.trim() === '' ||
      m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
      (m.name && m.name.toLowerCase().includes(modelSearch.toLowerCase()));
    return matchesFree && matchesSearch;
  });

  const activeMeta = PROVIDERS.find((p) => p.id === activeProvider)!;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
          <Cpu className="w-3.5 h-3.5" />
          <span>Multi-Provider AI & LLM Engine Settings</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {lang === 'en'
            ? 'API Keys, Account Token Integration & Model Discovery'
            : '模型探索、自備帳號金鑰管理與免費額度防護'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {lang === 'en'
            ? 'Supports OpenRouter, Google Gemini, OpenAI (ChatGPT), and Anthropic (Claude). Bring your own purchased tokens or use free tiers.'
            : '支援 OpenRouter、Google Gemini、OpenAI (ChatGPT) 與 Anthropic (Claude)。可直接輸入你已購買的 API Key 或使用免費用量。'}
        </p>
      </div>

      {/* Provider Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PROVIDERS.map((prov) => {
          const isSelected = activeProvider === prov.id;
          const hasKey = !!apiKeys[prov.id];
          return (
            <button
              key={prov.id}
              onClick={() => {
                setActiveProvider(prov.id);
                setTestResult(null);
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="font-bold text-sm text-slate-900">{prov.name}</span>
                <span className={`text-[11px] font-semibold ${hasKey ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {hasKey ? (lang === 'en' ? 'Configured' : '已設定') : (lang === 'en' ? 'Not set' : '未設定')}
                </span>
              </div>
              <span className="text-[11px] font-medium text-indigo-600 block mb-2">
                {prov.badge}
              </span>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                {lang === 'en' ? prov.descriptionEn : prov.descriptionZh}
              </p>
            </button>
          );
        })}
      </div>

      {/* API Key Management Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600" />
            <span>
              {activeMeta.name} {lang === 'en' ? 'API Credentials' : '憑證與連線設定'}
            </span>
          </h2>
          <a
            href={activeMeta.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
          >
            <span>{lang === 'en' ? 'Get API Key / View Usage ↗' : '獲取 API 金鑰 / 查詢額度 ↗'}</span>
          </a>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            {activeMeta.name} API Key ({activeMeta.keyPrefix}...)：
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={currentProviderKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={activeMeta.placeholder}
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg pl-3 pr-9 py-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={handleTestKey}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? (lang === 'en' ? 'Testing...' : '測試中...') : t.testConnection}</span>
            </button>

            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shrink-0"
            >
              {t.saveSettings}
            </button>

            {currentProviderKey && !confirmDeleteKey && (
              <button
                type="button"
                onClick={() => setConfirmDeleteKey(true)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                aria-label={lang === 'en' ? 'Remove this key' : '刪除此金鑰'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {confirmDeleteKey && (
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleConfirmDeleteKey}
                  className="px-2.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                >
                  {lang === 'en' ? 'Confirm Delete' : '確認刪除'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteKey(false)}
                  className="px-2.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  {lang === 'en' ? 'Cancel' : '取消'}
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
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

        {/* Security Disclosure */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
          <strong className="text-slate-700 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === 'en' ? 'Security & Key Protection Standard:' : '官方安全憑證保護規範：'}</span>
          </strong>
          <p>
            {lang === 'en'
              ? 'Your API keys are stored only in your browser local storage and sent via secure server-side proxy headers. They are NEVER baked into exported JSON packages, Git commits, or public project manifests.'
              : '你的 API Key 僅存放於你本地瀏覽器 LocalStorage，並由伺服器端代理請求發送。絕對不會被寫入匯出的商品 JSON 檔案、Git 儲存庫或公開檔案。'}
          </p>
        </div>
      </div>

      {/* Model Selection & Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {activeMeta.name} {lang === 'en' ? 'Model Suite' : '模型庫與探索'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'en'
                ? `Loaded ${models.length} models for ${activeMeta.name} (${filteredModels.length} matching search)`
                : `目前已為 ${activeMeta.name} 載入 ${models.length} 個模型（符合搜尋：${filteredModels.length} 個）`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeProvider === 'openrouter' && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={freeOnly}
                  onChange={(e) => setFreeOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {lang === 'en' ? 'Free Models Only' : '僅顯示免費模型 (Free Only)'}
                </span>
              </label>
            )}

            <button
              onClick={() => loadModelList(activeProvider)}
              disabled={loadingModels}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
              title="Refresh models"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Model Search & Active Model Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-slate-500">{lang === 'en' ? 'Selected Model:' : '目前選定模型：'}</span>
            <strong className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded ml-1 border border-indigo-100">
              {selectedModel}
            </strong>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder={lang === 'en' ? 'Search model ID or name...' : '搜尋模型 ID 或名稱...'}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* Model Cards Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
          {filteredModels.slice(0, 30).map((m) => {
            const isSelected = selectedModel === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModel(m.id)}
                className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between text-xs mb-1 gap-2">
                    <span className="font-mono font-bold text-slate-900 truncate max-w-[220px]" title={m.id}>
                      {m.id}
                    </span>
                    {m.isFree ? (
                      <span className="text-[10px] font-semibold text-emerald-700">
                        FREE
                      </span>
                    ) : m.pricing ? (
                      <span className="text-[10px] font-mono text-slate-400">
                        ${m.pricing.prompt}/M
                      </span>
                    ) : null}
                  </div>
                  <h4 className="text-xs font-semibold text-slate-700 truncate">{m.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{m.description || 'Standard API model'}</p>
                </div>

                <div className="w-full mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-400">Context: {(m.context_length || 128000).toLocaleString()}</span>
                  <span className={isSelected ? 'text-indigo-600 font-bold' : 'text-slate-400'}>
                    {isSelected ? (lang === 'en' ? '✓ Selected' : '✓ 啟用中') : (lang === 'en' ? 'Click to select' : '點擊選取')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Usage Dashboard & Budget Safeguards */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold text-slate-900">
            {lang === 'en' ? 'Usage & Cost Safeguards' : '用量監控與預算上限防護'}
          </h2>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {lang === 'en' ? 'Save Budget Limits' : '儲存預算設定'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-400 block uppercase">
              {lang === 'en' ? 'Total Requests' : '累計請求數'}
            </span>
            <strong className="text-lg text-slate-900 tabular-nums">
              {project.aiSettings.usageStats?.totalRequests || 0}
            </strong>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-400 block uppercase">
              {lang === 'en' ? 'Total Tokens' : '累計 Tokens'}
            </span>
            <strong className="text-lg text-slate-900 tabular-nums">
              {(project.aiSettings.usageStats?.totalTokens || 0).toLocaleString()}
            </strong>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-400 block uppercase">
              {lang === 'en' ? 'Estimated Cost' : '預估累積費用'}
            </span>
            <strong className="text-lg text-emerald-600 tabular-nums">
              ${(project.aiSettings.usageStats?.estimatedCostUsd || 0).toFixed(4)} USD
            </strong>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-400 block uppercase">
              {lang === 'en' ? 'Active Provider' : '目前啟用供應商'}
            </span>
            <strong className="text-xs text-indigo-600 uppercase block mt-1">
              {project.aiSettings.provider || 'openrouter'}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100">
          <label className="block space-y-1">
            <span className="font-semibold text-slate-700">{lang === 'en' ? 'Max Spend / Request ($)' : '單次請求上限 ($)'}</span>
            <input
              type="number"
              min={0}
              step={0.05}
              value={maxSpendPerRequest}
              onChange={(e) => setMaxSpendPerRequest(Number(e.target.value))}
              className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-700">{lang === 'en' ? 'Daily Budget ($)' : '每日預算上限 ($)'}</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={dailyBudget}
              onChange={(e) => setDailyBudget(Number(e.target.value))}
              className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-700">{lang === 'en' ? 'Project Budget Cap ($)' : '單一專案總預算 ($)'}</span>
            <input
              type="number"
              min={0}
              step={1}
              value={projectBudget}
              onChange={(e) => setProjectBudget(Number(e.target.value))}
              className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5"
            />
          </label>

          <label className="flex items-center gap-2 pt-5 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPaidFallback}
              onChange={(e) => setAllowPaidFallback(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600"
            />
            <span>{lang === 'en' ? 'Allow paid model fallback' : '允許切換至付費備援模型'}</span>
          </label>
        </div>
      </div>
    </div>
  );
};
