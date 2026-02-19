/**
 * Video Generation Pipeline - Type Definitions
 * 
 * In-house video generation: Script → Voice → Render → Final MP4
 * Estimated cost per video: $0.03-0.05 | Charge to user: $0.25 (~85% margin)
 */

export type VideoStatus = 
  | 'queued'
  | 'generating_audio'
  | 'rendering'
  | 'encoding'
  | 'uploading'
  | 'completed'
  | 'failed';

export type VideoStyle = 
  | 'minimal'
  | 'bold'
  | 'corporate'
  | 'energetic'
  | 'cinematic'
  | 'social';

export type VoiceId = 
  | 'alloy'     // OpenAI TTS voices
  | 'echo'
  | 'fable'
  | 'onyx'
  | 'nova'
  | 'shimmer';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface VideoJob {
  id: string;
  tenantId: string;
  status: VideoStatus;
  progress: number; // 0-100

  // Input
  script: string;
  style: VideoStyle;
  voice: VoiceId;
  duration: number; // target duration in seconds
  aspectRatio: AspectRatio;

  // Metadata for extensibility
  metadata?: Record<string, any>;
  
  // Generated assets
  audioUrl?: string;
  audioDuration?: number;
  
  // Output
  outputUrl?: string;
  thumbnailUrl?: string;
  
  // Cost tracking
  costCents: number;
  
  // Error handling
  error?: string;
  retryCount: number;
  
  // Timestamps
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  codec: 'h264' | 'h265';
  quality: 'low' | 'medium' | 'high';
  outputFormat: 'mp4' | 'webm';
}

export interface VideoAsset {
  id: string;
  type: 'audio' | 'video' | 'image' | 'music' | 'font';
  url: string;
  duration?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ScriptSegment {
  text: string;
  startTime: number;
  endTime: number;
  emphasis?: 'normal' | 'strong' | 'soft';
}

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  backgroundColor?: string;
  position: 'bottom' | 'center' | 'top';
  animation: 'none' | 'fade' | 'pop' | 'typewriter';
}

export interface VideoTemplate {
  id: string;
  name: string;
  style: VideoStyle;
  aspectRatio: AspectRatio;
  renderConfig: RenderConfig;
  captionStyle: CaptionStyle;
  defaultVoice: VoiceId;
  backgroundType: 'solid' | 'gradient' | 'video' | 'image';
  backgroundValue: string;
}

export interface GenerateVideoRequest {
  script: string;
  style?: VideoStyle;
  voice?: VoiceId;
  duration?: number;
  aspectRatio?: AspectRatio;
  templateId?: string;
}

export interface VideoStatusResponse {
  jobId: string;
  status: VideoStatus;
  progress: number;
  downloadUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  estimatedTimeRemaining?: number;
}

// Default configurations
export const DEFAULT_RENDER_CONFIG: Record<AspectRatio, RenderConfig> = {
  '16:9': { width: 1920, height: 1080, fps: 30, codec: 'h264', quality: 'high', outputFormat: 'mp4' },
  '9:16': { width: 1080, height: 1920, fps: 30, codec: 'h264', quality: 'high', outputFormat: 'mp4' },
  '1:1': { width: 1080, height: 1080, fps: 30, codec: 'h264', quality: 'high', outputFormat: 'mp4' },
  '4:5': { width: 1080, height: 1350, fps: 30, codec: 'h264', quality: 'high', outputFormat: 'mp4' },
};

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontFamily: 'Inter',
  fontSize: 48,
  fontWeight: 700,
  color: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  position: 'bottom',
  animation: 'pop',
};

// Cost constants (in cents)
export const VIDEO_COSTS = {
  TTS_PER_1K_CHARS: 1.5,      // $0.015 per 1K characters (OpenAI TTS)
  RENDER_PER_MINUTE: 2,       // $0.02 per minute of video (compute)
  STORAGE_PER_GB: 2,          // $0.02 per GB stored
  BASE_FEE: 1,                // $0.01 base fee per video
  USER_CHARGE: 25,            // $0.25 charged to user
};















