/**
 * Signals Evaluator
 * Compares current governance state to previous state
 * Determines if alerts should be dispatched
 */

import { AlertState } from "./state";

export interface StateChange {
  newAlerts: Array<{ id: string; ruleId: string; severity: string }>;
  severityIncreased: Array<{ id: string; ruleId: string; severity: string }>;
  healthScoreDropped: boolean;
  healthScoreThreshold: number;
  shouldDispatch: boolean;
}

/**
 * Evaluate state changes between current and previous state
 */
export function evaluateStateChange(
  currentAlerts: Array<{ id: string; ruleId: string; severity: string }>,
  currentHealthScore: number,
  previousState: AlertState | null
): StateChange {
  const result: StateChange = {
    newAlerts: [],
    severityIncreased: [],
    healthScoreDropped: false,
    healthScoreThreshold: 0,
    shouldDispatch: false
  };

  if (!previousState) {
    // First run - send all high severity alerts
    result.newAlerts = currentAlerts.filter(a => a.severity === "high");
    result.shouldDispatch = result.newAlerts.length > 0;
    return result;
  }

  const previousRuleIds = new Set(previousState.activeRuleIds);
  const previousAlertIds = new Set(previousState.lastSentAlerts);

  // Find new alerts (rules that weren't active before)
  result.newAlerts = currentAlerts.filter(
    alert => !previousRuleIds.has(alert.ruleId) && alert.severity === "high"
  );

  // Find alerts that increased in severity (would need severity tracking in previous state)
  // For now, we'll treat any high severity alert that wasn't sent before as new
  result.severityIncreased = currentAlerts.filter(
    alert => alert.severity === "high" && !previousAlertIds.has(alert.id)
  );

  // Check if health score dropped significantly
  const healthScoreDrop = previousState.lastHealthScore - currentHealthScore;
  const healthScoreDropPercent = (healthScoreDrop / previousState.lastHealthScore) * 100;

  if (healthScoreDrop >= 10 || healthScoreDropPercent >= 15) {
    result.healthScoreDropped = true;
    result.healthScoreThreshold = currentHealthScore;
  }

  // Dispatch if:
  // - New high severity alerts appeared
  // - Health score dropped significantly
  // - Any high severity alerts that weren't previously sent
  result.shouldDispatch =
    result.newAlerts.length > 0 ||
    result.healthScoreDropped ||
    result.severityIncreased.length > 0;

  return result;
}

/**
 * Filter alerts to only those that should be dispatched
 */
export function filterAlertsForDispatch(
  alerts: Array<{ id: string; ruleId: string; severity: string; message: string }>,
  stateChange: StateChange
): Array<{ id: string; ruleId: string; severity: string; message: string }> {
  // Only dispatch high severity alerts
  const highSeverity = alerts.filter(a => a.severity === "high");

  // Filter to new alerts or alerts that increased in severity
  const alertIdsToSend = new Set([
    ...stateChange.newAlerts.map(a => a.id),
    ...stateChange.severityIncreased.map(a => a.id)
  ]);

  // If health score dropped, include all high severity alerts
  if (stateChange.healthScoreDropped) {
    return highSeverity;
  }

  // Otherwise, only send new/changed alerts
  return highSeverity.filter(a => alertIdsToSend.has(a.id));
}
