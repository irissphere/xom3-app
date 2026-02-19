import {
  createTalkingVideo as createHeyGenVideo,
  getVideoStatus as getHeyGenVideoStatus,
  isHeyGenAvailable,
  type HeyGenVideoRequest,
} from '@/lib/heygen/client';

export type AvatarProviderId = 'heygen';

export interface AvatarVideoRequest {
  imageUrl?: string;
  script: string;
  voiceId?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  avatarId?: string;
  expression?: 'default' | 'happy' | 'serious' | 'friendly';
  useAvatarIV?: boolean;
}

export interface AvatarVideoResult {
  success: boolean;
  provider: AvatarProviderId;
  videoId?: string;
  error?: string;
}

export interface AvatarStatusResult {
  status: 'pending' | 'waiting' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

const DEFAULT_PROVIDER: AvatarProviderId = 'heygen';

export function getDefaultAvatarProvider(): AvatarProviderId {
  return DEFAULT_PROVIDER;
}

export function isAvatarProviderAvailable(provider: AvatarProviderId): boolean {
  if (provider === 'heygen') return isHeyGenAvailable();
  return false;
}

export async function createAvatarVideo(
  request: AvatarVideoRequest,
  provider: AvatarProviderId = DEFAULT_PROVIDER
): Promise<AvatarVideoResult> {
  if (provider === 'heygen') {
    const heygenRequest: HeyGenVideoRequest = {
      imageUrl: request.imageUrl || '',
      script: request.script,
      voiceId: request.voiceId,
      aspectRatio: request.aspectRatio,
      avatarId: request.avatarId,
      expression: request.expression,
      useAvatarIV: request.useAvatarIV,
    };
    const result = await createHeyGenVideo(heygenRequest);
    return {
      success: result.success,
      provider: 'heygen',
      videoId: result.videoId,
      error: result.error,
    };
  }

  return {
    success: false,
    provider,
    error: `Unsupported provider: ${provider}`,
  };
}

export async function getAvatarVideoStatus(
  provider: AvatarProviderId,
  videoId: string
): Promise<AvatarStatusResult> {
  if (provider === 'heygen') {
    return getHeyGenVideoStatus(videoId);
  }

  return { status: 'failed', error: `Unsupported provider: ${provider}` };
}
