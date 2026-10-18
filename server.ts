import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

/**
 * Resolves active API Key from Multi-Source Hierarchy:
 * 1) Client Header 'x-gemini-api-key' or Request Body 'apiKey'
 * 2) Server Environment 'GEMINI_API_KEY' or 'API_KEY'
 */
function resolveApiKey(req: Request): { apiKey: string | null; keySource: 'user_custom' | 'server_env' } {
  const headerKey = req.headers['x-gemini-api-key'] as string;
  const bodyKey = req.body?.apiKey as string;
  const clientKey = (headerKey || bodyKey || '').trim();

  if (clientKey && clientKey !== 'no API key' && clientKey.length > 5) {
    return { apiKey: clientKey, keySource: 'user_custom' };
  }

  const envKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  if (envKey) {
    return { apiKey: envKey, keySource: 'server_env' };
  }

  return { apiKey: null, keySource: 'user_custom' };
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    hasServerEnvKey: Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY)
  });
});

// Key validation endpoint
app.post('/api/ai/validate-key', async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  const targetKey = (apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();

  if (!targetKey) {
    return res.status(400).json({ valid: false, message: 'No API Key provided to validate.' });
  }

  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey: targetKey });
    // Quick test prompt
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Ping: Respond with "OK"',
    });

    const latencyMs = Date.now() - startTime;
    return res.json({
      valid: true,
      message: 'Key is verified and active.',
      response: response.text?.trim() || 'OK',
      latencyMs
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return res.status(400).json({
      valid: false,
      message: err.message || 'Key validation failed.',
      latencyMs
    });
  }
});

// Cascade Text Reasoning Endpoint
app.post('/api/ai/text', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { apiKey, keySource } = resolveApiKey(req);

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API_KEY_MISSING',
      message: 'No API key provided. Please provide a key in settings or set GEMINI_API_KEY on the server.'
    });
  }

  const { prompt, imageBase64, mimeType, requestedModel, modelsToTry = [] } = req.body;
  if (!prompt && !imageBase64) {
    return res.status(400).json({ success: false, error: 'PROMPT_OR_IMAGE_REQUIRED' });
  }

  const modelsList: string[] = modelsToTry.length > 0 ? modelsToTry : [requestedModel || 'gemini-3.6-flash'];
  const attempts: { model: string; status: 'tried' | 'succeeded' | 'failed'; error?: string; durationMs?: number }[] = [];

  for (const model of modelsList) {
    const modelStartTime = Date.now();
    try {
      const ai = new GoogleGenAI({ apiKey });
      const parts: any[] = [];

      if (imageBase64) {
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || 'image/png'
          }
        });
      }

      if (prompt) {
        parts.push({ text: prompt });
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts }
      });

      const text = response.text || '';
      const durationMs = Date.now() - modelStartTime;
      attempts.push({ model, status: 'succeeded', durationMs });

      return res.json({
        success: true,
        text,
        requestedModel: requestedModel || modelsList[0],
        actualModel: model,
        isFallback: model !== (requestedModel || modelsList[0]),
        attempts,
        latencyMs: Date.now() - startTime,
        keySource
      });
    } catch (err: any) {
      const durationMs = Date.now() - modelStartTime;
      const errorMsg = err.message || String(err);
      console.warn(`[Cascade Fallback] Text model ${model} failed in ${durationMs}ms:`, errorMsg);
      attempts.push({ model, status: 'failed', error: errorMsg, durationMs });
    }
  }

  // All cascade models failed
  return res.status(502).json({
    success: false,
    error: 'CASCADE_EXHAUSTED',
    message: 'All model cascade attempts failed. Check API key quota or permissions.',
    requestedModel: requestedModel || modelsList[0],
    attempts,
    latencyMs: Date.now() - startTime,
    keySource
  });
});

// Cascade Image Generation / Editing Endpoint
app.post('/api/ai/image', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { apiKey, keySource } = resolveApiKey(req);

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API_KEY_MISSING',
      message: 'No API key provided. Please provide a key in settings or set GEMINI_API_KEY on the server.'
    });
  }

  const { prompt, imageBase64, mimeType, requestedModel, modelsToTry = [] } = req.body;
  if (!imageBase64 && !prompt) {
    return res.status(400).json({ success: false, error: 'IMAGE_OR_PROMPT_REQUIRED' });
  }

  const modelsList: string[] = modelsToTry.length > 0 ? modelsToTry : [requestedModel || 'gemini-3-pro-image'];
  const attempts: { model: string; status: 'tried' | 'succeeded' | 'failed'; error?: string; durationMs?: number }[] = [];

  for (const model of modelsList) {
    const modelStartTime = Date.now();
    try {
      const ai = new GoogleGenAI({ apiKey });
      const parts: any[] = [];

      if (imageBase64) {
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || 'image/png'
          }
        });
      }

      if (prompt) {
        parts.push({ text: prompt });
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE] }
      });

      if (response.promptFeedback?.blockReason) {
        throw new Error(`Request was blocked by safety policy: ${response.promptFeedback.blockReason}`);
      }

      const candidate = response.candidates?.[0];
      const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
      const processedBase64 = imagePart?.inlineData?.data;

      if (!processedBase64) {
        let reason = response.text;
        if (!reason && candidate?.finishReason && candidate.finishReason !== 'STOP') {
          reason = `Generation stopped due to: ${candidate.finishReason}`;
        }
        throw new Error(reason || "Model returned no image data.");
      }

      const durationMs = Date.now() - modelStartTime;
      attempts.push({ model, status: 'succeeded', durationMs });

      return res.json({
        success: true,
        imageBase64: processedBase64,
        mimeType: imagePart?.inlineData?.mimeType || 'image/png',
        requestedModel: requestedModel || modelsList[0],
        actualModel: model,
        isFallback: model !== (requestedModel || modelsList[0]),
        attempts,
        latencyMs: Date.now() - startTime,
        keySource
      });
    } catch (err: any) {
      const durationMs = Date.now() - modelStartTime;
      const errorMsg = err.message || String(err);
      console.warn(`[Cascade Fallback] Image model ${model} failed in ${durationMs}ms:`, errorMsg);
      attempts.push({ model, status: 'failed', error: errorMsg, durationMs });
    }
  }

  // All cascade models failed
  return res.status(502).json({
    success: false,
    error: 'CASCADE_EXHAUSTED',
    message: 'All image model cascade attempts failed.',
    requestedModel: requestedModel || modelsList[0],
    attempts,
    latencyMs: Date.now() - startTime,
    keySource
  });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Dual-Layer Server] Running on http://0.0.0.0:${PORT} (Dev: ${isDev})`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
