// UOI Orchestrator - Decides what runs next

import { UOIDirective } from "./contract";
import { getPendingSignals, clearSignals } from "./signals";
import { evaluateRules } from "./governance";
import { explainDecision } from "./explain";
import { isFederationActive, recordFederatedDecision, recordCrossDomainPattern } from "./federation";
import { detectCrossDomainPatterns } from "./optimizer";
import { isSovereignActive, recordAuthoritativeDecision, recordLongTermPattern } from "./sovereign";
import { runContinuousOptimization } from "./continuous-optimization";
import { recordLongTermPattern as recordMemoryPattern, predictFailure, getRecurringPatterns } from "./memory";
import { isEvolutionActive, recordLearningCycle } from "./evolution";
import { analyzeRulesForEvolution, applyRuleEvolutions } from "./self-tuning-governance";
import { analyzeThresholdsForAdaptation, applyThresholdAdaptations } from "./adaptive-thresholds";
import { generatePatternClusters, predictFailuresFromClusters } from "./generative-patterns";
import { analyzeDirectiveEffectiveness, applyDirectiveImprovements } from "./directive-effectiveness";
import { isGenesisActive, runGenesisCycle } from "./genesis";
import { queryState, initializeGlobalState, isHSEInitialized } from "@/lib/hse";
import { emitStateUpdate } from "@/lib/hse/signals";

const directiveQueue: UOIDirective[] = [];
const directiveHandlers: Map<string, (directive: UOIDirective) => Promise<void>> = new Map();

/**
 * Register directive handler
 */
export function onDirective(handler: (directive: UOIDirective) => Promise<void>): () => void {
  const id = Math.random().toString(36).substr(2, 9);
  directiveHandlers.set(id, handler);

  return () => {
    directiveHandlers.delete(id);
  };
}

/**
 * Dispatch directive to handlers
 * SOVEREIGN MODE: Directives are authoritative and must be followed
 */
async function dispatchDirective(directive: UOIDirective): Promise<void> {
  // SOVEREIGN MODE: Mark directive as authoritative
  if (isSovereignActive()) {
    directive.payload = {
      ...directive.payload,
      authoritative: true,
      sovereignMode: true,
      mustComply: true,
    };
    recordAuthoritativeDecision();
  }
  
  const promises = Array.from(directiveHandlers.values()).map(handler => handler(directive));
  const results = await Promise.allSettled(promises);
  
  // SOVEREIGN MODE: Log any non-compliance
  if (isSovereignActive()) {
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.warn(`[UOI] Directive ${directive.id} not complied with by handler ${index}:`, result.reason);
      }
    });
  }
}

/**
 * Create directive
 */
