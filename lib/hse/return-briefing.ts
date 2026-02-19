// Return Briefing Engine (RBE)
// Generates comprehensive briefings when operator returns after absence
// Ties together lineage, inheritance, crest, posture, directives, and hyperstate

import { getDepartureState, handleOperatorReturn } from "./departure";
import { getLineageState, getLineageThreads } from "./lineage";
import { getInheritanceState, getOperatorSignature } from "./inheritance";
import { queryState } from "./query";
import { buildHyperstate } from "./buildHyperstate";
import { getPendingDirectives } from "@/lib/uoi/orchestrator";
import { getRecentSignals } from "@/lib/uoi/memory";
import { recordLineageEvent } from "./lineage";
import { getOperatorGlyphs } from "./lineage";

export interface ReturnBriefing {
  timestamp: string;
  operator: string;
  absenceDuration: {
    milliseconds: number;
    seconds: number;
    minutes: number;
    hours: number;
    humanReadable: string;
  };
  
  // Posture timeline
  postureTimeline: PostureTransition[];
  
  // Directive evolution
  directiveEvolution: {
    directivesIssued: number;
    directiveLog: DirectiveLogEntry[];
    directiveReasoning: string[];
  };
  
  // Anomaly clusters
  anomalyClusters: AnomalyClusterSummary[];
  
  // Subsystem lineage updates
  subsystemLineage: SubsystemLineageUpdate[];
  
  // Crest lineage marks
  crestEvolution: {
    marksAdded: number;
    glyphsAdded: number;
    ritualsTriggered: number;
    currentRitual?: string;
    crestState: {
      innerRing: number;
      middleRing: number;
      outerRing: number;
    };
  };
  
  // Stability arcs
  stabilityArcs: StabilityArc[];
  
  // Operator signature deltas
  operatorSignatureDeltas: OperatorSignatureDelta;
  
  // Genesis or succession pre-activations
  preActivations: {
    succession: boolean;
    directiveEvolution: boolean;
    crestEvolution: boolean;
  };
  
  // Hyperstate snapshot
  currentHyperstate: {
    globalState: string;
    subsystems: Record<string, any>;
    riskVectors: any[];
    driftVectors: any[];
    anomalyClusters: any[];
  };
  
  // Summary
  summary: {
    keyHighlights: string[];
    recommendations: string[];
    systemHealth: "excellent" | "good" | "moderate" | "concerning";
  };
}

export interface PostureTransition {
  from: string;
  to: string;
  timestamp: string;
  reason: string;
  duration?: number;
}

export interface DirectiveLogEntry {
  id: string;
  type: string;
  target: string;
  reason: string;
  timestamp: string;
  effective?: boolean;
}

export interface AnomalyClusterSummary {
  id: string;
  severity: number;
  subsystems: string[];
  label: string;
  firstSeen: string;
  lastSeen: string;
  count: number;
}

export interface SubsystemLineageUpdate {
  subsystem: string;
  events: number;
  anomalies: number;
  recoveries: number;
  postureShifts: number;
  healthDelta: number;
  evolutionHighlights: string[];
}

export interface StabilityArc {
  type: "calm" | "tension" | "recovery";
  startTime: string;
  endTime?: string;
  duration: number;
  description: string;
}

export interface OperatorSignatureDelta {
  decisionsMade: number;
  overridesExecuted: number;
  genesisCyclesTriggered: number;
  preferredPosture: string;
  riskToleranceShift: number;
  anomalySensitivityShift: number;
  newPatterns: string[];
}

/**
 * Generate return briefing
 */
