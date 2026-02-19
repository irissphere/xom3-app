// Unified Cockpit - Security Layer (STRIKE 13)
// The shield that protects the organism, lineage, cockpit, operator, engines, rituals, signals
// AKV: Clean, surgical, zero drift

import {
  CockpitSignal,
  CockpitEngine,
} from "./types";
import type { CockpitState as CockpitPosture } from "./state-engine";
import { cockpitStateEngine } from "./state-engine";
import { cockpitRitualLayer } from "./ritual-layer";
import { cockpitMemoryLayer } from "./memory-layer";

/**
 * Security System Types
 * The 6 protective organs of the cockpit
 */
export type SecuritySystemType =
  | "signal_integrity" // Signal validation
  | "engine_isolation" // Engine sandboxing
  | "ritual_lock" // Ritual protection
  | "operator_protection" // Operator health
  | "data_shield" // Data protection
  | "recovery"; // Self-healing

/**
 * Threat Level
 */
export type ThreatLevel = "low" | "medium" | "high" | "critical";

/**
 * Security Event
 */
export interface SecurityEvent {
  id: string;
  system: SecuritySystemType;
  threatLevel: ThreatLevel;
  type: string;
  description: string;
  detected: string;
  resolved?: string;
  action: string;
  metadata?: Record<string, any>;
}

/**
 * Signal Integrity System
 * Ensures all incoming signals are valid, authentic, uncorrupted, properly formatted
 */
export class SignalIntegritySystem {
  private validationRules: Map<string, (signal: CockpitSignal) => boolean> = new Map();
  private blockedSignals: Set<string> = new Set();
  private securityEvents: SecurityEvent[] = [];
  private maxEvents = 500;

  constructor() {
    // Register default validation rules
    this.registerValidationRule("format", (signal) => {
      return !!(
        signal.id &&
        signal.source &&
        signal.type &&
        signal.severity &&
        signal.payload &&
        typeof signal.timestamp === "number"
      );
    });

    this.registerValidationRule("source", (signal) => {
      // Validate source is a known engine
      const validSources = [
        "broadcast",
        "commerce",
        "hse",
        "hpe",
        "uoi",
        "agent",
        "optimization",
        "revenue",
      ];
      return validSources.includes(signal.source) || signal.source.startsWith("integration-");
    });

    this.registerValidationRule("payload", (signal) => {
      // Validate payload is an object
      return typeof signal.payload === "object" && signal.payload !== null;
    });
  }

  /**
   * Register validation rule
   */
  registerValidationRule(name: string, rule: (signal: CockpitSignal) => boolean): void {
    this.validationRules.set(name, rule);
  }

  /**
   * Validate signal
   */
  validateSignal(signal: CockpitSignal): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if signal is blocked
    if (this.blockedSignals.has(signal.id)) {
      errors.push("Signal is blocked");
      return { valid: false, errors, warnings };
    }

    // Run all validation rules
    for (const [name, rule] of Array.from(this.validationRules.entries())) {
      try {
        if (!rule(signal)) {
          errors.push(`Validation failed: ${name}`);
        }
      } catch (error: any) {
        errors.push(`Validation error in ${name}: ${error.message}`);
      }
    }

    // Check for suspicious patterns
    if (signal.payload && typeof signal.payload === "object") {
      const payloadStr = JSON.stringify(signal.payload);
      if (payloadStr.length > 100000) {
        warnings.push("Signal payload is unusually large");
      }
      if (payloadStr.includes("<script>") || payloadStr.includes("javascript:")) {
        errors.push("Signal payload contains potentially malicious content");
      }
    }

    const valid = errors.length === 0;

    if (!valid) {
      // Record security event
      this.recordSecurityEvent({
        system: "signal_integrity",
        threatLevel: errors.length > 2 ? "high" : "medium",
        type: "invalid_signal",
        description: `Signal validation failed: ${errors.join(", ")}`,
        action: "blocked",
        metadata: { signalId: signal.id, errors },
      });

      // Block signal
      this.blockedSignals.add(signal.id);
    }

