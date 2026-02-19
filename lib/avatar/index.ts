/**
 * Avatar Generation Pipeline
 * 
 * In-house talking head / AI avatar video generation
 * 
 * Stack:
 * - XTTS v2: Voice cloning from samples
 * - SadTalker: Lip-sync animation from photo
 * - GFPGAN: Face enhancement
 * - FFmpeg: Final composition
 * 
 * Architecture:
 * ┌─────────────────┐     dispatch      ┌─────────────────┐
 * │   xom3.io       │ ────────────────▶ │  GPU Worker     │
 * │   (Vercel)      │                   │  (RunPod)       │
 * │                 │ ◀──────────────── │                 │
 * └─────────────────┘     callback      └─────────────────┘
 * 
 * Cost per video: ~$0.02-0.05 (compute)
 * User charge: $0.75
 * Margin: ~95%
 */

// Types
export * from './types';

// Worker client
export {
  isAvatarWorkerAvailable,
  getAvatarWorkerStatus,
  dispatchAvatarJob,
  createVoiceProfile,
  createFaceProfile,
  listVoiceProfiles,
  listFaceProfiles,
} from './worker-client';















