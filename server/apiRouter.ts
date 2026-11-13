import express, { Request, Response, Router } from 'express';
import fs from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import { searchReferences, retrieveReference, verifyReferenceRecords } from './referenceResearch.ts';
import { collectMarketResearch } from './marketResearch.ts';
import {
  getDesktopPackageInfo,
  readDesktopSubscription,
  writeDesktopSubscription,
  type DesktopPackageInfo,
} from './desktopPackage.ts';

export interface ApiRouterOptions {
  includeDesktopPackager?: boolean;
  onBuildDesktop?: () => Promise<DesktopPackageInfo>;
}

export function createApiRouter(options: ApiRouterOptions = {}): Router {
  const router = express.Router();

  router.get('/market/research', async (_req: Request, res: Response) => {
    try {
      res.json(await collectMarketResearch());
    } catch {
      res.status(502).json({ error: 'Market research failed. Retry after checking source access.' });
    }
  });

  router.get('/references/search', async (req: Request, res: Response) => {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    if (query.trim().length < 3 || query.length > 250) {
      return res.status(400).json({ error: 'Use a research query between 3 and 250 characters.' });
    }
    try {
      res.json(await searchReferences(query));
    } catch {
      res.status(502).json({ error: 'Reference search failed; no validated source records were created.' });
    }
  });

  router.post('/references/retrieve', async (req: Request, res: Response) => {
    const { pmcid, url } = req.body || {};
    if ((typeof pmcid !== 'string' && typeof url !== 'string') || (url?.length || 0) > 2000) {
      return res.status(400).json({ error: 'Provide a supported source URL or PMC identifier.' });
    }
    try {
      res.json(await retrieveReference({ pmcid, url }));
    } catch (error) {
      res.status(422).json({
        error:
          error instanceof Error && error.message !== 'fetch failed'
            ? error.message
            : 'Could not retrieve the source text. Check network access; metadata is not validated full text.',
      });
    }
  });

  router.post('/references/verify', async (req: Request, res: Response) => {
    const cards = req.body?.cards;
    if (!Array.isArray(cards) || !cards.length || cards.length > 50) {
      return res.status(400).json({ error: 'Provide 1–50 source records for checking.' });
    }
    try {
      res.json(await verifyReferenceRecords(cards));
    } catch {
      res.status(422).json({ error: 'Source records could not be checked; no source validation was granted.' });
    }
  });

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: '4.0.0',
      app: 'Digital Product Studio',
      supportedProviders: ['openrouter', 'gemini', 'openai', 'claude'],
      geminiKeyAvailable: Boolean(process.env.GEMINI_API_KEY),
      desktopPackagerAvailable: Boolean(options.includeDesktopPackager),
      time: new Date().toISOString(),
    });
  });

  // Desktop Local Subscription Vault (persists across browser cache clears & inside standalone .exe)
  router.get('/desktop/subscription', (_req: Request, res: Response) => {
    try {
      const state = readDesktopSubscription();
      res.json({ success: true, state });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to read desktop subscription state.' });
    }
  });

  router.post('/desktop/subscription', (req: Request, res: Response) => {
    try {
      const payload = req.body?.state ?? req.body?.subscription ?? req.body;
      const saved = writeDesktopSubscription(payload);
      res.json({ success: true, state: saved });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Invalid subscription payload.' });
    }
  });

  // Desktop Executable Metadata & Download Endpoints
  router.get('/desktop/info', (_req: Request, res: Response) => {
    const info = getDesktopPackageInfo();
    res.json({
      ...info,
      canRebuild: Boolean(options.onBuildDesktop),
    });
  });

  if (options.includeDesktopPackager && options.onBuildDesktop) {
    router.post('/desktop/build', async (_req: Request, res: Response) => {
      try {
        const info = await options.onBuildDesktop!();
        res.json({ success: true, ...info, canRebuild: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error?.message || 'Failed to build Digital Product Studio.exe package.',
        });
      }
    });
  }

  router.get('/desktop/download', async (_req: Request, res: Response) => {
    try {
      let info = getDesktopPackageInfo();
      if (!info.ready && options.includeDesktopPackager && options.onBuildDesktop) {
        info = await options.onBuildDesktop();
      }
      if (!info.ready || !fs.existsSync(info.filePath)) {
        return res.status(404).json({
          error: 'Desktop executable has not been built yet. Click Build Desktop Package first.',
        });
      }

      res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
      res.setHeader('Content-Disposition', `attachment; filename="${info.fileName}"`);
      res.setHeader('Content-Length', String(info.sizeBytes));
      if (info.sha256) {
        res.setHeader('X-Content-Sha256', info.sha256);
      }

      const stream = fs.createReadStream(info.filePath);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed while streaming desktop executable.' });
        }
      });
      stream.pipe(res);
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || 'Unable to prepare Digital Product Studio.exe download.',
      });
    }
  });

  /**
   * Universal Test Connection for Multi-LLM Providers
   */
  router.post('/ai/connection/test', async (req: Request, res: Response) => {
    try {
      const { provider = 'openrouter', apiKey, baseUrl } = req.body;

      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: `Please provide an API key for ${String(provider).toUpperCase()}.`,
        });
      }

      const trimmedKey = apiKey.trim();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      if (provider === 'openrouter') {
        const endpoint = `${(baseUrl || 'https://openrouter.ai/api/v1').replace(/\/$/, '')}/key`;
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${trimmedKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({
            success: false,
            error: `OpenRouter authentication failed (${response.status}): ${errText || 'Invalid API key'}`,
          });
        }

        const data = await response.json();
        return res.json({
          success: true,
          provider: 'openrouter',
          data: data.data || data,
          message: 'OpenRouter API key connected successfully.',
        });
      }

      if (provider === 'openai') {
        const endpoint = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/models`;
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${trimmedKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({
            success: false,
            error: `OpenAI authentication failed (${response.status}): ${errText || 'Invalid API key'}`,
          });
        }

        return res.json({
          success: true,
          provider: 'openai',
          message: 'OpenAI (ChatGPT) API key verified successfully.',
        });
      }

      if (provider === 'claude') {
        const endpoint = `${(baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '')}/models`;
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'x-api-key': trimmedKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const msgRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': trimmedKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-3-5-haiku-20241022',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'hi' }],
            }),
          });

          if (!msgRes.ok) {
            const errText = await msgRes.text();
            return res.status(msgRes.status).json({
              success: false,
              error: `Claude (Anthropic) authentication failed (${msgRes.status}): ${errText || 'Invalid API key'}`,
            });
          }
        }

        return res.json({
          success: true,
          provider: 'claude',
          message: 'Anthropic (Claude) API key verified successfully.',
        });
      }

      if (provider === 'gemini') {
        clearTimeout(timeout);
        try {
          const ai = new GoogleGenAI({ apiKey: trimmedKey });
          await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Ping',
          });
          return res.json({
            success: true,
            provider: 'gemini',
            message: 'Google Gemini API key verified successfully.',
          });
        } catch (geminiErr: any) {
          return res.status(401).json({
            success: false,
            error: `Gemini verification failed: ${geminiErr.message}`,
          });
        }
      }

      clearTimeout(timeout);
      return res.status(400).json({ success: false, error: `Unsupported provider: ${provider}` });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.name === 'AbortError' ? 'Connection timed out. Check network or key.' : error.message,
      });
    }
  });

  /**
   * Universal Models Discovery
   */
  router.get('/ai/models', async (req: Request, res: Response) => {
    const provider = (req.query.provider as string) || 'openrouter';
    const authHeader = req.headers.authorization;
    const clientKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

    if (provider === 'openai') {
      return res.json({
        success: true,
        provider: 'openai',
        models: [
          { id: 'gpt-4o', name: 'GPT-4o (Omni flagship)', context_length: 128000, isFree: false },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & economical)', context_length: 128000, isFree: false },
          { id: 'o1', name: 'OpenAI o1 (Deep reasoning)', context_length: 200000, isFree: false },
          { id: 'o1-mini', name: 'OpenAI o1 Mini (Fast reasoning)', context_length: 128000, isFree: false },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context_length: 128000, isFree: false },
        ],
      });
    }

    if (provider === 'claude') {
      return res.json({
        success: true,
        provider: 'claude',
        models: [
          { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Hybrid Reasoning)', context_length: 200000, isFree: false },
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (State of the art)', context_length: 200000, isFree: false },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Ultra fast)', context_length: 200000, isFree: false },
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Complex analysis)', context_length: 200000, isFree: false },
        ],
      });
    }

    if (provider === 'gemini') {
      return res.json({
        success: true,
        provider: 'gemini',
        models: [
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended default)', context_length: 1048576, isFree: true },
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep editorial research)', context_length: 2097152, isFree: false },
          { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp (High speed)', context_length: 1048576, isFree: true },
        ],
      });
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (clientKey) headers['Authorization'] = `Bearer ${clientKey}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`OpenRouter models failed with status ${response.status}`);
      }

      const json = await response.json();
      const rawModels: any[] = json.data || [];

      const models = rawModels.map((m) => {
        const id: string = m.id || '';
        const promptPrice = parseFloat(m.pricing?.prompt || '0');
        const completionPrice = parseFloat(m.pricing?.completion || '0');
        const isFree =
          id.includes(':free') ||
          id === 'openrouter/free' ||
          (promptPrice === 0 && completionPrice === 0);

        return {
          id,
          name: m.name || id,
          description: m.description || '',
          context_length: m.context_length || 8192,
          pricing: {
            prompt: m.pricing?.prompt || '0',
            completion: m.pricing?.completion || '0',
          },
          isFree,
        };
      });

      return res.json({ success: true, provider: 'openrouter', models });
    } catch {
      const fallbackModels = [
        {
          id: 'openrouter/free',
          name: 'OpenRouter Auto Free Router',
          description: 'Automatic load-balanced zero-cost model pool',
          context_length: 32768,
          pricing: { prompt: '0', completion: '0' },
          isFree: true,
        },
        {
          id: 'meta-llama/llama-3.3-70b-instruct:free',
          name: 'Meta Llama 3.3 70B Instruct (Free)',
          description: 'High-capability open-weight writing model',
          context_length: 65536,
          pricing: { prompt: '0', completion: '0' },
          isFree: true,
        },
        {
          id: 'deepseek/deepseek-r1:free',
          name: 'DeepSeek R1 (Free)',
          description: 'Deep reasoning, research verification, logic validation',
          context_length: 65536,
          pricing: { prompt: '0', completion: '0' },
          isFree: true,
        },
        {
          id: 'google/gemini-2.0-flash-exp:free',
          name: 'Google Gemini 2.0 Flash Exp (Free)',
          description: 'Ultra-fast long context generation',
          context_length: 1048576,
          pricing: { prompt: '0', completion: '0' },
          isFree: true,
        },
      ];

      return res.json({
        success: true,
        provider: 'openrouter',
        isFallback: true,
        models: fallbackModels,
      });
    }
  });

  /**
   * Universal Multi-Provider Chat Completion Proxy
   */
  router.post('/ai/chat', async (req: Request, res: Response) => {
    try {
      const {
        provider = 'openrouter',
        model,
        messages,
        maxTokens = 2500,
        apiKey,
      } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Please provide messages array.' });
      }

      const trimmedKey = (apiKey || '').trim();

      if (provider === 'openai') {
        if (!trimmedKey) return res.status(400).json({ error: 'OpenAI API Key required.' });
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${trimmedKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model || 'gpt-4o',
            messages,
            max_tokens: maxTokens,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ error: `OpenAI Error: ${errText}` });
        }

        const json = await response.json();
        return res.json({
          success: true,
          provider: 'openai',
          model: model || 'gpt-4o',
          content: json.choices?.[0]?.message?.content || '',
          usage: json.usage || { total_tokens: 0 },
        });
      }

      if (provider === 'claude') {
        if (!trimmedKey) return res.status(400).json({ error: 'Claude (Anthropic) API Key required.' });

        const systemMsg = messages.find((m: any) => m.role === 'system')?.content;
        const userAndAssistantMsgs = messages
          .filter((m: any) => m.role !== 'system')
          .map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          }));

        const body: any = {
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: maxTokens,
          messages: userAndAssistantMsgs,
        };
        if (systemMsg) body.system = systemMsg;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': trimmedKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ error: `Claude Error: ${errText}` });
        }

        const json = await response.json();
        const content = json.content?.map((c: any) => c.text || '').join('\n') || '';
        return res.json({
          success: true,
          provider: 'claude',
          model: model || 'claude-3-5-sonnet-20241022',
          content,
          usage: { total_tokens: (json.usage?.input_tokens || 0) + (json.usage?.output_tokens || 0) },
        });
      }

      if (provider === 'gemini') {
        const geminiKey = trimmedKey || process.env.GEMINI_API_KEY;
        if (!geminiKey) return res.status(400).json({ error: 'Gemini API Key required.' });

        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const promptText = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

        const response = await ai.models.generateContent({
          model: model || 'gemini-2.5-flash',
          contents: promptText,
        });

        return res.json({
          success: true,
          provider: 'gemini',
          model: model || 'gemini-2.5-flash',
          content: response.text || '',
          usage: { total_tokens: 1200 },
        });
      }

      if (trimmedKey) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${trimmedKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://aistudio.google.com',
            'X-Title': 'Digital Product Studio',
          },
          body: JSON.stringify({
            model: model || 'openrouter/free',
            messages,
            max_tokens: maxTokens,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          return res.status(response.status).json({
            error: `OpenRouter Error (${response.status}): ${errorBody}`,
            isRateLimit: response.status === 429,
            retryAfter: response.headers.get('retry-after') || 15,
          });
        }

        const json = await response.json();
        return res.json({
          success: true,
          provider: 'openrouter',
          model: model || 'openrouter/free',
          content: json.choices?.[0]?.message?.content || '',
          usage: json.usage || { total_tokens: 0 },
        });
      }

      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI();
        const promptText = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: promptText,
        });

        return res.json({
          success: true,
          provider: 'gemini-native',
          model: 'gemini-2.5-flash',
          content: response.text || '',
          usage: { total_tokens: 1200 },
        });
      }

      return res.status(400).json({
        error: 'No active API Key configured for the selected provider. Please enter your API key in AI Model & API Settings.',
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Server error during AI generation' });
    }
  });

  return router;
}
