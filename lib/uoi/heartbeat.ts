// UOI Heartbeat - The core engine that makes UOI come alive
// Single intelligence loop: signal → normalize → store → analyze → decide → route → explain

import { normalizeSignal, getPendingSignals } from "./signals";
import { UoiRules } from "./governance";
import { remember, getRecentSignals } from "./memory";
import { analyzeSignals, detectCrossDomainPatterns } from "./optimizer";
import { routeDecision, routeFederatedDecision } from "./router";
import { explain } from "./explain";
import { isFederationActive } from "./federation";
import { synthesizeGlobalState, queryState, initializeGlobalState, isHSEInitialized } from "@/lib/hse";
import { emitStateUpdate, emitStateAnomaly } from "@/lib/hse/signals";
import { receiveUOIDirective } from "@/lib/hse/uoi-integration";
import { 
  isInheritanceModeActive, 
  initializeInheritanceMode, 
  recordOperatorDecision,
  predictOperatorAction 
} from "@/lib/hse/inheritance";

export interface HeartbeatOutput {
  decision: string;
  directive: {
    target: string;
    action: string;
  };
  explanation: string;
  metrics: {
    errorRate: number;
    driftCount: number;
    queuePressure: number;
  };
  timestamp: number;
}

/**
 * UOI Heartbeat - The minimum viable intelligence loop
 * 
 * FEDERATION MODE: Collects signals from all subsystems and makes holistic decisions
 * 
 * 1. Receives signals (or collects from all subsystems in federation mode)
 * 2. Normalizes them
 * 3. Stores them
 * 4. Analyzes patterns (cross-domain in federation mode)
 * 5. Makes a decision (federated awareness)
 * 6. Routes a directive (cross-domain in federation mode)
 * 7. Generates an explanation
 */
