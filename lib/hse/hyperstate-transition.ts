import type { HyperstateLevel, HyperstateSnapshot } from './hyperstate-types';
import { getCurrentHyperstate } from './hyperstate-engine';
import { executeRecoveryRoutines } from './recovery-routines';
import { recordPredictionActualization } from './hyperstate-prediction';

let lastSnapshot: HyperstateSnapshot | null = null;

export interface HyperstateTransition {
  from: HyperstateLevel | null;
  to: HyperstateLevel;
  at: string;
  reasonNotes: string[];
}

const transitions: HyperstateTransition[] = [];

export async function evaluateHyperstateWithTransition(): Promise<{
  snapshot: HyperstateSnapshot;
  transition: HyperstateTransition | null;
}> {
  const snapshot = await getCurrentHyperstate();

  const previousLevel = lastSnapshot?.level ?? null;
  let transition: HyperstateTransition | null = null;

  if (!lastSnapshot || previousLevel !== snapshot.level) {
    transition = {
      from: previousLevel,
      to: snapshot.level,
      at: snapshot.computedAt,
      reasonNotes: snapshot.notes ?? [],
    };
    transitions.push(transition);

    // HSE Phase II: Auto-trigger recovery routines when transitioning to RECOVERY_MODE
    if (snapshot.level === 'RECOVERY_MODE' && (previousLevel === 'CRITICAL' || previousLevel === 'DEGRADED')) {
      // Execute recovery routines asynchronously (don't block transition)
      executeRecoveryRoutines().catch(error => {
        console.error('[HSE] Recovery routines failed:', error);
      });
    }

    // HSE Phase II: Record prediction actualization
    // Check if any recent predictions were accurate
    const { getRecentPredictions } = await import('./hyperstate-prediction');
    const recentPredictions = getRecentPredictions(10);
    recentPredictions.forEach(pred => {
      if (pred.targetLevel === snapshot.level && pred.type === 'transition') {
        recordPredictionActualization(pred, true, snapshot.level);
      }
    });
  }

  lastSnapshot = snapshot;

  return { snapshot, transition };
}

export function getHyperstateTransitions(limit = 50): HyperstateTransition[] {
  return transitions.slice(-limit);
}
