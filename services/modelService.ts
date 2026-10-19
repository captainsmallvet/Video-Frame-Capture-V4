import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, onSnapshot } from 'firebase/firestore';

export const firebaseConfig = {
  projectId: "gen-lang-client-0014422363",
  appId: "1:978227936883:web:946402bf6886970bc77406",
  apiKey: "AIzaSyAJLNrYkuTt16qs034UlkEBJrMvlrNCnA4",
  authDomain: "gen-lang-client-0014422363.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-29f335c3-c8ac-451f-97d7-9c310736d1d9",
  storageBucket: "gen-lang-client-0014422363.firebasestorage.app",
  messagingSenderId: "978227936883",
  measurementId: ""
};

// App Importance Level for this app is Level 1
export const APP_IMPORTANCE_LEVEL = 1;

export interface AIModelOption {
  id: string;
  modelId: string;
  name: string;
  category: string;
  isActive: boolean;
  order: number;
  isDefaultLevel1?: boolean;
  isDefaultLevel2?: boolean;
}

// Fallback models when Firestore is loading or offline
export const FALLBACK_TEXT_REASONING_MODELS: AIModelOption[] = [
  { id: 'fallback-text-1', modelId: 'gemini-3.8-flash', name: '(20)Gemini 3.8 Flash', category: 'text_reasoning', isActive: true, order: 1, isDefaultLevel1: true },
  { id: 'fallback-text-2', modelId: 'gemini-3.7-flash', name: '(20)Gemini 3.7 Flash', category: 'text_reasoning', isActive: true, order: 2 },
  { id: 'fallback-text-3', modelId: 'gemini-3.6-flash', name: '(20)Gemini 3.6 Flash', category: 'text_reasoning', isActive: true, order: 3 },
  { id: 'fallback-text-4', modelId: 'gemini-3.5-flash', name: '(20)Gemini 3.5 Flash', category: 'text_reasoning', isActive: true, order: 4 },
  { id: 'fallback-text-5', modelId: 'gemini-3-flash-preview', name: '(20)Gemini 3 Flash Preview', category: 'text_reasoning', isActive: true, order: 5 },
  { id: 'fallback-text-6', modelId: 'gemini-3.5-flash-lite', name: '(500)Gemini 3.5 Flash Lite', category: 'text_reasoning', isActive: true, order: 6, isDefaultLevel2: true },
  { id: 'fallback-text-7', modelId: 'gemini-3.1-flash-lite', name: '(500)Gemini 3.1 Flash Lite', category: 'text_reasoning', isActive: true, order: 7 },
  { id: 'fallback-text-8', modelId: 'gemini-3.1-pro-preview', name: '(0)Gemini 3.1 Pro Preview', category: 'text_reasoning', isActive: true, order: 8 },
  { id: 'fallback-text-9', modelId: 'gemini-flash-latest', name: 'Gemini Flash Latest', category: 'text_reasoning', isActive: true, order: 9 },
  { id: 'fallback-text-10', modelId: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite Latest', category: 'text_reasoning', isActive: true, order: 10 },
  { id: 'fallback-text-11', modelId: 'gemini-2.5-flash', name: '(20)Gemini 2.5 Flash', category: 'text_reasoning', isActive: true, order: 11 },
  { id: 'fallback-text-12', modelId: 'gemini-2.5-flash-lite', name: '(20)Gemini 2.5 Flash Lite', category: 'text_reasoning', isActive: true, order: 12 },
  { id: 'fallback-text-13', modelId: 'gemini-2.5-pro', name: '(0)Gemini 2.5 Pro', category: 'text_reasoning', isActive: true, order: 13 },
  { id: 'fallback-text-14', modelId: 'gemini-pro-latest', name: 'Gemini Pro (Latest Stable)', category: 'text_reasoning', isActive: true, order: 14 },
];

export const FALLBACK_IMAGE_MODELS: AIModelOption[] = [
  { id: 'fallback-img-1', modelId: 'gemini-3-pro-image', name: 'Nano Banana Pro (Gemini 3 Pro Image)', category: 'image_gen', isActive: true, order: 1, isDefaultLevel1: true },
  { id: 'fallback-img-2', modelId: 'gemini-3.1-flash-image', name: 'Nano Banana 2 (Gemini 3.1 Flash Image)', category: 'image_gen', isActive: true, order: 2 },
  { id: 'fallback-img-3', modelId: 'gemini-2.5-flash-image', name: 'gemini-2.5-flash-image', category: 'image_gen', isActive: true, order: 3 },
  { id: 'fallback-img-4', modelId: 'gemini-flash-image-latest', name: 'Gemini Flash Image Latest', category: 'image_gen', isActive: true, order: 4 },
];

let dbInstance: ReturnType<typeof getFirestore> | null = null;

function getDb() {
  if (!dbInstance) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
  return dbInstance;
}

/**
 * Requirement 1: Future-Proof Model Passthrough & Sanitization
 * - Pass-Through for all future models matching standard pattern /^gemini-[a-z0-9.-]+$/i
 *   (e.g., gemini-3.9-*, gemini-4.0-*, gemini-4.5-*, etc.) -> 100% untouched as Target Model #1.
 * - Deprecation mapping for truly shutdown legacy models (e.g. 1.5, 2.0) to avoid 404 errors.
 */
export function resolveModelName(requestedModel: string): string {
  if (!requestedModel || typeof requestedModel !== 'string') {
    return 'gemini-3.8-flash';
  }

  const trimmed = requestedModel.trim();
  const lower = trimmed.toLowerCase();

  // Retired legacy models mapping (only Google shutdown models)
  const legacyDeprecations: Record<string, string> = {
    'gemini-1.5-pro': 'gemini-2.5-pro',
    'gemini-1.5-pro-latest': 'gemini-2.5-pro',
    'gemini-1.5-flash': 'gemini-2.5-flash',
    'gemini-1.5-flash-latest': 'gemini-2.5-flash',
    'gemini-1.5-flash-8b': 'gemini-2.5-flash-lite',
    'gemini-2.0-flash': 'gemini-2.5-flash',
    'gemini-2.0-flash-exp': 'gemini-2.5-flash',
    'gemini-2.0-flash-thinking-exp': 'gemini-3.6-flash',
    'gemini-1.0-pro': 'gemini-2.5-pro',
    'gemini-pro': 'gemini-2.5-pro',
  };

  if (legacyDeprecations[lower]) {
    return legacyDeprecations[lower];
  }

  // Future-Proof Pattern: Standard Gemini or Veo / Imagen pattern passes through 100%
  const isStandardPattern = /^(gemini|veo|imagen)-[a-z0-9.-]+$/i.test(trimmed);
  if (isStandardPattern) {
    return trimmed;
  }

  // If user entered a plain name like "3.6 flash", format it
  if (/^\d+\.\d+/.test(trimmed)) {
    const formatted = `gemini-${trimmed.toLowerCase().replace(/\s+/g, '-')}`;
    return formatted;
  }

  return trimmed;
}

/**
 * Deduplicates model list based on modelId and id to prevent React duplicate key warnings.
 */
export function deduplicateModels(models: AIModelOption[]): AIModelOption[] {
  const seenIds = new Set<string>();
  const seenModelIds = new Set<string>();
  const uniqueList: AIModelOption[] = [];

  for (const m of models) {
    const key = (m.modelId || m.id).trim().toLowerCase();
    if (!seenModelIds.has(key) && !seenIds.has(m.id)) {
      seenModelIds.add(key);
      seenIds.add(m.id);
      uniqueList.push(m);
    }
  }

  return uniqueList;
}

/**
 * Requirement 2: Centralized AI Models Registry with real-time onSnapshot subscription.
 * Any new models added to Firestore `ai_models` are pushed immediately to all listeners.
 */
export function subscribeCentralModels(
  onUpdate: (models: AIModelOption[]) => void,
  onError?: (error: any) => void
): () => void {
  try {
    const db = getDb();
    const modelsCol = collection(db, "ai_models");

    const unsubscribe = onSnapshot(
      modelsCol,
      (snapshot) => {
        const rawModels: AIModelOption[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const isActive = data.isActive ?? data.active ?? true;
          if (isActive) {
            rawModels.push({
              id: docSnap.id,
              modelId: data.modelId || docSnap.id,
              name: data.name || data.displayName || data.title || data.modelId || docSnap.id,
              category: data.category || 'text_reasoning',
              isActive: true,
              order: typeof data.order === 'number' ? data.order : 999,
              isDefaultLevel1: data.isDefaultLevel1 ?? data.defaultLevel1 ?? data.isLevel1Default ?? false,
              isDefaultLevel2: data.isDefaultLevel2 ?? data.defaultLevel2 ?? data.isLevel2Default ?? false,
            });
          }
        });

        // Deduplicate and sort by order ascending
        const deduped = deduplicateModels(rawModels);
        deduped.sort((a, b) => a.order - b.order);

        if (deduped.length > 0) {
          onUpdate(deduped);
        }
      },
      (error) => {
        console.warn("Centralized AI Models onSnapshot listener error:", error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("Failed to subscribe to central models, using fallbacks:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Fetches central AI models from Firestore collection 'ai_models' (one-time fetch)
 */
export async function fetchCentralModels(): Promise<AIModelOption[]> {
  try {
    const db = getDb();
    const snapshot = await getDocs(collection(db, "ai_models"));
    const rawModels: AIModelOption[] = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const isActive = data.isActive ?? data.active ?? true;
      if (isActive) {
        rawModels.push({
          id: docSnap.id,
          modelId: data.modelId || docSnap.id,
          name: data.name || data.displayName || data.title || data.modelId || docSnap.id,
          category: data.category || 'text_reasoning',
          isActive: true,
          order: typeof data.order === 'number' ? data.order : 999,
          isDefaultLevel1: data.isDefaultLevel1 ?? data.defaultLevel1 ?? data.isLevel1Default ?? false,
          isDefaultLevel2: data.isDefaultLevel2 ?? data.defaultLevel2 ?? data.isLevel2Default ?? false,
        });
      }
    });

    const deduped = deduplicateModels(rawModels);
    deduped.sort((a, b) => a.order - b.order);
    return deduped;
  } catch (error) {
    console.warn("Could not fetch models from central Firestore, using fallbacks:", error);
    return [];
  }
}

/**
 * Filters models by category name (e.g. 'text_reasoning', 'image_gen', 'video_gen', 'tts')
 */
export function filterModelsByCategory(models: AIModelOption[], categoryKey: string): AIModelOption[] {
  const catLower = categoryKey.toLowerCase();
  const filtered = models.filter((m) => {
    const mCat = (m.category || '').toLowerCase();
    if (mCat === catLower) return true;
    if (catLower === 'text_reasoning' && (mCat === 'text' || mCat === 'text_reasoning' || mCat === 'text-reasoning')) return true;
    if (catLower === 'image_gen' && (mCat === 'image' || mCat === 'image_gen' || mCat === 'image-gen' || mCat === 'image_editing')) return true;
    if (catLower === 'video_gen' && (mCat === 'video' || mCat === 'video_gen' || mCat === 'video-gen')) return true;
    if (catLower === 'tts' && (mCat === 'tts' || mCat === 'audio')) return true;
    return false;
  });
  return deduplicateModels(filtered);
}

/**
 * Determines the default model ID based on the app importance level (Level 1 or Level 2)
 */
export function getDefaultModelId(
  models: AIModelOption[], 
  level: 1 | 2 = APP_IMPORTANCE_LEVEL as 1 | 2, 
  fallbackId: string
): string {
  if (models.length === 0) return fallbackId;
  const isDefaultKey = level === 1 ? 'isDefaultLevel1' : 'isDefaultLevel2';
  const defaultModel = models.find((m) => m[isDefaultKey] === true);
  if (defaultModel) {
    return defaultModel.modelId;
  }
  return models[0].modelId;
}

/**
 * Helper to extract numeric version from model string for descending comparison.
 */
function extractVersion(nameOrId: string): number {
  const match = nameOrId.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Identifies the family flavor of a model (e.g., 'flash-lite', 'flash-image', 'pro-image', 'flash', 'pro')
 */
function getModelFamily(modelId: string): string {
  const m = modelId.toLowerCase();
  if (m.includes('flash-lite') || m.includes('lite')) return 'lite';
  if (m.includes('flash-image')) return 'flash-image';
  if (m.includes('pro-image')) return 'pro-image';
  if (m.includes('image')) return 'image';
  if (m.includes('flash')) return 'flash';
  if (m.includes('pro')) return 'pro';
  return 'general';
}

/**
 * Requirement 3: Smart Cascade Fallback Model Ordering.
 * 
 * Generates an array `modelsToTry` for every AI request:
 * 1) User-selected model (including future models, passed through cleanly)
 * 2) Models in the same family as selected model in descending version order
 *    (e.g., gemini-3.8-flash > gemini-3.7-flash > gemini-3.6-flash > gemini-3.5-flash > gemini-flash-latest)
 *    Prioritizing models from the real-time Centralized AI Models Registry!
 * 3) Workhorse most stable model (e.g., gemini-3.6-flash or Default Level 1)
 * 4) High-speed model (e.g., gemini-3.8-flash)
 * 5) Token saver / largest quota model (e.g., gemini-3.5-flash-lite or Lite family)
 * 
 * Deduped with `.filter((m, idx, arr) => arr.indexOf(m) === idx)`
 */
export function buildModelCascade(
  requestedModel: string,
  category: 'text_reasoning' | 'image_gen',
  availableModels: AIModelOption[] = []
): string[] {
  const target1 = resolveModelName(requestedModel);
  const family = getModelFamily(target1);
  const cascade: string[] = [target1];

  // Pool models from real-time available list + fallbacks
  const pool = category === 'text_reasoning' 
    ? [...availableModels, ...FALLBACK_TEXT_REASONING_MODELS]
    : [...availableModels, ...FALLBACK_IMAGE_MODELS];

  const poolIds = deduplicateModels(pool).map(m => m.modelId);

  // 2) Same family models in descending version order
  const sameFamilyModels = poolIds
    .filter(id => id !== target1 && getModelFamily(id) === family)
    .sort((a, b) => extractVersion(b) - extractVersion(a));
  cascade.push(...sameFamilyModels);

  if (category === 'text_reasoning') {
    // 3) Workhorse stable model
    cascade.push('gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash');

    // 4) High-speed model
    cascade.push('gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-flash-latest');

    // 5) Token saver / largest quota model (Lite family)
    cascade.push('gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite');

    // Ultimate stable fallbacks
    cascade.push('gemini-pro-latest');
  } else {
    // Image Generation Cascade
    // 3) Workhorse image models
    cascade.push('gemini-3-pro-image', 'gemini-3.1-flash-image');

    // 4 & 5) High-speed / High quota image models
    cascade.push('gemini-2.5-flash-image', 'gemini-flash-image-latest');
  }

  // Deduplicate preserving order
  const dedupedCascade = cascade.filter((m, idx, arr) => arr.indexOf(m) === idx);
  return dedupedCascade;
}
