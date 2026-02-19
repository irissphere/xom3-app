/**
 * Video Generation Pipeline
 * 
 * In-house video generation: Script → Voice → Render → Final MP4
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    VIDEO GENERATION PIPELINE                     │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
 * │  │   Script    │───▶│   Voice     │───▶│   Video     │         │
 * │  │  Generator  │    │  Synthesis  │    │  Renderer   │         │
 * │  └─────────────┘    └─────────────┘    └─────────────┘         │
 * │        │                   │                  │                 │
 * │        ▼                   ▼                  ▼                 │
 * │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
 * │  │   Hooks,    │    │   Audio     │    │   Final     │         │
 * │  │   Captions  │    │   File      │    │   MP4       │         │
 * │  └─────────────┘    └─────────────┘    └─────────────┘         │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * Costs:
 * - OpenAI TTS: $0.015/1K chars (~$0.02 per 60s video)
 * - Render: ~$0.01 compute per minute
 * - Total: $0.03-0.05 per video
 * - User charge: $0.25 (~85% margin)
 */

// Types
export * from './types';

// Voice synthesis
export {
  generateSpeech,
  generateSpeechHD,
  estimateDuration,
  calculateTTSCost,
  segmentScript,
  VOICE_INFO,
  type TTSRequest,
  type TTSResponse,
} from './voice-synthesis';

// Render engine
export {
  renderVideo,
  generateComposition,
  getRenderConfig,
  getStylePreset,
  calculateRenderCost,
  generateThumbnail,
  validateRenderRequest,
  type RenderRequest,
  type RenderResult,
  type CompositionFrame,
} from './render-engine';

// Job queue
export {
  createVideoJob,
  getVideoJob,
  startJob,
  estimateVideoCost,
  listJobs,
  getJobsByStatus,
  retryJob,
  cancelJob,
} from './job-queue';

// Worker client (for dispatching to Hostinger)
export {
  dispatchToWorker,
  isWorkerAvailable,
  getWorkerStatus,
  getWorkerJobStatus,
  type DispatchJobRequest,
  type DispatchResult,
} from './worker-client';

