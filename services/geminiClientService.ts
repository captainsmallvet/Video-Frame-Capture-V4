import { GoogleGenAI, Modality } from '@google/genai';
import { shouldUseDirectClientCalls } from '../src/utils/environmentUtils';
import { buildModelCascade, resolveModelName, AIModelOption } from './modelService';
import { executionTracker, CascadeAttempt } from './executionTracker';

export interface AiRequestOptions {
  operation: 'text_reasoning' | 'image_gen';
  actionName?: string;
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
  requestedModel: string;
  apiKey: string;
  availableModels?: AIModelOption[];
}

export interface AiExecutionResult {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
  requestedModel: string;
  actualModel: string;
  isFallback: boolean;
  attempts: CascadeAttempt[];
  latencyMs: number;
  keySource: 'user_custom' | 'server_env' | 'direct_client';
  engineMode: 'proxy' | 'direct';
}

/**
 * Validates an API Key live by testing it against the API
 */
export async function testGeminiApiKey(apiKey: string): Promise<{ valid: boolean; message: string; latencyMs: number }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { valid: false, message: 'API key is empty', latencyMs: 0 };
  }

  const startTime = Date.now();
  const direct = shouldUseDirectClientCalls();

  if (!direct) {
    // Test through server proxy
    try {
      const res = await fetch('/api/ai/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey })
      });
      const data = await res.json();
      return {
        valid: data.valid ?? false,
        message: data.message || (data.valid ? 'Active & working' : 'Invalid key'),
        latencyMs: data.latencyMs || (Date.now() - startTime)
      };
    } catch (e: any) {
      // If server unreachable, test directly as fallback
    }
  }

  // Direct client test
  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'ping',
    });
    return {
      valid: true,
      message: 'Verified successfully (Direct SDK)',
      latencyMs: Date.now() - startTime
    };
  } catch (err: any) {
    return {
      valid: false,
      message: err.message || 'Key validation failed',
      latencyMs: Date.now() - startTime
    };
  }
}

/**
 * Core wrapper: Dual-Layer Resilient Execution with Smart Cascade Fallback
 * Automatically routes to Server Proxy in AI Studio Preview / Sandbox
 * or Direct Client SDK on external domains, with transparent fallback tracking.
 */
