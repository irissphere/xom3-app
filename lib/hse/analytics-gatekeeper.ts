// HSE Phase II - Analytics Gatekeeper
// Pauses expensive analytics when system is under pressure

import { getCurrentHyperstateLevel } from './hyperstate-context';

let analyticsPaused = false;
let pauseReason: string | null = null;
let pauseStartedAt: number | null = null;

/**
 * Check if analytics should be paused
 */
export async function shouldPauseAnalytics(): Promise<{
  paused: boolean;
  reason?: string;
}> {
  const level = await getCurrentHyperstateLevel();
  
  if (level === 'CRITICAL' || level === 'DEGRADED') {
    if (!analyticsPaused) {
      analyticsPaused = true;
      pauseReason = `System in ${level} state - pausing expensive analytics`;
      pauseStartedAt = Date.now();
    }
    return {
      paused: true,
      reason: pauseReason || undefined,
    };
  }

  // Re-enable when system recovers
  if (analyticsPaused && (level === 'NOMINAL' || level === 'RECOVERY_MODE')) {
    analyticsPaused = false;
    pauseReason = null;
    pauseStartedAt = null;
  }

  return { paused: false };
}

/**
 * Get analytics pause status
 */
export function getAnalyticsPauseStatus(): {
  paused: boolean;
  reason: string | null;
  pausedSince: number | null;
} {
  return {
    paused: analyticsPaused,
    reason: pauseReason,
    pausedSince: pauseStartedAt,
  };
}

/**
 * Force pause analytics (for testing)
 */
export function forcePauseAnalytics(reason: string): void {
  analyticsPaused = true;
  pauseReason = reason;
  pauseStartedAt = Date.now();
}

/**
 * Force resume analytics (for testing)
 */
export function forceResumeAnalytics(): void {
  analyticsPaused = false;
  pauseReason = null;
  pauseStartedAt = null;
}
