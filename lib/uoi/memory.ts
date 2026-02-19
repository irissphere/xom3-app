// UOI Memory - Stores patterns and insights
// This is the UOI's short-term memory

export interface UOIMemoryEntry {
  id: string;
  type: "pattern" | "insight" | "optimization" | "anomaly";
  data: any;
  frequency: number;
  effectiveness: number;
  lastSeen: string;
  createdAt: string;
}

const memory: Map<string, UOIMemoryEntry> = new Map();
let signalHistory: any[] = [];
// Long-term memory for sovereign mode (multi-day patterns)
let longTermMemory: Map<string, {
  pattern: string;
  occurrences: Array<{ timestamp: string; context: any }>;
  firstSeen: string;
  lastSeen: string;
  frequency: number;
  prediction: string;
}> = new Map();

/**
 * Remember signal in history (for heartbeat)
 */
export function remember(signal: any): void {
  signalHistory.push(signal);
  if (signalHistory.length > 5000) signalHistory.shift();
}

/**
 * Get recent signals (for heartbeat analysis)
 */
export function getRecentSignals(limit: number = 50): any[] {
  return signalHistory.slice(-limit);
}

/**
 * Store pattern/insight in memory
 */
export function rememberPattern(
  type: UOIMemoryEntry["type"],
  data: any,
  effectiveness: number = 0.5
): UOIMemoryEntry {
  const key = `${type}-${JSON.stringify(data)}`;
  const existing = memory.get(key);

  if (existing) {
    existing.frequency++;
    existing.lastSeen = new Date().toISOString();
    existing.effectiveness = (existing.effectiveness + effectiveness) / 2;
    return existing;
  }

  const entry: UOIMemoryEntry = {
    id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    frequency: 1,
    effectiveness,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  memory.set(key, entry);
  return entry;
}

/**
 * Recall pattern/insight from memory
 */
export function recall(type: UOIMemoryEntry["type"], data: any): UOIMemoryEntry | null {
  const key = `${type}-${JSON.stringify(data)}`;
  return memory.get(key) || null;
}

/**
 * Get all memories of type
 */
export function getMemoriesByType(type: UOIMemoryEntry["type"]): UOIMemoryEntry[] {
  return Array.from(memory.values()).filter(m => m.type === type);
}

/**
 * Get high-frequency memories
 */
export function getHighFrequencyMemories(threshold: number = 5): UOIMemoryEntry[] {
  return Array.from(memory.values()).filter(m => m.frequency >= threshold);
}

/**
 * Get effective memories
 */
export function getEffectiveMemories(threshold: number = 0.7): UOIMemoryEntry[] {
  return Array.from(memory.values()).filter(m => m.effectiveness >= threshold);
}

/**
 * Clear old memories
 */
export function clearOldMemories(olderThanDays: number = 30): number {
  const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
  let cleared = 0;

  memory.forEach((entry, key) => {
    const lastSeen = new Date(entry.lastSeen).getTime();
    if (lastSeen < cutoff) {
      memory.delete(key);
      cleared++;
    }
  });

  return cleared;
}

/**
 * Record long-term pattern (sovereign mode)
 */
export function recordLongTermPattern(
  patternKey: string,
  context: any,
  prediction: string = ""
): void {
  const existing = longTermMemory.get(patternKey);
  const now = new Date().toISOString();
  
  if (existing) {
    existing.occurrences.push({ timestamp: now, context });
    existing.lastSeen = now;
    existing.frequency++;
    if (prediction) existing.prediction = prediction;
  } else {
    longTermMemory.set(patternKey, {
      pattern: patternKey,
      occurrences: [{ timestamp: now, context }],
      firstSeen: now,
      lastSeen: now,
      frequency: 1,
      prediction: prediction || "",
    });
  }
  
  // Keep only last 1000 patterns
  if (longTermMemory.size > 1000) {
    const firstKey = longTermMemory.keys().next().value;
    longTermMemory.delete(firstKey);
  }
}

/**
 * Get recurring patterns (sovereign mode)
 */
export function getRecurringPatterns(minFrequency: number = 3): Array<{
  pattern: string;
  frequency: number;
  firstSeen: string;
  lastSeen: string;
  daysActive: number;
  prediction: string;
}> {
  const patterns: Array<{
    pattern: string;
    frequency: number;
    firstSeen: string;
    lastSeen: string;
    daysActive: number;
    prediction: string;
  }> = [];
  
  longTermMemory.forEach((entry, key) => {
    if (entry.frequency >= minFrequency) {
      const daysActive = Math.ceil(
        (new Date(entry.lastSeen).getTime() - new Date(entry.firstSeen).getTime()) / (1000 * 60 * 60 * 24)
      );
      patterns.push({
        pattern: key,
        frequency: entry.frequency,
        firstSeen: entry.firstSeen,
        lastSeen: entry.lastSeen,
        daysActive,
        prediction: entry.prediction,
      });
    }
  });
  
  return patterns.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Predict failure based on patterns (sovereign mode)
 */
export function predictFailure(subsystem: string, context: any): {
  willFail: boolean;
  confidence: number;
  reason: string;
  predictedAt: string;
} {
  // Look for patterns that predict failures
  let maxConfidence = 0;
  let bestPattern = "";
  
  longTermMemory.forEach((entry, key) => {
    if (entry.prediction.includes("failure") || entry.prediction.includes("error")) {
      // Check if context matches pattern
      const recentOccurrences = entry.occurrences.slice(-5);
      const matches = recentOccurrences.filter(occ => {
        // Simple matching - in production would be more sophisticated
        return JSON.stringify(occ.context).includes(JSON.stringify(context).substring(0, 50));
      });
      
      if (matches.length > 0) {
        const confidence = Math.min(0.9, entry.frequency / 10);
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestPattern = key;
        }
      }
    }
  });
  
  return {
    willFail: maxConfidence > 0.5,
    confidence: maxConfidence,
    reason: bestPattern || "No matching failure pattern",
    predictedAt: new Date().toISOString(),
  };
}