export async function generateReturnBriefing(
  operator: string = "auren"
): Promise<ReturnBriefing> {
  const now = new Date();
  const departureState = getDepartureState();
  
  // Calculate absence duration
  const sealedAt = departureState?.sealedAt 
    ? new Date(departureState.sealedAt).getTime()
    : now.getTime() - 3600000; // Default to 1 hour if no departure state
  const absenceMs = now.getTime() - sealedAt;
  const absenceSeconds = Math.floor(absenceMs / 1000);
  const absenceMinutes = Math.floor(absenceSeconds / 60);
  const absenceHours = Math.floor(absenceMinutes / 60);
  
  const humanReadableDuration = absenceHours > 0
    ? `${absenceHours}h ${absenceMinutes % 60}m`
    : absenceMinutes > 0
    ? `${absenceMinutes}m ${absenceSeconds % 60}s`
    : `${absenceSeconds}s`;
  
  // Get current state
  const currentState = queryState();
  const currentHyperstate = await buildHyperstate();
  const lineageState = getLineageState();
  const inheritanceState = getInheritanceState();
  const operatorReturn = handleOperatorReturn(operator);
  
  // 1. Posture timeline
  const postureTimeline = generatePostureTimeline(
    departureState,
    currentState,
    absenceMs
  );
  
  // 2. Directive evolution
  const directiveEvolution = generateDirectiveEvolution(
    departureState,
    currentState,
    absenceMs
  );
  
  // 3. Anomaly clusters
  const anomalyClusters = generateAnomalyClusters(
    departureState,
    currentHyperstate,
    absenceMs
  );
  
  // 4. Subsystem lineage updates
  const subsystemLineage = generateSubsystemLineage(
    departureState,
    lineageState,
    currentState,
    absenceMs
  );
  
  // 5. Crest evolution
  const crestEvolution = generateCrestEvolution(
    departureState,
    lineageState,
    absenceMs
  );
  
  // 6. Stability arcs
  const stabilityArcs = generateStabilityArcs(
    departureState,
    operatorReturn,
    absenceMs
  );
  
  // 7. Operator signature deltas
  const operatorSignatureDeltas = generateOperatorSignatureDeltas(
    departureState,
    inheritanceState,
    operator,
    absenceMs
  );
  
  // 8. Pre-activations
  const preActivations = operatorReturn.preInitialized;
  
  // 9. Summary
  const summary = generateSummary(
    postureTimeline,
    anomalyClusters,
    currentHyperstate,
    absenceMs
  );
  
  // Record briefing generation event
  recordLineageEvent({
    type: "crest_ritual",
    operator,
    metadata: {
      message: `Return briefing generated after ${humanReadableDuration} absence`,
      absenceDuration: absenceMs,
      highlights: summary.keyHighlights.length,
    },
  });
  
  return {
    timestamp: now.toISOString(),
    operator,
    absenceDuration: {
      milliseconds: absenceMs,
      seconds: absenceSeconds,
      minutes: absenceMinutes,
      hours: absenceHours,
      humanReadable: humanReadableDuration,
    },
    postureTimeline,
    directiveEvolution,
    anomalyClusters,
    subsystemLineage,
    crestEvolution,
    stabilityArcs,
    operatorSignatureDeltas,
    preActivations,
    currentHyperstate: {
      globalState: currentHyperstate.globalState || "stable",
      subsystems: currentHyperstate.subsystems || {},
      riskVectors: currentHyperstate.riskVectors || [],
      driftVectors: currentHyperstate.driftVectors || [],
      anomalyClusters: currentHyperstate.anomalyClusters || [],
    },
    summary,
  };
}

/**
 * Generate posture timeline
 */
function generatePostureTimeline(
  departureState: any,
  currentState: any,
  absenceMs: number
): PostureTransition[] {
  const timeline: PostureTransition[] = [];
  
  if (!departureState) return timeline;
  
  const initialPosture = departureState.snapshot?.posture || "normal";
  const currentPosture = currentState?.sovereignPosture || initialPosture;
  
  // Add initial posture
  timeline.push({
    from: initialPosture,
    to: initialPosture,
    timestamp: departureState.sealedAt,
    reason: "State sealed at departure",
  });
  
  // Add posture shifts from briefing
  if (departureState.returnBriefing?.changes?.postureShifts) {
    departureState.returnBriefing.changes.postureShifts.forEach((shift: any) => {
      timeline.push({
        from: shift.from,
        to: shift.to,
        timestamp: shift.timestamp,
        reason: "Autonomous posture adjustment",
      });
    });
  }
  
  // Add current posture if different
  if (currentPosture !== initialPosture) {
    const lastShift = timeline[timeline.length - 1];
    if (!lastShift || lastShift.to !== currentPosture) {
      timeline.push({
        from: lastShift?.to || initialPosture,
        to: currentPosture,
        timestamp: new Date().toISOString(),
        reason: "Current posture on return",
      });
    }
  }
  
  return timeline;
}

