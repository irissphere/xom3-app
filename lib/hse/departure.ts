// Departure Protocol - AKV-style state sealing and autonomous progress
// When operator leaves, cockpit seals state and continues evolving

import {
  getGlobalState,
} from "./state";
import { synthesizeGlobalState } from "./synthesizer";
import type { GlobalState, HealthVector } from "./types";
import {
  getLineageState,
  recordLineageEvent,
} from "./lineage";
import {
  getInheritanceState,
  updateCrestLineageMemory,
} from "./inheritance";
import { queryState } from "./query";
import { getPendingDirectives } from "@/lib/uoi/orchestrator";
import {
  triggerCrestActivationPulse,
  syncOperatorSignature,
} from "./return-briefing";

function derivePostureFromGlobalState(state: GlobalState | null): string {
  if (!state) return "normal";

  const severityScore: Record<NonNullable<GlobalState["anomalies"]>[number]["severity"], number> = {
    low: 2,
    medium: 5,
    high: 7,
    critical: 10,
  };

  const maxAnomaly =
    state.anomalies.length > 0
      ? Math.max(...state.anomalies.map(a => severityScore[a.severity]))
      : 0;

  if (maxAnomaly >= 8 || state.stability.risk_level === "critical") return "recovery";
  if (state.stability.risk_level === "high" || state.stability.trend === "degrading" || maxAnomaly >= 5) return "protective";

  if (state.stability.overall_stability > 0.95 && state.stability.risk_level === "low" && state.anomalies.length === 0) return "aggressive";
  return "normal";
}

function computeHealthScore(v: HealthVector): number {
  const errorFactor = Math.max(0, 1 - (v.errors / 100));
  const loadFactor = Math.max(0, 1 - v.load);
  const score = v.successRate * 0.5 + errorFactor * 0.3 + loadFactor * 0.2;
  return Math.max(0, Math.min(1, score));
}

export interface DepartureState {
  sealed: boolean;
  sealedAt: string;
  operator: string;
  snapshot: {
    hyperstate: any;
    lineage: any;
    inheritance: any;
    posture: string;
    directives: any[];
    subsystems: Record<string, any>;
  };
  autonomousMode: {
    active: boolean;
    activatedAt: string;
    progressCycles: number;
    lastCycle: string;
  };
  preInitialized: {
    succession: boolean;
    directiveEvolution: boolean;
    crestEvolution: boolean;
  };
  returnBriefing: {
    prepared: boolean;
    preparedAt: string;
    changes: {
      postureShifts: any[];
      directiveShifts: any[];
      anomalyClusters: any[];
      subsystemUpdates: any[];
      crestEvolution: any[];
      inheritanceAdjustments: any[];
      stabilityArcs: any[];
      recoveryWaves: any[];
    };
  };
}

let departureState: DepartureState | null = null;
let autonomousModeActive = false;
let autonomousProgressInterval: NodeJS.Timeout | null = null;

/**
 * Seal current state - AKV departure protocol
 */
export function sealDepartureState(operator: string = "auren"): DepartureState {
  const now = new Date().toISOString();
  
  // 1. Hyperstate snapshot
  const hyperstate = getGlobalState();
  
  // 2. Lineage ledger
  const lineage = getLineageState();
  
  // 3. Inheritance state
  const inheritance = getInheritanceState();
  
  // 4. Current posture
  const currentState = queryState();
  const posture = derivePostureFromGlobalState(currentState);
  
  // 5. Directive engine state (get pending directives)
  const directives = getPendingDirectives().map(d => ({
    id: d.id,
    type: d.type,
    target: d.target,
    reason: d.reason,
    timestamp: d.timestamp,
  }));
  
  // 6. Subsystem states
  const subsystems: Record<string, any> = {};
  if (hyperstate) {
    Object.entries(hyperstate.subsystems).forEach(([name, health]) => {
      subsystems[name] = {
        health: computeHealthScore(health),
        errors: health.errors || 0,
        load: health.load || 0,
        drift: health.drift || 0,
        throughput: health.throughput || 0,
        successRate: health.successRate || 0,
        queueLength: health.queueLength || 0,
        latency: health.latency || 0,
      };
    });
  }
  
  // 7. Update crest lineage with departure mark
  if (inheritance) {
    updateCrestLineageMemory({
      operatorGlyphs: [`departure-${now}`],
    });
  }
  
  // 8. Record lineage event
  recordLineageEvent({
    type: "closure",
    operator,
    metadata: {
      message: "Seal confirmed. Auto-pilots locked. Cockpit holds the lineage until return.",
      departure: true,
    },
  });
  
  departureState = {
    sealed: true,
    sealedAt: now,
    operator,
    snapshot: {
      hyperstate,
      lineage,
      inheritance,
      posture,
      directives,
      subsystems,
    },
    autonomousMode: {
      active: false,
      activatedAt: "",
      progressCycles: 0,
      lastCycle: "",
    },
    preInitialized: {
      succession: false,
      directiveEvolution: false,
      crestEvolution: false,
    },
    returnBriefing: {
      prepared: false,
      preparedAt: "",
      changes: {
        postureShifts: [],
        directiveShifts: [],
        anomalyClusters: [],
        subsystemUpdates: [],
        crestEvolution: [],
        inheritanceAdjustments: [],
        stabilityArcs: [],
        recoveryWaves: [],
      },
    },
  };
  
  return departureState;
}

