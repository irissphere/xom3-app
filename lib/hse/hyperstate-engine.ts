import type { HyperstateLevel, HyperstateSnapshot } from './hyperstate-types';
import { collectHyperstateSignals } from './hyperstate-signals';

function evaluateHyperstateLevel(signals: Awaited<ReturnType<typeof collectHyperstateSignals>>): HyperstateLevel {
  const {
    automationQueueDepth,
    deadLetterCount,
    slowOperationScore,
    consistencyIssueCount,
    driftScore,
    usagePressureScore,
    backgroundWorkerLoad,
  } = signals;

  // CRITICAL conditions
  if (
    deadLetterCount > 20 ||
    consistencyIssueCount > 50 ||
    driftScore > 80
  ) {
    return 'CRITICAL';
  }

  // DEGRADED conditions
  if (
    slowOperationScore > 60 ||
    automationQueueDepth > 200 ||
    backgroundWorkerLoad > 80
  ) {
    return 'DEGRADED';
  }

  // ELEVATED_LOAD conditions
  if (
    automationQueueDepth > 50 ||
    usagePressureScore > 70
  ) {
    return 'ELEVATED_LOAD';
  }

  // RECOVERY_MODE will be handled by transitions later
  return 'NOMINAL';
}

export async function getCurrentHyperstate(): Promise<HyperstateSnapshot> {
  const signals = await collectHyperstateSignals();
  const level = evaluateHyperstateLevel(signals);
  const notes: string[] = [];

  if (signals.automationQueueDepth > 50) notes.push('High automation queue depth');
  if (signals.deadLetterCount > 0) notes.push('There are failed automations in the dead-letter queue');
  if (signals.slowOperationScore > 40) notes.push('Performance degradation detected');
  if (signals.consistencyIssueCount > 0) notes.push('Data consistency issues present');
  if (signals.driftScore > 0) notes.push('Drift detected from expected patterns');
  if (signals.usagePressureScore > 60) notes.push('High usage pressure');
  if (signals.backgroundWorkerLoad > 60) notes.push('Background worker under load');

  return {
    level,
    signals,
    computedAt: new Date().toISOString(),
    notes,
  };
}