/**
 * Generate directive evolution
 */
function generateDirectiveEvolution(
  departureState: any,
  currentState: any,
  absenceMs: number
): ReturnBriefing["directiveEvolution"] {
  const directives = getPendingDirectives();
  const recentSignals = getRecentSignals(100);
  
  const directiveLog: DirectiveLogEntry[] = [];
  
  // Get directives from departure snapshot
  const departureDirectives = departureState?.snapshot?.directives || [];
  
  // Track new directives
  directives.forEach(d => {
    directiveLog.push({
      id: d.id,
      type: d.type,
      target: d.target,
      reason: d.reason,
      timestamp: d.timestamp,
      effective: true,
    });
  });
  
  // Generate reasoning from signals
  const reasoning: string[] = [];
  const errorSignals = recentSignals.filter(s => 
    s.type === "error" || s.type?.includes("error") || s.priority === "high" || s.priority === "critical"
  );
  
  if (errorSignals.length > 0) {
    reasoning.push(`System issued ${errorSignals.length} error-related directives during absence`);
  }
  
  const driftSignals = recentSignals.filter(s => s.type === "drift" || s.type === "schema_drift");
  if (driftSignals.length > 0) {
    reasoning.push(`Detected ${driftSignals.length} drift events, triggering adaptive responses`);
  }
  
  if (reasoning.length === 0) {
    reasoning.push("System maintained stability through autonomous directive management");
  }
  
  return {
    directivesIssued: directiveLog.length,
    directiveLog: directiveLog.slice(0, 20), // Last 20 directives
    directiveReasoning: reasoning,
  };
}

/**
 * Generate anomaly clusters
 */
function generateAnomalyClusters(
  departureState: any,
  currentHyperstate: any,
  absenceMs: number
): AnomalyClusterSummary[] {
  const clusters: AnomalyClusterSummary[] = [];
  
  if (!currentHyperstate?.anomalyClusters) return clusters;
  
  currentHyperstate.anomalyClusters.forEach((cluster: any) => {
    clusters.push({
      id: cluster.id,
      severity: cluster.severity,
      subsystems: cluster.subsystems,
      label: cluster.label,
      firstSeen: cluster.firstSeen || new Date().toISOString(),
      lastSeen: cluster.lastSeen || new Date().toISOString(),
      count: 1,
    });
  });
  
  // Add clusters from briefing changes
  if (departureState?.returnBriefing?.changes?.anomalyClusters) {
    departureState.returnBriefing.changes.anomalyClusters.forEach((change: any) => {
      clusters.push({
        id: `briefing-${Date.now()}`,
        severity: Math.max(...(change.severity || [5])),
        subsystems: [],
        label: `${change.count} anomalies detected`,
        firstSeen: change.timestamp,
        lastSeen: change.timestamp,
        count: change.count,
      });
    });
  }
  
  return clusters;
}

/**
 * Generate subsystem lineage updates
 */
function generateSubsystemLineage(
  departureState: any,
  lineageState: any,
  currentState: any,
  absenceMs: number
): SubsystemLineageUpdate[] {
  const updates: SubsystemLineageUpdate[] = [];
  
  if (!lineageState?.ledger?.threads) return updates;
  
  const threads = getLineageThreads();
  const departureSubsystems = departureState?.snapshot?.subsystems || {};
  const currentSubsystems = currentState?.subsystems || {};
  
  Object.entries(threads).forEach(([subsystem, thread]: [string, any]) => {
    const departureHealth = departureSubsystems[subsystem]?.health || 1.0;
    const currentHealth = currentSubsystems[subsystem]?.health || 1.0;
    const healthDelta = currentHealth - departureHealth;
    
    const highlights: string[] = [];
    
    if (thread.metrics.anomalies > 0) {
      highlights.push(`${thread.metrics.anomalies} anomalies detected`);
    }
    if (thread.metrics.recoveries > 0) {
      highlights.push(`${thread.metrics.recoveries} recovery cycles completed`);
    }
    if (thread.metrics.postureShifts > 0) {
      highlights.push(`${thread.metrics.postureShifts} posture adjustments`);
    }
    
    if (healthDelta !== 0) {
      highlights.push(`Health ${healthDelta > 0 ? "improved" : "degraded"} by ${Math.abs(healthDelta * 100).toFixed(1)}%`);
    }
    
    updates.push({
      subsystem,
      events: thread.metrics.totalEvents || 0,
      anomalies: thread.metrics.anomalies || 0,
      recoveries: thread.metrics.recoveries || 0,
      postureShifts: thread.metrics.postureShifts || 0,
      healthDelta,
      evolutionHighlights: highlights.length > 0 ? highlights : ["Stable operation maintained"],
    });
  });
  
  return updates;
}

