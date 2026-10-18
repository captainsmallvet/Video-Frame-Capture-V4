import React, { useState, useEffect, useRef } from 'react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  title: string;
  originalFileName?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  src,
  title,
  originalFileName
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [fitMode, setFitMode] = useState<'fit-screen' | 'fit-width' | 'fit-height' | 'native'>('fit-screen');
  const [naturalDim, setNaturalDim] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(100);
      setFitMode('fit-screen');
    }
  }, [isOpen, src]);

  if (!isOpen || !src) return null;

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalDim({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = originalFileName || 'frame-inspection.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div 
        className="w-full bg-zinc-950/90 border-b border-zinc-800 px-4 py-3 flex items-center justify-between gap-3 text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-sm truncate max-w-xs sm:max-w-md">{title}</h3>
          {naturalDim && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
              {naturalDim.width} × {naturalDim.height} px (Original Data Intact)
            </span>
          )}
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-2">
          {/* Fit Width */}
          <button
            onClick={() => { setFitMode('fit-width'); setZoom(100); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              fitMode === 'fit-width' ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            ↔ พอดีกว้าง
          </button>

          {/* Fit Height */}
          <button
            onClick={() => { setFitMode('fit-height'); setZoom(100); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              fitMode === 'fit-height' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            ↕ พอดีสูง
          </button>

          {/* Fit Screen */}
          <button
            onClick={() => { setFitMode('fit-screen'); setZoom(100); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              fitMode === 'fit-screen' ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            พอดีจอ
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 ml-2">
            <button
              onClick={() => { setFitMode('native'); setZoom(z => Math.max(z - 25, 25)); }}
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white"
            >
              −
            </button>
            <span className="text-xs font-mono px-1.5 min-w-[45px] text-center text-zinc-300">{zoom}%</span>
            <button
              onClick={() => { setFitMode('native'); setZoom(z => Math.min(z + 25, 300)); }}
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white"
            >
              +
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 ml-1"
            title="Download full original image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div 
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={title}
          onLoad={handleImageLoaded}
          style={{
            transform: fitMode === 'native' ? `scale(${zoom / 100})` : 'none',
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out'
          }}
          className={`transition-all duration-150 select-none ${
            fitMode === 'fit-screen' ? 'max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl' :
            fitMode === 'fit-width' ? 'w-full max-w-6xl h-auto object-contain rounded-lg shadow-2xl' :
            fitMode === 'fit-height' ? 'h-[85vh] w-auto object-contain rounded-lg shadow-2xl' :
            'rounded-lg shadow-2xl'
          }`}
        />
      </div>

      {/* Footer Info */}
      <div className="w-full bg-zinc-950/80 border-t border-zinc-800 px-4 py-2 text-center text-[11px] text-zinc-500">
        การย่อ/ขยายในหน้าต่างนี้ใช้สำหรับมุมมอง Preview เท่านั้น ความละเอียดและพิกเซลภาพจริงถูกคงสภาพไว้ 100%
      </div>
    </div>
  );
};

export default ImageLightboxModal;
