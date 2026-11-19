export type SynthesisStageKind =
  | 'project_brief'
  | 'uvz'
  | 'transformation_full'
  | 'transformation_titles';

export interface SynthesisVisualStep {
  id: string;
  labelEn: string;
  labelZh: string;
  detailEn: string;
  detailZh: string;
  minElapsedMs: number;
}

export interface ParsedGeminiErrorInfo {
  isRateLimit: boolean;
  statusCode?: number;
  model?: string;
  retryAfterSeconds?: number;
  cleanMessage: string;
}

const STAGE_STEPS: Record<SynthesisStageKind, SynthesisVisualStep[]> = {
  project_brief: [
    {
      id: 'brief-facts',
      labelEn: 'Preserving Locked Creator Facts',
      labelZh: '保留創作者鎖定欄位與既有事實',
      detailEn: 'Keeping verified creator fields and constraints intact.',
      detailZh: '保護已填寫之專業背景與邊界規範不被覆寫。',
      minElapsedMs: 0,
    },
    {
      id: 'brief-audience',
      labelEn: 'Sharpening Audience & Pain Hooks',
      labelZh: '優化目標受眾與核心痛點描述',
      detailEn: 'Mapping buyer friction directly to your approved niche.',
      detailZh: '將選定題材的買家痛點具體化至受眾輪廓。',
      minElapsedMs: 2500,
    },
    {
      id: 'brief-voice',
      labelEn: 'Calibrating Voice & Pricing Ladder',
      labelZh: '校準品牌語調與定價階梯假設',
      detailEn: 'Structuring editorial tone, disclaimers, and bundle anchors.',
      detailZh: '整理寫作風格、合規邊界與試賣至旗艦套組定價。',
      minElapsedMs: 5500,
    },
  ],
  uvz: [
    {
      id: 'uvz-context',
      labelEn: 'Ingesting Niche & Brief Signal',
      labelZh: '讀取核准選題與簡報脈絡',
      detailEn: 'Cross-referencing your approved Gate A topic and brief boundaries.',
      detailZh: '比對已核准之 Gate A 利基題材與簡報邊界條件。',
      minElapsedMs: 0,
    },
    {
      id: 'uvz-friction',
      labelEn: 'Mapping Buyer Pain & Mechanisms',
      labelZh: '拆解買家痛點矩陣與解方機制',
      detailEn: 'Extracting top buyer problems, deliverable solutions, and gaps.',
      detailZh: '推演買家高頻痛點、對應工具解方與市場差異點。',
      minElapsedMs: 2200,
    },
    {
      id: 'uvz-vectors',
      labelEn: 'Synthesizing 3 UVZ Positioning Angles',
      labelZh: '生成 3 組差異化 UVZ 定位方案',
      detailEn: 'Comparing target personas, core promises, strengths, and risks.',
      detailZh: '建構三種策略切角、核心價值承諾與風險評估。',
      minElapsedMs: 5200,
    },
    {
      id: 'uvz-validate',
      labelEn: 'Validating Feasibility & Schema',
      labelZh: '校驗商業可行性與結構完整性',
      detailEn: 'Checking creator-fit gaps and formatting three comparable options.',
      detailZh: '標記專業缺口與可行性假設，確保三組方案可並排比較。',
      minElapsedMs: 8500,
    },
  ],
  transformation_full: [
    {
      id: 'map-uvz',
      labelEn: 'Anchoring Selected UVZ Positioning',
      labelZh: '承接所選 UVZ 價值定位核心',
      detailEn: 'Locking your chosen persona, differentiation angle, and promise.',
      detailZh: '鎖定您採用的買家切角與獨特賣點主張。',
      minElapsedMs: 0,
    },
    {
      id: 'map-before',
      labelEn: 'Tracing Before-State Friction & Costs',
      labelZh: '剖析轉變前痛點與日常摩擦代價',
      detailEn: 'Detailing daily pains, anxieties, and why current alternatives fail.',
      detailZh: '整理現況困擾、心理焦慮及傳統替代方案失效原因。',
      minElapsedMs: 2400,
    },
    {
      id: 'map-bridge',
      labelEn: 'Architecting Bridge Signature Method',
      labelZh: '建構專屬方法論與里程碑橋樑',
      detailEn: 'Designing step-by-step milestones, action tools, and bypasses.',
      detailZh: '規劃可執行里程碑、實戰輔助表單與卡關突破點。',
      minElapsedMs: 5400,
    },
    {
      id: 'map-after',
      labelEn: 'Shaping After-State Outcomes & 3 Titles',
      labelZh: '推演轉變後成果與 3 組商業書名',
      detailEn: 'Drafting measurable outcomes and conversion-ready title/subtitle hooks.',
      detailZh: '產出可驗證交付成果並生成三組主副標題建議。',
      minElapsedMs: 8800,
    },
  ],
  transformation_titles: [
    {
      id: 'titles-review',
      labelEn: 'Reviewing Before → Bridge → After',
      labelZh: '檢視現有轉變架構三大支柱',
      detailEn: 'Keeping your transformation pillars while refreshing commercial hooks.',
      detailZh: '保留現有前後轉變矩陣，僅重新發想商業包裝切角。',
      minElapsedMs: 0,
    },
    {
      id: 'titles-draft',
      labelEn: 'Crafting 3 Commercial Title Hooks',
      labelZh: '生成 3 組高辨識度商業主副標題',
      detailEn: 'Balancing clarity, outcome specificity, and audience resonance.',
      detailZh: '兼顧成果具體性、記憶點與副標題價值說明。',
      minElapsedMs: 2400,
    },
    {
      id: 'titles-align',
      labelEn: 'Checking Positioning Alignment',
      labelZh: '核對定位主張與轉換理由',
      detailEn: 'Verifying every title aligns with your chosen UVZ promise.',
      detailZh: '確認每組書名與已選定之 UVZ 核心承諾一致。',
      minElapsedMs: 5200,
    },
  ],
};