export function uoiHeartbeat(rawSignal?: any): HeartbeatOutput {
  const federationActive = isFederationActive();
  
  // HSE INTEGRATION: Initialize HSE if not already initialized
  if (!isHSEInitialized()) {
    initializeGlobalState();
  }
  
  // FEDERATION MODE: Collect signals from all subsystems
  let signalsToProcess: any[] = [];
  
  if (federationActive) {
    // Collect all pending signals from all subsystems
    const allSignals = getPendingSignals();
    signalsToProcess = allSignals.length > 0 ? allSignals : (rawSignal ? [rawSignal] : []);
  } else {
    // Normal mode: process single signal
    signalsToProcess = rawSignal ? [rawSignal] : [];
  }

  if (signalsToProcess.length === 0) {
    // No signals, but still update HSE with current state
    const globalState = queryState();
    if (globalState) {
      emitStateUpdate(["heartbeat_no_signals"]);
    }
    
    return {
      decision: "NOOP",
      directive: { target: "none", action: "noop" },
      explanation: "No signals to process",
      metrics: { errorRate: 0, driftCount: 0, queuePressure: 0 },
      timestamp: Date.now()
    };
  }

  // 1. Normalize all signals
  const normalizedSignals = signalsToProcess.map(s => normalizeSignal(s));

  // 2. Store them in memory
  normalizedSignals.forEach(signal => remember(signal));

  // 3. HSE INTEGRATION: Send subsystem updates to HSE
  const subsystemUpdates: any[] = [];
  const subsystemMetrics: Record<string, any> = {};
  
  normalizedSignals.forEach(signal => {
    const source = signal.source || "unknown";
    if (!subsystemMetrics[source]) {
      subsystemMetrics[source] = {
        errors: 0,
        throughput: 0,
        drift: 0,
        load: 0,
        queueLength: 0,
        successRate: 1.0,
      };
    }
    
    // Extract metrics from signals
    if (signal.type === "error") {
      subsystemMetrics[source].errors += signal.payload.errorCount || 1;
    }
    if (signal.type === "metric") {
      subsystemMetrics[source].throughput = signal.payload.throughput || subsystemMetrics[source].throughput;
      subsystemMetrics[source].load = signal.payload.load || subsystemMetrics[source].load;
      subsystemMetrics[source].queueLength = signal.payload.queueLength || subsystemMetrics[source].queueLength;
      subsystemMetrics[source].successRate = signal.payload.successRate || subsystemMetrics[source].successRate;
    }
    if (signal.type === "drift") {
      subsystemMetrics[source].drift = signal.payload.driftMagnitude || 0;
    }
  });
  
  // Send updates to HSE
  Object.entries(subsystemMetrics).forEach(([subsystem, metrics]) => {
    subsystemUpdates.push({
      subsystem,
      health: metrics,
      timestamp: new Date().toISOString(),
    });
  });
  
  if (subsystemUpdates.length > 0) {
    synthesizeGlobalState(subsystemUpdates);
    emitStateUpdate(subsystemUpdates.map(u => u.subsystem));
  }

  // 4. HSE INTEGRATION: Query global state for decision context
  const globalState = queryState();
  const globalContext: any = {};
  
  if (globalState) {
    globalContext.globalState = {
      risk: globalState.vectors.risk.aggregate_risk,
      stability: globalState.stability.overall_stability,
      anomalies: globalState.anomalies.length,
      pressure: globalState.vectors.pressure.aggregate_pressure,
    };
    
    // Emit anomaly signals if detected
    globalState.anomalies.forEach(anomaly => {
      if (anomaly.severity === "critical" || anomaly.severity === "high") {
        emitStateAnomaly(anomaly, anomaly.severity, anomaly.affectedAreas);
      }
    });
  }

  // 5. Pull recent signals for context (all subsystems in federation mode)
  const recent = getRecentSignals(federationActive ? 100 : 50);

  // 6. Analyze patterns (with cross-domain detection in federation mode)
  const metrics = analyzeSignals(recent);
  
  // FEDERATION MODE: Detect cross-domain patterns
  let crossDomainPatterns: any[] = [];
  let context: any = { subsystemSignals: {} };
  
  if (federationActive) {
    // Build context with subsystem grouping
    normalizedSignals.forEach(signal => {
      const source = signal.source || "unknown";
      if (!context.subsystemSignals[source]) {
        context.subsystemSignals[source] = [];
      }
      context.subsystemSignals[source].push(signal);
    });
    
    crossDomainPatterns = detectCrossDomainPatterns(normalizedSignals, context);
  }

  // 5. Decide what to do (with federation awareness)
  let decision = "NOOP";

  if (federationActive && crossDomainPatterns.length > 0) {
    // FEDERATION MODE: Prioritize cross-domain patterns
    const criticalPattern = crossDomainPatterns.find(p => p.severity === "critical");
    const highPattern = crossDomainPatterns.find(p => p.severity === "high");
    
    if (criticalPattern) {
      if (criticalPattern.pattern.includes("error") && criticalPattern.pattern.includes("workflow")) {
        decision = "REBALANCE_WORKFLOW";
      } else if (criticalPattern.pattern.includes("compliance")) {
        decision = "TRIGGER_ALERT";
      } else {
        decision = "PAUSE_PIPELINE";
      }
    } else if (highPattern) {
      if (highPattern.pattern.includes("drift")) {
        decision = "REWRITE_MAPPING";
      } else {
        decision = "TRIGGER_ALERT";
      }
    }
  }

  // HSE INTEGRATION: Use global state for decision context
  if (decision === "NOOP" && globalState) {
    // Use HSE global state for more informed decisions
    const aggregateRisk = globalState.vectors.risk.aggregate_risk;
    const aggregatePressure = globalState.vectors.pressure.aggregate_pressure;
    const stability = globalState.stability.overall_stability;
    
    // High risk triggers
    if (aggregateRisk > 0.7) {
      decision = "PAUSE_PIPELINE";
    }
    // High pressure triggers
    else if (aggregatePressure > 0.8) {
      decision = "REBALANCE_WORKFLOW";
    }
    // Low stability triggers
    else if (stability < 0.5) {
      decision = "TRIGGER_ALERT";
    }
    // Critical anomalies trigger
    else if (globalState.anomalies.some(a => a.severity === "critical")) {
      decision = "PAUSE_PIPELINE";
    }
  }
  
  // Fallback to standard rules if no HSE context or pattern triggered
  if (decision === "NOOP") {
    if (metrics.errorRate > UoiRules.maxErrorRate)
      decision = "PAUSE_PIPELINE";
    else if (metrics.driftCount > UoiRules.driftSensitivity * recent.length)
      decision = "REWRITE_MAPPING";
    else if (metrics.queuePressure > UoiRules.maxWorkflowQueue)
      decision = "REBALANCE_WORKFLOW";
  }

  // 6. Route the directive (cross-domain in federation mode)
  const directive = federationActive && crossDomainPatterns.length > 0
    ? routeFederatedDecision(decision, crossDomainPatterns[0], context)
    : routeDecision(decision);

  // 7. Generate a human-readable explanation (with federation context)
  const explanation = federationActive
    ? explain(decision, metrics, crossDomainPatterns)
    : explain(decision, metrics);

  // HSE INTEGRATION: Send directive to HSE
  if (directive.action !== "noop") {
    receiveUOIDirective({
      target: directive.target,
      action: directive.action,
      reason: explanation,
    });
  }

  // INHERITANCE MODE: Record operator decision if inheritance is active
  if (isInheritanceModeActive() && decision !== "NOOP") {
    // Try to detect operator from context (default to "auren" for now)
    const operator = "auren"; // TODO: Get actual operator from context
    recordOperatorDecision(operator, {
      type: decision,
      context: explanation,
      directive: directive.action,
      effectiveness: 0.5, // TODO: Track effectiveness over time
    });
  }

  // 8. Return the heartbeat output
  return {
    decision,
    directive,
    explanation,
    metrics,
    timestamp: Date.now()
  };
}
