import React, { useEffect, useState } from 'react';
import { AlertCircle, Link2, RefreshCw, SlidersHorizontal, Zap } from 'lucide-react';
import type { Language } from '../utils/i18n.ts';
import { formatElapsedClock, parseGeminiRateLimitDetails } from '../utils/synthesisVisualizer.ts';

interface AiRateLimitNoticeProps {
  errorMessage: string;
  currentModel?: string;
  draftRetained?: boolean;
  busy?: boolean;
  openrouterConnected?: boolean;
  onRetry?: () => void;
  onSwitchToFlashLiteAndRetry?: () => void;
  onSwitchToOpenRouterAndRetry?: () => void;
  onOpenAiSettings?: () => void;
  lang?: Language;
}

export const AiRateLimitNotice: React.FC<AiRateLimitNoticeProps> = ({
  errorMessage,
  currentModel = 'gemini-4-hydrogen',
  draftRetained = true,
  busy = false,
  openrouterConnected = false,
  onRetry,
  onSwitchToFlashLiteAndRetry,
  onSwitchToOpenRouterAndRetry,
  onOpenAiSettings,
  lang = 'en',
}) => {
  const parsed = parseGeminiRateLimitDetails(errorMessage);
  const isRateLimit = Boolean(parsed?.isRateLimit || /rate limit|429|quota|限流|上限/i.test(errorMessage));
  const initialWait = parsed?.retryAfterSeconds || (isRateLimit ? 45 : 0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(initialWait);

  useEffect(() => {
    setRemainingSeconds(initialWait);
  }, [errorMessage, initialWait]);

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const id = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [remainingSeconds]);

  const showFlashLiteAction =
    isRateLimit &&
    Boolean(onSwitchToFlashLiteAndRetry) &&
    currentModel !== 'gemini-3.1-flash-lite';

  const showOpenRouterAction =
    isRateLimit &&
    openrouterConnected &&
    Boolean(onSwitchToOpenRouterAndRetry) &&
    !currentModel.includes('/');

  return (
    <div
      role="alert"
      data-testid="ai-rate-limit-notice"
      className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-950 space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold leading-snug">
            {errorMessage}{' '}
            {draftRetained && (
              <span className="font-normal text-rose-900">
                {lang === 'en'
                  ? 'Your previous draft is retained.'
                  : '已保留原草稿，可直接重試或切換為低配額消耗模型。'}
              </span>
            )}
          </p>

          {isRateLimit && (
            <p className="text-xs text-rose-900 font-mono tabular-nums">
              {remainingSeconds > 0
                ? lang === 'en'
                  ? `Cooldown countdown: ${formatElapsedClock(remainingSeconds * 1000)} remaining for current model quota bucket`
                  : `目前模型限流冷卻倒數：剩餘 ${formatElapsedClock(remainingSeconds * 1000)}`
                : lang === 'en'
                ? 'Cooldown window elapsed — ready to retry now.'
                : '限流冷卻時間已到，可立即重試。'}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pl-6">
        {showFlashLiteAction && (
          <button
            type="button"
            disabled={busy}
            onClick={onSwitchToFlashLiteAndRetry}
            className="px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {lang === 'en'
                ? 'Switch to Gemini 3.1 Flash Lite (Token-Saver) & Retry'
                : '切換至 Gemini 3.1 Flash Lite（省 Token）並重試'}
            </span>
          </button>
        )}

        {showOpenRouterAction && (
          <button
            type="button"
            disabled={busy}
            onClick={onSwitchToOpenRouterAndRetry}
            className="px-3.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Link2 className="w-3.5 h-3.5 text-indigo-200" />
            <span>
              {lang === 'en'
                ? 'Switch to OpenRouter (Auto) & Retry'
                : '切換至 OpenRouter (Auto) 並重試'}
            </span>
          </button>
        )}

        {onRetry && (
          <button
            type="button"
            disabled={busy}
            onClick={onRetry}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-rose-100 border border-rose-300 text-rose-900 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
            <span>
              {remainingSeconds > 0
                ? lang === 'en'
                  ? `Retry (${remainingSeconds}s)`
                  : `重試 (${remainingSeconds}s)`
                : lang === 'en'
                ? 'Retry Now'
                : '立即重試'}
            </span>
          </button>
        )}

        {onOpenAiSettings && (
          <button
            type="button"
            onClick={onOpenAiSettings}
            className="px-3 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Open AI Settings' : '開啟 AI 設定'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
