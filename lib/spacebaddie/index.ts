/**
 * SpaceBaddie Module Index
 * Central export for all SpaceBaddie types, hooks, and utilities
 * AKV: SpaceBaddie Sovereign
 */

// Types
export * from './types';

// Data Hooks
export {
  useSpaceBaddieMetrics,
  useAvatarProfile,
  useSocialConnections,
  usePostingQueue,
  useDeviceTracking,
  type SpaceBaddieMetrics,
  type AvatarProfile,
  type RenderHistoryItem,
  type PlatformConnection,
  type QueueItem,
  type DeviceStatus,
} from './useSpaceBaddieData';