/**
 * Activate autonomous progress mode
 */
export function activateAutonomousProgressMode(): void {
  if (autonomousModeActive) return;
  
  const now = new Date().toISOString();
  autonomousModeActive = true;
  
  if (!departureState) {
    sealDepartureState();
  }
  
  if (departureState) {
    departureState.autonomousMode = {
      active: true,
      activatedAt: now,
      progressCycles: 0,
      lastCycle: now,
    };
  }
  
  // Start autonomous progress cycle
  autonomousProgressInterval = setInterval(() => {
    runAutonomousProgressCycle();
  }, 30000); // Every 30 seconds
  
  // Record lineage event
  recordLineageEvent({
    type: "architectural_evolution",
    metadata: {
      message: "Autonomous progress mode activated. Cockpit continues evolving.",
      autonomous: true,
    },
  });
}

/**
 * Run one autonomous progress cycle
 */
function runAutonomousProgressCycle(): void {
  if (!autonomousModeActive || !departureState) return;
  
  const now = new Date().toISOString();
  departureState.autonomousMode.progressCycles++;
  departureState.autonomousMode.lastCycle = now;
  
  // 1. Monitor all subsystems
  const currentState = queryState();
  if (currentState) {
    // Track changes for return briefing
    trackChangesForBriefing(currentState);
  }
  
  // 2. Track anomalies
  // (Handled by HSE anomaly detector)
  
  // 3. Adjust posture (if needed)
  // (Handled by UOI posture system)
  
  // 4. Refine directive logic
  // (Handled by UOI optimizer)
  
  // 5. Strengthen inheritance patterns
  // (Handled by inheritance system)
  
  // 6. Expand lineage threads
  // (Handled by lineage system)
  
  // 7. Maintain crest rituals
  // (Handled by crest system)
  
  // 8. Keep real-time streaming alive
  // (Handled by HSE stream)
  
  // 9. Record operator absence as lineage event (periodic)
  if (departureState.autonomousMode.progressCycles % 10 === 0) {
    recordLineageEvent({
      type: "stability_period",
      metadata: {
        message: `Autonomous progress cycle ${departureState.autonomousMode.progressCycles}`,
        autonomous: true,
      },
    });
  }
}

/**
 * Track changes for return briefing
 */
