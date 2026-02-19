// 🌌 STRIKE 5: Replace Schedules With Rhythms
// Circadian cycles instead of cron-style timing

import { Rhythm } from "./types";

/**
 * Get current cycle based on time
 */
export function getCurrentCycle(): "dawn" | "midday" | "dusk" | "midnight" {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 12) return "dawn";
  if (hour >= 12 && hour < 18) return "midday";
  if (hour >= 18 && hour < 24) return "dusk";
  return "midnight";
}

/**
 * Calculate cycle phase
 */
export function calculateCyclePhase(cycle: Rhythm["cycle"]): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  let cycleStart = 0;
  let cycleEnd = 0;

  switch (cycle) {
    case "dawn":
      cycleStart = 6;
      cycleEnd = 12;
      break;
    case "midday":
      cycleStart = 12;
      cycleEnd = 18;
      break;
    case "dusk":
      cycleStart = 18;
      cycleEnd = 24;
      break;
    case "midnight":
      cycleStart = 0;
      cycleEnd = 6;
      break;
  }

  const cycleDuration = cycleEnd - cycleStart;
  const currentHour = hour + (minute / 60);
  const phase = ((currentHour - cycleStart) / cycleDuration) % 1.0;

  return Math.max(0, Math.min(1, phase));
}

/**
 * Create rhythm for cycle
 */
export function createRhythm(cycle: Rhythm["cycle"]): Rhythm {
  const behaviors: string[] = [];
  let priorities: Record<string, number> = {};
  let optimizations: Record<string, any> = {};

  switch (cycle) {
    case "dawn":
      behaviors.push("adapt", "predict", "balance");
      priorities = {
        throughput: 0.9,
        accuracy: 0.8,
        stability: 0.7
      };
      optimizations = {
        flowVelocity: 1.2,
        attractorStrength: 1.0
      };
      break;

    case "midday":
      behaviors.push("rewrite", "expand", "harmonize");
      priorities = {
        throughput: 1.0,
        accuracy: 0.9,
        stability: 0.8
      };
      optimizations = {
        flowVelocity: 1.5,
        attractorStrength: 1.1
      };
      break;

    case "dusk":
      behaviors.push("protect", "balance", "harmonize");
      priorities = {
        throughput: 0.8,
        accuracy: 0.9,
        stability: 1.0
      };
      optimizations = {
        flowVelocity: 1.0,
        attractorStrength: 1.0
      };
      break;

    case "midnight":
      behaviors.push("predict", "protect", "adapt");
      priorities = {
        throughput: 0.7,
        accuracy: 0.95,
        stability: 1.0
      };
      optimizations = {
        flowVelocity: 0.8,
        attractorStrength: 0.9
      };
      break;
  }

  const phase = calculateCyclePhase(cycle);
  const cycleDuration = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  const nextTransition = new Date(Date.now() + (cycleDuration * (1 - phase))).toISOString();

  return {
    id: `rhythm-${cycle}-${Date.now()}`,
    cycle,
    phase,
    behaviors,
    priorities,
    optimizations,
    duration: cycleDuration,
    nextTransition
  };
}

/**
 * Initialize all rhythms
 */
export function initializeRhythms(): Rhythm[] {
  return [
    createRhythm("dawn"),
    createRhythm("midday"),
    createRhythm("dusk"),
    createRhythm("midnight")
  ];
}

/**
 * Get active rhythm
 */
export function getActiveRhythm(rhythms: Rhythm[]): Rhythm {
  const currentCycle = getCurrentCycle();
  return rhythms.find(r => r.cycle === currentCycle) || rhythms[0];
}