/**
 * Generate crest evolution summary
 */
function generateCrestEvolution(
  departureState: any,
  lineageState: any,
  absenceMs: number
): ReturnBriefing["crestEvolution"] {
  if (!lineageState?.ledger) {
    return {
      marksAdded: 0,
      glyphsAdded: 0,
      ritualsTriggered: 0,
      crestState: {
        innerRing: 0,
        middleRing: 0,
        outerRing: 0,
      },
    };
  }
  
  const departureMarks = departureState?.snapshot?.lineage?.ledger?.marks?.length || 0;
  const currentMarks = lineageState.ledger.marks.length;
  const marksAdded = Math.max(0, currentMarks - departureMarks);
  
  const departureGlyphs = departureState?.snapshot?.lineage?.ledger?.glyphs?.length || 0;
  const currentGlyphs = lineageState.ledger.glyphs.length;
  const glyphsAdded = Math.max(0, currentGlyphs - departureGlyphs);
  
  const crestState = lineageState.ledger.crestState || {};
  const currentRitual = crestState.currentRitual;
  
  return {
    marksAdded,
    glyphsAdded,
    ritualsTriggered: lineageState.ledger.statistics.totalRituals || 0,
    currentRitual,
    crestState: {
      innerRing: (crestState.innerRing || []).length,
      middleRing: (crestState.middleRing || []).length,
      outerRing: (crestState.outerRing || []).length,
    },
  };
}

/**
 * Generate stability arcs
 */
function generateStabilityArcs(
  departureState: any,
  operatorReturn: any,
  absenceMs: number
): StabilityArc[] {
  const arcs: StabilityArc[] = [];
  
  if (!departureState) return arcs;
  
  // Analyze briefing changes for stability patterns
  const briefing = departureState.returnBriefing;
  
  // Check for recovery waves
  if (briefing?.changes?.recoveryWaves && briefing.changes.recoveryWaves.length > 0) {
    briefing.changes.recoveryWaves.forEach((wave: any) => {
      arcs.push({
        type: "recovery",
        startTime: wave.timestamp || departureState.sealedAt,
        endTime: new Date().toISOString(),
        duration: absenceMs,
        description: "System recovered from instability during autonomous operation",
      });
    });
  }
  
  // Check stability periods
  if (briefing?.changes?.stabilityArcs && briefing.changes.stabilityArcs.length > 0) {
    briefing.changes.stabilityArcs.forEach((arc: any) => {
      arcs.push({
        type: "calm",
        startTime: arc.startTime || departureState.sealedAt,
        endTime: arc.endTime || new Date().toISOString(),
        duration: arc.duration || absenceMs,
        description: "Extended period of system stability",
      });
    });
  } else if (operatorReturn.autonomousProgress.progressCycles > 0) {
    // Default: stable operation if cycles completed
    arcs.push({
      type: "calm",
      startTime: departureState.sealedAt,
      endTime: new Date().toISOString(),
      duration: absenceMs,
      description: `Autonomous operation maintained stability over ${operatorReturn.autonomousProgress.progressCycles} cycles`,
    });
  }
  
  return arcs;
}

/**
 * Generate operator signature deltas
 */
