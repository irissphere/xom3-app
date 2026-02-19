/**
 * Signals State Persistence
 * Tracks last known governance state to detect changes
 */

import { loadJson, saveJson } from "@/lib/system/persistence";

export interface AlertState {
  activeRuleIds: string[];
  lastHealthScore: number;
  lastSentAlerts: string[];
  timestamp: string;
}

const STATE_KEY = "signals:lastState";
const STATE_FILE = "signals-last-state.json";

/**
 * Load last known alert state
 */
export async function loadLastState(): Promise<AlertState | null> {
  try {
    const state = await loadJson<AlertState>({
      key: STATE_KEY,
      fileName: STATE_FILE,
      fallback: {
        activeRuleIds: [],
        lastHealthScore: 100,
        lastSentAlerts: [],
        timestamp: new Date().toISOString()
      }
    });

    return state;
  } catch (error) {
    console.error("Failed to load last state:", error);
    return null;
  }
}

/**
 * Save current alert state
 */
export async function saveLastState(state: AlertState): Promise<void> {
  try {
    await saveJson({
      key: STATE_KEY,
      fileName: STATE_FILE,
      value: state
    });
  } catch (error) {
    console.error("Failed to save last state:", error);
  }
}

/**
 * Create state from current alerts and health score
 */
export function createState(
  alerts: Array<{ id: string; ruleId: string }>,
  healthScore: number
): AlertState {
  return {
    activeRuleIds: alerts.map(a => a.ruleId),
    lastHealthScore: healthScore,
    lastSentAlerts: alerts.map(a => a.id),
    timestamp: new Date().toISOString()
  };
}
