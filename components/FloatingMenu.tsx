import React, { useState, useEffect } from 'react';
import { AIModelOption } from '../services/modelService';
import { executionTracker } from '../services/executionTracker';

export interface ShortModelDisplay {
  version: string;
  family: string;
  lines: string[];
}

/**
 * Requirement 6: Dynamic model name abbreviation using regular expressions
 * Extracts decimal versions (\d+\.\d+) and keywords (Flash, Pro, Lite, Ultra, Image)
 * Displays in 2 or 3 lines automatically without hardcoded versions.
 */
export function getShortModelDisplay(rawNameOrId: string): ShortModelDisplay {
  if (!rawNameOrId) {
    return { version: '', family: 'AI', lines: ['Gemini', 'Auto'] };
  }

  // Strip prefixes like "(20)" or "(500)" or "Nano Banana Pro"
  const clean = rawNameOrId.replace(/^\s*\(\d+\)\s*/, '').trim();

  // Extract version: e.g. 4.5, 3.8, 3.6, 3.1, 2.5, 3
  const vMatch = clean.match(/(\d+\.\d+|\d+)/);
  const version = vMatch ? vMatch[1] : '';

  // Extract keywords
  const keywords: string[] = [];
  if (/ultra/i.test(clean)) keywords.push('Ultra');
  if (/pro/i.test(clean)) keywords.push('Pro');
  if (/flash/i.test(clean)) keywords.push('Flash');
  if (/lite/i.test(clean)) keywords.push('Lite');
  if (/image/i.test(clean) || /banana/i.test(clean)) keywords.push('Image');
  if (/preview/i.test(clean)) keywords.push('Prev');
  if (/latest/i.test(clean)) keywords.push('Latest');

  const family = keywords.length > 0 ? keywords.join(' ') : 'Gemini';

  // Dynamic 2 or 3 line layout
  let lines: string[] = [];
  if (version) {
    if (keywords.length >= 2) {
      lines = [`v${version}`, keywords[0], keywords.slice(1).join(' ')];
    } else {
      lines = [`v${version}`, family];
    }
  } else {
    lines = ['Gemini', family];
  }

  return {
    version: version ? `v${version}` : '',
    family,
    lines
  };
}

interface FloatingMenuProps {
  selectedTextModel: string;
  onSelectTextModel: (modelId: string) => void;
  textModelOptions: AIModelOption[];
  onOpenLogs: () => void;
  onOpenApiKey: () => void;
  onCaptureFrame: () => void;
  isProcessing: boolean;
  hasVideo: boolean;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({
  selectedTextModel,
  onSelectTextModel,
  textModelOptions,
  onOpenLogs,
  onOpenApiKey,
  onCaptureFrame,
  isProcessing,
  hasVideo
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState<boolean>(false);
  const [lastStatus, setLastStatus] = useState<'idle' | 'success' | 'fallback' | 'failed'>('idle');

  useEffect(() => {
    const unsub = executionTracker.subscribe((logs) => {
      if (logs.length > 0) {
        setLastStatus(logs[0].status);
      }
    });
    return unsub;
  }, []);

  const activeModelOption = textModelOptions.find(m => m.modelId === selectedTextModel);
  const shortInfo = getShortModelDisplay(activeModelOption?.name || selectedTextModel);

  const statusColor = 
    lastStatus === 'success' ? 'bg-emerald-400 text-emerald-400' :
    lastStatus === 'fallback' ? 'bg-amber-400 text-amber-400' :
    lastStatus === 'failed' ? 'bg-rose-400 text-rose-400' :
    'bg-indigo-400 text-indigo-400';

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 select-none">
      
      {/* Model Picker Popup */}
      {isModelPickerOpen && (
        <div className="mb-2 w-72 bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl p-3 shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Live Model Registry
            </span>
            <button 
              onClick={() => setIsModelPickerOpen(false)}
              className="text-zinc-500 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {textModelOptions.map((opt) => {
              const isSelected = opt.modelId === selectedTextModel;
              const short = getShortModelDisplay(opt.name);
              return (
                <button
                  key={opt.id || opt.modelId}
                  onClick={() => {
                    onSelectTextModel(opt.modelId);
                    setIsModelPickerOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-200'
                      : 'hover:bg-zinc-800/70 text-zinc-300 border border-transparent'
                  }`}
                >
                  <div className="truncate flex-1 pr-2">
                    <div className="font-semibold truncate">{opt.name}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{opt.modelId}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">
                      {short.version || 'v*'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Floating Capsule */}
      <div className="flex items-center gap-2 bg-zinc-950/90 backdrop-blur-xl border border-zinc-700/70 p-2 rounded-2xl shadow-2xl shadow-black/60 transition-all hover:border-zinc-600">
        
        {/* Toggle Minimize/Expand */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse floating menu" : "Expand floating menu"}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          {isExpanded ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>

        {/* Dynamic Model Badge (Click to open picker) */}
        <button
          onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 hover:border-indigo-500/60 transition-all active:scale-95"
          title={`Active Model: ${activeModelOption?.name || selectedTextModel} (Click to change)`}
        >
          <div className="flex flex-col text-left leading-tight">
            {shortInfo.lines.map((line, idx) => (
              <span 
                key={idx} 
                className={`tracking-tight ${
                  idx === 0 
                    ? 'text-[11px] font-extrabold text-indigo-300 font-mono' 
                    : 'text-[9px] font-medium text-zinc-400 uppercase'
                }`}
              >
                {line}
              </span>
            ))}
          </div>

          <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Action Buttons (Visible when expanded) */}
        {isExpanded && (
          <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-2">
            
            {/* Quick Frame Capture */}
            <button
              onClick={onCaptureFrame}
              disabled={!hasVideo}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                hasVideo 
                  ? 'bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30 active:scale-95' 
                  : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-transparent'
              }`}
              title="Capture Frame from Video"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">Capture</span>
            </button>

            {/* AI Log Trigger Button with Status Pulse */}
            <button
              onClick={onOpenLogs}
              className="relative p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 text-xs font-medium"
              title="Open AI Cascade Execution Logs"
            >
              {/* Pulse Indicator */}
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColor}`} />
              </span>
              <span className="hidden sm:inline">AI Log</span>
            </button>

            {/* API Key Modal Trigger */}
            <button
              onClick={onOpenApiKey}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white transition-all active:scale-95 text-xs font-medium"
              title="API Key Settings"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default FloatingMenu;
