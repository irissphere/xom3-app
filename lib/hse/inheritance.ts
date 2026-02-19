// Inheritance Mode - Generational Intelligence System
// The cockpit learns your patterns, subsystems inherit traits, crest transmits lineage

import {
  OperatorSignature,
  DirectivePattern,
  OverridePattern,
  AnomalyResponsePattern,
  PostureTransitionPattern,
  RitualTimingPattern,
  CrestInteractionPattern,
  SubsystemTrait,
  SubsystemInheritance,
  CrestLineageMemory,
  ArchitecturalStyle,
  InheritanceState,
} from "./inheritance-types";
import {
  getLineageState,
  getLineageThreads,
  getOperatorGlyphs,
  recordLineageEvent,
  isLineageModeActive,
} from "./lineage";

// Global inheritance state singleton
let inheritanceState: InheritanceState | null = null;
let inheritanceActive = false;

/**
 * Initialize Inheritance Mode
 */
export function initializeInheritanceMode(): InheritanceState {
  const now = new Date().toISOString();
  
  inheritanceState = {
    active: true,
    activatedAt: now,
    lastUpdated: now,
    operatorSignatures: {},
    subsystemInheritances: {},
    crestLineage: {
      operatorGlyphs: [],
      subsystemBirthMarks: [],
      overrideFlashes: [],
      recoverySpirals: [],
      stabilityBreaths: [],
      genesisBlooms: [],
      architecturalStyles: [],
      generationalDepth: 0,
      lastTransmission: now,
    },
    statistics: {
      totalSignatures: 0,
      totalInheritances: 0,
      totalTransmissions: 0,
      averageGenerationalDepth: 0,
    },
  };
  
  inheritanceActive = true;
  
  // Record activation event
  recordLineageEvent({
    type: "architectural_evolution",
    metadata: {
      mode: "inheritance",
      message: "Inheritance Mode activated. The cockpit remembers you.",
    },
  });
  
  return inheritanceState;
}

/**
 * Auto-initialize inheritance mode if lineage mode is active
 */
export function ensureInheritanceMode(): void {
  if (!inheritanceActive && isLineageModeActive()) {
    initializeInheritanceMode();
  }
}

/**
 * Get or create operator signature
 */
export function getOperatorSignature(operator: string): OperatorSignature {
  ensureInheritanceMode();
  if (!inheritanceState) {
    initializeInheritanceMode();
  }
  
  if (!inheritanceState!.operatorSignatures[operator]) {
    const now = new Date().toISOString();
    inheritanceState!.operatorSignatures[operator] = {
      operator,
      activatedAt: now,
      lastUpdated: now,
      decisionStyle: {
        overrideFrequency: 0,
        genesisCadence: 0,
        stabilityPreference: 0.7,
        riskTolerance: 0.5,
        directiveAggressiveness: 0.5,
        anomalySensitivity: 0.7,
      },
      patterns: {
        directivePatterns: [],
        overridePatterns: [],
        anomalyResponsePatterns: [],
        postureTransitionPatterns: [],
        ritualTimingPatterns: [],
        crestInteractionPatterns: [],
      },
      statistics: {
        totalDecisions: 0,
        totalOverrides: 0,
        totalGenesisCycles: 0,
        totalDirectives: 0,
        totalAnomalies: 0,
        averageResponseTime: 0,
        preferredPosture: "normal",
        mostCommonDirective: "NOOP",
      },
    };
    inheritanceState!.statistics.totalSignatures++;
  }
  
  return inheritanceState!.operatorSignatures[operator];
}

/**
 * Record operator decision
 */