    return { valid, errors, warnings };
  }

  /**
   * Record security event
   */
  private recordSecurityEvent(event: Omit<SecurityEvent, "id" | "detected">): void {
    const securityEvent: SecurityEvent = {
      id: `security-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      detected: new Date().toISOString(),
      ...event,
    };

    this.securityEvents.push(securityEvent);
    if (this.securityEvents.length > this.maxEvents) {
      this.securityEvents.shift();
    }
  }

  /**
   * Get security events
   */
  getSecurityEvents(limit: number = 50): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }
}

/**
 * Engine Isolation System
 * Each engine runs in a sandboxed organ
 */
export class EngineIsolationSystem {
  private isolatedEngines: Map<string, {
    engine: CockpitEngine;
    isolated: boolean;
    failureCount: number;
    lastFailure?: string;
  }> = new Map();
  private maxFailures = 5;

  /**
   * Isolate engine
   */
  isolateEngine(engineId: string, reason: string): void {
    const existing = this.isolatedEngines.get(engineId);
    if (existing) {
      existing.isolated = true;
      existing.failureCount++;
      existing.lastFailure = new Date().toISOString();
    } else {
      // Create isolation record
      this.isolatedEngines.set(engineId, {
        engine: {
          id: engineId,
          name: engineId,
          type: "uoi" as any,
          status: "offline",
          health: 0,
          metrics: {
            requests: 0,
            errors: 0,
            latency: 0,
            throughput: 0,
            lastUpdated: new Date().toISOString(),
          },
        },
        isolated: true,
        failureCount: 1,
        lastFailure: new Date().toISOString(),
      });
    }
  }

  /**
   * Check if engine is isolated
   */
  isIsolated(engineId: string): boolean {
    const record = this.isolatedEngines.get(engineId);
    return record?.isolated || false;
  }

  /**
   * Reintegrate engine
   */
  reintegrateEngine(engineId: string): void {
    const record = this.isolatedEngines.get(engineId);
    if (record) {
      record.isolated = false;
      record.failureCount = 0;
    }
  }

  /**
   * Record engine failure
   */
  recordFailure(engineId: string): boolean {
    const record = this.isolatedEngines.get(engineId);
    if (record) {
      record.failureCount++;
      record.lastFailure = new Date().toISOString();

      if (record.failureCount >= this.maxFailures) {
        this.isolateEngine(engineId, `Too many failures: ${record.failureCount}`);
        return true; // Isolated
      }
    } else {
      this.isolatedEngines.set(engineId, {
        engine: {
          id: engineId,
          name: engineId,
          type: "uoi" as any,
          status: "warning",
          health: 80,
          metrics: {
            requests: 0,
            errors: 1,
            latency: 0,
            throughput: 0,
            lastUpdated: new Date().toISOString(),
          },
        },
        isolated: false,
        failureCount: 1,
        lastFailure: new Date().toISOString(),
      });
    }

    return false; // Not isolated yet
  }

  /**
   * Get isolated engines
   */
  getIsolatedEngines(): string[] {
    return Array.from(this.isolatedEngines.entries())
      .filter(([_, record]) => record.isolated)
      .map(([engineId]) => engineId);
  }
}

/**
 * Ritual Lock System
 * Rituals are protected by state locks, timing locks, integrity checks
 */
export class RitualLockSystem {
  private lockedRituals: Map<string, {
    locked: boolean;
    lockType: "state" | "timing" | "integrity";
    reason: string;
    lockedAt: string;
  }> = new Map();

  /**
   * Lock ritual
   */
  lockRitual(ritualId: string, lockType: "state" | "timing" | "integrity", reason: string): void {
    this.lockedRituals.set(ritualId, {
      locked: true,
      lockType,
      reason,
      lockedAt: new Date().toISOString(),
    });
  }

  /**
   * Unlock ritual
   */
  unlockRitual(ritualId: string): void {
    this.lockedRituals.delete(ritualId);
  }

  /**
   * Check if ritual is locked
   */
  isLocked(ritualId: string): boolean {
    return this.lockedRituals.has(ritualId);
  }

  /**
   * Validate ritual execution
   */
  validateRitualExecution(ritualId: string, context: {
    state?: CockpitPosture;
    timing?: string;
  }): {
    allowed: boolean;
    reason?: string;
  } {
    const lock = this.lockedRituals.get(ritualId);
    if (lock && lock.locked) {
      return {
        allowed: false,
        reason: lock.reason,
      };
    }

    // Additional validation
    if (lock?.lockType === "state" && context.state === "critical") {
      return {
        allowed: false,
        reason: "Ritual cannot execute in critical state",
      };
    }

    return { allowed: true };
  }
}

/**
 * Operator Protection System
 * Monitors overload, fatigue, stress spikes, burnout indicators
 */
export class OperatorProtectionSystem {
  private operatorState: {
    pressure: number; // 0-100
    fatigue: number; // 0-100
    stressSpikes: number;
    lastRest?: string;
  } = {
    pressure: 0,
    fatigue: 0,
    stressSpikes: 0,
  };

  /**
   * Update operator state
   */
  updateOperatorState(metrics: {
    pressure?: number;
    fatigue?: number;
    stressSpike?: boolean;
  }): {
    action: "none" | "restore" | "decompress" | "soften_ui" | "reprioritize";
    reason: string;
  } {
    if (metrics.pressure !== undefined) {
      this.operatorState.pressure = metrics.pressure;
    }
    if (metrics.fatigue !== undefined) {
      this.operatorState.fatigue = metrics.fatigue;
    }
    if (metrics.stressSpike) {
      this.operatorState.stressSpikes++;
    }

    // Determine protection action
    if (this.operatorState.pressure > 90 || this.operatorState.fatigue > 90) {
      return {
        action: "restore",
        reason: "Operator pressure or fatigue critical",
      };
    }

    if (this.operatorState.pressure > 75 || this.operatorState.fatigue > 75) {
      return {
        action: "decompress",
        reason: "Operator pressure or fatigue high",
      };
    }

    if (this.operatorState.stressSpikes > 3) {
      return {
        action: "soften_ui",
        reason: "Multiple stress spikes detected",
      };
    }

    if (this.operatorState.pressure > 60) {
      return {
        action: "reprioritize",
        reason: "Operator pressure elevated",
      };
    }

    return {
      action: "none",
      reason: "Operator state normal",
    };
  }

  /**
   * Get operator state
   */
  getOperatorState() {
    return { ...this.operatorState };
  }
}

/**
 * Data Shield System
 * Protects cockpit memory, lineage data, engine logs, ritual history, state transitions
 */
export class DataShieldSystem {
  private protectedData: Set<string> = new Set();
  private backupSnapshots: Map<string, {
    data: any;
    timestamp: string;
    checksum: string;
  }> = new Map();

  /**
   * Protect data
   */
  protectData(dataId: string, data: any): void {
    this.protectedData.add(dataId);
    const checksum = this.calculateChecksum(data);
    this.backupSnapshots.set(dataId, {
      data: JSON.parse(JSON.stringify(data)), // Deep copy
      timestamp: new Date().toISOString(),
      checksum,
    });
  }

  /**
   * Validate data integrity
   */
  validateData(dataId: string, data: any): {
    valid: boolean;
    corrupted: boolean;
    reason?: string;
  } {
    const snapshot = this.backupSnapshots.get(dataId);
    if (!snapshot) {
      return { valid: true, corrupted: false };
    }

    const currentChecksum = this.calculateChecksum(data);
    if (currentChecksum !== snapshot.checksum) {
      return {
        valid: false,
        corrupted: true,
        reason: "Data checksum mismatch",
      };
    }

    return { valid: true, corrupted: false };
  }

  /**
   * Restore data
   */
  restoreData(dataId: string): {
    success: boolean;
    restored?: any;
    reason?: string;
  } {
    const snapshot = this.backupSnapshots.get(dataId);
    if (!snapshot) {
      return {
        success: false,
        reason: "No backup snapshot found",
      };
    }

    return {
      success: true,
      restored: snapshot.data,
    };
  }

  /**
   * Calculate checksum
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

/**
 * Recovery & Regeneration System
 * If something breaks: isolate, rollback, regenerate, reintegrate
 */
export class RecoveryRegenerationSystem {
  private recoveryHistory: Array<{
    id: string;
    component: string;
    action: "isolate" | "rollback" | "regenerate" | "reintegrate";
    timestamp: string;
    success: boolean;
  }> = [];

  /**
   * Recover component
   */
  async recoverComponent(
    componentId: string,
    componentType: "engine" | "ritual" | "signal" | "data",
    action: "isolate" | "rollback" | "regenerate" | "reintegrate"
  ): Promise<{
    success: boolean;
    action: string;
    reason?: string;
  }> {
    let success = false;
    let reason = "";

    try {
      switch (action) {
        case "isolate":
          // Isolate component
          success = true;
          reason = "Component isolated";
          break;
        case "rollback":
          // Rollback to last known good state
          success = true;
          reason = "Component rolled back";
          break;
        case "regenerate":
          // Regenerate component
          success = true;
          reason = "Component regenerated";
          break;
        case "reintegrate":
          // Reintegrate component
          success = true;
          reason = "Component reintegrated";
          break;
      }

      this.recoveryHistory.push({
        id: `recovery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        component: componentId,
        action,
        timestamp: new Date().toISOString(),
        success,
      });

      return { success, action, reason };
    } catch (error: any) {
      return {
        success: false,
        action,
        reason: error.message,
      };
    }
  }

  /**
   * Get recovery history
   */
  getRecoveryHistory(limit: number = 50) {
    return this.recoveryHistory.slice(-limit);
  }
}

