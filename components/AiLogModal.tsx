import React, { useState, useEffect } from 'react';
import { executionTracker, AiExecutionLog } from '../services/executionTracker';
import { getEngineModeLabel } from '../src/utils/environmentUtils';

interface AiLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiLogModal: React.FC<AiLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AiExecutionLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'text' | 'image' | 'fallback'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLogs(executionTracker.getLogs());
      const unsub = executionTracker.subscribe((updated) => setLogs(updated));
      return unsub;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const engineInfo = getEngineModeLabel();

  const total = logs.length;
  const successful = logs.filter(l => l.status === 'success' || l.status === 'fallback').length;
  const fallbacks = logs.filter(l => l.status === 'fallback').length;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 100;
  const avgLatency = total > 0 ? Math.round(logs.reduce((acc, l) => acc + (l.latencyMs || 0), 0) / total) : 0;

  const filteredLogs = logs.filter(l => {
    if (filter === 'text') return l.operation === 'text_reasoning';
    if (filter === 'image') return l.operation === 'image_gen';
    if (filter === 'fallback') return l.status === 'fallback';
    return true;
  });

  const handleClear = () => {
    executionTracker.clearLogs();
    setLogs([]);
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(JSON.stringify(logs, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl shadow-black/80 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AI Execution Tracker
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Transparency Log
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Model resolution, cascade fallback history, latency, and key tracking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              {copied ? 'Copied JSON' : 'Export Logs'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-zinc-900/40 border-b border-zinc-800/80 text-xs">
          <div className="p-3 bg-zinc-900/80 rounded-2xl border border-zinc-800/70">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">Total Calls</span>
            <span className="text-lg font-extrabold text-white mt-1 block font-mono">{total}</span>
          </div>

          <div className="p-3 bg-zinc-900/80 rounded-2xl border border-zinc-800/70">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">Success Rate</span>
            <span className="text-lg font-extrabold text-emerald-400 mt-1 block font-mono">{successRate}%</span>
          </div>

          <div className="p-3 bg-zinc-900/80 rounded-2xl border border-zinc-800/70">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">Cascade Recoveries</span>
            <span className="text-lg font-extrabold text-amber-400 mt-1 block font-mono">{fallbacks}</span>
          </div>

          <div className="p-3 bg-zinc-900/80 rounded-2xl border border-zinc-800/70">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">Avg Latency</span>
            <span className="text-lg font-extrabold text-cyan-400 mt-1 block font-mono">{avgLatency} ms</span>
          </div>
        </div>

        {/* Engine Mode Banner */}
        <div className="px-6 py-2.5 bg-indigo-950/20 border-b border-indigo-900/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-indigo-200 font-semibold">{engineInfo.label}:</span>
            <span className="text-indigo-300/80 hidden sm:inline">{engineInfo.description}</span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
            Auto-Detected
          </span>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-zinc-800/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {(['all', 'text', 'image', 'fallback'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                  filter === mode
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mode === 'all' && `All (${logs.length})`}
                {mode === 'text' && `Text (${logs.filter(l => l.operation === 'text_reasoning').length})`}
                {mode === 'image' && `Image (${logs.filter(l => l.operation === 'image_gen').length})`}
                {mode === 'fallback' && `Recoveries (${fallbacks})`}
              </button>
            ))}
          </div>

          {logs.length > 0 && (
            <button
              onClick={handleClear}
              className="text-[11px] text-zinc-500 hover:text-rose-400 transition-colors"
            >
              Clear History
            </button>
          )}
        </div>

        {/* Logs Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-sm font-medium">No execution logs in this view yet.</p>
              <p className="text-xs text-zinc-600 mt-1">Actions performed with Gemini models will appear here automatically.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isFallback = log.status === 'fallback';
              const isFailed = log.status === 'failed';

              return (
                <div
                  key={log.id}
                  className={`rounded-2xl border transition-all ${
                    isFailed 
                      ? 'bg-rose-950/10 border-rose-800/30' 
                      : isFallback 
                        ? 'bg-amber-950/15 border-amber-800/40' 
                        : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div 
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      {/* Status indicator dot */}
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isFailed ? 'bg-rose-500 shadow-sm shadow-rose-500' :
                        isFallback ? 'bg-amber-400 shadow-sm shadow-amber-400' :
                        'bg-emerald-400 shadow-sm shadow-emerald-400'
                      }`} />

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white capitalize">
                            {log.actionName || log.operation.replace('_', ' ')}
                          </span>
                          
                          {/* Status Badge */}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isFailed ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            isFallback ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {isFailed ? 'Failed' : isFallback ? 'Cascade Recovered' : 'Direct Success'}
                          </span>

                          {/* Key Source */}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                            Key: {log.keySource === 'user_custom' ? 'User Custom' : log.keySource === 'server_env' ? 'Server Env' : 'Direct SDK'}
                          </span>
                        </div>

                        {/* Models Flow */}
                        <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5 font-mono">
                          <span className="text-zinc-300">{log.requestedModel}</span>
                          {isFallback && (
                            <>
                              <span className="text-amber-400">➔</span>
                              <span className="text-amber-300 font-semibold">{log.actualModel}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-xs font-mono font-semibold text-zinc-300 block">{log.latencyMs} ms</span>
                        <span className="text-[10px] text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>

                      <svg className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Trace Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-zinc-800/80 bg-black/20 text-xs space-y-2 mt-1">
                      {log.promptSnippet && (
                        <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Prompt / Context</span>
                          <p className="line-clamp-2 italic font-mono text-[11px]">"{log.promptSnippet}..."</p>
                        </div>
                      )}

                      {/* Cascade Steps list */}
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                          Cascade Fallback Trace ({log.attempts?.length || 0} attempts):
                        </span>
                        
                        <div className="space-y-1">
                          {(log.attempts || []).map((att, i) => (
                            <div 
                              key={i} 
                              className={`p-2 rounded-lg flex items-center justify-between font-mono text-[11px] ${
                                att.status === 'succeeded' 
                                  ? 'bg-emerald-950/20 text-emerald-300 border border-emerald-900/30' 
                                  : 'bg-rose-950/20 text-rose-300 border border-rose-900/30'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{att.status === 'succeeded' ? '✓' : '✗'}</span>
                                <span className="font-semibold">{att.model}</span>
                                {att.error && (
                                  <span className="text-[10px] text-rose-400 truncate max-w-xs sm:max-w-md">
                                    ({att.error.slice(0, 60)}...)
                                  </span>
                                )}
                              </div>
                              {att.durationMs !== undefined && (
                                <span className="text-[10px] opacity-75">{att.durationMs}ms</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {log.error && (
                        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300">
                          <span className="text-[10px] font-bold uppercase block">Error Detail</span>
                          <p className="font-mono text-[11px] mt-0.5">{log.error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AiLogModal;