export async function runWithModelTracking(options: AiRequestOptions): Promise<AiExecutionResult> {
  const {
    operation,
    actionName = operation,
    prompt,
    imageBase64,
    mimeType = 'image/png',
    requestedModel,
    apiKey,
    availableModels = []
  } = options;

  const startTime = Date.now();
  const targetModel = resolveModelName(requestedModel);
  const modelsToTry = buildModelCascade(targetModel, operation, availableModels);
  const useDirect = shouldUseDirectClientCalls();
  const engineMode: 'proxy' | 'direct' = useDirect ? 'direct' : 'proxy';

  let activeKey = apiKey?.trim();
  let keySource: 'user_custom' | 'server_env' | 'direct_client' = activeKey ? 'user_custom' : 'server_env';

  // 1. ATTEMPT ROUTE: SERVER PROXY (when in AI Studio sandbox)
  if (!useDirect) {
    try {
      const endpoint = operation === 'text_reasoning' ? '/api/ai/text' : '/api/ai/image';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeKey) {
        headers['x-gemini-api-key'] = activeKey;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          imageBase64,
          mimeType,
          requestedModel: targetModel,
          modelsToTry,
          apiKey: activeKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        const latencyMs = Date.now() - startTime;
        const result: AiExecutionResult = {
          text: data.text,
          imageBase64: data.imageBase64,
          mimeType: data.mimeType || mimeType,
          requestedModel: targetModel,
          actualModel: data.actualModel || targetModel,
          isFallback: data.isFallback || data.actualModel !== targetModel,
          attempts: data.attempts || [{ model: data.actualModel, status: 'succeeded' }],
          latencyMs,
          keySource: data.keySource || keySource,
          engineMode: 'proxy'
        };

        // Record transparency log
        executionTracker.addLog({
          operation,
          actionName,
          requestedModel: targetModel,
          actualModel: result.actualModel,
          status: result.isFallback ? 'fallback' : 'success',
          latencyMs,
          keySource: result.keySource,
          engineMode: 'proxy',
          attempts: result.attempts,
          promptSnippet: prompt?.slice(0, 100)
        });

        return result;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`[Proxy Gateway Failed] HTTP ${response.status}:`, errorData);
        // If 401 and no key, let user know
        if (response.status === 401 && !activeKey) {
          throw new Error('No API Key detected. Please provide your Gemini API Key in settings or notepad.');
        }
        // Fall back to direct client if proxy returned non-auth server error
      }
    } catch (proxyErr: any) {
      console.warn('[Proxy Route Unreachable, falling back to direct client]:', proxyErr);
    }
  }

  // 2. ATTEMPT ROUTE: DIRECT CLIENT SDK (or fallback if proxy unavailable)
  const clientAttempts: CascadeAttempt[] = [];
  const clientKey = activeKey || (typeof process !== 'undefined' ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : '');

  if (!clientKey) {
    const errorMsg = 'No Gemini API key available. Please enter a key in the settings bar.';
    executionTracker.addLog({
      operation,
      actionName,
      requestedModel: targetModel,
      actualModel: targetModel,
      status: 'failed',
      latencyMs: Date.now() - startTime,
      keySource: 'user_custom',
      engineMode,
      attempts: [],
      error: errorMsg
    });
    throw new Error(errorMsg);
  }

  for (const model of modelsToTry) {
    const modelStart = Date.now();
    try {
      const ai = new GoogleGenAI({ apiKey: clientKey });
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

      if (operation === 'text_reasoning') {
        const response = await ai.models.generateContent({
          model,
          contents: { parts }
        });
        const durationMs = Date.now() - modelStart;
        clientAttempts.push({ model, status: 'succeeded', durationMs });

        const result: AiExecutionResult = {
          text: response.text || '',
          requestedModel: targetModel,
          actualModel: model,
          isFallback: model !== targetModel,
          attempts: clientAttempts,
          latencyMs: Date.now() - startTime,
          keySource: 'direct_client',
          engineMode: 'direct'
        };

        executionTracker.addLog({
          operation,
          actionName,
          requestedModel: targetModel,
          actualModel: model,
          status: result.isFallback ? 'fallback' : 'success',
          latencyMs: result.latencyMs,
          keySource: 'direct_client',
          engineMode: 'direct',
          attempts: clientAttempts,
          promptSnippet: prompt?.slice(0, 100)
        });

        return result;
      } else {
        // image_gen
        const response = await ai.models.generateContent({
          model,
          contents: { parts },
          config: { responseModalities: [Modality.IMAGE] }
        });

        if (response.promptFeedback?.blockReason) {
          throw new Error(`Safety block: ${response.promptFeedback.blockReason}`);
        }

        const candidate = response.candidates?.[0];
        const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
        const processedBase64 = imagePart?.inlineData?.data;

        if (!processedBase64) {
          throw new Error(response.text || 'No image data returned from model.');
        }

        const durationMs = Date.now() - modelStart;
        clientAttempts.push({ model, status: 'succeeded', durationMs });

        const result: AiExecutionResult = {
          imageBase64: processedBase64,
          mimeType: imagePart?.inlineData?.mimeType || 'image/png',
          requestedModel: targetModel,
          actualModel: model,
          isFallback: model !== targetModel,
          attempts: clientAttempts,
          latencyMs: Date.now() - startTime,
          keySource: 'direct_client',
          engineMode: 'direct'
        };

        executionTracker.addLog({
          operation,
          actionName,
          requestedModel: targetModel,
          actualModel: model,
          status: result.isFallback ? 'fallback' : 'success',
          latencyMs: result.latencyMs,
          keySource: 'direct_client',
          engineMode: 'direct',
          attempts: clientAttempts,
          promptSnippet: prompt?.slice(0, 100)
        });

        return result;
      }
    } catch (err: any) {
      const durationMs = Date.now() - modelStart;
      const errorMsg = err.message || String(err);
      console.warn(`[Client Cascade] Model ${model} failed (${durationMs}ms):`, errorMsg);
      clientAttempts.push({ model, status: 'failed', error: errorMsg, durationMs });
    }
  }

  // All failed
  const finalError = clientAttempts[clientAttempts.length - 1]?.error || 'All fallback models failed.';
  executionTracker.addLog({
    operation,
    actionName,
    requestedModel: targetModel,
    actualModel: targetModel,
    status: 'failed',
    latencyMs: Date.now() - startTime,
    keySource: 'direct_client',
    engineMode,
    attempts: clientAttempts,
    error: finalError,
    promptSnippet: prompt?.slice(0, 100)
  });

  throw new Error(`AI processing failed after attempting cascade: ${finalError}`);
}