export function getSynthesisVisualSteps(stage: SynthesisStageKind): SynthesisVisualStep[] {
  return STAGE_STEPS[stage] || STAGE_STEPS.uvz;
}

export function getActiveSynthesisStepIndex(
  steps: SynthesisVisualStep[],
  elapsedMs: number
): number {
  if (!steps.length) return 0;
  const safeElapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  let active = 0;
  for (let i = 0; i < steps.length; i++) {
    if (safeElapsed >= steps[i].minElapsedMs) {
      active = i;
    }
  }
  return Math.max(0, Math.min(steps.length - 1, active));
}

export function formatElapsedClock(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor((Number.isFinite(elapsedMs) ? elapsedMs : 0) / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseRetrySecondsFromText(text: string): number | undefined {
  const retryMatch = text.match(
    /(?:retry(?:\s+in|\s*after)?|wait(?:\s*~)?|約)\s*[:=]?\s*"?(\d+(?:\.\d+)?)\s*(?:s|秒)/i
  );
  if (retryMatch) {
    const num = Math.ceil(Number(retryMatch[1]));
    if (Number.isFinite(num) && num > 0) return num;
  }
  return undefined;
}

export function parseGeminiRateLimitDetails(
  rawMessage: string,
  statusCode?: number
): ParsedGeminiErrorInfo | null {
  const trimmed = String(rawMessage || '').trim();
  if (!trimmed) return null;

  let parsedPayload: any = null;
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace >= 0) {
    try {
      parsedPayload = JSON.parse(trimmed.slice(firstBrace));
    } catch {
      parsedPayload = null;
    }
  }

  const errObj = parsedPayload?.error && typeof parsedPayload.error === 'object' ? parsedPayload.error : parsedPayload;
  const errCode = Number(errObj?.code || statusCode || 0);
  const errStatus = String(errObj?.status || '');
  const innerMessage = typeof errObj?.message === 'string' ? errObj.message : trimmed;

  const isRateLimit =
    errCode === 429 ||
    errStatus === 'RESOURCE_EXHAUSTED' ||
    /resource_exhausted|quota exceeded|rate[- ]limit/i.test(`${errStatus} ${innerMessage}`);

  let retryAfterSeconds: number | undefined;
  let model: string | undefined;

  if (Array.isArray(errObj?.details)) {
    for (const detail of errObj.details) {
      if (typeof detail?.retryDelay === 'string') {
        const parsedDelay = parseRetrySecondsFromText(detail.retryDelay);
        if (parsedDelay) retryAfterSeconds = parsedDelay;
      }
      if (Array.isArray(detail?.violations)) {
        for (const v of detail.violations) {
          if (typeof v?.quotaDimensions?.model === 'string' && v.quotaDimensions.model.trim()) {
            model = v.quotaDimensions.model.trim();
          }
        }
      }
    }
  }

  if (!retryAfterSeconds) {
    retryAfterSeconds = parseRetrySecondsFromText(innerMessage);
  }
  if (!model) {
    const modelMatch = innerMessage.match(/model:\s*([a-z0-9._-]+)/i);
    if (modelMatch) model = modelMatch[1];
  }

  if (isRateLimit) {
    const modelLabel = model ? ` for ${model}` : '';
    const waitLabel = retryAfterSeconds
      ? ` Please wait ~${retryAfterSeconds}s and click Retry.`
      : ' Please wait ~45s and click Retry.';
    return {
      isRateLimit: true,
      statusCode: 429,
      model,
      retryAfterSeconds,
      cleanMessage: `Gemini API free-tier request limit reached${modelLabel}.${waitLabel} For higher throughput, select a billing-enabled API key in Settings > Secrets.`,
    };
  }

  if (errObj && typeof errObj.message === 'string' && errObj.message.trim()) {
    const firstSentence = errObj.message.split('\n')[0].trim();
    return {
      isRateLimit: false,
      statusCode: errCode || statusCode,
      model,
      cleanMessage: firstSentence,
    };
  }

  return null;
}

export function formatLocalizedRateLimitError(
  parsed: ParsedGeminiErrorInfo,
  lang: 'en' | 'zh'
): string {
  if (!parsed.isRateLimit) {
    return parsed.cleanMessage;
  }
  const waitSecs = parsed.retryAfterSeconds || 45;
  const modelNote = parsed.model ? ` (${parsed.model})` : '';
  if (lang === 'zh') {
    return `已達 Gemini API 免費層每分鐘請求上限${modelNote}。請稍候約 ${waitSecs} 秒再重試，或於 Google AI Studio 的 Settings > Secrets 切換為已啟用計費的 API 金鑰。`;
  }
  return `Gemini API rate limit reached${modelNote}. Please wait ~${waitSecs}s before retrying, or attach a billing-enabled API key in Settings > Secrets for higher quota.`;
}
