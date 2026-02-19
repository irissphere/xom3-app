/**
 * SpaceBaddie API Client
 * Handles video generation using RunPod GPU workers
 */

export interface SpaceBaddieVideoRequest {
  imageUrl?: string;
  script?: string;
  voiceStyle?: 'natural' | 'energetic' | 'professional' | 'friendly' | 'calm' | string;
  duration?: number;
  aspectRatio?: '9:16' | '16:9' | '1:1' | string;
  effects?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    hue?: number;
    blur?: number;
    vignette?: number;
  };
  music?: string | boolean;
  cameraMovement?: string;
  lensType?: string;
  textOverlay?: any;
  photoAsset?: any;
  videoSuggestion?: any;
  [key: string]: any;
}

export interface SpaceBaddieVideoResponse {
  id: string;
  jobId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'queued' | 'demo';
  mode?: 'production' | 'demo';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: string;
  progress?: number;
  videoAsset?: {
    url: string;
    thumbnailUrl?: string;
    duration?: number;
  };
  error?: string;
  pollUrl?: string;
  [key: string]: any;
}

export interface VideoCompletionOptions {
  pollInterval?: number;
  maxAttempts?: number;
  onProgress?: (status: { progress: number; status?: string }) => void;
}

class SpaceBaddieClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    this.baseUrl = '/api/spacebaddie';
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `SpaceBaddie API error: ${response.statusText}`);
    }

    return data;
  }

  /**
   * Generate a video from an image
   */
  async generateVideo(request: SpaceBaddieVideoRequest): Promise<SpaceBaddieVideoResponse> {
    console.log('[SpaceBaddie] Generating video with request:', request);
    
    const response = await this.fetch<SpaceBaddieVideoResponse>('/video', {
      method: 'POST',
      body: JSON.stringify({
        imageUrl: request.imageUrl || request.photoAsset?.url,
        script: request.script,
        voiceStyle: request.voiceStyle,
        duration: request.duration,
        aspectRatio: request.aspectRatio,
        effects: request.effects,
        music: request.music,
      }),
    });
    
    return response;
  }

  /**
   * Create video from photo (alias for generateVideo)
   */
  async createPhotoToVideo(request: SpaceBaddieVideoRequest): Promise<SpaceBaddieVideoResponse> {
    return this.generateVideo({
      ...request,
      imageUrl: request.photoAsset?.url || request.imageUrl,
    });
  }

  /**
   * Poll for video completion
   */
  async waitForVideoCompletion(
    jobId: string, 
    options: VideoCompletionOptions = {}
  ): Promise<SpaceBaddieVideoResponse> {
    const { pollInterval = 2000, maxAttempts = 60, onProgress } = options;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.fetch<SpaceBaddieVideoResponse>(`/video?jobId=${jobId}`);
        
        // Report progress
        onProgress?.({ 
          progress: response.progress || Math.min(attempt * 5, 95), 
          status: response.status 
        });
        
        // Check if complete or failed
        if (response.status === 'completed') {
          onProgress?.({ progress: 100, status: 'completed' });
          return response;
        }
        
        if (response.status === 'failed') {
          throw new Error(response.error || 'Video generation failed');
        }
        
        // Demo mode - simulate completion
        if (response.status === 'demo' || response.mode === 'demo') {
          // Simulate progress for demo
          for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, pollInterval / 10));
            onProgress?.({ progress: i, status: i < 100 ? 'processing' : 'completed' });
          }
          
          return {
            ...response,
            id: response.id || jobId,
            status: 'completed',
            progress: 100,
            videoUrl: '/demo-video.mp4',
            thumbnailUrl: '/demo-thumbnail.jpg',
            videoAsset: {
              url: '/demo-video.mp4',
              thumbnailUrl: '/demo-thumbnail.jpg',
              duration: 15,
            },
          };
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error('[SpaceBaddie] Poll error:', error);
        if (attempt >= maxAttempts - 1) throw error;
      }
    }
    
    throw new Error('Video generation timed out');
  }

  /**
   * Get status of a video job
   */
  async getVideoStatus(videoId: string): Promise<SpaceBaddieVideoResponse> {
    return this.fetch<SpaceBaddieVideoResponse>(`/video?jobId=${videoId}`);
  }

  /**
   * Check if the video generation service is available
   */
  async checkServiceStatus(): Promise<{
    available: boolean;
    mode: 'production' | 'demo';
    pricing?: { perVideo: { cents: number; formatted: string } };
  }> {
    try {
      const response = await this.fetch<any>('/video?action=status');
      return {
        available: response.worker?.available || false,
        mode: response.worker?.available ? 'production' : 'demo',
        pricing: response.pricing,
      };
    } catch {
      return { available: false, mode: 'demo' };
    }
  }

  /**
   * Upload an image file and get a URL
   */
  async uploadImage(file: File): Promise<{ url: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * List user's generated videos
   */
  async listVideos(): Promise<SpaceBaddieVideoResponse[]> {
    // TODO: Implement when user accounts are ready
    return [];
  }
}

export const spaceBaddieClient = new SpaceBaddieClient();
