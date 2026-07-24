import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  { id: 'fallback-text-1', modelId: 'gemini-3.6-flash', name: '(20)Gemini 3.6 Flash', category: 'text_reasoning', isActive: true, order: 1, isDefaultLevel1: true },
  { id: 'fallback-text-2', modelId: 'gemini-3.5-flash', name: '(20)Gemini 3.5 Flash', category: 'text_reasoning', isActive: true, order: 2 },
  { id: 'fallback-text-3', modelId: 'gemini-3-flash-preview', name: '(20)Gemini 3 Flash Preview', category: 'text_reasoning', isActive: true, order: 3 },
  { id: 'fallback-text-4', modelId: 'gemini-3.1-flash-lite', name: '(500)Gemini 3.1 Flash Lite', category: 'text_reasoning', isActive: true, order: 4 },
  { id: 'fallback-text-5', modelId: 'gemini-3.1-pro-preview', name: '(0)Gemini 3.1 Pro Preview', category: 'text_reasoning', isActive: true, order: 5 },
  { id: 'fallback-text-6', modelId: 'gemini-flash-latest', name: 'Gemini Flash Latest', category: 'text_reasoning', isActive: true, order: 6 },
  { id: 'fallback-text-7', modelId: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite Latest', category: 'text_reasoning', isActive: true, order: 7 },
  { id: 'fallback-text-8', modelId: 'gemini-2.5-flash', name: '(20)Gemini 2.5 Flash', category: 'text_reasoning', isActive: true, order: 8 },
  { id: 'fallback-text-9', modelId: 'gemini-2.5-flash-lite', name: '(20)Gemini 2.5 Flash Lite', category: 'text_reasoning', isActive: true, order: 9 },
  { id: 'fallback-text-10', modelId: 'gemini-2.5-pro', name: '(0)Gemini 2.5 Pro', category: 'text_reasoning', isActive: true, order: 10 },
  { id: 'fallback-text-11', modelId: 'gemini-pro-latest', name: 'Gemini Pro (Latest Stable)', category: 'text_reasoning', isActive: true, order: 11 },
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
 * Fetches central AI models from Firestore collection 'ai_models'
 */
export async function fetchCentralModels(): Promise<AIModelOption[]> {
  try {
    const db = getDb();
    const snapshot = await getDocs(collection(db, "ai_models"));
    const models: AIModelOption[] = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const isActive = data.isActive ?? data.active ?? true;
      if (isActive) {
        models.push({
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

    // Sort by order ascending
    models.sort((a, b) => a.order - b.order);
    return models;
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
  return models.filter((m) => {
    const mCat = (m.category || '').toLowerCase();
    if (mCat === catLower) return true;
    if (catLower === 'text_reasoning' && (mCat === 'text' || mCat === 'text_reasoning' || mCat === 'text-reasoning')) return true;
    if (catLower === 'image_gen' && (mCat === 'image' || mCat === 'image_gen' || mCat === 'image-gen' || mCat === 'image_editing')) return true;
    if (catLower === 'video_gen' && (mCat === 'video' || mCat === 'video_gen' || mCat === 'video-gen')) return true;
    if (catLower === 'tts' && (mCat === 'tts' || mCat === 'audio')) return true;
    return false;
  });
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
