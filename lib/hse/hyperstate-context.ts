import type { HyperstateLevel } from './hyperstate-types';
import { evaluateHyperstateWithTransition } from './hyperstate-transition';

let cachedLevel: HyperstateLevel = 'NOMINAL';
let lastCheck = 0;
const CHECK_INTERVAL_MS = 10_000; // 10 seconds

export async function getCurrentHyperstateLevel(): Promise<HyperstateLevel> {
  const now = Date.now();
  if (now - lastCheck > CHECK_INTERVAL_MS) {
    const { snapshot } = await evaluateHyperstateWithTransition();
    cachedLevel = snapshot.level;
    lastCheck = now;
  }
  return cachedLevel;
}

export function isElevatedOrWorse(level: HyperstateLevel): boolean {
  return level === 'ELEVATED_LOAD' || level === 'DEGRADED' || level === 'CRITICAL';
}
