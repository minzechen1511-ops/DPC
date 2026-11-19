import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  Zap,
  Link2,
  Unlink,
  ExternalLink,
  Wallet,
} from 'lucide-react';
import { DigitalProductProject, ModelInfo, TokenSaverMode } from '../../types/project.ts';
import {
  ActiveStudioProvider,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  dispatchAiCatalogUpdated,
  disconnectOpenRouter,
  fetchModels,
  fetchOpenRouterStatus,
  GEMINI_TASK_MODELS,
  normalizeStudioProvider,
  OPENROUTER_CURATED_MODELS,
  OpenRouterStatusResponse,
  OPENAI_SERVER_MODELS,
  startOpenRouterOAuth,
  testAiConnection,
  TOKEN_SAVER_MODES,
} from '../../services/aiService.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface AISettingsViewProps {
  project: DigitalProductProject;
  onUpdateAiSettings: (settings: any) => void;
  lang?: Language;
}

const FALLBACK_GEMINI_MODELS: ModelInfo[] = GEMINI_TASK_MODELS.map((m) => ({
  id: m.id,
  name: m.labelEn,
  description: m.taskHintEn,
  context_length: 1048576,
  pricing:
    m.id === 'gemini-3.1-flash-lite'
      ? { prompt: '0.08', completion: '0.30' }
      : m.id === 'gemini-4-hydrogen'
      ? { prompt: '0.15', completion: '0.60' }
      : m.id === 'gemini-4-neon'
      ? { prompt: '0.60', completion: '2.50' }
      : m.id === 'gemini-4-argon'
      ? { prompt: '1.25', completion: '5.00' }
      : { prompt: '2.50', completion: '10.00' },
  isFree: false,
  tier: m.paidTier ? 'paid' : 'standard',
  provider: 'gemini',
}));

