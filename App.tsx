import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  fetchCentralModels, 
  subscribeCentralModels,
  filterModelsByCategory, 
  getDefaultModelId, 
  FALLBACK_TEXT_REASONING_MODELS, 
  FALLBACK_IMAGE_MODELS, 
  AIModelOption, 
  APP_IMPORTANCE_LEVEL 
} from './services/modelService';
import { runWithModelTracking } from './services/geminiClientService';
import { FloatingMenu } from './components/FloatingMenu';
import { AiLogModal } from './components/AiLogModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PreviewControls, PreviewFitMode } from './components/PreviewControls';
import { ImageLightboxModal } from './components/ImageLightboxModal';
import { executionTracker } from './services/executionTracker';

// --- FRAME INTERFACE ---
interface Frame {
    id: string;
    src: string;
    title: string;
    prompt: string;
    originalFileName: string;
    textOutput?: string;
    naturalWidth?: number;
    naturalHeight?: number;
    frameIndex?: number;
}

// --- ICONS ---
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
    </svg>
);

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
    </svg>
);

const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
);

const SkipToEndIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19V5l11 7-11 7zM19 5v14" />
    </svg>
);

const VolumeHighIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const VolumeMuteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4" />
    </svg>
);

const SpinnerIcon = () => (
    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- DETAILED TIME & FRAME UTILITIES ---
const formatTimeDetailed = (timeInSeconds: number) => {
    const totalSeconds = Math.floor(timeInSeconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((timeInSeconds % 1) * 100);
    
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    const formattedMs = String(milliseconds).padStart(2, '0');
    
    if (hours > 0) return `${hours}:${formattedMinutes}:${formattedSeconds}.${formattedMs}`;
    return `${formattedMinutes}:${formattedSeconds}.${formattedMs}`;
};

const formatTimeShort = (timeInSeconds: number) => {
    const totalSeconds = Math.floor(timeInSeconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    if (hours > 0) return `${hours}:${formattedMinutes}:${formattedSeconds}`;
    return `${formattedMinutes}:${formattedSeconds}`;
};

const formatTimeForFilename = (timeInSeconds: number, fps: number = 30) => {
    const totalSeconds = Math.floor(timeInSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const frameIndex = Math.floor(timeInSeconds * fps);
    return `${String(minutes).padStart(2, '0')}_${String(seconds).padStart(2, '0')}_f${String(frameIndex).padStart(4, '0')}`;
};

const dataURLToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
};

// --- CHILD COMPONENTS ---
const UploadPlaceholder: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div
        onClick={onClick}
        className="w-full h-80 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-cyan-400 hover:bg-gray-700/50 transition-all duration-300 ease-in-out"
    >
        <UploadIcon />
        <p className="text-gray-300 font-semibold">Click to browse for a video</p>
        <p className="text-sm text-gray-500 mt-1">Please select an .mp4 file</p>
    </div>
);

// --- HIGH-PRECISION FRAME-BY-FRAME VIDEO PLAYER ---
const VideoPlayer: React.FC<{
    src: string;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    togglePlayPause: () => void;
    handleSeek: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    toggleMute: () => void;
    onPlay: () => void;
    onPause: () => void;
    onTimeUpdate: () => void;
    onLoadedMetadata: () => void;
    onEnded: () => void;
    onSkipToEnd: () => void;
    fitMode: PreviewFitMode;
    zoom: number;
    onSetFitMode: (mode: PreviewFitMode) => void;
    onZoomChange: (zoom: number) => void;
    onResetZoom: () => void;
    videoDimensions: { width: number; height: number } | null;
    fps: number;
    onFpsChange: (newFps: number) => void;
    onStepFrames: (delta: number) => void;
    onCaptureFrame: () => void;
}> = ({
    src, videoRef, isPlaying, currentTime, duration, isMuted, volume,
    togglePlayPause, handleSeek, toggleMute, handleVolumeChange,
    onPlay, onPause, onTimeUpdate, onLoadedMetadata, onEnded, onSkipToEnd,
    fitMode, zoom, onSetFitMode, onZoomChange, onResetZoom, videoDimensions,
    fps, onFpsChange, onStepFrames, onCaptureFrame
}) => {
    const currentFrame = Math.floor(currentTime * fps);
    const totalFrames = Math.floor((duration || 0) * fps);
    const sliderStep = 1 / fps; // Sub-second frame step

    return (
        <div className="w-full flex flex-col items-center gap-2">
            
            {/* Quick Preview Sizing Toolbar */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <PreviewControls
                    fitMode={fitMode}
                    zoom={zoom}
                    onSetFitMode={onSetFitMode}
                    onZoomChange={onZoomChange}
                    onResetZoom={onResetZoom}
                    title="Video Preview"
                />
            </div>

            {/* Video Metadata & FPS Bar */}
            <div className="w-full flex flex-wrap items-center justify-between px-2 py-1 text-[11px] text-zinc-400 font-mono bg-zinc-950/60 rounded-lg border border-zinc-800 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {videoDimensions ? `${videoDimensions.width} × ${videoDimensions.height} px` : 'Video Loading...'}
                    </span>

                    <span className="text-zinc-600">|</span>

                    {/* Live Frame Counter Badge */}
                    <span className="px-2 py-0.5 rounded bg-indigo-950/50 text-indigo-300 border border-indigo-800/60 font-bold">
                        Frame #{currentFrame} / {totalFrames}
                    </span>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    {/* FPS Selector */}
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">FPS:</span>
                        <select
                            value={fps}
                            onChange={(e) => onFpsChange(Number(e.target.value))}
                            className="bg-black border border-zinc-700 rounded px-1.5 py-0.5 text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono"
                            title="Frame rate for precise frame-by-frame calculations"
                        >
                            <option value={24}>24 fps (Cinema)</option>
                            <option value={25}>25 fps (PAL)</option>
                            <option value={30}>30 fps (Standard)</option>
                            <option value={60}>60 fps (High)</option>
                        </select>
                    </div>

                    <span className="text-[10px] text-zinc-500 hidden md:inline">
                        (← / → keys: ±1f, Shift: ±5f)
                    </span>
                </div>
            </div>

            {/* Main Video Viewport Container */}
            <div className={`w-full overflow-hidden transition-all duration-300 flex items-center justify-center bg-black/90 rounded-t-xl border border-zinc-700/80 ${
                fitMode === 'fit-height' ? 'max-h-[55vh]' : ''
            }`}>
                <div 
                    className={`w-full flex items-center justify-center overflow-auto transition-all ${
                        fitMode === 'custom-zoom' ? 'max-h-[60vh] p-2' : ''
                    }`}
                >
                    <video
                        ref={videoRef} 
                        key={src} 
                        autoPlay
                        style={{
                            transform: fitMode === 'custom-zoom' ? `scale(${zoom / 100})` : 'none',
                            transformOrigin: 'center center',
                            transition: 'transform 0.15s ease-out'
                        }}
                        className={`cursor-pointer transition-all ${
                            fitMode === 'fit-width' ? 'w-full h-auto object-contain max-h-[75vh]' :
                            fitMode === 'fit-height' ? 'max-h-[52vh] w-auto object-contain' :
                            fitMode === 'custom-zoom' ? 'max-w-none max-h-none' :
                            'w-[500px] h-auto object-contain'
                        }`}
                        onClick={togglePlayPause} 
                        onPlay={onPlay} 
                        onPause={onPause} 
                        onTimeUpdate={onTimeUpdate}
                        onLoadedMetadata={onLoadedMetadata} 
                        onEnded={onEnded}
                    >
                        <source src={src} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>
            </div>

            {/* Video Controls & Frame-by-Frame Fine-Tune Bar */}
            <div className="w-full bg-gray-800/95 backdrop-blur-sm p-3 rounded-b-xl flex flex-col gap-2.5 text-white border-x border-b border-zinc-700/80 shadow-xl">
                
                {/* Row 1: High-Precision Sub-Second Slider */}
                <div className="flex items-center gap-3">
                    <button onClick={togglePlayPause} className="p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    
                    <button onClick={onSkipToEnd} className="p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Go to end">
                        <SkipToEndIcon />
                    </button>

                    <div className="flex items-center gap-2 flex-grow">
                        {/* Current Time with Milliseconds */}
                        <span className="text-xs font-mono min-w-[70px] text-center text-cyan-300 font-bold" aria-label="Current time">
                            {formatTimeDetailed(currentTime)}
                        </span>
                        
                        {/* High-Resolution Slider with sub-second step */}
                        <input 
                            type="range" 
                            min={0} 
                            max={duration || 0} 
                            step={sliderStep}
                            value={currentTime} 
                            onChange={handleSeek} 
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all" 
                            aria-label="Frame-by-frame Seek slider" 
                            title={`Seek video (Step: ${sliderStep.toFixed(4)}s / 1 frame)`}
                        />

                        {/* Total Duration */}
                        <span className="text-xs font-mono min-w-[55px] text-center text-zinc-400" aria-label="Total duration">
                            {formatTimeShort(duration || 0)}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button onClick={toggleMute} className="p-1.5 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}>
                            {isMuted || volume === 0 ? <VolumeMuteIcon /> : <VolumeHighIcon />}
                        </button>
                        <input type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-16 sm:w-20 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-cyan-400" aria-label="Volume slider" />
                    </div>
                </div>

                {/* Row 2: Frame-by-Frame Fine-Tune Buttons (+- 1 frame, +- 5 frames) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-700/60 text-xs">
                    
                    {/* Stepper Buttons Group */}
                    <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-xl border border-zinc-700/80">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 hidden sm:inline">
                            Fine Tune:
                        </span>

                        {/* -5 Frames */}
                        <button
                            type="button"
                            onClick={() => onStepFrames(-5)}
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg font-mono font-bold text-[11px] border border-zinc-700 transition-all active:scale-95 flex items-center gap-1"
                            title="Step backward 5 frames (Shift + Left Arrow)"
                        >
                            <span>⏪</span>
                            <span>-5f</span>
                        </button>

                        {/* -1 Frame */}
                        <button
                            type="button"
                            onClick={() => onStepFrames(-1)}
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg font-mono font-bold text-[11px] border border-zinc-700 transition-all active:scale-95 flex items-center gap-1"
                            title="Step backward 1 frame (Left Arrow)"
                        >
                            <span>◀</span>
                            <span>-1f</span>
                        </button>

                        {/* Frame Counter display */}
                        <div className="px-3 py-1 bg-black rounded-lg border border-zinc-800 text-cyan-300 font-mono text-[11px] font-bold text-center min-w-[70px]">
                            f#{currentFrame}
                        </div>

                        {/* +1 Frame */}
                        <button
                            type="button"
                            onClick={() => onStepFrames(1)}
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg font-mono font-bold text-[11px] border border-zinc-700 transition-all active:scale-95 flex items-center gap-1"
                            title="Step forward 1 frame (Right Arrow)"
                        >
                            <span>+1f</span>
                            <span>▶</span>
                        </button>

                        {/* +5 Frames */}
                        <button
                            type="button"
                            onClick={() => onStepFrames(5)}
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg font-mono font-bold text-[11px] border border-zinc-700 transition-all active:scale-95 flex items-center gap-1"
                            title="Step forward 5 frames (Shift + Right Arrow)"
                        >
                            <span>+5f</span>
                            <span>⏩</span>
                        </button>
                    </div>

                    {/* Quick Frame Capture Trigger */}
                    <button
                        type="button"
                        onClick={onCaptureFrame}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/20 active:scale-95 transition-all text-xs flex items-center gap-1.5"
                        title="Capture this exact frame at native video resolution"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Capture Frame #{currentFrame}</span>
                    </button>

                </div>

            </div>
        </div>
    );
};

// --- RESILIENT IMAGE FRAME WITH PREVIEW SIZING & LIGHTBOX INSPECT ---
const ImageFrame: React.FC<{
    frame: Frame;
    onUpdatePrompt: (frameId: string, newPrompt: string) => void;
    onDelete: (frameId: string) => void;
    onSave: (frameId: string) => void;
    onProcess: (sourceFrameId: string, prompt: string, resultTitle: string, model: string) => void;
    onTextAction: (frameId: string, action: 'idea' | 'polish' | 'translate' | 'caption') => void;
    onOpenFile: (frameId: string, file: File) => void;
    isProcessing: boolean;
    imageModelOptions: AIModelOption[];
    defaultImageModel: string;
}> = ({ frame, onUpdatePrompt, onDelete, onSave, onProcess, onTextAction, onOpenFile, isProcessing, imageModelOptions, defaultImageModel }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedModel, setSelectedModel] = useState(defaultImageModel || 'gemini-3-pro-image');
    
    // Preview Resize States (Preview Only - Original Data 100% Intact)
    const [fitMode, setFitMode] = useState<PreviewFitMode>('fit-width');
    const [zoom, setZoom] = useState<number>(100);
    const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
    const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        if (defaultImageModel) {
            setSelectedModel(defaultImageModel);
        }
    }, [defaultImageModel]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            onOpenFile(frame.id, e.target.files[0]);
        }
    };

    const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };

    const handleButtonClick = (action: string) => {
        switch (action) {
            case 'open': fileInputRef.current?.click(); break;
            case 'save': onSave(frame.id); break;
            case 'remove_logo': onProcess(frame.id, 'Please edit this image to remove any visible logos.', 'Logo Removed', selectedModel); break;
            case 'remove_text': onProcess(frame.id, 'remove all logos and text from this image', 'Text Removed', selectedModel); break;
            case 'clear': onDelete(frame.id); break;
            case 'process_prompt':
                if (frame.prompt.trim()) {
                    onProcess(frame.id, frame.prompt, 'Edited Frame', selectedModel);
                }
                break;
        }
    };

    const handleZoomChange = (newZoom: number) => {
        setFitMode('custom-zoom');
        setZoom(newZoom);
    };

    const handleResetZoom = () => {
        setFitMode('standard');
        setZoom(100);
    };

    return (
        <section 
            className={`mt-8 w-full transition-all duration-300 box-content ${
                fitMode === 'fit-width' ? 'max-w-4xl' : 
                fitMode === 'fit-height' ? 'max-w-3xl' : 
                fitMode === 'custom-zoom' ? 'max-w-4xl' : 
                'max-w-[500px]'
            }`} 
            aria-labelledby={`frame-heading-${frame.id}`}
        >
            <div className="flex items-center justify-between mb-3 px-1">
                <h2 id={`frame-heading-${frame.id}`} className="text-xl sm:text-2xl font-bold text-gray-200 truncate">
                    {frame.title}
                </h2>

                {imgDimensions && (
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700/80 text-zinc-400 shrink-0">
                        {imgDimensions.width} × {imgDimensions.height} px
                    </span>
                )}
            </div>

            <div className="bg-gray-800 rounded-2xl shadow-2xl p-3 sm:p-4 flex flex-col gap-3.5 border border-zinc-700/60">
                
                {/* Preview Toolbar */}
                <PreviewControls
                    fitMode={fitMode}
                    zoom={zoom}
                    onSetFitMode={setFitMode}
                    onZoomChange={handleZoomChange}
                    onResetZoom={handleResetZoom}
                    onToggleFullscreen={() => setIsLightboxOpen(true)}
                    title="Image Preview"
                />

                {/* Image Viewport Container */}
                <div className={`w-full overflow-hidden flex items-center justify-center bg-black/70 rounded-xl border border-zinc-700/70 p-1.5 transition-all ${
                    fitMode === 'fit-height' ? 'max-h-[50vh]' : ''
                }`}>
                    <div className={`w-full flex items-center justify-center overflow-auto transition-all ${
                        fitMode === 'custom-zoom' ? 'max-h-[55vh]' : ''
                    }`}>
                        <img 
                            src={frame.src} 
                            alt={frame.title}
                            onLoad={handleImageLoaded}
                            style={{
                                transform: fitMode === 'custom-zoom' ? `scale(${zoom / 100})` : 'none',
                                transformOrigin: 'center center',
                                transition: 'transform 0.15s ease-out'
                            }}
                            className={`rounded-lg cursor-pointer transition-all ${
                                fitMode === 'fit-width' ? 'w-full h-auto object-contain max-h-[75vh]' :
                                fitMode === 'fit-height' ? 'max-h-[48vh] w-auto object-contain' :
                                fitMode === 'custom-zoom' ? 'max-w-none max-h-none' :
                                'w-full max-w-[500px] h-auto object-contain'
                            }`}
                            onClick={() => setIsLightboxOpen(true)}
                            title="Click to inspect in fullscreen lightbox"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between px-1 text-[10px] text-zinc-500 font-mono">
                    <span>* ขนาดและความละเอียดของข้อมูลภาพจริงคงเดิม 100%</span>
                    <button 
                        onClick={() => setIsLightboxOpen(true)}
                        className="text-indigo-400 hover:text-indigo-300 underline"
                    >
                        ขยายตรวจสอบภาพแบบเต็มจอ ↗
                    </button>
                </div>
                
                {/* Text Actions */}
                <div className="grid grid-cols-4 gap-2">
                    <button 
                        onClick={() => onTextAction(frame.id, 'idea')}
                        disabled={isProcessing}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] py-2 rounded-lg transition-colors uppercase font-bold"
                    >
                        Idea
                    </button>
                    <button 
                        onClick={() => onTextAction(frame.id, 'polish')}
                        disabled={isProcessing}
                        className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-[11px] py-2 rounded-lg transition-colors uppercase font-bold"
                    >
                        Polish
                    </button>
                    <button 
                        onClick={() => onTextAction(frame.id, 'translate')}
                        disabled={isProcessing}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] py-2 rounded-lg transition-colors uppercase font-bold"
                    >
                        Translate
                    </button>
                    <button 
                        onClick={() => onTextAction(frame.id, 'caption')}
                        disabled={isProcessing}
                        className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-[11px] py-2 rounded-lg transition-colors uppercase font-bold"
                    >
                        Caption
                    </button>
                </div>

                {frame.textOutput && (
                    <div className="bg-zinc-950/70 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">AI Output:</div>
                        {frame.textOutput}
                    </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-sm">
                    <button onClick={() => handleButtonClick('open')} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-2 rounded-lg transition-colors text-xs">Open</button>
                    <button onClick={() => handleButtonClick('save')} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-2 rounded-lg transition-colors text-xs">Save</button>
                    <button onClick={() => handleButtonClick('remove_logo')} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-2 rounded-lg transition-colors text-xs">Logo</button>
                    <button onClick={() => handleButtonClick('remove_text')} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-2 rounded-lg transition-colors text-xs">Text</button>
                    <button onClick={() => handleButtonClick('clear')} className="bg-red-600/80 hover:bg-red-600 text-white font-semibold py-2 px-2 rounded-lg transition-colors text-xs">Clear</button>
                </div>

                <textarea
                    value={frame.prompt}
                    onChange={(e) => onUpdatePrompt(frame.id, e.target.value)}
                    rows={3}
                    className="bg-gray-900 text-gray-200 rounded-xl p-3 w-full focus:ring-2 focus:ring-cyan-400 focus:outline-none transition text-sm border border-zinc-700/60"
                    placeholder="Enter a prompt to edit the image with AI..."
                />
                
                {/* Image Model Selector */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1 flex items-center justify-between">
                        <span>AI Image Model</span>
                        <span className="text-[9px] text-indigo-400 font-normal">Cascade Protected</span>
                    </label>
                    <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-zinc-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium"
                    >
                        {imageModelOptions.map((m) => (
                            <option key={m.id || m.modelId} value={m.modelId}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => handleButtonClick('process_prompt')}
                    disabled={isProcessing || !frame.prompt.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/60 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 ease-in-out transform hover:scale-[1.01] active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center gap-2 text-sm shadow-lg shadow-purple-600/20"
                >
                    {isProcessing ? (
                        <>
                            <SpinnerIcon /> 
                            <span>Resilient AI Processing...</span>
                        </>
                    ) : (
                        'Process with Prompt'
                    )}
                </button>
            </div>
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

            {/* Fullscreen Lightbox Modal */}
            <ImageLightboxModal
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                src={frame.src}
                title={frame.title}
                originalFileName={frame.originalFileName}
            />
        </section>
    );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    // --- CENTRAL AI MODELS STATES ---
    const [textModelOptions, setTextModelOptions] = useState<AIModelOption[]>(FALLBACK_TEXT_REASONING_MODELS);
    const [imageModelOptions, setImageModelOptions] = useState<AIModelOption[]>(FALLBACK_IMAGE_MODELS);

    const initialTextModel = getDefaultModelId(FALLBACK_TEXT_REASONING_MODELS, APP_IMPORTANCE_LEVEL as 1, 'gemini-3.6-flash');
    const initialImageModel = getDefaultModelId(FALLBACK_IMAGE_MODELS, APP_IMPORTANCE_LEVEL as 1, 'gemini-3-pro-image');

    const [selectedTextModel, setSelectedTextModel] = useState<string>(initialTextModel);
    const [defaultImageModel, setDefaultImageModel] = useState<string>(initialImageModel);

    // --- API KEY NOTEPAD STATES ---
    const [notepadKey, setNotepadKey] = useState<string>('');
    const [activeApiKey, setActiveApiKey] = useState<string>('');
    
    // --- APP STATES ---
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [videoFileName, setVideoFileName] = useState<string>('');
    const [frames, setFrames] = useState<Frame[]>([]);
    const [error, setError] = useState<string>('');
    const [successNotice, setSuccessNotice] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    
    // Video Preview Sizing & FPS State
    const [videoFitMode, setVideoFitMode] = useState<PreviewFitMode>('standard');
    const [videoZoom, setVideoZoom] = useState<number>(100);
    const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
    const [fps, setFps] = useState<number>(30); // Frame Rate for frame-by-frame seeking

    // Modals
    const [isAiLogModalOpen, setIsAiLogModalOpen] = useState<boolean>(false);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
    
    // Video Player State
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [volume, setVolume] = useState<number>(1);
    const [isMuted, setIsMuted] = useState<boolean>(false);

    // --- REAL-TIME CENTRALIZED REGISTRY SUBSCRIPTION ---
    useEffect(() => {
        fetchCentralModels().then((models) => {
            if (models && models.length > 0) {
                const textModels = filterModelsByCategory(models, 'text_reasoning');
                if (textModels.length > 0) {
                    setTextModelOptions(textModels);
                    setSelectedTextModel(prev => prev || getDefaultModelId(textModels, APP_IMPORTANCE_LEVEL as 1, 'gemini-3.6-flash'));
                }
                const imgModels = filterModelsByCategory(models, 'image_gen');
                if (imgModels.length > 0) {
                    setImageModelOptions(imgModels);
                    setDefaultImageModel(prev => prev || getDefaultModelId(imgModels, APP_IMPORTANCE_LEVEL as 1, 'gemini-3-pro-image'));
                }
            }
        });

        const unsubscribe = subscribeCentralModels((updatedModels) => {
            if (updatedModels && updatedModels.length > 0) {
                const textModels = filterModelsByCategory(updatedModels, 'text_reasoning');
                if (textModels.length > 0) {
                    setTextModelOptions(textModels);
                }

                const imgModels = filterModelsByCategory(updatedModels, 'image_gen');
                if (imgModels.length > 0) {
                    setImageModelOptions(imgModels);
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    // --- INITIALIZATION ---
    useEffect(() => {
        const savedKey = localStorage.getItem('GEMINI_CUSTOM_API_KEY');
        const envKey = (typeof process !== 'undefined' ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : '') || '';
        const initialKey = savedKey || envKey || '';
        
        setActiveApiKey(initialKey);
        setNotepadKey(initialKey || 'no API key');
    }, []);

    // --- NOTEPAD & KEY HANDLERS ---
    const handleSendKey = () => {
        const cleanKey = notepadKey.trim();
        if (cleanKey && cleanKey !== 'no API key') {
            localStorage.setItem('GEMINI_CUSTOM_API_KEY', cleanKey);
            setActiveApiKey(cleanKey);
            setError('');
            setSuccessNotice('Gemini API Key activated successfully!');
            setTimeout(() => setSuccessNotice(''), 3000);
        } else {
            setError('Please enter a valid API Key.');
        }
    };

    const handleCopyKey = () => {
        navigator.clipboard.writeText(notepadKey).then(() => {
            setSuccessNotice('Copied key to clipboard.');
            setTimeout(() => setSuccessNotice(''), 2000);
        });
    };

    const handleClearKey = () => {
        setNotepadKey('');
        setActiveApiKey('');
        localStorage.removeItem('GEMINI_CUSTOM_API_KEY');
    };

    // --- VIDEO HANDLERS ---
    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setError('');
        setFrames([]);
        if (videoSrc) {
            URL.revokeObjectURL(videoSrc);
            setVideoSrc(null);
        }
        if (file) {
            if (file.type === 'video/mp4') {
                const videoUrl = URL.createObjectURL(file);
                setVideoSrc(videoUrl);
                setVideoFileName(file.name);
            } else {
                setError('Invalid file type. Please select a .mp4 video file.');
            }
        }
    }, [videoSrc]);

    const handleUploadAreaClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);
    
    useEffect(() => {
        if (videoSrc && videoRef.current) {
            setIsPlaying(true);
            setCurrentTime(0);
            setDuration(0);
            videoRef.current.volume = volume;
            videoRef.current.muted = isMuted;
        }
    }, [videoSrc, isMuted, volume]);
    
    // --- VIDEO PLAYER HANDLERS ---
    const togglePlayPause = useCallback(() => {
        if (!videoRef.current) return;
        videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
    }, []);

    // High-Precision Seek Handler
    const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const targetTime = Number(event.target.value);
        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
    };

    // Frame-by-Frame Fine Tune (+- 1 frame, +- 5 frames) with exact frame-center snapping
    const handleStepFrames = useCallback((frameDelta: number) => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        if (!video.paused) {
            video.pause();
            setIsPlaying(false);
        }
        
        const frameDuration = 1 / fps;
        const totalFrames = Math.max(1, Math.floor((duration || 0) * fps));
        // Calculate current frame index and target frame index
        const currentFrameIndex = Math.floor(video.currentTime * fps);
        const targetFrameIndex = Math.max(0, Math.min(totalFrames - 1, currentFrameIndex + frameDelta));
        
        // Snap to the exact center of the target frame to prevent edge float rounding errors
        const exactCenterTime = (targetFrameIndex * frameDuration) + (frameDuration * 0.5);
        const clampedTime = Math.max(0, Math.min(duration || 0, exactCenterTime));
        
        video.currentTime = clampedTime;
        setCurrentTime(clampedTime);
    }, [fps, duration]);

    // Keyboard Shortcuts for Frame Navigation
    useEffect(() => {
        if (!videoSrc) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
                return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handleStepFrames(e.shiftKey ? -5 : -1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleStepFrames(e.shiftKey ? 5 : 1);
            } else if (e.key === ' ') {
                e.preventDefault();
                togglePlayPause();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [videoSrc, handleStepFrames, togglePlayPause]);

    const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const newVolume = Number(event.target.value);
        videoRef.current.volume = newVolume;
        setVolume(newVolume);
        if (newVolume > 0 && isMuted) {
            videoRef.current.muted = false;
            setIsMuted(false);
        } else if (newVolume === 0 && !isMuted) {
             videoRef.current.muted = true;
             setIsMuted(true);
        }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        const newMutedState = !isMuted;
        videoRef.current.muted = newMutedState;
        setIsMuted(newMutedState);
        if (!newMutedState && volume === 0) {
            const newVolume = 0.5;
            setVolume(newVolume);
            videoRef.current.volume = newVolume;
        }
    };

    const onTimeUpdate = () => {
        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
    };

    const onLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setVideoDimensions({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight
            });
        }
    };

    const handleSkipToEnd = () => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = videoRef.current.duration;
        if (!videoRef.current.paused) videoRef.current.pause();
    };

    // --- VIDEO PREVIEW ZOOM HANDLERS ---
    const handleVideoZoomChange = (newZoom: number) => {
        setVideoFitMode('custom-zoom');
        setVideoZoom(newZoom);
    };

    const handleVideoResetZoom = () => {
        setVideoFitMode('standard');
        setVideoZoom(100);
    };

    // --- BULLETPROOF FRAME-ACCURATE CAPTURE (100% UNBLURRED NATIVE FRAME) ---
    const handleCaptureFrame = async () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        
        // 1. If currently playing, pause immediately to freeze exact frame buffer
        if (!video.paused) {
            video.pause();
            setIsPlaying(false);
        }

        // 2. If video decoder is actively seeking, wait for the 'seeked' event
        if (video.seeking) {
            await new Promise<void>((resolve) => {
                const onSeeked = () => {
                    video.removeEventListener('seeked', onSeeked);
                    resolve();
                };
                video.addEventListener('seeked', onSeeked, { once: true });
            });
        }

        // 3. Ensure browser presentation pipeline has rendered the latest decoded frame
        if ('requestVideoFrameCallback' in video) {
            await new Promise<void>((resolve) => {
                (video as any).requestVideoFrameCallback(() => resolve());
            });
        } else {
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }

        // 4. Always captures from native videoWidth and videoHeight at full resolution
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Ensure highest image smoothing quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/png');
        const originalNameWithoutExt = videoFileName.split('.').slice(0, -1).join('.') || videoFileName || 'video';
        const currentFrameNum = Math.floor(video.currentTime * fps);
        
        const newFrame: Frame = {
            id: crypto.randomUUID ? crypto.randomUUID() : `frame-${Date.now()}`,
            src: dataUrl,
            title: `Captured Frame #${currentFrameNum} (${canvas.width}×${canvas.height})`,
            prompt: '',
            originalFileName: `${formatTimeForFilename(video.currentTime, fps)} - ${originalNameWithoutExt}.png`,
            naturalWidth: canvas.width,
            naturalHeight: canvas.height,
            frameIndex: currentFrameNum
        };
        
        setFrames(prev => [newFrame, ...prev]);
        setSuccessNotice(`✓ Frame #${currentFrameNum} captured with 100% exact frame-accuracy (${canvas.width}×${canvas.height})!`);
        setTimeout(() => setSuccessNotice(''), 3000);
    };

    // --- RESILIENT IMAGE PROCESSING WITH CASCADE FALLBACK ---
    const handleImageProcessing = async (sourceFrameId: string, prompt: string, resultTitle: string, model: string) => {
        const sourceFrame = frames.find(f => f.id === sourceFrameId);
        if (!sourceFrame || isProcessing) return;

        setIsProcessing(true);
        setError('');

        try {
            const base64Data = sourceFrame.src.split(',')[1] || sourceFrame.src;
            const mimeType = sourceFrame.src.match(/data:(.*);/)?.[1] || 'image/png';

            const result = await runWithModelTracking({
                operation: 'image_gen',
                actionName: resultTitle,
                prompt,
                imageBase64: base64Data,
                mimeType,
                requestedModel: model,
                apiKey: activeApiKey,
                availableModels: imageModelOptions
            });

            if (result.imageBase64) {
                const newFrame: Frame = {
                    id: crypto.randomUUID ? crypto.randomUUID() : `frame-${Date.now()}`,
                    src: `data:${result.mimeType || 'image/png'};base64,${result.imageBase64}`,
                    title: `${resultTitle} (${result.actualModel})`,
                    prompt: '',
                    originalFileName: `processed - ${sourceFrame.originalFileName}`
                };
                setFrames(prev => [newFrame, ...prev]);

                if (result.isFallback) {
                    setSuccessNotice(`Succeeded using fallback model: ${result.actualModel} (${result.latencyMs}ms)`);
                } else {
                    setSuccessNotice(`Image processed with ${result.actualModel} in ${result.latencyMs}ms!`);
                }
                setTimeout(() => setSuccessNotice(''), 4000);
            }
        } catch (err: any) {
            console.error("Error processing image:", err);
            setError(`Image processing failed: ${err.message || 'Please check your API key.'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- RESILIENT TEXT REASONING WITH CASCADE FALLBACK ---
    const handleTextProcessing = async (frameId: string, action: 'idea' | 'polish' | 'translate' | 'caption') => {
        const sourceFrame = frames.find(f => f.id === frameId);
        if (!sourceFrame || isProcessing) return;

        setIsProcessing(true);
        setError('');

        try {
            const base64Data = sourceFrame.src.split(',')[1] || sourceFrame.src;
            const mimeType = sourceFrame.src.match(/data:(.*);/)?.[1] || 'image/png';

            let prompt = "";
            let actionName = "";
            switch (action) {
                case 'idea':
                    actionName = "Idea Generation";
                    prompt = "Describe this image and suggest 3 creative AI image editing ideas to transform it.";
                    break;
                case 'polish':
                    actionName = "Prompt Polish";
                    prompt = `Improve and expand this image editing prompt for better results: "${sourceFrame.prompt || 'make it look cinematic'}". Return only the improved prompt text.`;
                    break;
                case 'translate':
                    actionName = "Translation";
                    prompt = "Translate any text visible in the image or provide a translation of what is happening in the scene from English to Thai and vice versa.";
                    break;
                case 'caption':
                    actionName = "Social Caption";
                    prompt = "Create 3 catchy social media captions for this specific image scene.";
                    break;
            }

            const result = await runWithModelTracking({
                operation: 'text_reasoning',
                actionName,
                prompt,
                imageBase64: base64Data,
                mimeType,
                requestedModel: selectedTextModel,
                apiKey: activeApiKey,
                availableModels: textModelOptions
            });

            const textResult = result.text;
            if (textResult) {
                setFrames(prev => prev.map(f => f.id === frameId ? { ...f, textOutput: textResult } : f));
                if (action === 'polish') {
                    setFrames(prev => prev.map(f => f.id === frameId ? { ...f, prompt: textResult.trim() } : f));
                }

                if (result.isFallback) {
                    setSuccessNotice(`Recovered with cascade model: ${result.actualModel} (${result.latencyMs}ms)`);
                } else {
                    setSuccessNotice(`Generated with ${result.actualModel} in ${result.latencyMs}ms`);
                }
                setTimeout(() => setSuccessNotice(''), 3000);
            }
        } catch (err: any) {
            console.error("Error processing text reasoning:", err);
            setError(`Text processing failed: ${err.message || 'Please check your API key.'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateFramePrompt = (frameId: string, newPrompt: string) => {
        setFrames(frames.map(f => f.id === frameId ? { ...f, prompt: newPrompt } : f));
    };

    const handleDeleteFrame = (frameId: string) => {
        setFrames(frames.filter(f => f.id !== frameId));
    };

    const handleSaveFrame = async (frameId: string) => {
        const frame = frames.find(f => f.id === frameId);
        if (!frame) return;
        const blob = await dataURLToBlob(frame.src);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = frame.originalFileName || `${frame.title.toLowerCase().replace(' ','_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    const handleOpenFileForFrame = (frameId: string, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
                setFrames(frames.map(f => f.id === frameId ? { ...f, src: dataUrl, originalFileName: file.name } : f));
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-start font-sans text-white pb-24">
            
            {/* TOP BAR: API KEY & DUAL-LAYER RESILIENT SETTINGS */}
            <div className="w-full bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 p-3 shadow-lg sticky top-0 z-30">
                <div className="max-w-6xl mx-auto flex flex-col gap-2.5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
                        
                        {/* Status + Model Selection */}
                        <div className="flex items-center flex-wrap gap-3">
                            <button
                                onClick={() => setIsApiKeyModalOpen(true)}
                                className="flex items-center gap-2 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white"
                                title="Click to open API Key Settings"
                            >
                                <span className={`w-2 h-2 rounded-full ${activeApiKey ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-500'} animate-pulse`} />
                                Key Status: {activeApiKey ? 'Active' : 'Unset'}
                            </button>
                            
                            <div className="flex items-center gap-2 border-l border-zinc-800 pl-3">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:inline">
                                    Text Reasoning:
                                </label>
                                <select 
                                    value={selectedTextModel}
                                    onChange={(e) => setSelectedTextModel(e.target.value)}
                                    className="bg-black border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium max-w-[200px] sm:max-w-none truncate"
                                    title="Primary text reasoning model (Auto cascades if unavailable)"
                                >
                                    {textModelOptions.map((m) => (
                                        <option key={m.id || m.modelId} value={m.modelId}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Top Bar Actions */}
                        <div className="flex items-center gap-2 self-end md:self-center">
                            <button 
                                onClick={handleSendKey}
                                className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30 transition-all uppercase tracking-wider active:scale-95"
                            >
                                Send
                            </button>
                            <button 
                                onClick={handleCopyKey}
                                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-700 transition-all uppercase tracking-wider active:scale-95"
                            >
                                Copy
                            </button>
                            <button 
                                onClick={handleClearKey}
                                className="px-3 py-1 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 text-xs font-bold rounded-lg border border-rose-500/20 transition-all uppercase tracking-wider active:scale-95"
                            >
                                Clear
                            </button>
                            
                            <button
                                onClick={() => setIsAiLogModalOpen(true)}
                                className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold rounded-lg border border-indigo-500/30 transition-all flex items-center gap-1.5 active:scale-95"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                                AI Log
                            </button>
                        </div>
                    </div>

                    <textarea 
                        value={notepadKey}
                        onChange={(e) => setNotepadKey(e.target.value)}
                        className="w-full h-11 bg-black/90 border border-zinc-800 rounded-lg p-2 text-emerald-400 font-mono text-xs resize-none focus:outline-none focus:border-emerald-500/40 whitespace-pre overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800"
                        placeholder="Paste Gemini API key here..."
                    />
                </div>
            </div>

            {/* Notification Toasts */}
            {successNotice && (
                <div className="fixed top-24 z-50 bg-emerald-950/90 border border-emerald-700/60 text-emerald-200 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {successNotice}
                </div>
            )}

            <header className="w-full max-w-[500px] text-center my-8 px-4">
                <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-blue-500">
                    Video Frame Capture
                </h1>
                <p className="text-sm text-gray-400 mt-2">
                    Capture, analyze, and edit video frames with Dual-Layer Gemini Engine.
                </p>
            </header>

            {/* Main Video Section with Dynamic Sizing Container */}
            <main className={`bg-gray-800 rounded-2xl shadow-2xl p-4 w-full transition-all duration-300 box-content border border-zinc-700/50 ${
                videoFitMode === 'fit-width' ? 'max-w-4xl' : 
                videoFitMode === 'fit-height' ? 'max-w-3xl' : 
                videoFitMode === 'custom-zoom' ? 'max-w-4xl' : 
                'max-w-[500px]'
            }`}>
                <div className="w-full h-auto flex items-center justify-center">
                    {videoSrc ? (
                        <VideoPlayer 
                            src={videoSrc} videoRef={videoRef} isPlaying={isPlaying} currentTime={currentTime}
                            duration={duration} volume={volume} isMuted={isMuted} togglePlayPause={togglePlayPause}
                            handleSeek={handleSeek} handleVolumeChange={handleVolumeChange} toggleMute={toggleMute}
                            onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
                            onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata}
                            onEnded={() => setIsPlaying(false)} onSkipToEnd={handleSkipToEnd}
                            fitMode={videoFitMode}
                            zoom={videoZoom}
                            onSetFitMode={setVideoFitMode}
                            onZoomChange={handleVideoZoomChange}
                            onResetZoom={handleVideoResetZoom}
                            videoDimensions={videoDimensions}
                            fps={fps}
                            onFpsChange={setFps}
                            onStepFrames={handleStepFrames}
                            onCaptureFrame={handleCaptureFrame}
                        />
                    ) : (
                        <UploadPlaceholder onClick={handleUploadAreaClick} />
                    )}
                </div>
            </main>
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".mp4" className="hidden" />
            
            {error && (
                 <div role="alert" className="mt-4 bg-red-950/80 border border-red-500/50 text-red-300 px-4 py-3 rounded-2xl text-xs max-w-[500px] w-full text-center shadow-lg">
                    {error}
                </div>
            )}
            
            {videoSrc && (
                <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                        onClick={handleUploadAreaClick}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl transition duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-cyan-600/20 text-sm"
                    >
                        Change Video
                    </button>
                    <button
                        onClick={handleCaptureFrame}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/20 text-sm flex items-center gap-2"
                        title="Captures frame at 100% original video resolution"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Capture Current Frame #{Math.floor(currentTime * fps)}</span>
                    </button>
                </div>
            )}
            
            {/* Captured and Processed Frames */}
            <div className="w-full flex flex-col items-center pb-8 px-4">
                 {frames.map(frame => (
                    <ImageFrame
                        key={frame.id}
                        frame={frame}
                        onUpdatePrompt={handleUpdateFramePrompt}
                        onDelete={handleDeleteFrame}
                        onSave={handleSaveFrame}
                        onProcess={handleImageProcessing}
                        onTextAction={handleTextProcessing}
                        onOpenFile={handleOpenFileForFrame}
                        isProcessing={isProcessing}
                        imageModelOptions={imageModelOptions}
                        defaultImageModel={defaultImageModel}
                    />
                 ))}
            </div>

            {/* FLOATING MENU */}
            <FloatingMenu
                selectedTextModel={selectedTextModel}
                onSelectTextModel={setSelectedTextModel}
                textModelOptions={textModelOptions}
                onOpenLogs={() => setIsAiLogModalOpen(true)}
                onOpenApiKey={() => setIsApiKeyModalOpen(true)}
                onCaptureFrame={handleCaptureFrame}
                isProcessing={isProcessing}
                hasVideo={Boolean(videoSrc)}
            />

            {/* AI EXECUTION LOG MODAL */}
            <AiLogModal
                isOpen={isAiLogModalOpen}
                onClose={() => setIsAiLogModalOpen(false)}
            />

            {/* SAFE API KEY MODAL */}
            <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onClose={() => setIsApiKeyModalOpen(false)}
                onSave={(newKey) => {
                    setActiveApiKey(newKey);
                    setNotepadKey(newKey || 'no API key');
                }}
            />

        </div>
    );
};

export default App;
