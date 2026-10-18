/**
 * Execution Tracker & AI Log Store
 * Records transparency logs for all Gemini AI operations:
 * - Requested model vs Actual responding model
 * - Cascade attempts trace
 * - Key source (User Custom Key vs Server Environment Key)
 * - Latency in milliseconds
 * - Execution status & error messages
 */

export interface CascadeAttempt {
  model: string;
  status: 'tried' | 'succeeded' | 'failed';
  error?: string;
  durationMs?: number;
}

export interface AiExecutionLog {
  id: string;
  timestamp: number;
  operation: 'text_reasoning' | 'image_gen' | 'key_validation';
  actionName?: string;
  requestedModel: string;
  actualModel: string;
  status: 'success' | 'fallback' | 'failed';
  latencyMs: number;
  keySource: 'user_custom' | 'server_env' | 'direct_client';
  engineMode: 'proxy' | 'direct';
  attempts: CascadeAttempt[];
  error?: string;
  promptSnippet?: string;
}

const STORAGE_KEY = 'GEMINI_AI_EXECUTION_LOGS_V1';
const MAX_LOGS = 50;

let logListeners: ((logs: AiExecutionLog[]) => void)[] = [];
let cachedLogs: AiExecutionLog[] | null = null;

function loadLogs(): AiExecutionLog[] {
  if (cachedLogs) return cachedLogs;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cachedLogs = JSON.parse(raw);
      return cachedLogs || [];
    }
  } catch (e) {
    console.warn('Could not load AI execution logs from storage:', e);
  }
  cachedLogs = [];
  return cachedLogs;
}

function persistLogs(logs: AiExecutionLog[]) {
  cachedLogs = logs;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
  } catch (e) {
    console.warn('Could not persist logs to localStorage:', e);
  }
  logListeners.forEach(fn => fn([...logs]));
}

export const executionTracker = {
  getLogs(): AiExecutionLog[] {
    return [...loadLogs()];
  },

  addLog(log: Omit<AiExecutionLog, 'id' | 'timestamp'>): AiExecutionLog {
    const newLog: AiExecutionLog = {
      ...log,
      id: crypto.randomUUID ? crypto.randomUUID() : `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
    };

    const current = loadLogs();
    const updated = [newLog, ...current].slice(0, MAX_LOGS);
    persistLogs(updated);
    return newLog;
  },

  clearLogs() {
    persistLogs([]);
  },

  subscribe(listener: (logs: AiExecutionLog[]) => void): () => void {
    logListeners.push(listener);
    listener([...loadLogs()]);
    return () => {
      logListeners = logListeners.filter(l => l !== listener);
    };
  },

  getLatestStatus(): 'idle' | 'success' | 'fallback' | 'failed' {
    const logs = loadLogs();
    if (logs.length === 0) return 'idle';
    return logs[0].status;
  }
};