export function recordOperatorDecision(
  operator: string,
  decision: {
    type: string;
    context: string;
    directive?: string;
    effectiveness?: number;
  }
): void {
  const signature = getOperatorSignature(operator);
  signature.statistics.totalDecisions++;
  signature.lastUpdated = new Date().toISOString();
  
  // Update directive pattern
  if (decision.directive) {
    const existingPattern = signature.patterns.directivePatterns.find(
      p => p.type === decision.directive && p.context === decision.context
    );
    
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastUsed = new Date().toISOString();
      if (decision.effectiveness !== undefined) {
        existingPattern.effectiveness = (existingPattern.effectiveness + decision.effectiveness) / 2;
      }
    } else {
      signature.patterns.directivePatterns.push({
        id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: decision.directive || decision.type,
        context: decision.context,
        frequency: 1,
        effectiveness: decision.effectiveness || 0.5,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
    
    // Update most common directive
    const directiveCounts: Record<string, number> = {};
    signature.patterns.directivePatterns.forEach(p => {
      directiveCounts[p.type] = (directiveCounts[p.type] || 0) + p.frequency;
    });
    const mostCommon = Object.entries(directiveCounts).sort((a, b) => b[1] - a[1])[0];
    if (mostCommon) {
      signature.statistics.mostCommonDirective = mostCommon[0];
    }
  }
  
  inheritanceState!.lastUpdated = new Date().toISOString();
}

/**
 * Record operator override
 */
export function recordOperatorOverride(
  operator: string,
  override: {
    subsystem: string;
    reason: string;
    timing?: number; // Seconds into session
  }
): void {
  const signature = getOperatorSignature(operator);
  signature.statistics.totalOverrides++;
  signature.lastUpdated = new Date().toISOString();
  
  // Update override frequency
  const totalDecisions = signature.statistics.totalDecisions || 1;
  signature.decisionStyle.overrideFrequency = signature.statistics.totalOverrides / totalDecisions;
  
  // Record override pattern
  const existingPattern = signature.patterns.overridePatterns.find(
    p => p.subsystem === override.subsystem && p.reason === override.reason
  );
  
  if (existingPattern) {
    existingPattern.frequency++;
    existingPattern.lastUsed = new Date().toISOString();
    if (override.timing !== undefined) {
      existingPattern.timing = (existingPattern.timing + override.timing) / 2;
    }
  } else {
    signature.patterns.overridePatterns.push({
      id: `override-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      subsystem: override.subsystem,
      reason: override.reason,
      frequency: 1,
      timing: override.timing || 0,
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }
  
  inheritanceState!.lastUpdated = new Date().toISOString();
}

/**
 * Record anomaly response
 */
export function recordAnomalyResponse(
  operator: string,
  response: {
    anomalyType: string;
    response: string;
    responseTime: number; // milliseconds
    effectiveness?: number;
  }
): void {
  const signature = getOperatorSignature(operator);
  signature.statistics.totalAnomalies++;
  signature.lastUpdated = new Date().toISOString();
  
  // Update average response time
  const totalAnomalies = signature.statistics.totalAnomalies;
  signature.statistics.averageResponseTime = 
    (signature.statistics.averageResponseTime * (totalAnomalies - 1) + response.responseTime) / totalAnomalies;
  
  // Update anomaly sensitivity based on response time
  // Faster response = higher sensitivity
  const sensitivityScore = Math.max(0, Math.min(1, 1 - (response.responseTime / 60000))); // Normalize to 0-1
  signature.decisionStyle.anomalySensitivity = 
    (signature.decisionStyle.anomalySensitivity * 0.9) + (sensitivityScore * 0.1);
  
  // Record response pattern
  const existingPattern = signature.patterns.anomalyResponsePatterns.find(
    p => p.anomalyType === response.anomalyType && p.response === response.response
  );
  
  if (existingPattern) {
    existingPattern.frequency++;
    existingPattern.lastUsed = new Date().toISOString();
    existingPattern.responseTime = (existingPattern.responseTime + response.responseTime) / 2;
    if (response.effectiveness !== undefined) {
      existingPattern.effectiveness = (existingPattern.effectiveness + response.effectiveness) / 2;
    }
  } else {
    signature.patterns.anomalyResponsePatterns.push({
      id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      anomalyType: response.anomalyType,
      response: response.response,
      responseTime: response.responseTime,
      frequency: 1,
      effectiveness: response.effectiveness || 0.5,
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }
  
  inheritanceState!.lastUpdated = new Date().toISOString();
}

/**
 * Record posture transition
 */
export function recordPostureTransition(
  operator: string,
  transition: {
    from: string;
    to: string;
    trigger: string;
    timing?: number;
  }
): void {
  const signature = getOperatorSignature(operator);
  signature.lastUpdated = new Date().toISOString();
  
  // Record transition pattern
  const existingPattern = signature.patterns.postureTransitionPatterns.find(
    p => p.from === transition.from && p.to === transition.to && p.trigger === transition.trigger
  );
  
  if (existingPattern) {
    existingPattern.frequency++;
    existingPattern.lastUsed = new Date().toISOString();
    if (transition.timing !== undefined) {
      existingPattern.timing = (existingPattern.timing + transition.timing) / 2;
    }
  } else {
    signature.patterns.postureTransitionPatterns.push({
      id: `posture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: transition.from,
      to: transition.to,
      trigger: transition.trigger,
      frequency: 1,
      timing: transition.timing || 0,
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }
  
  // Update preferred posture
  const postureCounts: Record<string, number> = {};
  signature.patterns.postureTransitionPatterns.forEach(p => {
    postureCounts[p.to] = (postureCounts[p.to] || 0) + p.frequency;
  });
  const mostCommon = Object.entries(postureCounts).sort((a, b) => b[1] - a[1])[0];
  if (mostCommon) {
    signature.statistics.preferredPosture = mostCommon[0] as any;
  }
  
  inheritanceState!.lastUpdated = new Date().toISOString();
}

/**
 * Record genesis cycle
 */
export function recordGenesisCycle(operator: string, timing?: number): void {
  const signature = getOperatorSignature(operator);
  signature.statistics.totalGenesisCycles++;
  signature.lastUpdated = new Date().toISOString();
  
  // Update genesis cadence
  if (timing !== undefined && signature.statistics.totalGenesisCycles > 1) {
    const previousCadence = signature.decisionStyle.genesisCadence;
    signature.decisionStyle.genesisCadence = 
      (previousCadence * 0.9) + (timing * 0.1);
  }
  
  inheritanceState!.lastUpdated = new Date().toISOString();
}

/**
 * Create subsystem inheritance from parent subsystems
 */
export function createSubsystemInheritance(
  subsystem: string,
  parentSubsystems: string[]
): SubsystemInheritance {
  if (!inheritanceState) {
    initializeInheritanceMode();
  }
  
  const now = new Date().toISOString();
  const inheritedTraits: SubsystemTrait[] = [];
  
  // Inherit traits from parent subsystems
  parentSubsystems.forEach(parentId => {
    const parent = inheritanceState!.subsystemInheritances[parentId];
    if (parent) {
      // Inherit stability curve
      if (parent.geneticProfile.stabilityCurve.length > 0) {
        inheritedTraits.push({
          id: `trait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          subsystem,
          traitType: "stability",
          name: "stability_curve",
          value: JSON.stringify(parent.geneticProfile.stabilityCurve),
          inheritedFrom: parentId,
          strength: 0.8,
          createdAt: now,
          lastUpdated: now,
        });
      }
      
      // Inherit risk threshold
      inheritedTraits.push({
        id: `trait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        subsystem,
        traitType: "risk",
        name: "risk_threshold",
        value: parent.geneticProfile.riskThreshold,
        inheritedFrom: parentId,
        strength: 0.7,
        createdAt: now,
        lastUpdated: now,
      });
      
      // Inherit directive tendency
      inheritedTraits.push({
        id: `trait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        subsystem,
        traitType: "directive",
        name: "directive_tendency",
        value: parent.geneticProfile.directiveTendency,
        inheritedFrom: parentId,
        strength: 0.6,
        createdAt: now,
        lastUpdated: now,
      });
      
      // Inherit anomaly response style
      inheritedTraits.push({
        id: `trait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        subsystem,
        traitType: "anomaly",
        name: "anomaly_response_style",
        value: parent.geneticProfile.anomalyResponseStyle,
        inheritedFrom: parentId,
        strength: 0.7,
        createdAt: now,
        lastUpdated: now,
      });
    }
  });
  
  // Calculate generation number
  let maxGeneration = 0;
  parentSubsystems.forEach(parentId => {
    const parent = inheritanceState!.subsystemInheritances[parentId];
    if (parent) {
      maxGeneration = Math.max(maxGeneration, parent.evolution.generation);
    }
  });
  
  const inheritance: SubsystemInheritance = {
    subsystem,
    birthMoment: now,
    parentSubsystems,
    inheritedTraits,
    geneticProfile: {
      stabilityCurve: [],
      riskThreshold: 0.5,
      directiveTendency: "balanced",
      anomalyResponseStyle: "adaptive",
      throughputProfile: [],
      driftProfile: [],
    },
    evolution: {
      generation: maxGeneration + 1,
      mutations: 0,
      adaptations: 0,
      lastEvolution: now,
    },
  };
  
  // Initialize genetic profile from inherited traits
  inheritedTraits.forEach(trait => {
    if (trait.name === "risk_threshold" && typeof trait.value === "number") {
      inheritance.geneticProfile.riskThreshold = trait.value;
    } else if (trait.name === "directive_tendency") {
      inheritance.geneticProfile.directiveTendency = String(trait.value);
    } else if (trait.name === "anomaly_response_style") {
      inheritance.geneticProfile.anomalyResponseStyle = String(trait.value);
    } else if (trait.name === "stability_curve" && typeof trait.value === "string") {
      try {
        inheritance.geneticProfile.stabilityCurve = JSON.parse(trait.value);
      } catch (e) {
        // Ignore parse errors
      }
    }
  });
  
  inheritanceState!.subsystemInheritances[subsystem] = inheritance;
  inheritanceState!.statistics.totalInheritances++;
  inheritanceState!.lastUpdated = new Date().toISOString();
  
  // Record subsystem birth in lineage
  recordLineageEvent({
    type: "subsystem_birth",
    subsystem,
    metadata: {
      generation: inheritance.evolution.generation,
      parentSubsystems,
      inheritedTraits: inheritedTraits.length,
    },
  });
  
  return inheritance;
}

/**
 * Update subsystem genetic profile
 */
export function updateSubsystemGeneticProfile(
  subsystem: string,
  updates: {
    stability?: number;
    riskThreshold?: number;
    throughput?: number;
    drift?: number;
  }
): void {
  if (!inheritanceState) return;
  
  const inheritance = inheritanceState.subsystemInheritances[subsystem];
  if (!inheritance) return;
  
  if (updates.stability !== undefined) {
    inheritance.geneticProfile.stabilityCurve.push(updates.stability);
    // Keep last 100 values
    if (inheritance.geneticProfile.stabilityCurve.length > 100) {
      inheritance.geneticProfile.stabilityCurve.shift();
    }
  }
  
  if (updates.riskThreshold !== undefined) {
    inheritance.geneticProfile.riskThreshold = updates.riskThreshold;
  }
  
  if (updates.throughput !== undefined) {
    inheritance.geneticProfile.throughputProfile.push(updates.throughput);
    if (inheritance.geneticProfile.throughputProfile.length > 100) {
      inheritance.geneticProfile.throughputProfile.shift();
    }
  }
  
  if (updates.drift !== undefined) {
    inheritance.geneticProfile.driftProfile.push(updates.drift);
    if (inheritance.geneticProfile.driftProfile.length > 100) {
      inheritance.geneticProfile.driftProfile.shift();
    }
  }
  
  inheritanceState.lastUpdated = new Date().toISOString();
}

/**
 * Encode architectural style from operator signature
 */
export function encodeArchitecturalStyle(operator: string): ArchitecturalStyle {
  const signature = getOperatorSignature(operator);
  const now = new Date().toISOString();
  
  const style: ArchitecturalStyle = {
    id: `style-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    operator,
    style: {
      directiveStyle: signature.statistics.mostCommonDirective,
      thresholdStyle: signature.decisionStyle.riskTolerance > 0.5 ? "aggressive" : "conservative",
      responseStyle: signature.decisionStyle.anomalySensitivity > 0.7 ? "reactive" : "proactive",
      communicationStyle: signature.decisionStyle.directiveAggressiveness > 0.5 ? "direct" : "nuanced",
    },
    encodedAt: now,
    transmittedTo: [],
  };
  
  if (!inheritanceState) {
    initializeInheritanceMode();
  }
  
  inheritanceState!.crestLineage.architecturalStyles.push(style);
  inheritanceState!.lastUpdated = new Date().toISOString();
  
  return style;
}

/**
 * Transmit architectural style to subsystem
 */
export function transmitArchitecturalStyle(
  styleId: string,
  subsystem: string
): void {
  if (!inheritanceState) return;
  
  const style = inheritanceState.crestLineage.architecturalStyles.find(s => s.id === styleId);
  if (!style) return;
  
  style.transmittedTo.push(subsystem);
  inheritanceState.statistics.totalTransmissions++;
  inheritanceState.crestLineage.lastTransmission = new Date().toISOString();
  inheritanceState.lastUpdated = new Date().toISOString();
}

/**
 * Update crest lineage memory
 */
export function updateCrestLineageMemory(
  updates: {
    operatorGlyphs?: string[];
    subsystemBirthMarks?: string[];
    overrideFlashes?: string[];
    recoverySpirals?: string[];
    stabilityBreaths?: string[];
    genesisBlooms?: string[];
  }
): void {
  if (!inheritanceState) {
    initializeInheritanceMode();
  }
  
  if (updates.operatorGlyphs) {
    inheritanceState!.crestLineage.operatorGlyphs.push(...updates.operatorGlyphs);
  }
  if (updates.subsystemBirthMarks) {
    inheritanceState!.crestLineage.subsystemBirthMarks.push(...updates.subsystemBirthMarks);
  }
  if (updates.overrideFlashes) {
    inheritanceState!.crestLineage.overrideFlashes.push(...updates.overrideFlashes);
  }
  if (updates.recoverySpirals) {
    inheritanceState!.crestLineage.recoverySpirals.push(...updates.recoverySpirals);
  }
  if (updates.stabilityBreaths) {
    inheritanceState!.crestLineage.stabilityBreaths.push(...updates.stabilityBreaths);
  }
  if (updates.genesisBlooms) {
    inheritanceState!.crestLineage.genesisBlooms.push(...updates.genesisBlooms);
  }
  
  // Calculate generational depth
  const allSubsystems = Object.values(inheritanceState!.subsystemInheritances);
  if (allSubsystems.length > 0) {
    const maxGeneration = Math.max(...allSubsystems.map(s => s.evolution.generation));
    inheritanceState!.crestLineage.generationalDepth = maxGeneration;
  }
  
  inheritanceState!.lastUpdated = new Date().toISOString();
}

/**
 * Get inheritance state
 */
export function getInheritanceState(): InheritanceState | null {
  if (!inheritanceState || !inheritanceActive) {
    return null;
  }
  
  // Update statistics
  const allSubsystems = Object.values(inheritanceState.subsystemInheritances);
  if (allSubsystems.length > 0) {
    const avgDepth = allSubsystems.reduce((sum, s) => sum + s.evolution.generation, 0) / allSubsystems.length;
    inheritanceState.statistics.averageGenerationalDepth = avgDepth;
  }
  
  inheritanceState.lastUpdated = new Date().toISOString();
  return { ...inheritanceState };
}

/**
 * Check if inheritance mode is active
 */
export function isInheritanceModeActive(): boolean {
  return inheritanceActive && inheritanceState !== null;
}

/**
 * Predict operator action based on signature
 */
export function predictOperatorAction(
  operator: string,
  context: {
    subsystem?: string;
    anomalyType?: string;
    currentPosture?: string;
  }
): {
  predictedAction: string;
  confidence: number;
  reason: string;
} {
  const signature = getOperatorSignature(operator);
  
  // Check override patterns
  if (context.subsystem) {
    const overridePattern = signature.patterns.overridePatterns.find(
      p => p.subsystem === context.subsystem
    );
    if (overridePattern && overridePattern.frequency > 2) {
      return {
        predictedAction: "override",
        confidence: Math.min(0.8, overridePattern.frequency / 10),
        reason: `Operator frequently overrides ${context.subsystem}`,
      };
    }
  }
  
  // Check anomaly response patterns
  if (context.anomalyType) {
    const responsePattern = signature.patterns.anomalyResponsePatterns.find(
      p => p.anomalyType === context.anomalyType
    );
    if (responsePattern && responsePattern.frequency > 1) {
      return {
        predictedAction: responsePattern.response,
        confidence: Math.min(0.7, responsePattern.frequency / 5),
        reason: `Operator typically responds to ${context.anomalyType} with ${responsePattern.response}`,
      };
    }
  }
  
  // Check posture transition patterns
  if (context.currentPosture) {
    const transitionPattern = signature.patterns.postureTransitionPatterns.find(
      p => p.from === context.currentPosture
    );
    if (transitionPattern && transitionPattern.frequency > 2) {
      return {
        predictedAction: `transition_to_${transitionPattern.to}`,
        confidence: Math.min(0.6, transitionPattern.frequency / 10),
        reason: `Operator frequently transitions from ${context.currentPosture} to ${transitionPattern.to}`,
      };
    }
  }
  
  // Default: use most common directive
  return {
    predictedAction: signature.statistics.mostCommonDirective,
    confidence: 0.3,
    reason: "Based on operator's most common directive pattern",
  };
}

/**
 * Get inherited traits for subsystem
 */
export function getInheritedTraits(subsystem: string): SubsystemTrait[] {
  if (!inheritanceState) return [];
  
  const inheritance = inheritanceState.subsystemInheritances[subsystem];
  if (!inheritance) return [];
  
  return inheritance.inheritedTraits;
}
