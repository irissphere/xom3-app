/**
 * Render Engine - Video Composition & Encoding
 * 
 * Orchestrates video rendering using Remotion-style composition
 * with FFmpeg for final encoding. Self-hosted for cost efficiency.
 */

import {
  RenderConfig,
  VideoJob,
  VideoAsset,
  ScriptSegment,
  CaptionStyle,
  DEFAULT_RENDER_CONFIG,
  DEFAULT_CAPTION_STYLE,
  VIDEO_COSTS,
  AspectRatio,
  VideoStyle,
} from './types';

export interface RenderRequest {
  jobId: string;
  audioUrl: string;
  audioDuration: number;
  segments: ScriptSegment[];
  style: VideoStyle;
  aspectRatio: AspectRatio;
  captionStyle?: CaptionStyle;
}

export interface RenderResult {
  outputUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSizeBytes: number;
  costCents: number;
}

export interface CompositionFrame {
  time: number;
  background: BackgroundConfig;
  captions: CaptionFrame[];
  effects: EffectConfig[];
}

export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'video' | 'image';
  value: string;
  animation?: 'none' | 'pulse' | 'zoom' | 'pan';
}

export interface CaptionFrame {
  text: string;
  x: number;
  y: number;
  opacity: number;
  scale: number;
  style: CaptionStyle;
}

export interface EffectConfig {
  type: 'fade' | 'blur' | 'glow' | 'particles';
  intensity: number;
  color?: string;
}

// Style presets with visual configurations
const STYLE_PRESETS: Record<VideoStyle, {
  background: BackgroundConfig;
  captionStyle: Partial<CaptionStyle>;
  effects: EffectConfig[];
}> = {
  minimal: {
    background: { type: 'solid', value: '#0a0a0a' },
    captionStyle: { 
      fontFamily: 'Inter', 
      color: '#ffffff',
      backgroundColor: undefined,
      animation: 'fade',
    },
    effects: [],
  },
  bold: {
    background: { type: 'gradient', value: 'linear-gradient(135deg, #1a1a2e, #16213e)' },
    captionStyle: { 
      fontFamily: 'Montserrat', 
      fontWeight: 900,
      color: '#ffcc00',
      animation: 'pop',
    },
    effects: [{ type: 'glow', intensity: 0.5, color: '#ffcc00' }],
  },
  corporate: {
    background: { type: 'gradient', value: 'linear-gradient(180deg, #1e3a5f, #0d1b2a)' },
    captionStyle: { 
      fontFamily: 'Open Sans', 
      fontWeight: 600,
      color: '#e2e8f0',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      animation: 'fade',
    },
    effects: [],
  },
  energetic: {
    background: { type: 'gradient', value: 'linear-gradient(45deg, #ff006e, #8338ec, #3a86ff)', animation: 'pulse' },
    captionStyle: { 
      fontFamily: 'Poppins', 
      fontWeight: 800,
      color: '#ffffff',
      animation: 'pop',
    },
    effects: [{ type: 'particles', intensity: 0.3 }],
  },
  cinematic: {
    background: { type: 'solid', value: '#000000' },
    captionStyle: { 
      fontFamily: 'Playfair Display', 
      fontWeight: 500,
      color: '#f8f8f8',
      position: 'center',
      animation: 'typewriter',
    },
    effects: [{ type: 'blur', intensity: 0.1 }],
  },
  social: {
    background: { type: 'gradient', value: 'linear-gradient(180deg, #0f0f0f, #1a1a1a)' },
    captionStyle: { 
      fontFamily: 'DM Sans', 
      fontWeight: 700,
      color: '#22d3ee',
      animation: 'pop',
    },
    effects: [{ type: 'glow', intensity: 0.3, color: '#22d3ee' }],
  },
};

/**
 * Calculate rendering cost based on duration
 */
export function calculateRenderCost(durationSeconds: number): number {
  const minutes = Math.ceil(durationSeconds / 60);
  return VIDEO_COSTS.BASE_FEE + (minutes * VIDEO_COSTS.RENDER_PER_MINUTE);
}

/**
 * Get render configuration for aspect ratio
 */
export function getRenderConfig(aspectRatio: AspectRatio): RenderConfig {
  return DEFAULT_RENDER_CONFIG[aspectRatio];
}

/**
 * Get style preset configuration
 */
export function getStylePreset(style: VideoStyle) {
  return STYLE_PRESETS[style];
}

/**
 * Generate composition frames from script segments
 */
export function generateComposition(
  segments: ScriptSegment[],
  totalDuration: number,
  style: VideoStyle,
  aspectRatio: AspectRatio,
  customCaptionStyle?: Partial<CaptionStyle>
): CompositionFrame[] {
  const preset = STYLE_PRESETS[style];
  const config = DEFAULT_RENDER_CONFIG[aspectRatio];
  const captionStyle: CaptionStyle = {
    ...DEFAULT_CAPTION_STYLE,
    ...preset.captionStyle,
    ...customCaptionStyle,
  };

  const frames: CompositionFrame[] = [];
  const fps = config.fps;
  const totalFrames = Math.ceil(totalDuration * fps);

  // Generate frames at key points (we don't need every frame for the composition plan)
  for (let frameNum = 0; frameNum < totalFrames; frameNum += fps) {
    const time = frameNum / fps;
    
    // Find active segment at this time
    const activeSegment = segments.find(
      s => time >= s.startTime && time < s.endTime
    );

    const captionProgress = activeSegment
      ? (time - activeSegment.startTime) / (activeSegment.endTime - activeSegment.startTime)
      : 0;

    const captions: CaptionFrame[] = activeSegment ? [{
      text: activeSegment.text,
      x: config.width / 2,
      y: getCaptionY(captionStyle.position, config.height),
      opacity: getCaptionOpacity(captionStyle.animation, captionProgress),
      scale: getCaptionScale(captionStyle.animation, captionProgress),
      style: captionStyle,
    }] : [];

    frames.push({
      time,
      background: preset.background,
      captions,
      effects: preset.effects,
    });
  }

  return frames;
}

