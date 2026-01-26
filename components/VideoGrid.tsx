
import React from 'react';
import { GeneratedVideo } from '../types';

interface VideoGridProps {
  videos: GeneratedVideo[];
  onPlay: (video: GeneratedVideo) => void;
}

const VideoGrid: React.FC<VideoGridProps> = ({ videos, onPlay }) => {
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-white mb-2">No videos yet</h3>
        <p className="text-zinc-500">Generate your first cinematic masterpiece above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <div 
          key={video.id}
          className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer"
          onClick={() => onPlay(video)}
        >
          <div className="aspect-video bg-black flex items-center justify-center">
             <video 
              src={video.url} 
              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
              muted
              onMouseOver={(e) => {
                const v = e.target as HTMLVideoElement;
                v.play().catch(() => {});
              }}
              onMouseOut={(e) => {
                const v = e.target as HTMLVideoElement;
                v.pause();
                v.currentTime = 0;
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:scale-110 transition-transform">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-white line-clamp-2 font-medium mb-2">{video.prompt}</p>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              <span>{new Date(video.timestamp).toLocaleDateString()}</span>
              <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">VE 3.1 Fast</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideoGrid;
