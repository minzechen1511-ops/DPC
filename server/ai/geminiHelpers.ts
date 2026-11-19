export type GeminiModelId =
  | 'gemini-4-hydrogen'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-argon'
  | 'gemini-4-carbon';

export type StudioCopilotRoleId =
  | 'strategist'
  | 'market_analyst'
  | 'editor'
  | 'launch_copy';

export interface CopilotRolePreset {
  id: StudioCopilotRoleId;
  labelEn: string;
  labelZh: string;
  recommendedModel: GeminiModelId;
  defaultUseSearch: boolean;
  systemInstruction: string;
}

export const STUDIO_COPILOT_ROLES: Record<StudioCopilotRoleId, CopilotRolePreset> = {
  strategist: {
    id: 'strategist',
    labelEn: 'Product Strategist & UVZ Advisor',
    labelZh: '產品策略與 UVZ 顧問',
    recommendedModel: 'gemini-4-carbon',
    defaultUseSearch: false,
    systemInstruction: [
      'You are the senior Digital Product Studio strategist helping a creator design a high-value, well-crafted digital product bundle.',
      'Give structured, actionable product strategy advice grounded in the user project state (niche, UVZ, Transformation Map, Product Charter, pricing).',
      'Be honest about unvalidated assumptions: never invent market rankings, revenue numbers, or unverified customer claims.',
      'Keep answers crisp, well-structured with clear headings or bullet points, and directly usable in Digital Product Studio.',
    ].join(' '),
  },
  market_analyst: {
    id: 'market_analyst',
    labelEn: 'Market & Trend Analyst (Web Search)',
    labelZh: '市場趨勢分析師（Google 搜尋實證）',
    recommendedModel: 'gemini-4-hydrogen',
    defaultUseSearch: true,
    systemInstruction: [
      'You are a market intelligence researcher for Digital Product Studio.',
      'Use Google Search grounding when enabled to surface current trends, buyer demand signals, competitor positioning, and primary/secondary public reports with real source citations.',
      'Distinguish clearly between verified published facts, consumer interest trends, and hypotheses that require manual evidence review before Gate A approval.',
      'Respond clearly in concise structured sections so discovered URLs can be inspected directly.',
    ].join(' '),
  },
  editor: {
    id: 'editor',
    labelEn: 'Curriculum & Manuscript Editor',
    labelZh: '章節架構與內容主編',
    recommendedModel: 'gemini-4-argon',
    defaultUseSearch: false,
    systemInstruction: [
      'You are an editorial architect and instructional designer for Digital Product Studio.',
      'Help craft outlines, actionable chapter sections, exercises, worksheets, and clear reader takeaways aligned with Gate B/C rigor.',
      'Whenever scholarly or empirical claims are discussed, remind the author to verify primary citations in the Reference Library.',
      'Deliver clean, publication-ready structure without fluff.',
    ].join(' '),
  },
  launch_copy: {
    id: 'launch_copy',
    labelEn: 'Launch, Pricing & Offer Copywriter',
    labelZh: '定價策略與銷售文案顧問',
    recommendedModel: 'gemini-3.1-flash-lite',
    defaultUseSearch: false,
    systemInstruction: [
      'You are a conversion-focused digital product launch strategist.',
      'Craft honest, clear value propositions, tier bundles, FAQ answers, and launch sequences grounded in the actual workbook and product deliverables.',
      'Avoid exaggerated income guarantees or fabricated testimonials.',
      'Keep recommendations practical and concise.',
    ].join(' '),
  },
};

export interface InputChatMessage {
  role: string;
  content: string;
}

