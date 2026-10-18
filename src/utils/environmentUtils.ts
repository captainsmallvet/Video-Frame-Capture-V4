/**
 * Environment detection utility to automatically switch between
 * Direct Client-Side SDK calls and Server-Side Proxy calls.
 */

export function isAiStudioPreview(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname.toLowerCase();
  const search = window.location.search.toLowerCase();
  
  // AI Studio Preview, Cloud Run preview domains, or embedded iframes
  const isPreviewHost = 
    hostname.includes('aistudio.google.com') ||
    hostname.includes('run.app') ||
    hostname.startsWith('ais-dev-') ||
    hostname.startsWith('ais-pre-') ||
    hostname.includes('googleusercontent.com');

  // Check if running in iframe under AI Studio
  let isInIframe = false;
  try {
    isInIframe = window.self !== window.top;
  } catch (e) {
    // Cross-origin iframe restriction also implies iframe
    isInIframe = true;
  }

  return isPreviewHost || isInIframe || search.includes('env=preview');
}

/**
 * Determines whether the app should invoke Gemini via Direct Client SDK
 * or route through the Server Proxy (/api/ai/...)
 * 
 * - In AI Studio Preview (aistudio.google.com, run.app, ais-dev-, ais-pre-), 
 *   return false to use the Server Proxy to avoid sandbox iframe restrictions.
 * - In Vercel or external production domains, return true for maximum speed.
 */
export function shouldUseDirectClientCalls(): boolean {
  // Check for explicit user override in localStorage
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('GEMINI_ENGINE_MODE');
    if (override === 'direct') return true;
    if (override === 'proxy') return false;
  }

  // Auto-detection based on environment
  if (isAiStudioPreview()) {
    return false; // Use Server Proxy in AI Studio Preview / Sandbox
  }

  // External deployment (e.g. Vercel, Netlify, Custom Domain) uses direct client
  return true;
}

export function getEngineModeLabel(): { mode: 'proxy' | 'direct'; label: string; description: string } {
  const direct = shouldUseDirectClientCalls();
  if (direct) {
    return {
      mode: 'direct',
      label: 'Direct Client SDK',
      description: 'Ultra-low latency direct calls via @google/genai client'
    };
  }
  return {
    mode: 'proxy',
    label: 'Server Proxy Gateway',
    description: 'Resilient sandbox-safe routing through server.ts'
  };
}
