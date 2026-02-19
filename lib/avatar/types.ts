/**
 * Avatar Generation Pipeline - Type Definitions
 * 
 * In-house avatar/talking head video generation
 * Uses: XTTS v2 (voice clone) + SadTalker (lip sync)
 */

export type AvatarStatus = 
  | 'queued'
  | 'cloning_voice'
  | 'animating_face'
  | 'composing'
  | 'uploading'
  | 'completed'
  | 'failed';

export type AvatarStyle = 
  | 'professional'
  | 'casual'
  | 'energetic'
  | 'calm'
  | 'social';

export interface AvatarJob {
  id: string;
  tenantId: string;
  status: AvatarStatus;
  progress: number;
  
  // Input
  script: string;
  voiceId: string;
  faceId: string;
  style: AvatarStyle;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  enhanceFace: boolean;
  
  // Output
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  
  // Cost
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

export interface VoiceProfile {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  sampleCount: number;
  createdAt: string;
}

export interface FaceProfile {
  id: string;
  tenantId: string;
  name: string;
  imageUrl: string;
  createdAt: string;
}

export interface GenerateAvatarRequest {
  script: string;
  voiceId: string;
  faceId: string;
  style?: AvatarStyle;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5';
  enhanceFace?: boolean;
  
  // Cinematic LTX-2 additions
  sceneType?: string;
  isDraft?: boolean;
  seed?: number;
  parentJobId?: string;
}

export interface CreateVoiceRequest {
  name: string;
  samples: string[]; // base64 encoded audio samples
  description?: string;
}

export interface CreateFaceRequest {
  name: string;
  image: string; // base64 encoded image
}

export interface AvatarStatusResponse {
  jobId: string;
  status: AvatarStatus;
  progress: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  estimatedTimeRemaining?: number;
}

// Cost constants
export const AVATAR_COSTS = {
  VOICE_CLONE_PER_VIDEO: 2,    // $0.02 voice cloning
  FACE_ANIMATION_PER_SEC: 0.5, // $0.005 per second of animation
  ENHANCEMENT_PER_VIDEO: 1,    // $0.01 face enhancement
  BASE_FEE: 2,                 // $0.02 base
  USER_CHARGE: 75,             // $0.75 per avatar video
};

// Estimated processing times (seconds)
export const AVATAR_TIMING = {
  VOICE_CLONE: 10,
  ANIMATION_PER_SEC: 2, // 2 sec processing per 1 sec video
  ENHANCEMENT: 15,
  UPLOAD: 5,
};















