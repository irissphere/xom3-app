// HSE History Store - Rolling history buffer for temporal intelligence
// Simple in-memory rolling history buffer.
// Replace with Redis/Postgres later if needed.

type HistoryEntry = {
  timestamp: number;
  subsystem: string;
  type: string;
  value: number;
};

const history: HistoryEntry[] = [];
const MAX_HISTORY_MS = 60 * 60 * 1000; // 60 minutes

/**
 * Push history entry
 */
export function pushHistory(entry: HistoryEntry) {
  history.push(entry);

  // Prune old entries
  const cutoff = Date.now() - MAX_HISTORY_MS;
  while (history.length > 0 && history[0].timestamp < cutoff) {
    history.shift();
  }
}

/**
 * Get history for a subsystem within a time window
 */
export function getHistory(subsystem: string, windowMs: number): HistoryEntry[] {
  const cutoff = Date.now() - windowMs;
  return history.filter(
    h => h.subsystem === subsystem && h.timestamp >= cutoff
  );
}

/**
 * Get all history within a time window (across all subsystems)
 */
export function getAllHistory(windowMs: number): HistoryEntry[] {
  const cutoff = Date.now() - windowMs;
  return history.filter(h => h.timestamp >= cutoff);
}

/**
 * Get history by type for a subsystem
 */
export function getHistoryByType(subsystem: string, type: string, windowMs: number): HistoryEntry[] {
  const cutoff = Date.now() - windowMs;
  return history.filter(
    h => h.subsystem === subsystem && h.type === type && h.timestamp >= cutoff
  );
}
