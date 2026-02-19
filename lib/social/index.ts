/**
 * Social Lane Library
 * 
 * Core exports for the social + YouTube lane.
 */

// Types
export * from "./types";

// Signal Emitters
export {
  emitSocialSignal,
  emitPostCreated,
  emitPostScheduled,
  emitPostPublished,
  emitPostFailed,
  emitPostCancelled,
  emitVideoUploaded,
  emitVideoScheduled,
  emitVideoPublished,
  emitVideoFailed,
  emitQueuePressure,
  emitEngagementSpike,
  emitEngagementDrop,
  emitBulkStatusChange,
  generateSignalSummary
} from "./signals";