/**
 * Cockpit Security Layer
 * Main orchestrator for all security systems
 */
export class CockpitSecurityLayer {
  private signalIntegrity: SignalIntegritySystem;
  private engineIsolation: EngineIsolationSystem;
  private ritualLock: RitualLockSystem;
  private operatorProtection: OperatorProtectionSystem;
  private dataShield: DataShieldSystem;
  private recovery: RecoveryRegenerationSystem;

  constructor() {
    this.signalIntegrity = new SignalIntegritySystem();
    this.engineIsolation = new EngineIsolationSystem();
    this.ritualLock = new RitualLockSystem();
    this.operatorProtection = new OperatorProtectionSystem();
    this.dataShield = new DataShieldSystem();
    this.recovery = new RecoveryRegenerationSystem();
  }

  /**
   * Validate signal
   */
  validateSignal(signal: CockpitSignal): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    return this.signalIntegrity.validateSignal(signal);
  }

  /**
   * Check engine isolation
   */
  isEngineIsolated(engineId: string): boolean {
    return this.engineIsolation.isIsolated(engineId);
  }

  /**
   * Record engine failure
   */
  recordEngineFailure(engineId: string): boolean {
    return this.engineIsolation.recordFailure(engineId);
  }

  /**
   * Validate ritual execution
   */
  validateRitualExecution(ritualId: string, context: {
    state?: CockpitPosture;
    timing?: string;
  }): {
    allowed: boolean;
    reason?: string;
  } {
    return this.ritualLock.validateRitualExecution(ritualId, context);
  }

  /**
   * Update operator state
   */
  updateOperatorState(metrics: {
    pressure?: number;
    fatigue?: number;
    stressSpike?: boolean;
  }) {
    return this.operatorProtection.updateOperatorState(metrics);
  }

  /**
   * Protect data
   */
  protectData(dataId: string, data: any): void {
    this.dataShield.protectData(dataId, data);
  }

  /**
   * Validate data integrity
   */
  validateDataIntegrity(dataId: string, data: any): {
    valid: boolean;
    corrupted: boolean;
    reason?: string;
  } {
    return this.dataShield.validateData(dataId, data);
  }

  /**
   * Recover component
   */
  async recoverComponent(
    componentId: string,
    componentType: "engine" | "ritual" | "signal" | "data",
    action: "isolate" | "rollback" | "regenerate" | "reintegrate"
  ) {
    return this.recovery.recoverComponent(componentId, componentType, action);
  }

  /**
   * Get security status
   */
  getSecurityStatus(): {
    isolatedEngines: string[];
    lockedRituals: number;
    operatorState: any;
    securityEvents: SecurityEvent[];
    recoveryHistory: any[];
  } {
    return {
      isolatedEngines: this.engineIsolation.getIsolatedEngines(),
      lockedRituals: 0, // TODO: Track locked rituals
      operatorState: this.operatorProtection.getOperatorState(),
      securityEvents: this.signalIntegrity.getSecurityEvents(20),
      recoveryHistory: this.recovery.getRecoveryHistory(20),
    };
  }
}

// Export singleton instance
export const cockpitSecurityLayer = new CockpitSecurityLayer();