function generateOperatorSignatureDeltas(
  departureState: any,
  inheritanceState: any,
  operator: string,
  absenceMs: number
): OperatorSignatureDelta {
  if (!inheritanceState) {
    return {
      decisionsMade: 0,
      overridesExecuted: 0,
      genesisCyclesTriggered: 0,
      preferredPosture: "normal",
      riskToleranceShift: 0,
      anomalySensitivityShift: 0,
      newPatterns: [],
    };
  }
  
  const signature = getOperatorSignature(operator);
  const departureSignature = departureState?.snapshot?.inheritance?.operatorSignatures?.[operator];
  
  const riskToleranceShift = departureSignature
    ? signature.decisionStyle.riskTolerance - departureSignature.decisionStyle.riskTolerance
    : 0;
  
  const anomalySensitivityShift = departureSignature
    ? signature.decisionStyle.anomalySensitivity - departureSignature.decisionStyle.anomalySensitivity
    : 0;
  
  const newPatterns: string[] = [];
  if (signature.patterns.directivePatterns.length > (departureSignature?.patterns?.directivePatterns?.length || 0)) {
    newPatterns.push("New directive patterns learned");
  }
  if (signature.patterns.anomalyResponsePatterns.length > (departureSignature?.patterns?.anomalyResponsePatterns?.length || 0)) {
    newPatterns.push("Enhanced anomaly response patterns");
  }
  
  return {
    decisionsMade: signature.statistics.totalDecisions || 0,
    overridesExecuted: signature.statistics.totalOverrides || 0,
    genesisCyclesTriggered: signature.statistics.totalGenesisCycles || 0,
    preferredPosture: signature.statistics.preferredPosture || "normal",
    riskToleranceShift,
    anomalySensitivityShift,
    newPatterns,
  };
}

/**
 * Generate summary
 */
function generateSummary(
  postureTimeline: PostureTransition[],
  anomalyClusters: AnomalyClusterSummary[],
  currentHyperstate: any,
  absenceMs: number
): ReturnBriefing["summary"] {
  const highlights: string[] = [];
  const recommendations: string[] = [];
  
  // Analyze posture changes
  if (postureTimeline.length > 1) {
    const finalPosture = postureTimeline[postureTimeline.length - 1].to;
    highlights.push(`Posture transitioned to "${finalPosture}" during absence`);
  } else {
    highlights.push("Posture remained stable throughout absence");
  }
  
  // Analyze anomalies
  if (anomalyClusters.length > 0) {
    const criticalAnomalies = anomalyClusters.filter(a => a.severity >= 8);
    if (criticalAnomalies.length > 0) {
      highlights.push(`${criticalAnomalies.length} critical anomaly cluster${criticalAnomalies.length > 1 ? "s" : ""} detected`);
      recommendations.push("Review critical anomaly clusters immediately");
    } else {
      highlights.push(`${anomalyClusters.length} anomaly cluster${anomalyClusters.length > 1 ? "s" : ""} detected and handled`);
    }
  } else {
    highlights.push("No anomalies detected during absence");
  }
  
  // Analyze system health
  const globalState = currentHyperstate?.globalState || "stable";
  let systemHealth: "excellent" | "good" | "moderate" | "concerning";
  
  if (globalState === "stable" && anomalyClusters.length === 0) {
    systemHealth = "excellent";
    highlights.push("System health: Excellent - All subsystems operating optimally");
  } else if (globalState === "stable" || globalState === "recovering") {
    systemHealth = "good";
    highlights.push("System health: Good - Stable operation maintained");
  } else if (globalState === "unstable") {
    systemHealth = "moderate";
    highlights.push("System health: Moderate - Some instability detected");
    recommendations.push("Monitor subsystem health closely");
  } else {
    systemHealth = "concerning";
    highlights.push("System health: Concerning - Critical issues detected");
    recommendations.push("Immediate attention required");
  }
  
  // Add autonomous progress highlights
  highlights.push("Autonomous forward-progress mode maintained all subsystems");
  
  if (recommendations.length === 0) {
    recommendations.push("Continue monitoring system health");
    recommendations.push("Review lineage evolution patterns");
  }
  
  return {
    keyHighlights: highlights,
    recommendations,
    systemHealth,
  };
}

/**
 * Trigger crest activation pulse
 */
export function triggerCrestActivationPulse(operator: string): void {
  recordLineageEvent({
    type: "crest_ritual",
    operator,
    metadata: {
      message: "Crest activation pulse - Operator presence confirmed",
      ritual: "activation_pulse",
    },
  });
}

/**
 * Sync operator signature on return
 */
export function syncOperatorSignature(operator: string): void {
  const signature = getOperatorSignature(operator);
  signature.lastUpdated = new Date().toISOString();
  
  recordLineageEvent({
    type: "activation",
    operator,
    metadata: {
      message: "Operator signature synced - Posture and directive logic realigned",
      synced: true,
    },
  });
}
