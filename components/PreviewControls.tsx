import React from 'react';

export type PreviewFitMode = 'standard' | 'fit-width' | 'fit-height' | 'custom-zoom';

interface PreviewControlsProps {
  fitMode: PreviewFitMode;
  zoom: number; // in percentage, e.g. 100
  onSetFitMode: (mode: PreviewFitMode) => void;
  onZoomChange: (newZoom: number) => void;
  onResetZoom: () => void;
  onToggleFullscreen?: () => void;
  title?: string;
  className?: string;
}

export const PreviewControls: React.FC<PreviewControlsProps> = ({
  fitMode,
  zoom,
  onSetFitMode,
  onZoomChange,
  onResetZoom,
  onToggleFullscreen,
  title = "Preview Display",
  className = ""
}) => {
  const handleZoomIn = () => {
    const next = Math.min(zoom + 25, 250);
    onZoomChange(next);
  };

  const handleZoomOut = () => {
    const next = Math.max(zoom - 25, 40);
    onZoomChange(next);
  };

  return (
    <div className={`w-full bg-zinc-950/80 backdrop-blur-sm border border-zinc-700/60 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 text-xs select-none ${className}`}>
      
      {/* Quick Sizing Presets */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mr-1">
          {title}:
        </span>

        {/* Fit to Width Button */}
        <button
          type="button"
          onClick={() => onSetFitMode('fit-width')}
          className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all text-[11px] ${
            fitMode === 'fit-width'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
          }`}
          title="Fit preview to available width (Original resolution maintained)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m0 0l-3-3m3 3l-3 3m-8 7h8m-8 0l3-3m-3 3l3 3" />
          </svg>
          <span>พอดีกว้าง (Fit Width)</span>
        </button>

        {/* Fit to Height Button */}
        <button
          type="button"
          onClick={() => onSetFitMode('fit-height')}
          className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all text-[11px] ${
            fitMode === 'fit-height'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
          }`}
          title="Fit preview within screen height (Original resolution maintained)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8v8m0 0l-3-3m3 3l3-3m7-8v8m0-8l-3 3m3-3l3 3" />
          </svg>
          <span>พอดีสูง (Fit Height)</span>
        </button>

        {/* Standard 500px Button */}
        <button
          type="button"
          onClick={() => onSetFitMode('standard')}
          className={`px-2 py-1 rounded-lg font-medium transition-all text-[11px] ${
            fitMode === 'standard' && zoom === 100
              ? 'bg-zinc-700 text-white border border-zinc-600'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
          }`}
          title="Default 500px preview width"
        >
          500px
        </button>
      </div>

      {/* Zoom In/Out & Badge */}
      <div className="flex items-center gap-1.5 ml-auto">
        
        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 40}
          className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 flex items-center justify-center border border-zinc-800 transition-colors font-bold text-sm active:scale-95"
          title="Zoom Out Preview"
        >
          −
        </button>

        {/* Zoom Percentage (Click to Reset) */}
        <button
          type="button"
          onClick={onResetZoom}
          className="px-2 py-1 rounded-lg bg-black/60 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-mono text-[11px] transition-colors"
          title="Click to reset zoom to 100%"
        >
          {zoom}%
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 250}
          className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 flex items-center justify-center border border-zinc-800 transition-colors font-bold text-sm active:scale-95"
          title="Zoom In Preview"
        >
          +
        </button>

        {/* Fullscreen Inspect / Modal if supported */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="w-7 h-7 ml-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-800 transition-colors"
            title="Inspect Fullscreen Preview"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5m-6 16H4m0 0v-4m0 4l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        )}
      </div>

    </div>
  );
};

export default PreviewControls;
