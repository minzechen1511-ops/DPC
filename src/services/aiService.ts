import { ModelInfo } from '../types/project.ts';
import { apiFetch } from './apiClient.ts';
import { scrubLegacyApiKeyStorage } from '../utils/projectStorage.ts';

// Clean up any legacy plaintext credentials stored in localStorage
if (typeof window !== 'undefined') {
  scrubLegacyApiKeyStorage();
}

export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

export async function testAiConnection(model: string = DEFAULT_GEMINI_MODEL) {
  const res = await apiFetch('/api/ai/connection/test', {
    method: 'POST',
    body: JSON.stringify({ model }),
  });
  return res.json();
}

export async function fetchModels(): Promise<{
  success: boolean;
  models: ModelInfo[];
  error?: string;
}> {
  const res = await apiFetch('/api/ai/models');
  return res.json();
}

export interface ChatGenerateOptions {
  provider?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  projectId?: string;
}

export async function generateTextWithAi(options: ChatGenerateOptions) {
  const messages = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: options.userPrompt });

  const res = await apiFetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      model: options.model || DEFAULT_GEMINI_MODEL,
      messages,
      maxTokens: options.maxTokens || 2500,
      projectId: options.projectId,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}
