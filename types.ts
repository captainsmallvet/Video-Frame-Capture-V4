
export interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  status: 'completed' | 'processing' | 'failed';
}

export enum VideoAspectRatio {
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16'
}

export enum VideoResolution {
  P720 = '720p',
  P1080 = '1080p'
}

export interface VideoConfig {
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
}

// Global aistudio type declarations are removed because they are pre-configured
// in the execution context, causing duplicate identifier errors when redeclared.