function trackChangesForBriefing(currentState: any): void {
  if (!departureState) return;
  
  const briefing = departureState.returnBriefing;
  const snapshot = departureState.snapshot;
  
  // Track posture shifts
  const currentPosture = derivePostureFromGlobalState(currentState as GlobalState);
  if (currentPosture !== snapshot.posture) {
    briefing.changes.postureShifts.push({
      from: snapshot.posture,
      to: currentPosture,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Track subsystem updates
  if (currentState.subsystems) {
    Object.entries(currentState.subsystems).forEach(([name, health]: [string, any]) => {
      const snapshotHealth = snapshot.subsystems[name];
      if (snapshotHealth) {
        const healthDelta = (health.health || 1.0) - (snapshotHealth.health || 1.0);
        const errorDelta = (health.errors || 0) - (snapshotHealth.errors || 0);
        
        if (Math.abs(healthDelta) > 0.1 || errorDelta !== 0) {
          briefing.changes.subsystemUpdates.push({
            subsystem: name,
            healthDelta,
            errorDelta,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });
  }
  
  // Track anomalies
  if (currentState.anomalies && currentState.anomalies.length > 0) {
    briefing.changes.anomalyClusters.push({
      count: currentState.anomalies.length,
      severity: currentState.anomalies.map((a: any) => a.severity),
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Pre-initialize Succession Mode groundwork
 */
export function preInitializeSuccessionMode(): void {
  if (!departureState) {
    sealDepartureState();
  }
  
  if (departureState && !departureState.preInitialized.succession) {
    // Begin preparing multi-operator inheritance layer
    // - Operator signature isolation
    // - Lineage branching
    // - Crest multi-signature support
    // - Subsystem trait divergence
    
    recordLineageEvent({
      type: "architectural_evolution",
      metadata: {
        message: "Succession Mode groundwork initiated. Multi-operator layer preparing.",
        preInitialized: true,
      },
    });
    
    departureState.preInitialized.succession = true;
  }
}

/**
 * Pre-initialize Directive Evolution Engine
 */
export function preInitializeDirectiveEvolution(): void {
  if (!departureState) {
    sealDepartureState();
  }
  
  if (departureState && !departureState.preInitialized.directiveEvolution) {
    // Begin analyzing:
    // - Past overrides
    // - Risk tolerance
    // - Stability patterns
    // - Anomaly responses
    
    recordLineageEvent({
      type: "architectural_evolution",
      metadata: {
        message: "Directive Evolution Engine initiated. Analyzing operator patterns.",
        preInitialized: true,
      },
    });
    
    departureState.preInitialized.directiveEvolution = true;
  }
}

/**
 * Pre-initialize Crest Evolution Layer
 */
export function preInitializeCrestEvolution(): void {
  if (!departureState) {
    sealDepartureState();
  }
  
  if (departureState && !departureState.preInitialized.crestEvolution) {
    // Begin:
    // - Mapping glyph patterns
    // - Preparing new lineage marks
    // - Tuning posture-based animations
    // - Generating next crest evolution cycle
    
    recordLineageEvent({
      type: "architectural_evolution",
      metadata: {
        message: "Crest Evolution Layer initiated. Crest preparing next evolution cycle.",
        preInitialized: true,
      },
    });
    
    departureState.preInitialized.crestEvolution = true;
  }
}

/**
 * Prepare return briefing
 */
export function prepareReturnBriefing(): void {
  if (!departureState) return;
  
  const now = new Date().toISOString();
  const currentState = queryState();
  
  if (currentState) {
    // Final change tracking
    trackChangesForBriefing(currentState);
  }
  
  // Get latest lineage state
  const lineage = getLineageState();
  if (lineage) {
    departureState.returnBriefing.changes.crestEvolution.push({
      marks: lineage.ledger.marks.length,
      glyphs: lineage.ledger.glyphs.length,
      threads: Object.keys(lineage.ledger.threads).length,
      timestamp: now,
    });
  }
  
  // Get latest inheritance state
  const inheritance = getInheritanceState();
  if (inheritance) {
    departureState.returnBriefing.changes.inheritanceAdjustments.push({
      signatures: Object.keys(inheritance.operatorSignatures).length,
      inheritances: Object.keys(inheritance.subsystemInheritances).length,
      transmissions: inheritance.statistics.totalTransmissions,
      timestamp: now,
    });
  }
  
  departureState.returnBriefing.prepared = true;
  departureState.returnBriefing.preparedAt = now;
}

/**
 * Execute full departure protocol
 */
export function executeDepartureProtocol(operator: string = "auren"): DepartureState {
  // 1. Seal the current state
  const sealed = sealDepartureState(operator);
  
  // 2. Activate autonomous progress mode
  activateAutonomousProgressMode();
  
  // 3. Pre-initialize next lanes
  preInitializeSuccessionMode();
  preInitializeDirectiveEvolution();
  preInitializeCrestEvolution();
  
  // 4. Prepare return briefing (will be updated during autonomous mode)
  prepareReturnBriefing();
  
  return sealed;
}

/**
 * Handle operator return
 */
export function handleOperatorReturn(operator: string = "auren"): {
  briefing: DepartureState["returnBriefing"];
  autonomousProgress: DepartureState["autonomousMode"];
  preInitialized: DepartureState["preInitialized"];
} {
  if (!departureState) {
    return {
      briefing: {
        prepared: false,
        preparedAt: "",
        changes: {
          postureShifts: [],
          directiveShifts: [],
          anomalyClusters: [],
          subsystemUpdates: [],
          crestEvolution: [],
          inheritanceAdjustments: [],
          stabilityArcs: [],
          recoveryWaves: [],
        },
      },
      autonomousProgress: {
        active: false,
        activatedAt: "",
        progressCycles: 0,
        lastCycle: "",
      },
      preInitialized: {
        succession: false,
        directiveEvolution: false,
        crestEvolution: false,
      },
    };
  }
  
  // Stop autonomous progress mode
  if (autonomousProgressInterval) {
    clearInterval(autonomousProgressInterval);
    autonomousProgressInterval = null;
  }
  autonomousModeActive = false;
  
  // Final briefing preparation
  prepareReturnBriefing();
  
  // RBE Integration: Trigger crest activation pulse and sync operator signature
  triggerCrestActivationPulse(operator);
  syncOperatorSignature(operator);
  
  // Record return event
  recordLineageEvent({
    type: "activation",
    operator,
    metadata: {
      message: "Operator returned. Cockpit synced and ready. Return Briefing Engine activated.",
      return: true,
      autonomousCycles: departureState.autonomousMode.progressCycles,
      rbeTriggered: true,
    },
  });
  
  return {
    briefing: departureState.returnBriefing,
    autonomousProgress: departureState.autonomousMode,
    preInitialized: departureState.preInitialized,
  };
}

/**
 * Get departure state
 */
export function getDepartureState(): DepartureState | null {
  return departureState;
}

/**
 * Check if autonomous mode is active
 */
export function isAutonomousModeActive(): boolean {
  return autonomousModeActive;
}
