import React, { useEffect, useState } from 'react';
import { Cpu, SlidersHorizontal, Zap } from 'lucide-react';
import type { DigitalProductProject, ModelInfo, TokenSaverMode } from '../types/project.ts';
import type { Language } from '../utils/i18n.ts';
import {
  AI_CATALOG_UPDATED_EVENT,
  DEFAULT_GEMINI_MODEL,
  fetchModels,
  GEMINI_TASK_MODELS,
  normalizeStudioProvider,
  OPENROUTER_CURATED_MODELS,
  OPENAI_SERVER_MODELS,
  TOKEN_SAVER_MODES,
} from '../services/aiService.ts';

let cachedServerModelCatalog: {
  loaded: boolean;
  openrouterConnected: boolean;
  openrouterModels: ModelInfo[];
  openaiConfigured: boolean;
  openaiModels: ModelInfo[];
} = {
  loaded: false,
  openrouterConnected: false,
  openrouterModels: OPENROUTER_CURATED_MODELS,
  openaiConfigured: false,
  openaiModels: [],
};

export function useOpenRouterConnected(): boolean {
  const [connected, setConnected] = useState(cachedServerModelCatalog.openrouterConnected);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const sync = (force = false) => {
      if (!force && cachedServerModelCatalog.loaded) {
        setConnected(cachedServerModelCatalog.openrouterConnected);
        return;
      }
      void fetchModels()
        .then((res) => {
          if (cancelled) return;
          const nextOrConnected = Boolean(res?.openrouterConnected);
          cachedServerModelCatalog = {
            ...cachedServerModelCatalog,
            loaded: true,
            openrouterConnected: nextOrConnected,
            openrouterModels:
              Array.isArray(res?.openrouterModels) && res.openrouterModels.length > 0
                ? res.openrouterModels
                : OPENROUTER_CURATED_MODELS,
            openaiConfigured: Boolean(res?.openaiConfigured),
            openaiModels:
              Array.isArray(res?.openaiModels) && res.openaiModels.length > 0
                ? res.openaiModels
                : Boolean(res?.openaiConfigured)
                ? (OPENAI_SERVER_MODELS as unknown as ModelInfo[])
                : [],
          };
          setConnected(nextOrConnected);
        })
        .catch(() => {
          cachedServerModelCatalog.loaded = true;
        });
    };
    sync(false);
    const onUpdated = () => sync(true);
    window.addEventListener(AI_CATALOG_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(AI_CATALOG_UPDATED_EVENT, onUpdated);
    };
  }, []);

  return connected;
}

interface AiEngineQuickControlProps {
  project: DigitalProductProject;
  onUpdateAiSettings?: (settings: any) => void;
  onOpenAiSettings?: () => void;
  disabled?: boolean;
  fallbackNotice?: string;
  lang?: Language;
}