/**
 * Get Y position for caption based on position setting
 */
function getCaptionY(position: CaptionStyle['position'], height: number): number {
  switch (position) {
    case 'top': return height * 0.15;
    case 'center': return height * 0.5;
    case 'bottom': return height * 0.85;
    default: return height * 0.85;
  }
}

/**
 * Get opacity based on animation and progress
 */
function getCaptionOpacity(animation: CaptionStyle['animation'], progress: number): number {
  switch (animation) {
    case 'fade':
      if (progress < 0.1) return progress * 10;
      if (progress > 0.9) return (1 - progress) * 10;
      return 1;
    case 'pop':
    case 'typewriter':
      if (progress < 0.05) return progress * 20;
      return 1;
    default:
      return 1;
  }
}

/**
 * Get scale based on animation and progress
 */
function getCaptionScale(animation: CaptionStyle['animation'], progress: number): number {
  switch (animation) {
    case 'pop':
      if (progress < 0.1) return 0.8 + (progress * 2);
      return 1;
    default:
      return 1;
  }
}

/**
 * Generate FFmpeg filter graph for the composition
 */
export function generateFFmpegFilters(
  composition: CompositionFrame[],
  config: RenderConfig
): string {
  const filters: string[] = [];

  // Base video filter
  filters.push(`scale=${config.width}:${config.height}`);
  filters.push(`fps=${config.fps}`);

  // Add format conversion
  filters.push('format=yuv420p');

  return filters.join(',');
}

/**
 * Generate FFmpeg command for rendering
 */
export function generateFFmpegCommand(
  audioPath: string,
  outputPath: string,
  config: RenderConfig,
  duration: number
): string[] {
  const args = [
    '-y', // Overwrite output
    '-f', 'lavfi',
    '-i', `color=c=black:s=${config.width}x${config.height}:d=${duration}`, // Black background
    '-i', audioPath, // Audio input
    '-c:v', config.codec === 'h264' ? 'libx264' : 'libx265',
    '-preset', config.quality === 'high' ? 'slow' : config.quality === 'medium' ? 'medium' : 'fast',
    '-crf', config.quality === 'high' ? '18' : config.quality === 'medium' ? '23' : '28',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    outputPath,
  ];

  return args;
}

/**
 * Main render function - orchestrates the full render pipeline
 */
export async function renderVideo(request: RenderRequest): Promise<RenderResult> {
  const { jobId, audioUrl, audioDuration, segments, style, aspectRatio, captionStyle } = request;
  
  // Get configurations
  const config = getRenderConfig(aspectRatio);
  const preset = getStylePreset(style);

  // Generate composition plan
  const composition = generateComposition(
    segments,
    audioDuration,
    style,
    aspectRatio,
    captionStyle
  );

  // In production, this would:
  // 1. Download audio from audioUrl
  // 2. Generate video frames using canvas/remotion
  // 3. Encode with FFmpeg
  // 4. Upload to storage
  // 5. Generate thumbnail

  // For now, return placeholder URLs
  // The actual implementation would use child_process to run FFmpeg
  // or integrate with a render service

  const outputUrl = `https://storage.xom3.ai/videos/${jobId}/output.mp4`;
  const thumbnailUrl = `https://storage.xom3.ai/videos/${jobId}/thumbnail.jpg`;
  
  // Calculate costs
  const costCents = calculateRenderCost(audioDuration);
  
  // Estimate file size (rough: 1MB per 10 seconds at medium quality)
  const fileSizeBytes = Math.ceil(audioDuration * 100000);

  return {
    outputUrl,
    thumbnailUrl,
    duration: audioDuration,
    fileSizeBytes,
    costCents,
  };
}

/**
 * Generate a thumbnail from a video timestamp
 */
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp: number = 0.5
): Promise<string> {
  // FFmpeg command to extract a frame
  const _args = [
    '-i', videoPath,
    '-ss', String(timestamp),
    '-vframes', '1',
    '-q:v', '2',
    outputPath,
  ];

  // In production: spawn FFmpeg process
  return outputPath;
}

/**
 * Get video duration using FFprobe
 */
export async function getVideoDuration(_videoPath: string): Promise<number> {
  // In production: use FFprobe to get actual duration
  // For now, return placeholder
  return 60;
}

/**
 * Validate render request
 */
export function validateRenderRequest(request: Partial<RenderRequest>): string[] {
  const errors: string[] = [];

  if (!request.jobId) errors.push('jobId is required');
  if (!request.audioUrl) errors.push('audioUrl is required');
  if (!request.audioDuration || request.audioDuration <= 0) errors.push('audioDuration must be positive');
  if (!request.segments || request.segments.length === 0) errors.push('segments are required');
  if (!request.style) errors.push('style is required');
  if (!request.aspectRatio) errors.push('aspectRatio is required');

  return errors;
}