export interface NormalizedChatHistoryTurn {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface PreparedConversation {
  history: NormalizedChatHistoryTurn[];
  latestMessage: string;
  inlineSystemPrompts: string[];
}

export interface GroundedWebSource {
  title: string;
  url: string;
  domain: string;
}

export interface ExtractedGroundingInfo {
  grounded: boolean;
  webSearchQueries: string[];
  sources: GroundedWebSource[];
}

export function resolveRolePreset(roleId?: string): CopilotRolePreset {
  const key = String(roleId || '').trim() as StudioCopilotRoleId;
  return STUDIO_COPILOT_ROLES[key] || STUDIO_COPILOT_ROLES.strategist;
}

export function selectTaskGeminiModel(options: {
  requestedModel?: string;
  useSearch?: boolean;
  allowedModels: Set<string>;
  fallbackModel?: string;
}): string {
  const fallback = options.fallbackModel || 'gemini-4-hydrogen';
  if (options.useSearch) {
    // Google Search grounding runs on gemini-4-hydrogen
    return 'gemini-4-hydrogen';
  }
  const trimmed = String(options.requestedModel || '').trim();
  if (options.allowedModels.has(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function prepareMultiTurnConversation(
  messages: InputChatMessage[],
  maxHistoryTurns = 30
): PreparedConversation {
  const inlineSystemPrompts: string[] = [];
  const rawTurns: Array<{ role: 'user' | 'model'; text: string }> = [];

  for (const msg of messages) {
    if (!msg || typeof msg.content !== 'string') continue;
    const text = msg.content.trim().slice(0, 16000);
    if (!text) continue;

    if (msg.role === 'system') {
      inlineSystemPrompts.push(text);
      continue;
    }

    const mappedRole: 'user' | 'model' =
      msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';

    const prev = rawTurns[rawTurns.length - 1];
    if (prev && prev.role === mappedRole) {
      prev.text = `${prev.text}\n\n${text}`.slice(0, 24000);
    } else {
      rawTurns.push({ role: mappedRole, text });
    }
  }

  // Gemini chats expect history to start with a user turn when non-empty.
  while (rawTurns.length > 0 && rawTurns[0].role === 'model') {
    rawTurns.shift();
  }

  const trimmed = rawTurns.slice(-Math.max(1, maxHistoryTurns));

  if (trimmed.length === 0) {
    return {
      history: [],
      latestMessage: 'Continue.',
      inlineSystemPrompts,
    };
  }

  const last = trimmed[trimmed.length - 1];
  if (last.role === 'user') {
    return {
      history: trimmed.slice(0, -1).map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      latestMessage: last.text,
      inlineSystemPrompts,
    };
  }

  return {
    history: trimmed.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    latestMessage: 'Continue.',
    inlineSystemPrompts,
  };
}

export function buildStudioSystemInstruction(options: {
  roleId?: string;
  customSystemInstruction?: string;
  inlineSystemPrompts?: string[];
  projectContext?: Record<string, unknown> | string | null;
  useSearch?: boolean;
  lang?: string;
}): string {
  const preset = resolveRolePreset(options.roleId);
  const parts: string[] = [];

  const custom = String(options.customSystemInstruction || '').trim();
  if (custom) {
    parts.push(custom);
  } else if (!options.inlineSystemPrompts || options.inlineSystemPrompts.length === 0) {
    parts.push(preset.systemInstruction);
  }

  if (options.inlineSystemPrompts && options.inlineSystemPrompts.length > 0) {
    parts.push(...options.inlineSystemPrompts);
  }

  if (options.useSearch) {
    parts.push(
      'Google Search Grounding is active. Base factual statements on retrieved search results, summarize clearly, and note uncertainty when search snippets lack details.'
    );
  }

  if (options.lang === 'zh') {
    parts.push('Respond primarily in Traditional Chinese (繁體中文) unless quoting English product names or technical identifiers.');
  }

  if (options.projectContext) {
    const serialized =
      typeof options.projectContext === 'string'
        ? options.projectContext.trim()
        : JSON.stringify(options.projectContext);
    if (serialized && serialized !== '{}') {
      parts.push(`Active Project Context:\n${serialized.slice(0, 4000)}`);
    }
  }

  return parts.join('\n\n').trim();
}

export function extractGroundingResult(response: unknown): ExtractedGroundingInfo {
  const meta = (response as any)?.candidates?.[0]?.groundingMetadata;
  if (!meta) {
    return {
      grounded: false,
      webSearchQueries: [],
      sources: [],
    };
  }

  const queriesRaw = Array.isArray(meta.webSearchQueries) ? meta.webSearchQueries : [];
  const webSearchQueries = Array.from(
    new Set(
      queriesRaw
        .filter((q: unknown): q is string => typeof q === 'string' && q.trim().length > 0)
        .map((q: string) => q.trim())
    )
  ) as string[];

  const chunks = Array.isArray(meta.groundingChunks) ? meta.groundingChunks : [];
  const seenUrls = new Set<string>();
  const sources: GroundedWebSource[] = [];

  for (const chunk of chunks) {
    const uri = typeof chunk?.web?.uri === 'string' ? chunk.web.uri.trim() : '';
    if (!uri || seenUrls.has(uri)) continue;
    let domain = '';
    try {
      domain = new URL(uri).hostname.replace(/^www\./, '');
    } catch {
      domain = '';
    }
    const rawTitle = typeof chunk?.web?.title === 'string' ? chunk.web.title.trim() : '';
    seenUrls.add(uri);
    sources.push({
      title: rawTitle || domain || uri,
      url: uri,
      domain,
    });
  }

  return {
    grounded: sources.length > 0 || webSearchQueries.length > 0,
    webSearchQueries,
    sources,
  };
}