function isAllowedOAuthOrigin(origin: string): boolean {
  if (!origin) return false;
  if (typeof window !== 'undefined' && origin === window.location.origin) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host.endsWith('.run.app') || host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

export const AISettingsView: React.FC<AISettingsViewProps> = ({
  project,
  onUpdateAiSettings,
  lang = 'en',
}) => {
  const t = translations[lang];

  const [testing, setTesting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [connectingOpenRouter, setConnectingOpenRouter] = useState<boolean>(false);
  const [disconnectingOpenRouter, setDisconnectingOpenRouter] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [models, setModels] = useState<ModelInfo[]>(FALLBACK_GEMINI_MODELS);
  const [openrouterModels, setOpenrouterModels] = useState<ModelInfo[]>(OPENROUTER_CURATED_MODELS);
  const [openaiModels, setOpenaiModels] = useState<ModelInfo[]>([]);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(true);
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean>(false);
  const [openrouterStatus, setOpenrouterStatus] = useState<OpenRouterStatusResponse>({
    connected: false,
    source: null,
    hint: null,
    updatedAt: null,
    keyInfo: null,
  });
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [modelSearch, setModelSearch] = useState<string>('');

  const initialProvider = normalizeStudioProvider(
    project.aiSettings?.provider,
    project.aiSettings?.defaultModel
  );
  const initialModel =
    project.aiSettings?.defaultModel ||
    (initialProvider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL : DEFAULT_GEMINI_MODEL);

  const [selectedProvider, setSelectedProvider] = useState<ActiveStudioProvider>(initialProvider);
  const [selectedModel, setSelectedModel] = useState<string>(initialModel);
  const [tokenSaverMode, setTokenSaverMode] = useState<TokenSaverMode>(
    project.aiSettings?.tokenSaverMode || 'economy'
  );
  const [allowRateLimitFallback, setAllowRateLimitFallback] = useState<boolean>(
    project.aiSettings?.allowRateLimitFallback ?? true
  );
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
    const nextProv = normalizeStudioProvider(
      project.aiSettings?.provider,
      project.aiSettings?.defaultModel
    );
    setSelectedProvider(nextProv);
    setSelectedModel(
      project.aiSettings?.defaultModel ||
        (nextProv === 'openrouter' ? DEFAULT_OPENROUTER_MODEL : DEFAULT_GEMINI_MODEL)
    );
    setTokenSaverMode(project.aiSettings?.tokenSaverMode || 'economy');
    setAllowRateLimitFallback(project.aiSettings?.allowRateLimitFallback ?? true);
    setMaxSpendPerRequest(project.aiSettings?.maxSpendPerRequest ?? 0.5);
    setDailyBudget(project.aiSettings?.dailyBudget ?? 5);
    setProjectBudget(project.aiSettings?.projectBudget ?? 20);
    setAllowPaidFallback(project.aiSettings?.allowPaidFallback ?? true);
  }, [project.projectId]);

  const loadModelList = useCallback(async () => {
    setLoadingModels(true);
    try {
      const [res, orStatus] = await Promise.all([
        fetchModels(),
        fetchOpenRouterStatus().catch(() => null),
      ]);
      if (res) {
        if (Array.isArray(res.models) && res.models.length > 0) {
          setModels(res.models);
        }
        if (Array.isArray(res.openrouterModels) && res.openrouterModels.length > 0) {
          setOpenrouterModels(res.openrouterModels);
        }
        if (typeof res.geminiConfigured === 'boolean') {
          setGeminiConfigured(res.geminiConfigured);
        }
        const isOpenAiReady = Boolean(res.openaiConfigured);
        setOpenaiConfigured(isOpenAiReady);
        setOpenaiModels(
          isOpenAiReady
            ? Array.isArray(res.openaiModels) && res.openaiModels.length > 0
              ? res.openaiModels
              : (OPENAI_SERVER_MODELS as unknown as ModelInfo[])
            : []
        );
      }
      if (orStatus) {
        setOpenrouterStatus(orStatus);
      } else if (res) {
        setOpenrouterStatus((prev) => ({
          ...prev,
          connected: Boolean(res.openrouterConnected),
          source: res.openrouterSource || null,
          hint: res.openrouterHint || null,
        }));
      }
    } catch {
      // Keep fallback catalogs cleanly
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    void loadModelList();
  }, [loadModelList]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onMessage = (event: MessageEvent) => {
      if (!isAllowedOAuthOrigin(event.origin)) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'OPENROUTER_OAUTH_SUCCESS') {
        setConnectingOpenRouter(false);
        dispatchAiCatalogUpdated();
        void loadModelList();
        const defaultOrModel =
          selectedProvider === 'openrouter' ? selectedModel : DEFAULT_OPENROUTER_MODEL;
        setSelectedProvider('openrouter');
        setSelectedModel(defaultOrModel);
        onUpdateAiSettings({
          ...project.aiSettings,
          provider: 'openrouter',
          apiKey: '',
          baseUrl: '',
          apiKeys: { openrouter: '', gemini: '', openai: '', claude: '' },
          defaultModel: defaultOrModel,
          providerModels: {
            ...project.aiSettings?.providerModels,
            openrouter: defaultOrModel,
          },
        });
        setTestResult({
          success: true,
          message:
            lang === 'en'
              ? `OpenRouter account connected (${data.hint || 'key linked'}) & switched active engine to ${defaultOrModel}. Prompts will spend credits from your OpenRouter account.`
              : `已成功連結您的 OpenRouter 帳號（${data.hint || '已加密儲存'}），並切換至 ${defaultOrModel}。後續生成將直接消耗您的 OpenRouter 帳號額度。`,
        });
      } else if (data.type === 'OPENROUTER_OAUTH_ERROR') {
        setConnectingOpenRouter(false);
        setTestResult({
          success: false,
          message:
            data.error ||
            (lang === 'en'
              ? 'OpenRouter authorization was cancelled or failed.'
              : 'OpenRouter 授權已取消或發生錯誤。'),
        });
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [lang, loadModelList, onUpdateAiSettings, project.aiSettings, selectedModel, selectedProvider]);

  const handleConnectOpenRouter = async () => {
    setConnectingOpenRouter(true);
    setTestResult(null);
    try {
      const flow = await startOpenRouterOAuth();
      const popup = window.open(
        flow.url,
        'openrouter_oauth_popup',
        'width=620,height=740,scrollbars=yes,resizable=yes'
      );
      if (!popup) {
        setConnectingOpenRouter(false);
        setTestResult({
          success: false,
          message:
            lang === 'en'
              ? 'Popup window was blocked by your browser. Allow popups for this studio window and click Connect OpenRouter Account again.'
              : '瀏覽器封鎖了彈出式登入視窗，請允許彈窗後再點擊「連結 OpenRouter 帳號」。',
        });
        return;
      }
      const watchTimer = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(watchTimer);
          setConnectingOpenRouter(false);
          dispatchAiCatalogUpdated();
          void loadModelList();
        }
      }, 650);
    } catch (err: any) {
      setConnectingOpenRouter(false);
      setTestResult({
        success: false,
        message:
          err?.message ||
          (lang === 'en'
            ? 'Could not initiate OpenRouter OAuth flow.'
            : '無法啟動 OpenRouter OAuth 授權流程。'),
      });
    }
  };

  const handleDisconnectOpenRouter = async () => {
    setDisconnectingOpenRouter(true);
    setTestResult(null);
    try {
      const res = await disconnectOpenRouter();
      dispatchAiCatalogUpdated();
      await loadModelList();
      if (selectedProvider === 'openrouter' && !res.stillConfiguredViaSecret) {
        setSelectedProvider('gemini');
        setSelectedModel(DEFAULT_GEMINI_MODEL);
        onUpdateAiSettings({
          ...project.aiSettings,
          provider: 'gemini',
          defaultModel: DEFAULT_GEMINI_MODEL,
        });
      }
      setTestResult({
        success: true,
        message: res.stillConfiguredViaSecret
          ? lang === 'en'
            ? 'Disconnected your personal OpenRouter OAuth session. Server OPENROUTER_API_KEY secret remains active.'
            : '已中斷個人 OpenRouter OAuth 連線；伺服器端 OPENROUTER_API_KEY Secret 仍可使用。'
          : lang === 'en'
          ? 'Disconnected OpenRouter OAuth account and deleted its encrypted server key.'
          : '已中斷 OpenRouter 帳號連線並清除伺服器加密金鑰。',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || (lang === 'en' ? 'Failed to disconnect OpenRouter.' : '無法中斷 OpenRouter 連線。'),
      });
    } finally {
      setDisconnectingOpenRouter(false);
    }
  };

  const handleSelectModel = (provider: ActiveStudioProvider, modelId: string) => {
    setSelectedProvider(provider);
    setSelectedModel(modelId);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnection(selectedModel, selectedProvider);
      if (res?.success) {
        setTestResult({
          success: true,
          message:
            res?.message ||
            (lang === 'en'
              ? `Connected & verified token spend on ${selectedProvider.toUpperCase()} (${res.model || selectedModel}).`
              : `已成功驗證 ${selectedProvider.toUpperCase()} 實時消耗連線（${res.model || selectedModel}）。`),
        });
        if (selectedProvider === 'openrouter') {
          void loadModelList();
        }
      } else {
        setTestResult({
          success: false,
          message:
            res?.error ||
            (lang === 'en'
              ? 'Engine connection test failed. Check provider connection or Secrets.'
              : '無法驗證 AI 引擎消耗連線，請確認帳號連結或 Secrets 金鑰設定。'),
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
        provider: selectedProvider,
        apiKey: '',
        baseUrl: '',
        apiKeys: { openrouter: '', gemini: '', openai: '', claude: '' },
        defaultModel: selectedModel,
        tokenSaverMode,
        allowRateLimitFallback,
        providerModels: {
          ...project.aiSettings?.providerModels,
          [selectedProvider]: selectedModel,
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
            ? `Saved ${selectedProvider.toUpperCase()} model (${selectedModel}), ${tokenSaverMode} token mode & safeguards.`
            : `已儲存 ${selectedProvider.toUpperCase()} 模型（${selectedModel}）、${tokenSaverMode} 思考模式與預算設定。`,
      });
    } finally {
      setSaving(false);
    }
  };

  const q = modelSearch.trim().toLowerCase();
  const filterBySearch = (m: ModelInfo) =>
    !q ||
    m.id.toLowerCase().includes(q) ||
    (m.name && m.name.toLowerCase().includes(q)) ||
    (m.description && m.description.toLowerCase().includes(q));

  const filteredGeminiModels = models.filter(filterBySearch);
  const filteredOpenRouterModels = openrouterModels.filter(filterBySearch);

  const shownOpenAiModels =
    openaiModels.length > 0
      ? openaiModels
      : selectedProvider === 'openai'
      ? (OPENAI_SERVER_MODELS as unknown as ModelInfo[])
      : [];

  return (
    <div className="w-full space-y-5 pb-3">
      {/* Header Banner */}
      <div className="lab-panel p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-indigo-700 mb-1">
            <Cpu className="w-4 h-4" />
            <span>
              {lang === 'en'
                ? 'Google Gemini + OpenRouter Dual-Engine Hub'
                : 'Google Gemini + OpenRouter 雙主引擎設定中心'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'en'
              ? 'Google & OpenRouter Engine Connection, Models & Token Saver'
              : 'Google 與 OpenRouter 引擎連結、模型選擇與省 Token 控制'}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-4xl">
            {lang === 'en'
              ? 'Run workflows on Google Gemini (via GEMINI_API_KEY in Secrets) or connect your OpenRouter account with one click to spend OpenRouter credits across GPT, Claude, Gemini & Llama models.'
              : '可使用伺服器端 GEMINI_API_KEY 執行 Google Gemini，或一鍵登入連結您的 OpenRouter 帳號（亦支援 Secrets 的 OPENROUTER_API_KEY），直接消耗帳號額度使用 GPT、Claude、Gemini 與 DeepSeek 等模型。'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? (lang === 'en' ? 'Testing...' : '驗證中...') : t.testConnection}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm whitespace-nowrap cursor-pointer"
          >
            {saving ? (lang === 'en' ? 'Saving...' : '儲存中...') : t.saveSettings}
          </button>
        </div>
      </div>

      {/* Primary Engine Connection Cards: Google Gemini + OpenRouter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Google (Gemini) */}
        <div
          className={`bg-white rounded-xl p-5 space-y-3.5 shadow-xs border ${
            selectedProvider === 'gemini' ? 'border-emerald-400 ring-1 ring-emerald-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {lang === 'en' ? '1. Google Gemini Engine' : '1. Google Gemini 引擎'}
                  </h2>
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                      geminiConfigured ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {geminiConfigured
                      ? lang === 'en'
                        ? 'GEMINI_API_KEY Active'
                        : '金鑰已就緒'
                      : lang === 'en'
                      ? 'Key Missing'
                      : '尚未設定金鑰'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === 'en'
                    ? 'Your Google Sign-In authenticates studio access while requests spend quota from GEMINI_API_KEY in Settings > Secrets. Google does not bill consumer Gmail OAuth logins directly for Gemini API without an API key or GCP billing project.'
                    : 'Google 帳號登入用於驗證工作室使用權限，Gemini Token 則由 Settings > Secrets 中的 GEMINI_API_KEY 實質扣抵（純 Gmail 消費者帳號本身不提供免費無限 Gemini API 額度，須綁定 API Key 或啟用計費的專案）。'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-slate-700">
              {selectedProvider === 'gemini'
                ? lang === 'en'
                  ? `Active Engine: GEMINI / ${selectedModel}`
                  : `目前使用：GEMINI / ${selectedModel}`
                : lang === 'en'
                ? 'Ready for Google Search Grounding & Gemini 4'
                : '支援 Google 搜尋即時實證與 Gemini 4 模型'}
            </span>
            <button
              type="button"
              onClick={() =>
                handleSelectModel(
                  'gemini',
                  selectedProvider === 'gemini' ? selectedModel : DEFAULT_GEMINI_MODEL
                )
              }
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap cursor-pointer ${
                selectedProvider === 'gemini'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
              }`}
            >
              {selectedProvider === 'gemini'
                ? lang === 'en'
                  ? 'Active Provider'
                  : '目前使用中'
                : lang === 'en'
                ? 'Use Google Gemini'
                : '切換為 Google Gemini'}
            </button>
          </div>
        </div>

        {/* Card 2: OpenRouter (Connected Account OAuth + OPENROUTER_API_KEY Secret) */}
        <div
          className={`bg-white rounded-xl p-5 space-y-3.5 shadow-xs border ${
            selectedProvider === 'openrouter' ? 'border-indigo-400 ring-1 ring-indigo-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 shrink-0">
                <Link2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {lang === 'en' ? '2. OpenRouter Account & Credits' : '2. OpenRouter 帳號登入與額度'}
                  </h2>
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                      openrouterStatus.connected
                        ? 'bg-indigo-50 text-indigo-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {openrouterStatus.connected
                      ? openrouterStatus.source === 'oauth_account'
                        ? lang === 'en'
                          ? 'OAuth Account Linked'
                          : '帳號 OAuth 已連結'
                        : lang === 'en'
                        ? 'Server Secret Active'
                        : 'Secrets 金鑰已就緒'
                      : lang === 'en'
                      ? 'Not Connected'
                      : '尚未連結'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === 'en'
                    ? 'Sign in directly with your OpenRouter account (OAuth PKCE) or configure OPENROUTER_API_KEY in Settings > Secrets. Prompts spend tokens directly from your linked OpenRouter credits across GPT, Claude, Gemini & Llama.'
                    : '點擊下方按鈕直接登入連結 OpenRouter 帳號（OAuth PKCE 安全加密保存於伺服器），或於 Settings > Secrets 設定 OPENROUTER_API_KEY。所有請求將實質消耗您 OpenRouter 帳號內的點數與額度。'}
                </p>
              </div>
            </div>
          </div>

          {openrouterStatus.connected && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono">
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">
                  {lang === 'en' ? 'Credential Source' : '憑證來源'}
                </span>
                <strong className="text-slate-900 truncate block">
                  {openrouterStatus.source === 'oauth_account'
                    ? lang === 'en'
                      ? 'OpenRouter OAuth'
                      : 'OpenRouter OAuth 帳號'
                    : 'OPENROUTER_API_KEY'}
                  {openrouterStatus.hint ? ` (${openrouterStatus.hint})` : ''}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">
                  {lang === 'en' ? 'Key Usage' : '累積用量'}
                </span>
                <strong className="text-slate-900 tabular-nums block">
                  {typeof openrouterStatus.keyInfo?.usage === 'number'
                    ? `$${openrouterStatus.keyInfo.usage.toFixed(4)}`
                    : '—'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">
                  {lang === 'en' ? 'Remaining Limit' : '剩餘可用額度'}
                </span>
                <strong className="text-emerald-700 tabular-nums block">
                  {typeof openrouterStatus.keyInfo?.limitRemaining === 'number'
                    ? `$${openrouterStatus.keyInfo.limitRemaining.toFixed(4)}`
                    : openrouterStatus.keyInfo?.limit === null
                    ? lang === 'en'
                      ? 'Account Balance'
                      : '依帳號餘額扣款'
                    : 'Active'}
                </strong>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleConnectOpenRouter}
                disabled={connectingOpenRouter}
                data-testid="connect-openrouter-btn"
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>
                  {connectingOpenRouter
                    ? lang === 'en'
                      ? 'Waiting for OpenRouter...'
                      : '等待 OpenRouter 授權...'
                    : openrouterStatus.source === 'oauth_account'
                    ? lang === 'en'
                      ? 'Reconnect OpenRouter Account'
                      : '重新連結 OpenRouter 帳號'
                    : lang === 'en'
                    ? 'Connect OpenRouter Account'
                    : '登入並連結 OpenRouter 帳號'}
                </span>
              </button>

              {openrouterStatus.connected && (
                <button
                  type="button"
                  onClick={() => void loadModelList()}
                  disabled={loadingModels}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Refresh Balance' : '更新餘額'}</span>
                </button>
              )}

              {openrouterStatus.source === 'oauth_account' && (
                <button
                  type="button"
                  onClick={handleDisconnectOpenRouter}
                  disabled={disconnectingOpenRouter}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-300 text-rose-700 font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Disconnect' : '中斷連結'}</span>
                </button>
              )}
            </div>

            {openrouterStatus.connected && (
              <button
                type="button"
                onClick={() =>
                  handleSelectModel(
                    'openrouter',
                    selectedProvider === 'openrouter' ? selectedModel : DEFAULT_OPENROUTER_MODEL
                  )
                }
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap cursor-pointer ${
                  selectedProvider === 'openrouter'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                }`}
              >
                {selectedProvider === 'openrouter'
                  ? lang === 'en'
                    ? 'Active Provider'
                    : '目前使用中'
                  : lang === 'en'
                  ? 'Use OpenRouter'
                  : '切換為 OpenRouter'}
              </button>
            )}
          </div>
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

      {/* Token-Saver & Quota Preservation Controls */}
      <div className="lab-panel p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>
                {lang === 'en'
                  ? 'Token-Saver Mode & Automatic 429 Quota Fallback'
                  : '省 Token 思考深度控制與 429 限流自動備援'}
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === 'en'
                ? 'Economy mode reduces token burn per stage run significantly across both Gemini and OpenRouter.'
                : '預設「省 Token 模式」可顯著降低單次生成用量，同時適用於 Gemini 與 OpenRouter。'}
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={allowRateLimitFallback}
              onChange={(e) => setAllowRateLimitFallback(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600"
            />
            <span>
              {lang === 'en'
                ? 'Auto-fallback to Flash Lite / Hydrogen on Gemini 429 limit'
                : '遇 Gemini 429 限流時自動備援切換至 Flash Lite / Hydrogen'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TOKEN_SAVER_MODES.map((mode) => {
            const active = tokenSaverMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={active}
                onClick={() => setTokenSaverMode(mode.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-900">
                    {lang === 'en' ? mode.labelEn : mode.labelZh}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-teal-800">
                    {active ? (lang === 'en' ? 'Active' : '使用中') : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === 'en' ? mode.descriptionEn : mode.descriptionZh}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Model Suites: OpenRouter + Google Gemini */}
      <div className="lab-panel p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'en' ? 'Model Selector (Google Gemini & OpenRouter)' : '模型挑選（Google Gemini 與 OpenRouter）'}</span>
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {loadingModels
                ? lang === 'en'
                  ? 'Syncing live model catalogs...'
                  : '正在同步模型清單...'
                : lang === 'en'
                ? `${filteredGeminiModels.length} Gemini models · ${filteredOpenRouterModels.length} OpenRouter models available`
                : `共 ${filteredGeminiModels.length} 個 Gemini 模型與 ${filteredOpenRouterModels.length} 個 OpenRouter 模型`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder={lang === 'en' ? 'Filter Gemini or OpenRouter models...' : '搜尋 Gemini 或 OpenRouter 模型...'}
                className="w-full pl-10 pr-3.5 py-2 border border-slate-300 rounded-lg bg-white text-sm"
              />
            </div>

            <button
              type="button"
              onClick={() => void loadModelList()}
              disabled={loadingModels}
              className="p-2.5 text-slate-600 hover:text-slate-900 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer"
              aria-label={lang === 'en' ? 'Refresh models' : '重新整理模型'}
            >
              <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* OpenRouter Models Section */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {lang === 'en'
                ? 'OpenRouter Models (Uses Connected OpenRouter Account or OPENROUTER_API_KEY)'
                : 'OpenRouter 模型清單（使用已連結 OpenRouter 帳號或 Secrets 金鑰扣點）'}
            </h3>
            <span className="text-xs font-mono text-slate-600">
              {openrouterStatus.connected
                ? lang === 'en'
                  ? 'Ready to spend OpenRouter credits'
                  : '已就緒，可即時消耗點數'
                : lang === 'en'
                ? 'Connect OpenRouter above to enable'
                : '請先於上方連結 OpenRouter 帳號'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {filteredOpenRouterModels.slice(0, 16).map((m) => {
              const isSelected = selectedProvider === 'openrouter' && selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectModel('openrouter', m.id)}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="w-full space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-mono font-bold text-slate-900 truncate" title={m.id}>
                        {m.id}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-600 shrink-0">
                        {m.isFree ? 'FREE' : m.pricing ? `$${m.pricing.prompt}/M` : 'OPENROUTER'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{m.name}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{m.description}</p>
                  </div>

                  <div className="w-full mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500">OPENROUTER</span>
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

        {/* Google Gemini Models Section */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {lang === 'en'
                ? 'Google Gemini Official Suite (Uses GEMINI_API_KEY in Settings > Secrets)'
                : 'Google Gemini 官方模型（透過 Settings > Secrets 中的 GEMINI_API_KEY）'}
            </h3>
            <span className="text-xs font-mono text-slate-500">
              {geminiConfigured ? 'GEMINI_API_KEY Active' : 'GEMINI_API_KEY Missing'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
            {filteredGeminiModels.map((m) => {
              const isSelected = selectedProvider === 'gemini' && selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectModel('gemini', m.id)}
                  className={`p-5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-mono font-bold text-slate-900 truncate" title={m.id}>
                        {m.id}
                      </span>
                      {m.pricing ? (
                        <span className="text-[11px] font-mono tabular-nums text-slate-600 shrink-0">
                          ${m.pricing.prompt}/M in
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500 shrink-0">GEMINI</span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>
                  </div>

                  <div className="w-full mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono tabular-nums text-slate-500">
                      {m.tier === 'paid'
                        ? lang === 'en'
                          ? 'Paid API Key'
                          : '付費層級'
                        : lang === 'en'
                        ? 'Standard Quota'
                        : '標準配額'}
                    </span>
                    <span className={isSelected ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'}>
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

        {(openaiConfigured || (selectedProvider === 'openai' && shownOpenAiModels.length > 0)) && (
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'en'
                  ? 'Optional OpenAI Server Models (via OPENAI_API_KEY in Settings > Secrets)'
                  : '選用 OpenAI 伺服器端模型（透過 Settings > Secrets 中的 OPENAI_API_KEY）'}
              </h3>
              <span className="text-xs font-mono text-slate-500">
                {openaiConfigured ? 'Secret Active' : 'Secret Missing'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shownOpenAiModels.map((m) => {
                const isSelected = selectedProvider === 'openai' && selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModel('openai', m.id)}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-mono font-bold text-slate-900">{m.id}</span>
                        {m.pricing && (
                          <span className="font-mono tabular-nums text-slate-600">
                            ${m.pricing.prompt}/M in
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>
                      <p className="text-xs text-slate-600">{m.description}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-500">OPENAI</span>
                      <span className={isSelected ? 'text-indigo-700 font-bold' : 'text-slate-500 font-medium'}>
                        {isSelected ? (lang === 'en' ? 'Selected' : '已選取') : lang === 'en' ? 'Select' : '選取'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
              {selectedProvider}
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
