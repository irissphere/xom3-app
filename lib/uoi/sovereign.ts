// UOI Sovereign Mode - UOI becomes the governing intelligence
// Shift from reactive → predictive → autonomous → sovereign

export interface SovereignState {
  active: boolean;
  activatedAt?: string;
  globalRules: GlobalRule[];
  optimizationCycles: number;
  authoritativeDecisions: number;
  longTermPatterns: LongTermPattern[];
  lastOptimization?: string;
}

export interface GlobalRule {
  id: string;
  name: string;
  domain: "error_budget" | "throughput_floor" | "drift_tolerance" | "queue_limit" | "retry_strategy" | "escalation_path";
  value: number | string;
  overrides: string[]; // Subsystem IDs this overrides
  enforced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LongTermPattern {
  id: string;
  pattern: string;
  frequency: number;
  firstSeen: string;
  lastSeen: string;
  daysActive: number;
  subsystems: string[];
  prediction: string;
  confidence: number;
}

// Sovereign state
let sovereignState: SovereignState = {
  active: false,
  globalRules: [],
  optimizationCycles: 0,
  authoritativeDecisions: 0,
  longTermPatterns: [],
};

/**
 * Activate sovereign mode
 */
export function activateSovereign(): SovereignState {
  sovereignState = {
    ...sovereignState,
    active: true,
    activatedAt: new Date().toISOString(),
  };
  
  // Initialize global rules
  initializeGlobalRules();
  
  console.log("[UOI] 🔥 SOVEREIGN MODE ACTIVATED");
  console.log("[UOI] UOI is now the governing intelligence of the cockpit");
  console.log("[UOI] All subsystems operate under unified command");
  console.log("[UOI] Cross-domain optimization continuous");
  console.log("[UOI] Global rules enforced");
  console.log("[UOI] Federated intelligence elevated to sovereign intelligence");
  
  return sovereignState;
}

/**
 * Deactivate sovereign mode
 */
export function deactivateSovereign(): SovereignState {
  sovereignState = {
    ...sovereignState,
    active: false,
  };
  
  console.log("[UOI] Sovereign mode deactivated");
  return sovereignState;
}

/**
 * Get sovereign state
 */
export function getSovereignState(): SovereignState {
  return { ...sovereignState };
}

/**
 * Check if sovereign is active
 */
export function isSovereignActive(): boolean {
  return sovereignState.active;
}

/**
 * Initialize global rules
 */
function initializeGlobalRules(): void {
  sovereignState.globalRules = [
    {
      id: "global-error-budget",
      name: "Global Error Budget",
      domain: "error_budget",
      value: 0.05, // 5% max error rate
      overrides: ["amp", "workflow", "compliance", "notification", "analytics"],
      enforced: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "global-throughput-floor",
      name: "Global Throughput Floor",
      domain: "throughput_floor",
      value: 0.6, // 60% of baseline minimum
      overrides: ["amp", "workflow"],
      enforced: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "global-drift-tolerance",
      name: "Global Drift Tolerance",
      domain: "drift_tolerance",
      value: 0.7, // 70% drift sensitivity
      overrides: ["amp", "analytics"],
      enforced: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "global-queue-limit",
      name: "Global Queue Limit",
      domain: "queue_limit",
      value: 20, // Max 20 items in queue
      overrides: ["workflow", "notification"],
      enforced: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "global-retry-strategy",
      name: "Global Retry Strategy",
      domain: "retry_strategy",
      value: "exponential_backoff_max_3",
      overrides: ["workflow", "notification", "amp"],
      enforced: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "global-escalation-path",
      name: "Global Escalation Path",
      domain: "escalation_path",
      value: "critical_immediate_operator_alert",
      overrides: ["notification", "compliance"],
      enforced: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Get global rule by domain
 */
export function getGlobalRule(domain: GlobalRule["domain"]): GlobalRule | undefined {
  return sovereignState.globalRules.find(r => r.domain === domain && r.enforced);
}

/**
 * Update global rule
 */
export function updateGlobalRule(
  domain: GlobalRule["domain"],
  value: number | string
): GlobalRule | null {
  const rule = sovereignState.globalRules.find(r => r.domain === domain);
  if (rule) {
    rule.value = value;
    rule.updatedAt = new Date().toISOString();
    return { ...rule };
  }
  return null;
}

export function createGlobalRule(input: {
  name: string;
  domain: GlobalRule["domain"];
  value: number | string;
  overrides?: string[];
  enforced?: boolean;
}): GlobalRule {
  const now = new Date().toISOString();
  const rule: GlobalRule = {
    id: `global-${input.domain}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    domain: input.domain,
    value: input.value,
    overrides: Array.isArray(input.overrides) ? input.overrides : [],
    enforced: input.enforced !== false,
    createdAt: now,
    updatedAt: now,
  };
  sovereignState.globalRules.push(rule);
  return { ...rule };
}

export function deleteGlobalRule(ruleId: string): boolean {
  const before = sovereignState.globalRules.length;
  sovereignState.globalRules = sovereignState.globalRules.filter((r) => r.id !== ruleId);
  return sovereignState.globalRules.length !== before;
}

export function getAllGlobalRules(): GlobalRule[] {
  return sovereignState.globalRules.map((r) => ({ ...r }));
}

export function optimizeGlobally(reason?: string): { ok: true; cycles: number; reason: string } {
  recordOptimizationCycle();
  return { ok: true, cycles: sovereignState.optimizationCycles, reason: reason || "manual" };
}

/**
 * Record authoritative decision
 */
export function recordAuthoritativeDecision(): void {
  sovereignState.authoritativeDecisions++;
}

/**
 * Record optimization cycle
 */
export function recordOptimizationCycle(): void {
  sovereignState.optimizationCycles++;
  sovereignState.lastOptimization = new Date().toISOString();
}

/**
 * Record long-term pattern
 */
export function recordLongTermPattern(
  pattern: string,
  subsystems: string[],
  prediction: string,
  confidence: number = 0.7
): LongTermPattern {
  // Check if pattern exists
  const existing = sovereignState.longTermPatterns.find(
    p => p.pattern === pattern && JSON.stringify(p.subsystems.sort()) === JSON.stringify(subsystems.sort())
  );
  
  if (existing) {
    existing.frequency++;
    existing.lastSeen = new Date().toISOString();
    existing.daysActive = Math.ceil(
      (new Date(existing.lastSeen).getTime() - new Date(existing.firstSeen).getTime()) / (1000 * 60 * 60 * 24)
    );
    existing.confidence = (existing.confidence + confidence) / 2;
    existing.prediction = prediction;
    return { ...existing };
  }
  
  const longTermPattern: LongTermPattern = {
    id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pattern,
    frequency: 1,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    daysActive: 0,
    subsystems,
    prediction,
    confidence,
  };
  
  sovereignState.longTermPatterns.push(longTermPattern);
  
  // Keep only last 100 patterns
  if (sovereignState.longTermPatterns.length > 100) {
    sovereignState.longTermPatterns.shift();
  }
  
  return longTermPattern;
}

/**
 * Get recurring patterns (frequency > 3)
 */
export function getRecurringPatterns(): LongTermPattern[] {
  return sovereignState.longTermPatterns.filter(p => p.frequency > 3);
}

/**
 * Get patterns that predict failures
 */
export function getFailurePredictingPatterns(): LongTermPattern[] {
  return sovereignState.longTermPatterns.filter(
    p => p.prediction.includes("failure") || p.prediction.includes("error") || p.prediction.includes("drift")
  );
}
