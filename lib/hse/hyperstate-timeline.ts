// HSE Phase II - Hyperstate Timeline
// Visual replay of system mood over time

import { getHyperstateTransitions } from './hyperstate-transition';
import { evaluateHyperstateWithTransition } from './hyperstate-transition';
import type { HyperstateLevel } from './hyperstate-types';

export interface TimelinePoint {
  timestamp: number;
  level: HyperstateLevel;
  duration: number; // milliseconds in this state
  signals: {
    automationQueueDepth: number;
    deadLetterCount: number;
    slowOperationScore: number;
    consistencyIssueCount: number;
    driftScore: number;
    usagePressureScore: number;
    cacheHitRate: number;
    backgroundWorkerLoad: number;
  };
  transition?: {
    from: HyperstateLevel | null;
    reason: string;
  };
}

export interface TimelineSegment {
  level: HyperstateLevel;
  startTime: number;
  endTime: number;
  duration: number;
  points: TimelinePoint[];
  pressureSpikes: number;
  recoveryArcs: number;
}

export interface HyperstateTimeline {
  segments: TimelineSegment[];
  totalDuration: number;
  levelDistribution: Record<HyperstateLevel, number>; // milliseconds
  transitions: number;
  criticalEvents: number;
  recoveryEvents: number;
  generatedAt: string;
}

// In-memory timeline storage (last 24 hours)
const timelinePoints: TimelinePoint[] = [];
const MAX_POINTS = 1000; // ~1 point per minute for 16+ hours
const TIMELINE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Record a timeline point
 */
export async function recordTimelinePoint(): Promise<TimelinePoint> {
  const { snapshot, transition } = await evaluateHyperstateWithTransition();
  
  // Calculate duration in current state
  const lastPoint = timelinePoints[timelinePoints.length - 1];
  const duration = lastPoint && lastPoint.level === snapshot.level
    ? Date.now() - lastPoint.timestamp
    : 0;

  const point: TimelinePoint = {
    timestamp: Date.now(),
    level: snapshot.level,
    duration,
    signals: snapshot.signals,
    transition: transition ? {
      from: transition.from,
      reason: transition.reasonNotes.join('; ') || 'State transition',
    } : undefined,
  };

  timelinePoints.push(point);

  // Trim old points
  const cutoff = Date.now() - TIMELINE_WINDOW_MS;
  while (timelinePoints.length > 0 && timelinePoints[0].timestamp < cutoff) {
    timelinePoints.shift();
  }

  // Limit total points
  if (timelinePoints.length > MAX_POINTS) {
    timelinePoints.shift();
  }

  return point;
}

/**
 * Build timeline segments from points
 */
function buildTimelineSegments(points: TimelinePoint[]): TimelineSegment[] {
  if (points.length === 0) return [];

  const segments: TimelineSegment[] = [];
  let currentSegment: TimelineSegment | null = null;

  for (const point of points) {
    if (!currentSegment || currentSegment.level !== point.level) {
      // Start new segment
      if (currentSegment) {
        currentSegment.endTime = point.timestamp;
        currentSegment.duration = currentSegment.endTime - currentSegment.startTime;
        segments.push(currentSegment);
      }

      currentSegment = {
        level: point.level,
        startTime: point.timestamp,
        endTime: point.timestamp,
        duration: 0,
        points: [point],
        pressureSpikes: 0,
        recoveryArcs: 0,
      };
    } else {
      // Continue current segment
      currentSegment.points.push(point);
      currentSegment.endTime = point.timestamp;
    }

    // Detect pressure spikes (high signal values)
    const maxSignal = Math.max(
      point.signals.automationQueueDepth,
      point.signals.deadLetterCount,
      point.signals.slowOperationScore,
      point.signals.usagePressureScore,
      point.signals.backgroundWorkerLoad
    );
    if (maxSignal > 70) {
      currentSegment.pressureSpikes++;
    }

    // Detect recovery arcs (transitioning from worse to better)
    if (point.transition) {
      const from = point.transition.from;
      const to = point.level;
      if (from === 'CRITICAL' && (to === 'DEGRADED' || to === 'RECOVERY_MODE')) {
        currentSegment.recoveryArcs++;
      } else if (from === 'DEGRADED' && (to === 'ELEVATED_LOAD' || to === 'RECOVERY_MODE')) {
        currentSegment.recoveryArcs++;
      }
    }
  }

  // Close last segment
  if (currentSegment) {
    currentSegment.duration = currentSegment.endTime - currentSegment.startTime;
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Generate complete timeline
 */
export function generateHyperstateTimeline(): HyperstateTimeline {
  const points = [...timelinePoints];
  const segments = buildTimelineSegments(points);
  const transitions = getHyperstateTransitions(1000);

  // Calculate level distribution
  const levelDistribution: Record<HyperstateLevel, number> = {
    NOMINAL: 0,
    ELEVATED_LOAD: 0,
    DEGRADED: 0,
    CRITICAL: 0,
    RECOVERY_MODE: 0,
  };

  segments.forEach(seg => {
    levelDistribution[seg.level] += seg.duration;
  });

  const totalDuration = segments.length > 0
    ? segments[segments.length - 1].endTime - segments[0].startTime
    : 0;

  const criticalEvents = segments.filter(s => s.level === 'CRITICAL').length;
  const recoveryEvents = segments.filter(s => s.level === 'RECOVERY_MODE').length;

  return {
    segments,
    totalDuration,
    levelDistribution,
    transitions: transitions.length,
    criticalEvents,
    recoveryEvents,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get timeline for a specific time range
 */
export function getTimelineRange(startTime: number, endTime: number): TimelinePoint[] {
  return timelinePoints.filter(
    p => p.timestamp >= startTime && p.timestamp <= endTime
  );
}

/**
 * Get recent timeline (last N minutes)
 */
export function getRecentTimeline(minutes: number = 60): TimelinePoint[] {
  const cutoff = Date.now() - (minutes * 60 * 1000);
  return timelinePoints.filter(p => p.timestamp >= cutoff);
}
