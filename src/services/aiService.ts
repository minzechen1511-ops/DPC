import { AIProviderType, ModelInfo } from '../types/project.ts';

const PROVIDER_STORAGE_PREFIX = 'dpc_key_';
const LEGACY_STORAGE_KEY = 'dpc_openrouter_api_key';

export function getStoredApiKey(provider: AIProviderType = 'openrouter'): string {
  try {
    const key = localStorage.getItem(`${PROVIDER_STORAGE_PREFIX}${provider}`);
    if (key) return key;
    if (provider === 'openrouter') {
      return localStorage.getItem(LEGACY_STORAGE_KEY) || '';
    }
    return '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(provider: AIProviderType, key: string): void {
  try {
    const trimmed = key ? key.trim() : '';
    if (trimmed) {
      localStorage.setItem(`${PROVIDER_STORAGE_PREFIX}${provider}`, trimmed);
      if (provider === 'openrouter') {
        localStorage.setItem(LEGACY_STORAGE_KEY, trimmed);
      }
    } else {
      localStorage.removeItem(`${PROVIDER_STORAGE_PREFIX}${provider}`);
      if (provider === 'openrouter') {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
  } catch (e) {
    console.error(`Failed to save API key for ${provider} to local storage`, e);
  }
}

export function getAllStoredApiKeys(): Record<AIProviderType, string> {
  return {
    openrouter: getStoredApiKey('openrouter'),
    gemini: getStoredApiKey('gemini'),
    openai: getStoredApiKey('openai'),
    claude: getStoredApiKey('claude'),
  };
}

export async function testAiConnection(
  provider: AIProviderType = 'openrouter',
  apiKey: string,
  baseUrl?: string
) {
  const res = await fetch('/api/ai/connection/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey: apiKey.trim(), baseUrl }),
  });
  return res.json();
}

// Backward compatible alias
export const testOpenRouterConnection = (apiKey: string, baseUrl?: string) =>
  testAiConnection('openrouter', apiKey, baseUrl);

export async function fetchModels(
  provider: AIProviderType = 'openrouter',
  apiKey?: string
): Promise<{ success: boolean; models: ModelInfo[]; isFallback?: boolean; error?: string }> {
  const headers: Record<string, string> = {};
  const activeKey = apiKey || getStoredApiKey(provider);
  if (activeKey) {
    headers['Authorization'] = `Bearer ${activeKey.trim()}`;
  }
  const res = await fetch(`/api/ai/models?provider=${encodeURIComponent(provider)}`, { headers });
  return res.json();
}

export interface ChatGenerateOptions {
  provider?: AIProviderType;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  apiKey?: string;
  fallbackModels?: string[];
}

export async function generateTextWithAi(options: ChatGenerateOptions) {
  const provider = options.provider || 'openrouter';
  const apiKey = options.apiKey || getStoredApiKey(provider);

  const messages = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: options.userPrompt });

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      model: options.model,
      messages,
      maxTokens: options.maxTokens || 2000,
      apiKey,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}
