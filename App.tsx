
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

// --- FRAME INTERFACE ---
interface Frame {
    id: string;
    src: string;
    title: string;
    prompt: string;
    originalFileName: string;
    textOutput?: string;
}

// --- ICONS ---
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
    </svg>
);

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
    </svg>
);

const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
);

const SkipToEndIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19V5l11 7-11 7zM19 5v14" />
    </svg>
);

const VolumeHighIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const VolumeMuteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4" />
    </svg>
);

const SpinnerIcon = () => (
    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- UTILITY FUNCTIONS ---
const formatTime = (timeInSeconds: number) => {
    const totalSeconds = Math.floor(timeInSeconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    if (hours > 0) return `${hours}:${formattedMinutes}:${formattedSeconds}`;
    return `${formattedMinutes}:${formattedSeconds}`;
};

const formatTimeForFilename = (timeInSeconds: number) => {
    const totalSeconds = Math.floor(timeInSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}_${String(seconds).padStart(2, '0')}`;
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

const VideoPlayer: React.FC<{
    src: string;
    videoRef: React.RefObject<HTMLVideoElement>;
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
}> = ({
    src, videoRef, isPlaying, currentTime, duration, isMuted, volume,
    togglePlayPause, handleSeek, toggleMute, handleVolumeChange,
    onPlay, onPause, onTimeUpdate, onLoadedMetadata, onEnded, onSkipToEnd
}) => (
     <div className="w-full flex flex-col items-center">
        <video
            ref={videoRef} key={src} autoPlay
            className="w-[500px] h-auto rounded-t-md bg-black cursor-pointer"
            onClick={togglePlayPause} onPlay={onPlay} onPause={onPause} onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata} onEnded={onEnded}
        >
            <source src={src} type="video/mp4" />
            Your browser does not support the video tag.
        </video>
        <div className="w-[500px] bg-gray-800/80 backdrop-blur-sm p-2 rounded-b-md flex items-center gap-3 text-white">
            <button onClick={togglePlayPause} className="p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button onClick={onSkipToEnd} className="p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Go to end">
                <SkipToEndIcon />
            </button>
            <div className="flex items-center gap-2 flex-grow">
                <span className="text-xs font-mono w-12 text-center" aria-label="Current time">{formatTime(currentTime)}</span>
                <input type="range" min={0} max={duration || 0} value={currentTime} onChange={handleSeek} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-cyan-400" aria-label="Seek slider" />
                <span className="text-xs font-mono w-12 text-center" aria-label="Total duration">{formatTime(duration || 0)}</span>
            </div>
             <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}>
                    {isMuted || volume === 0 ? <VolumeMuteIcon /> : <VolumeHighIcon />}
                </button>
                <input type="range" min={0} max={1} step={0.1} value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-24 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-cyan-400" aria-label="Volume slider" />
            </div>
        </div>
    </div>
);

const ImageFrame: React.FC<{
    frame: Frame;
    onUpdatePrompt: (frameId: string, newPrompt: string) => void;
    onDelete: (frameId: string) => void;
    onSave: (frameId: string) => void;
    onProcess: (sourceFrameId: string, prompt: string, resultTitle: string, model: string) => void;
    onTextAction: (frameId: string, action: 'idea' | 'polish' | 'translate' | 'caption') => void;
    onOpenFile: (frameId: string, file: File) => void;
    isProcessing: boolean;
}> = ({ frame, onUpdatePrompt, onDelete, onSave, onProcess, onTextAction, onOpenFile, isProcessing }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-image');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            onOpenFile(frame.id, e.target.files[0]);
        }
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
    return (
        <section className="mt-8 w-full max-w-[500px] box-content" aria-labelledby={`frame-heading-${frame.id}`}>
            <h2 id={`frame-heading-${frame.id}`} className="text-2xl font-bold mb-4 text-center text-gray-300">{frame.title}</h2>
            <div className="bg-gray-800 rounded-xl shadow-2xl p-2 flex flex-col gap-4">
                <img src={frame.src} alt={frame.title} className="w-full h-auto rounded-md"/>
                
                {/* Text Actions */}
                <div className="grid grid-cols-4 gap-2 px-1">
                    <button 
                        onClick={() => onTextAction(frame.id, 'idea')}
                        disabled={isProcessing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] py-1 rounded-md transition-colors uppercase font-bold"
                    >
                        Idea
                    </button>
                    <button 
                        onClick={() => onTextAction(frame.id, 'polish')}
                        disabled={isProcessing}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] py-1 rounded-md transition-colors uppercase font-bold"
                    >
                        Polish
                    </button>
                    <button 
                        onClick={() => onTextAction(frame.id, 'translate')}
                        disabled={isProcessing}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] py-1 rounded-md transition-colors uppercase font-bold"
                    >
                        Translate
                    </button>
                    <button 
                        onClick={() => onTextAction(frame.id, 'caption')}
                        disabled={isProcessing}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-[10px] py-1 rounded-md transition-colors uppercase font-bold"
                    >
                        Caption
                    </button>
                </div>

                {frame.textOutput && (
                    <div className="bg-zinc-950/50 border border-zinc-700 rounded-md p-3 text-xs text-zinc-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {frame.textOutput}
                    </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-sm">
                    <button onClick={() => handleButtonClick('open')} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-2 rounded-lg transition-colors text-xs">Open</button>
                    <button onClick={() => handleButtonClick('save')} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-2 rounded-lg transition-colors text-xs">Save</button>
                    <button onClick={() => handleButtonClick('remove_logo')} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-2 rounded-lg transition-colors text-xs">Logo</button>
                    <button onClick={() => handleButtonClick('remove_text')} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-2 rounded-lg transition-colors text-xs">Text</button>
                    <button onClick={() => handleButtonClick('clear')} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-2 rounded-lg transition-colors text-xs">Clear</button>
                </div>
                <textarea
                    value={frame.prompt}
                    onChange={(e) => onUpdatePrompt(frame.id, e.target.value)}
                    rows={3}
                    className="bg-gray-900 text-gray-200 rounded-lg p-3 w-full focus:ring-2 focus:ring-cyan-400 focus:outline-none transition"
                    placeholder="Enter a prompt to edit the image..."
                />
                
                {/* Model Selector Dropdown */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold ml-1">AI Image Model</label>
                    <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
<option value="gemini-2.5-flash-image">gemini-2.5-flash-image (Default)</option>
<option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview</option>
<option value="imagen-4.0-generate-001">imagen-4.0-generate-001</option>
<option value="gemini-flash-image-latest">Gemini Flash Image Latest</option>
<option value="gemini-pro-image-latest">Gemini Pro Image Latest</option>
<option value="gemini-flash-latest">gemini-flash-latest</option>
<option value="gemini-flash-lite-latest">gemini-flash-lite-latest</option>
<option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
<option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
<option value="gemini-3.1-flash-image-preview">Gemini 3.1 Flash Image (High Quality)</option>
                    </select>
                </div>

                <button
                    onClick={() => handleButtonClick('process_prompt')}
                    disabled={isProcessing || !frame.prompt.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/80 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 flex items-center justify-center"
                >
                    {isProcessing ? <><SpinnerIcon /> Processing...</> : 'Process with Prompt'}
                </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </section>
    );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    // --- API KEY NOTEPAD STATES ---
    const [notepadKey, setNotepadKey] = useState<string>('');
    const [activeApiKey, setActiveApiKey] = useState<string>('');
    const [selectedTextModel, setSelectedTextModel] = useState<string>('gemini-3-flash-preview');
    
    // --- APP STATES ---
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoFileName, setVideoFileName] = useState<string>('');
    const [frames, setFrames] = useState<Frame[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    // Video player state
    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        const savedKey = localStorage.getItem('GEMINI_CUSTOM_API_KEY');
        const envKey = process.env.API_KEY;
        const initialKey = savedKey || envKey || '';
        
        setActiveApiKey(initialKey);
        setNotepadKey(initialKey || 'no API key');
    }, []);

    // --- NOTEPAD HANDLERS ---
    const handleSendKey = () => {
        const cleanKey = notepadKey.trim();
        if (cleanKey && cleanKey !== 'no API key') {
            localStorage.setItem('GEMINI_CUSTOM_API_KEY', cleanKey);
            setActiveApiKey(cleanKey);
            setError('');
        } else {
            setError('Please enter a valid API Key');
        }
    };

    const handleCopyKey = () => {
        navigator.clipboard.writeText(notepadKey).then(() => {
            // Success
        });
    };

    const handleClearKey = () => {
        setNotepadKey('');
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
    const togglePlayPause = () => {
        if (!videoRef.current) return;
        videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
    };
    const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Number(event.target.value);
    };
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
        if (videoRef.current) setDuration(videoRef.current.duration);
    };
    const handleSkipToEnd = () => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = videoRef.current.duration;
        if (!videoRef.current.paused) videoRef.current.pause();
    };

    // --- FRAME HANDLERS ---
    const handleCaptureFrame = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const originalNameWithoutExt = videoFileName.split('.').slice(0, -1).join('.') || videoFileName;
        const newFrame: Frame = {
            id: crypto.randomUUID(),
            src: dataUrl,
            title: 'Captured Frame',
            prompt: '',
            originalFileName: `${formatTimeForFilename(currentTime)} of ${formatTimeForFilename(duration)} - ${originalNameWithoutExt}.png`
        };
        setFrames(prev => [newFrame, ...prev]);
    };

    const handleImageProcessing = async (sourceFrameId: string, prompt: string, resultTitle: string, model: string) => {
        const sourceFrame = frames.find(f => f.id === sourceFrameId);
        if (!sourceFrame || isProcessing) return;
        if (!activeApiKey) {
            setError('No API Key detected. Please enter a key in the Notepad bar above and click Send.');
            return;
        }

        setIsProcessing(true);
        setError('');
        try {
            const base64Data = sourceFrame.src.split(',')[1];
            const mimeType = sourceFrame.src.match(/data:(.*);/)?.[1] || 'image/png';
            const ai = new GoogleGenAI({ apiKey: activeApiKey });
            
            const response = await ai.models.generateContent({
                model: model, 
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType } },
                        { text: prompt },
                    ],
                },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            if (response.promptFeedback?.blockReason) {
                throw new Error(`Request was blocked. Reason: ${response.promptFeedback.blockReason}`);
            }
            
            const candidate = response.candidates?.[0];
            const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
            const processedBase64 = imagePart?.inlineData?.data;
            
            if (processedBase64) {
                const newFrame: Frame = {
                    id: crypto.randomUUID(),
                    src: `data:image/png;base64,${processedBase64}`,
                    title: resultTitle,
                    prompt: '',
                    originalFileName: `processed - ${sourceFrame.originalFileName}`
                };
                setFrames(prev => [newFrame, ...prev]);
            } else {
                 let reason = response.text;
                if (!reason && candidate?.finishReason && candidate.finishReason !== 'STOP') {
                     reason = `Generation stopped due to: ${candidate.finishReason}`;
                }
                throw new Error(reason || "Could not process image. The API returned no image data.");
            }
        } catch (err: any) {
            console.error("Error processing image:", err);
            setError(`Failed to process image: ${err.message || 'Please try again.'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTextProcessing = async (frameId: string, action: 'idea' | 'polish' | 'translate' | 'caption') => {
        const sourceFrame = frames.find(f => f.id === frameId);
        if (!sourceFrame || isProcessing) return;
        if (!activeApiKey) {
            setError('No API Key detected.');
            return;
        }

        setIsProcessing(true);
        setError('');
        try {
            const ai = new GoogleGenAI({ apiKey: activeApiKey });
            const base64Data = sourceFrame.src.split(',')[1];
            const mimeType = sourceFrame.src.match(/data:(.*);/)?.[1] || 'image/png';

            let prompt = "";
            switch (action) {
                case 'idea':
                    prompt = "Describe this image and suggest 3 creative AI image editing ideas to transform it.";
                    break;
                case 'polish':
                    prompt = `Improve and expand this image editing prompt for better results: "${sourceFrame.prompt || 'make it look cinematic'}". Return only the improved prompt text.`;
                    break;
                case 'translate':
                    prompt = "Translate any text visible in the image or provide a translation of what is happening in the scene from English to Thai and vice versa.";
                    break;
                case 'caption':
                    prompt = "Create 3 catchy social media captions for this specific image scene.";
                    break;
            }

            const response = await ai.models.generateContent({
                model: selectedTextModel,
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType } },
                        { text: prompt },
                    ],
                },
            });

            const textResult = response.text;
            if (textResult) {
                setFrames(prev => prev.map(f => f.id === frameId ? { ...f, textOutput: textResult } : f));
                // If polishing, also update the prompt textarea
                if (action === 'polish') {
                    setFrames(prev => prev.map(f => f.id === frameId ? { ...f, prompt: textResult.trim() } : f));
                }
            }
        } catch (err: any) {
            console.error("Error processing text reasoning:", err);
            setError(`Text processing failed: ${err.message || 'Please try again.'}`);
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
    
    // --- RENDER ---
    return (
        <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-start font-sans text-white">
            
            {/* API KEY & GLOBAL SETTINGS BAR */}
            <div className="w-full bg-zinc-950 border-b border-zinc-800 p-3 shadow-lg sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
                        <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${activeApiKey ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                                API Key:
                            </label>
                            
                            <div className="flex items-center gap-2 border-l border-zinc-700 pl-3 ml-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Text Reasoning Model:</label>
                                <select 
                                    value={selectedTextModel}
                                    onChange={(e) => setSelectedTextModel(e.target.value)}
                                    className="bg-black border border-zinc-700 rounded-md px-2 py-1 text-[10px] text-zinc-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-bold uppercase"
                                >
<option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
<option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
<option value="gemini-3-pro-preview">Gemini 3.0 Pro Preview</option>
<option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite Preview</option>
<option value="gemini-flash-latest">Gemini Flash Latest</option>
<option value="gemini-flash-lite-latest">Gemini Flash Lite Latest</option>
<option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
<option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
<option value="gemini-pro-latest">Gemini Pro (Latest Stable)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleSendKey}
                                className="px-4 py-1 bg-green-600/10 hover:bg-green-600/20 text-green-500 text-[10px] font-black rounded border border-green-500/20 transition-all uppercase tracking-tighter"
                            >
                                Send
                            </button>
                            <button 
                                onClick={handleCopyKey}
                                className="px-4 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-bold rounded border border-zinc-700 transition-all uppercase tracking-tighter"
                            >
                                Copy
                            </button>
                            <button 
                                onClick={handleClearKey}
                                className="px-4 py-1 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-bold rounded border border-red-500/20 transition-all uppercase tracking-tighter"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                    <textarea 
                        value={notepadKey}
                        onChange={(e) => setNotepadKey(e.target.value)}
                        className="w-full h-12 bg-black border border-zinc-800 rounded p-2 text-green-400 font-mono text-xs resize-none focus:outline-none focus:border-green-500/30 whitespace-pre overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800"
                        placeholder="Enter Gemini API key..."
                    />
                </div>
            </div>

            <header className="w-full max-w-[500px] text-center my-8 px-4">
                <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                    Video Frame Capture
                </h1>
                <p className="text-lg text-gray-400 mt-2">
                    Capture, analyze, and edit video frames with AI.
                </p>
            </header>

            <main className="bg-gray-800 rounded-xl shadow-2xl p-4 w-full max-w-[500px] box-content">
                <div className="w-[500px] h-auto flex items-center justify-center">
                    {videoSrc ? (
                        <VideoPlayer 
                            src={videoSrc} videoRef={videoRef} isPlaying={isPlaying} currentTime={currentTime}
                            duration={duration} volume={volume} isMuted={isMuted} togglePlayPause={togglePlayPause}
                            handleSeek={handleSeek} handleVolumeChange={handleVolumeChange} toggleMute={toggleMute}
                            onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
                            onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata}
                            onEnded={() => setIsPlaying(false)} onSkipToEnd={handleSkipToEnd}
                        />
                    ) : (
                        <UploadPlaceholder onClick={handleUploadAreaClick} />
                    )}
                </div>
            </main>
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".mp4" className="hidden" />
            
            {error && (
                 <div role="alert" className="mt-4 bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg text-sm max-w-[500px] w-full text-center">
                    {error}
                </div>
            )}
            
            {videoSrc && (
                <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                        onClick={handleUploadAreaClick}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500"
                    >
                        Change Video
                    </button>
                    <button
                        onClick={handleCaptureFrame}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500"
                    >
                        Capture Frame
                    </button>
                </div>
            )}
            
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
                    />
                 ))}
            </div>

        </div>
    );
};

export default App;