export const AiEngineQuickControl: React.FC<AiEngineQuickControlProps> = ({
  project,
  onUpdateAiSettings,
  onOpenAiSettings,
  disabled = false,
  fallbackNotice,
  lang = 'en',
}) => {
  const [openrouterConnected, setOpenrouterConnected] = useState(
    cachedServerModelCatalog.openrouterConnected
  );
  const [openrouterModels, setOpenrouterModels] = useState<ModelInfo[]>(
    cachedServerModelCatalog.openrouterModels
  );
  const [openaiConfigured, setOpenaiConfigured] = useState(cachedServerModelCatalog.openaiConfigured);
  const [openaiModels, setOpenaiModels] = useState<ModelInfo[]>(cachedServerModelCatalog.openaiModels);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    const refreshCatalog = (force = false) => {
      if (!force && cachedServerModelCatalog.loaded) return;
      void fetchModels()
        .then((res) => {
          if (cancelled) return;
          const nextOrConnected = Boolean(res?.openrouterConnected);
          const nextOrModels =
            Array.isArray(res?.openrouterModels) && res.openrouterModels.length > 0
              ? res.openrouterModels
              : OPENROUTER_CURATED_MODELS;
          const nextOpenAiConfigured = Boolean(res?.openaiConfigured);
          const nextOpenAiModels =
            Array.isArray(res?.openaiModels) && res.openaiModels.length > 0
              ? res.openaiModels
              : nextOpenAiConfigured
              ? (OPENAI_SERVER_MODELS as unknown as ModelInfo[])
              : [];

          cachedServerModelCatalog = {
            loaded: true,
            openrouterConnected: nextOrConnected,
            openrouterModels: nextOrModels,
            openaiConfigured: nextOpenAiConfigured,
            openaiModels: nextOpenAiModels,
          };
          setOpenrouterConnected(nextOrConnected);
          setOpenrouterModels(nextOrModels);
          setOpenaiConfigured(nextOpenAiConfigured);
          setOpenaiModels(nextOpenAiModels);
        })
        .catch(() => {
          cachedServerModelCatalog.loaded = true;
        });
    };

    refreshCatalog(false);
    const onUpdated = () => refreshCatalog(true);
    window.addEventListener(AI_CATALOG_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(AI_CATALOG_UPDATED_EVENT, onUpdated);
    };
  }, []);

  const currentProvider = normalizeStudioProvider(
    project.aiSettings?.provider,
    project.aiSettings?.defaultModel
  );
  const currentModel =
    project.aiSettings?.defaultModel ||
    (currentProvider === 'openrouter' ? 'openrouter/auto' : DEFAULT_GEMINI_MODEL);
  const tokenSaverMode: TokenSaverMode = project.aiSettings?.tokenSaverMode || 'economy';

  const selectValue = `${currentProvider}:${currentModel}`;
  const isOpenRouterSelected = currentProvider === 'openrouter';
  const isOpenAiSelected =
    currentProvider === 'openai' || OPENAI_SERVER_MODELS.some((m) => m.id === currentModel);

  const handleModelChange = (rawValue: string) => {
    if (!onUpdateAiSettings) return;
    const colonIdx = rawValue.indexOf(':');
    const rawProv = colonIdx > 0 ? rawValue.slice(0, colonIdx) : 'gemini';
    const nextModel = colonIdx > 0 ? rawValue.slice(colonIdx + 1) : rawValue;
    const nextProvider = normalizeStudioProvider(rawProv, nextModel);

    onUpdateAiSettings({
      ...project.aiSettings,
      provider: nextProvider,
      apiKey: '',
      baseUrl: '',
      apiKeys: { openrouter: '', gemini: '', openai: '', claude: '' },
      defaultModel: nextModel,
      providerModels: {
        ...project.aiSettings?.providerModels,
        [nextProvider]: nextModel,
      },
    });
  };

  const handleSaverModeChange = (mode: TokenSaverMode) => {
    if (!onUpdateAiSettings) return;
    onUpdateAiSettings({
      ...project.aiSettings,
      apiKey: '',
      baseUrl: '',
      apiKeys: { openrouter: '', gemini: '', openai: '', claude: '' },
      tokenSaverMode: mode,
    });
  };

  const visibleOpenRouterModels =
    openrouterConnected || isOpenRouterSelected ? openrouterModels : [];

  const visibleOpenAiModels =
    openaiModels.length > 0
      ? openaiModels
      : isOpenAiSelected
      ? (OPENAI_SERVER_MODELS as unknown as ModelInfo[])
      : [];

  return (
    <div
      data-testid="ai-engine-quick-control"
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/90 text-xs"
    >
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 whitespace-nowrap shrink-0">
          <Cpu className="w-3.5 h-3.5 text-teal-700" />
          <span>{lang === 'en' ? 'AI Engine' : '生成引擎'}</span>
        </div>

        <label className="flex items-center gap-2 min-w-0">
          <span className="sr-only">{lang === 'en' ? 'Select AI model' : '選擇 AI 模型'}</span>
          <select
            aria-label={lang === 'en' ? 'Active AI model' : '目前使用的 AI 模型'}
            disabled={disabled || !onUpdateAiSettings}
            value={selectValue}
            onChange={(e) => handleModelChange(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 max-w-[300px] truncate disabled:opacity-60"
          >
            <optgroup label={lang === 'en' ? 'Google Gemini (GEMINI_API_KEY)' : 'Google Gemini（託管金鑰）'}>
              {GEMINI_TASK_MODELS.map((m) => (
                <option key={m.id} value={`gemini:${m.id}`}>
                  {lang === 'en' ? m.labelEn : m.labelZh}
                </option>
              ))}
            </optgroup>
            {visibleOpenRouterModels.length > 0 && (
              <optgroup
                label={
                  lang === 'en'
                    ? 'OpenRouter (Connected Account / Key)'
                    : 'OpenRouter（已連結帳號 / 額度）'
                }
              >
                {visibleOpenRouterModels.map((m) => (
                  <option key={m.id} value={`openrouter:${m.id}`}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            )}
            {(openaiConfigured || visibleOpenAiModels.length > 0) && (
              <optgroup label={lang === 'en' ? 'OpenAI GPT (Server Secret)' : 'OpenAI GPT（伺服器 Secret）'}>
                {visibleOpenAiModels.map((m) => (
                  <option key={m.id} value={`openai:${m.id}`}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        <div
          className="flex items-center gap-1 p-0.5 bg-slate-200/80 rounded-lg border border-slate-300/70"
          role="group"
          aria-label={lang === 'en' ? 'Token consumption mode' : 'Token 用量模式'}
        >
          <span className="px-2 text-[11px] font-semibold text-slate-600 inline-flex items-center gap-1 whitespace-nowrap">
            <Zap className="w-3 h-3 text-amber-600" />
            <span>{lang === 'en' ? 'Tokens' : '思考深度'}</span>
          </span>
          {TOKEN_SAVER_MODES.map((mode) => {
            const active = tokenSaverMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                disabled={disabled || !onUpdateAiSettings}
                aria-pressed={active}
                title={lang === 'en' ? mode.descriptionEn : mode.descriptionZh}
                onClick={() => handleSaverModeChange(mode.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 ${
                  active
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                {lang === 'en' ? mode.shortLabelEn : mode.shortLabelZh}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {fallbackNotice && (
          <span className="font-mono text-[11px] text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md whitespace-nowrap">
            {fallbackNotice}
          </span>
        )}
        {onOpenAiSettings && (
          <button
            type="button"
            onClick={onOpenAiSettings}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
            <span>
              {openrouterConnected
                ? lang === 'en'
                  ? 'Google & OpenRouter (Linked)'
                  : 'Google & OpenRouter（已連結）'
                : lang === 'en'
                ? 'Google & OpenRouter'
                : 'Google / OpenRouter 設定'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
