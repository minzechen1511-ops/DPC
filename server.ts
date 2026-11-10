import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '4.0.0',
    app: 'Digital Product Creator 2.0',
    supportedProviders: ['openrouter', 'gemini', 'openai', 'claude'],
    geminiKeyAvailable: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

/**
 * Universal Test Connection for Multi-LLM Providers:
 * OpenRouter, Gemini, OpenAI (ChatGPT), Anthropic (Claude)
 */
app.post('/api/ai/connection/test', async (req: Request, res: Response) => {
  try {
    const { provider = 'openrouter', apiKey, baseUrl } = req.body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: `Please provide an API key for ${provider.toUpperCase()}.`,
      });
    }

    const trimmedKey = apiKey.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // 1. OpenRouter
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

    // 2. OpenAI (ChatGPT)
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

    // 3. Anthropic (Claude)
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
        // Fallback test with a minimal 1-token message if models endpoint is restricted
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

    // 4. Gemini
    if (provider === 'gemini') {
      clearTimeout(timeout);
      try {
        const ai = new GoogleGenAI({ apiKey: trimmedKey });
        const testRes = await ai.models.generateContent({
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
app.get('/api/ai/models', async (req: Request, res: Response) => {
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

  // Default: OpenRouter Dynamic Discovery
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
  } catch (err: any) {
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
app.post('/api/ai/chat', async (req: Request, res: Response) => {
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

    // 1. OpenAI (ChatGPT)
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

    // 2. Anthropic (Claude)
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

    // 3. Google Gemini
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

    // 4. OpenRouter (Default)
    if (trimmedKey) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${trimmedKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://aistudio.google.com',
          'X-Title': 'Digital Product Creator 2.0',
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

    // Native fallback to server environment Gemini if available
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

// Setup Vite in Dev or serve static in Prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Digital Product Creator 2.0 backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
