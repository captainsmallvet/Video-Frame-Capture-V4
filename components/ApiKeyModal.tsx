import React, { useState, useEffect } from 'react';
import { testGeminiApiKey } from '../services/geminiClientService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  initialError?: string | null;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, initialError }) => {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string; latencyMs: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('GEMINI_CUSTOM_API_KEY') || '';
      setKey(savedKey);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!key.trim()) {
      setTestResult({ valid: false, message: 'Please enter an API key first.', latencyMs: 0 });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(key.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ valid: false, message: err.message || 'Validation request failed', latencyMs: 0 });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const clean = key.trim();
    if (clean) {
      localStorage.setItem('GEMINI_CUSTOM_API_KEY', clean);
    } else {
      localStorage.removeItem('GEMINI_CUSTOM_API_KEY');
    }
    onSave(clean);
    onClose();
  };

  const handleClear = () => {
    setKey('');
    setTestResult(null);
    localStorage.removeItem('GEMINI_CUSTOM_API_KEY');
    onSave('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-7 shadow-2xl shadow-indigo-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            Gemini API Key
          </h2>
          <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {initialError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <p className="text-xs text-red-400 font-medium leading-relaxed">
              {initialError}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Personal API Key
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-zinc-500 hover:text-indigo-400"
              >
                {showKey ? 'Hide' : 'Reveal'}
              </button>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="AIzaSy..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-mono transition-all"
              />
            </div>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between font-medium ${
              testResult.valid 
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' 
                : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                <span>{testResult.valid ? '✓' : '✗'}</span>
                <span>{testResult.message}</span>
              </div>
              {testResult.latencyMs > 0 && (
                <span className="font-mono text-[10px] opacity-75">{testResult.latencyMs}ms</span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !key.trim()}
              className="flex-1 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isTesting ? (
                <>
                  <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>

            {key && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-400 rounded-xl text-xs font-medium transition-all"
              >
                Clear
              </button>
            )}
          </div>

          <p className="text-[11px] text-zinc-500 leading-relaxed px-1">
            Safely stored in your browser's LocalStorage. Need an API key?
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-indigo-400 hover:underline ml-1 inline-block"
            >
              Get one from Google AI Studio ↗
            </a>
          </p>

          <button
            onClick={handleSave}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 text-sm"
          >
            Save & Activate
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
