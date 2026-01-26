import { GoogleGenAI } from "@google/genai";
import { VideoAspectRatio, VideoResolution } from "../types";

/**
 * Generates a video using the Veo model.
 * Strictly uses process.env.API_KEY which is injected by the environment.
 */
export const generateVideo = async (
  prompt: string, 
  aspectRatio: VideoAspectRatio = VideoAspectRatio.LANDSCAPE,
  resolution: VideoResolution = VideoResolution.P1080
): Promise<string> => {
  const activeKey = process.env.API_KEY;
  
  if (!activeKey) {
    throw new Error("API_KEY_MISSING");
  }

  // Guideline: Create a new GoogleGenAI instance right before making an API call 
  // to ensure it always uses the most up-to-date API key from the selection dialog.
  const ai = new GoogleGenAI({ apiKey: activeKey });
  
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio
      }
    });

    // Poll for video completion as per Veo generation guidelines
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("No video URI returned from the API.");
    }

    // Guideline: Append API key when fetching from the download link
    const fetchUrl = `${downloadLink}&key=${activeKey}`;
    const response = await fetch(fetchUrl);
    
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error("API_KEY_INVALID");
        if (response.status === 429) throw new Error("API_QUOTA_EXCEEDED");
        throw new Error(`Fetch failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error: any) {
    console.error("Video generation failed:", error);
    const msg = error.message?.toLowerCase() || "";
    // Guideline: Handle specific error for re-selecting API key
    if (msg.includes("requested entity was not found")) {
      throw new Error("Requested entity was not found.");
    }
    if (msg.includes("unauthorized") || msg.includes("api key not valid") || msg.includes("401") || msg.includes("403")) {
      throw new Error("API_KEY_INVALID");
    }
    if (msg.includes("quota") || msg.includes("429")) {
      throw new Error("API_QUOTA_EXCEEDED");
    }
    throw error;
  }
};