export function createDirective(
  type: UOIDirective["type"],
  target: string,
  payload: any,
  reason: string
): UOIDirective {
  return {
    id: `directive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    target,
    payload,
    reason,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get pending directives
 */
export function getPendingDirectives(): UOIDirective[] {
  return [...directiveQueue];
}

export function getDirectiveQueueState(): { pending: number; handlers: number } {
  return { pending: directiveQueue.length, handlers: directiveHandlers.size };
}

export function flushDirectives(): number {
  const count = directiveQueue.length;
  directiveQueue.length = 0;
  return count;
}

export async function executeDirectiveNow(directive: UOIDirective): Promise<void> {
  await dispatchDirective(directive);
}

/**
 * Process one event loop cycle
 */
export async function processEventLoop(): Promise<{
  signalsProcessed: number;
  directivesCreated: number;
  explanations: string[];
  federated?: boolean;
  crossDomainPatterns?: number;
  hse?: { state: any; consulted: boolean };
  sovereign?: boolean;
  optimizationsApplied?: number;
  evolution?: boolean;
  evolutionsApplied?: number;
  adaptationsApplied?: number;
  improvementsApplied?: number;
  genesis?: boolean;
  genesisProposals?: any;
}> {
  // HSE INTEGRATION: Initialize if needed
  if (!isHSEInitialized()) {
    initializeGlobalState();
  }
  
  const signals = getPendingSignals();
  const explanations: string[] = [];
  const federationActive = isFederationActive();

  if (signals.length === 0) {
    const genesisActive = isGenesisActive();
    const evolutionActive = isEvolutionActive();
    return { 
      signalsProcessed: 0, 
      directivesCreated: 0, 
      explanations: [], 
      federated: federationActive,
      sovereign: isSovereignActive(),
      optimizationsApplied: 0,
      evolution: evolutionActive,
      evolutionsApplied: 0,
      adaptationsApplied: 0,
      improvementsApplied: 0,
      genesis: genesisActive,
      genesisProposals: null
    };
  }

  // Build context from signals (enhanced for federation)
  const context: any = {
    errorRate: 0,
    workflowQueue: 0,
    mappingDrift: false,
    tenantAnomaly: false,
    throughputDrop: 0,
    // Federation-aware context
    subsystemSignals: {} as Record<string, any[]>,
    crossDomainMetrics: {} as Record<string, number>,
  };

  // Group signals by subsystem for federation analysis
  signals.forEach(signal => {
    const source = signal.source || "unknown";
    if (!context.subsystemSignals[source]) {
      context.subsystemSignals[source] = [];
    }
    context.subsystemSignals[source].push(signal);

    switch (signal.type) {
      case "error":
        context.errorRate = signal.payload.errorRate || context.errorRate;
        break;
      case "metric":
        if (signal.payload.workflowQueue !== undefined) {
          context.workflowQueue = signal.payload.workflowQueue;
        }
        if (signal.payload.throughputDrop !== undefined) {
          context.throughputDrop = signal.payload.throughputDrop;
        }
        break;
      case "drift":
        context.mappingDrift = true;
        break;
      case "anomaly":
        context.tenantAnomaly = true;
        break;
    }
  });

  // FEDERATION MODE: Detect cross-domain patterns
  let crossDomainPatterns: any[] = [];
  if (federationActive) {
    crossDomainPatterns = detectCrossDomainPatterns(signals, context);
    
    // Record cross-domain patterns
    crossDomainPatterns.forEach(pattern => {
      recordCrossDomainPattern(
        pattern.pattern,
        pattern.subsystems,
        pattern.severity
      );
    });
  }
  
  // SOVEREIGN MODE: Run continuous optimization
  const sovereignActive = isSovereignActive();
  let optimizationActions: any[] = [];
  if (sovereignActive) {
    const optimizationResult = await runContinuousOptimization();
    optimizationActions = optimizationResult.actions;
    
    // Record long-term patterns for recurring issues
    // This will be populated as patterns are detected over time
    
    // Predict failures and record patterns
    Object.keys(context.subsystemSignals || {}).forEach(subsystem => {
      const subsystemSignals = context.subsystemSignals[subsystem];
      if (subsystemSignals.length > 0) {
        const prediction = predictFailure(subsystem, { signals: subsystemSignals });
        if (prediction.willFail && prediction.confidence > 0.6) {
          const patternKey = `${subsystem}-failure-pattern`;
          recordMemoryPattern(patternKey, { subsystem, signals: subsystemSignals }, prediction.reason);
        }
      }
    });
  }
  
  // GENESIS MODE: Self-architecting intelligence
  const genesisActive = isGenesisActive();
  let genesisProposals: any = null;
  
  if (genesisActive) {
    // Run Genesis cycle to analyze architecture and generate proposals
    const genesisResult = runGenesisCycle({
      signals,
      subsystems: Object.keys(context.subsystemSignals || {}),
      performance: {
        errorRate: context.errorRate,
        workflowQueue: context.workflowQueue,
        throughputDrop: context.throughputDrop,
      },
    });
    genesisProposals = genesisResult.proposals;
  }
  
  // EVOLUTION MODE: Self-improving intelligence
  const evolutionActive = isEvolutionActive();
  let evolutionsApplied = 0;
  let adaptationsApplied = 0;
  let improvementsApplied = 0;
  
  if (evolutionActive) {
    // 1. Generate pattern clusters (generative pattern intelligence)
    const clusters = generatePatternClusters();
    const failurePredictions = predictFailuresFromClusters(clusters);
    
    // 2. Analyze rules for evolution (self-tuning governance)
    const ruleProposals = analyzeRulesForEvolution();
    evolutionsApplied = await applyRuleEvolutions(ruleProposals);
    
    // 3. Analyze thresholds for adaptation (adaptive thresholds)
    const thresholdAnalyses = analyzeThresholdsForAdaptation();
    adaptationsApplied = await applyThresholdAdaptations(thresholdAnalyses);
    
    // 4. Analyze directive effectiveness (experience-driven directives)
    const directiveImprovements = analyzeDirectiveEffectiveness();
    improvementsApplied = await applyDirectiveImprovements(directiveImprovements);
    
    // Record learning cycle
    if (evolutionsApplied > 0 || adaptationsApplied > 0 || improvementsApplied > 0) {
      recordLearningCycle();
    }
  }

  // HSE INTEGRATION: Consult global state before evaluating rules
  const globalState = queryState();
  let hseConsulted = false;
  
  if (globalState) {
    hseConsulted = true;
    // Enhance context with global state
    context.globalState = {
      risk: globalState.vectors.risk.aggregate_risk,
      stability: globalState.stability.overall_stability,
      pressure: globalState.vectors.pressure.aggregate_pressure,
      anomalies: globalState.anomalies.length,
    };
    
    // Emit state update
    emitStateUpdate(["orchestrator_cycle"]);
  }

  // Evaluate rules (with federation awareness and HSE context)
  const ruleEvaluations = evaluateRules(context);
  const triggeredRules = ruleEvaluations.filter(e => e.triggered);

  // FEDERATION MODE: Generate cross-domain directives
  const processedSignalIds: string[] = [];
  triggeredRules.forEach(({ rule }) => {
    // In federation mode, directives can target any subsystem
    const directive = createDirective(
      rule.action as UOIDirective["type"],
      federationActive ? determineFederatedTarget(rule, context, crossDomainPatterns) : rule.id,
      { rule: rule.id, context, federation: federationActive, crossDomainPatterns },
      federationActive 
        ? `Federated: ${rule.name} triggered (cross-domain awareness)`
        : `${rule.name} triggered`
    );

    directiveQueue.push(directive);
    explanations.push(explainDecision(rule, context, directive));

    // Mark signals as processed
    signals.forEach(s => {
      if (s.source === rule.id || s.type === rule.name.toLowerCase()) {
        processedSignalIds.push(s.id);
      }
    });
  });

  // FEDERATION MODE: Create cross-domain directives from patterns
  if (federationActive && crossDomainPatterns.length > 0) {
    crossDomainPatterns.forEach(pattern => {
      if (pattern.severity === "high" || pattern.severity === "critical") {
        const directive = createFederatedDirective(pattern, context);
        directiveQueue.push(directive);
        explanations.push(`Cross-domain pattern detected: ${pattern.pattern} → ${directive.type} to ${directive.target}`);
      }
    });
    recordFederatedDecision();
  }

  // Dispatch directives
  const directivesToDispatch = [...directiveQueue];
  directiveQueue.length = 0;

  for (const directive of directivesToDispatch) {
    await dispatchDirective(directive);
  }

  // Clear processed signals
  clearSignals(processedSignalIds.length > 0 ? processedSignalIds : signals.map(s => s.id));

  return {
    signalsProcessed: signals.length,
    directivesCreated: triggeredRules.length + (federationActive ? crossDomainPatterns.length : 0) + (sovereignActive ? optimizationActions.length : 0),
    explanations,
    federated: federationActive,
    crossDomainPatterns: crossDomainPatterns.length,
    sovereign: sovereignActive,
    optimizationsApplied: sovereignActive ? optimizationActions.filter(a => a.applied).length : 0,
    evolution: evolutionActive,
    evolutionsApplied: evolutionActive ? evolutionsApplied : 0,
    adaptationsApplied: evolutionActive ? adaptationsApplied : 0,
    improvementsApplied: evolutionActive ? improvementsApplied : 0,
    genesis: genesisActive,
    genesisProposals: genesisActive ? {
      subsystems: genesisProposals?.subsystems?.length || 0,
      governance: genesisProposals?.governance?.length || 0,
      intelligence: genesisProposals?.intelligence?.length || 0,
      refactoring: genesisProposals?.refactoring?.length || 0,
      signals: genesisProposals?.signals?.length || 0,
      directives: genesisProposals?.directives?.length || 0,
      blueprints: genesisProposals?.blueprints?.length || 0,
    } : null,
    hse: globalState ? {
      state: {
        risk: globalState.vectors.risk.aggregate_risk,
        stability: globalState.stability.overall_stability,
        pressure: globalState.vectors.pressure.aggregate_pressure,
      },
      consulted: hseConsulted,
    } : undefined
  };
}

/**
 * Alias for processEventLoop (for API compatibility)
 */
export const processOneCycle = processEventLoop;

/**
 * Determine federated target based on cross-domain patterns
 */
function determineFederatedTarget(
  rule: any,
  context: any,
  crossDomainPatterns: any[]
): string {
  // Cross-domain routing logic
  // Example: workflow congestion → might throttle AMP
  if (rule.action === "REBALANCE_WORKFLOW" && context.subsystemSignals.amp?.length > 0) {
    // If AMP is also showing issues, throttle AMP instead
    return "amp";
  }
  
  // Example: AMP errors + compliance violations → trigger compliance review
  if (rule.action === "PAUSE_PIPELINE" && context.subsystemSignals.compliance?.length > 0) {
    const hasComplianceIssues = context.subsystemSignals.compliance.some((s: any) => 
      s.type === "anomaly" || s.priority === "high"
    );
    if (hasComplianceIssues) {
      return "compliance";
    }
  }
  
  // Example: Analytics risk + AMP drift → trigger analytics recalibration
  if (rule.action === "REWRITE_MAPPING" && context.subsystemSignals.analytics?.length > 0) {
    return "analytics";
  }
  
  // Default to rule target
  return rule.id;
}

/**
 * Create federated directive from cross-domain pattern
 */
function createFederatedDirective(pattern: any, context: any): UOIDirective {
  // Map patterns to directives
  let directiveType: UOIDirective["type"] = "TRIGGER_ALERT";
  let target = pattern.subsystems[0];
  
  if (pattern.pattern.includes("error") && pattern.pattern.includes("workflow")) {
    directiveType = "REBALANCE_WORKFLOW";
    target = "workflow";
  } else if (pattern.pattern.includes("drift") && pattern.pattern.includes("analytics")) {
    directiveType = "REWRITE_MAPPING";
    target = "amp";
  } else if (pattern.pattern.includes("compliance") && pattern.pattern.includes("risk")) {
    directiveType = "TRIGGER_ALERT";
    target = "compliance";
  } else if (pattern.pattern.includes("notification") && pattern.pattern.includes("failure")) {
    directiveType = "TRIGGER_ALERT";
    target = "notification";
  }
  
  return createDirective(
    directiveType,
    target,
    { pattern: pattern.pattern, subsystems: pattern.subsystems, context },
    `Federated response to cross-domain pattern: ${pattern.pattern}`
  );
}
