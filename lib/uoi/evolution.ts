// UOI Evolution Mode - Self-improving intelligence
// The cockpit becomes a learning organism

export interface EvolutionState {
  active: boolean;
  activatedAt?: string;
  ruleEvolutions: RuleEvolution[];
  thresholdAdaptations: ThresholdAdaptation[];
  directiveImprovements: DirectiveImprovement[];
  patternClusters: PatternCluster[];
  learningCycles: number;
  improvementsApplied: number;
  lastEvolution?: string;
}

export interface RuleEvolution {
  id: string;
  ruleId: string;
  ruleName: string;
  oldValue: number | string;
  newValue: number | string;
  reason: string;
  confidence: number;
  applied: boolean;
  appliedAt?: string;
  reverted: boolean;
  revertedAt?: string;
  createdAt: string;
}

export interface ThresholdAdaptation {
  id: string;
  domain: "error_budget" | "throughput_floor" | "drift_tolerance" | "queue_limit";
  oldThreshold: number;
  newThreshold: number;
  reason: string;
  basedOn: string; // "historical_performance" | "current_load" | "predicted_risk" | "subsystem_health"
  applied: boolean;
  appliedAt?: string;
  reverted: boolean;
  createdAt: string;
}

export interface DirectiveImprovement {
  id: string;
  directiveType: string;
  target: string;
  oldAction: string;
  newAction: string;
  effectiveness: number; // 0-1, how much better the new action is
  reason: string;
  applied: boolean;
  appliedAt?: string;
  createdAt: string;
}

export interface PatternCluster {
  id: string;
  patterns: string[];
  correlation: number; // 0-1, how correlated these patterns are
  prediction: string;
  confidence: number;
  discoveredAt: string;
  lastSeen: string;
}

// Evolution state
let evolutionState: EvolutionState = {
  active: false,
  ruleEvolutions: [],
  thresholdAdaptations: [],
  directiveImprovements: [],
  patternClusters: [],
  learningCycles: 0,
  improvementsApplied: 0,
};

/**
 * Activate evolution mode
 */
export function activateEvolution(): EvolutionState {
  evolutionState = {
    ...evolutionState,
    active: true,
    activatedAt: new Date().toISOString(),
  };
  
  console.log("[UOI] 🌱 EVOLUTION MODE ACTIVATED");
  console.log("[UOI] UOI now adapts based on long-term patterns");
  console.log("[UOI] Governance rules self-tune");
  console.log("[UOI] Thresholds evolve");
  console.log("[UOI] Directives improve");
  console.log("[UOI] Memory becomes intelligence");
  console.log("[UOI] The cockpit becomes a learning organism");
  
  return evolutionState;
}

/**
 * Deactivate evolution mode
 */
export function deactivateEvolution(): EvolutionState {
  evolutionState = {
    ...evolutionState,
    active: false,
  };
  
  console.log("[UOI] Evolution mode deactivated");
  return evolutionState;
}

/**
 * Get evolution state
 */
export function getEvolutionState(): EvolutionState {
  return { ...evolutionState };
}

/**
 * Check if evolution is active
 */
export function isEvolutionActive(): boolean {
  return evolutionState.active;
}

/**
 * Record rule evolution
 */
export function recordRuleEvolution(
  ruleId: string,
  ruleName: string,
  oldValue: number | string,
  newValue: number | string,
  reason: string,
  confidence: number = 0.7
): RuleEvolution {
  const evolution: RuleEvolution = {
    id: `evolution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ruleId,
    ruleName,
    oldValue,
    newValue,
    reason,
    confidence,
    applied: false,
    reverted: false,
    createdAt: new Date().toISOString(),
  };
  
  evolutionState.ruleEvolutions.push(evolution);
  
  // Keep only last 100 evolutions
  if (evolutionState.ruleEvolutions.length > 100) {
    evolutionState.ruleEvolutions.shift();
  }
  
  return evolution;
}

/**
 * Apply rule evolution
 */
export function applyRuleEvolution(evolutionId: string): boolean {
  const evolution = evolutionState.ruleEvolutions.find(e => e.id === evolutionId);
  if (evolution && !evolution.applied) {
    evolution.applied = true;
    evolution.appliedAt = new Date().toISOString();
    evolutionState.improvementsApplied++;
    return true;
  }
  return false;
}

/**
 * Revert rule evolution
 */
export function revertRuleEvolution(evolutionId: string): boolean {
  const evolution = evolutionState.ruleEvolutions.find(e => e.id === evolutionId);
  if (evolution && evolution.applied && !evolution.reverted) {
    evolution.reverted = true;
    evolution.revertedAt = new Date().toISOString();
    return true;
  }
  return false;
}

/**
 * Record threshold adaptation
 */
export function recordThresholdAdaptation(
  domain: ThresholdAdaptation["domain"],
  oldThreshold: number,
  newThreshold: number,
  reason: string,
  basedOn: ThresholdAdaptation["basedOn"]
): ThresholdAdaptation {
  const adaptation: ThresholdAdaptation = {
    id: `adaptation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    domain,
    oldThreshold,
    newThreshold,
    reason,
    basedOn,
    applied: false,
    reverted: false,
    createdAt: new Date().toISOString(),
  };
  
  evolutionState.thresholdAdaptations.push(adaptation);
  
  // Keep only last 100 adaptations
  if (evolutionState.thresholdAdaptations.length > 100) {
    evolutionState.thresholdAdaptations.shift();
  }
  
  return adaptation;
}

/**
 * Record directive improvement
 */
export function recordDirectiveImprovement(
  directiveType: string,
  target: string,
  oldAction: string,
  newAction: string,
  effectiveness: number,
  reason: string
): DirectiveImprovement {
  const improvement: DirectiveImprovement = {
    id: `improvement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    directiveType,
    target,
    oldAction,
    newAction,
    effectiveness,
    reason,
    applied: false,
    createdAt: new Date().toISOString(),
  };
  
  evolutionState.directiveImprovements.push(improvement);
  
  // Keep only last 100 improvements
  if (evolutionState.directiveImprovements.length > 100) {
    evolutionState.directiveImprovements.shift();
  }
  
  return improvement;
}

/**
 * Record pattern cluster
 */
export function recordPatternCluster(
  patterns: string[],
  correlation: number,
  prediction: string,
  confidence: number = 0.7
): PatternCluster {
  const cluster: PatternCluster = {
    id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    patterns,
    correlation,
    prediction,
    confidence,
    discoveredAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };
  
  evolutionState.patternClusters.push(cluster);
  
  // Keep only last 50 clusters
  if (evolutionState.patternClusters.length > 50) {
    evolutionState.patternClusters.shift();
  }
  
  return cluster;
}

/**
 * Record learning cycle
 */
export function recordLearningCycle(): void {
  evolutionState.learningCycles++;
  evolutionState.lastEvolution = new Date().toISOString();
}

/**
 * Get active evolutions (applied, not reverted)
 */
export function getActiveEvolutions(): RuleEvolution[] {
  return evolutionState.ruleEvolutions.filter(e => e.applied && !e.reverted);
}

/**
 * Get active adaptations (applied, not reverted)
 */
export function getActiveAdaptations(): ThresholdAdaptation[] {
  return evolutionState.thresholdAdaptations.filter(a => a.applied && !a.reverted);
}
