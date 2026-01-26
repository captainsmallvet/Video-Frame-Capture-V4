
import React, { useEffect, useState } from 'react';

interface ApiKeyManagerProps {
  onKeyValidated: () => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onKeyValidated }) => {
  const [hasKey, setHasKey] = useState<boolean>(false);

  useEffect(() => {
    const checkKey = async () => {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (selected) {
        setHasKey(true);
        onKeyValidated();
      }
    };
    checkKey();
  }, [onKeyValidated]);

  const handleSelectKey = async () => {
    await window.aistudio.openSelectKey();
    // Guideline: Assume successful after triggering and proceed
    setHasKey(true);
    onKeyValidated();
  };

  if (hasKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md px-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl text-center">
        <div className="mb-6 inline-flex p-4 bg-indigo-500/10 rounded-full">
          <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Connect to Google Cloud</h2>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          To generate high-quality videos with Gemini Veo, you need to select a billing-enabled API key from Google AI Studio.
        </p>
        <button
          onClick={handleSelectKey}
          className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 mb-4"
        >
          Select API Key
        </button>
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 text-sm underline transition-colors"
        >
          Learn about billing and quotas
        </a>
      </div>
    </div>
  );
};

export default ApiKeyManager;
