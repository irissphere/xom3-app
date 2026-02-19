// HSE Control State - Operator control overrides
// Allows operators to override posture, freeze directives, and issue manual directives

import { 
  isInheritanceModeActive, 
  recordOperatorOverride 
} from "./inheritance";

export type PostureOverride = null | "normal" | "protective" | "aggressive" | "recovery";

let postureOverride: PostureOverride = null;
let directivesFrozen = false;
let manualDirective: {
  target: string;
  action: string;
  reason: string;
  source: string;
  timestamp: string;
} | null = null;

/**
 * Set posture override
 */
export function setPostureOverride(value: PostureOverride, operator: string = "auren") {
  const previousOverride = postureOverride;
  postureOverride = value;
  
  // INHERITANCE MODE: Record override if inheritance is active
  if (isInheritanceModeActive() && value && previousOverride !== value) {
    recordOperatorOverride(operator, {
      subsystem: "global",
      reason: `Posture override to ${value}`,
    });
  }
}

/**
 * Get posture override
 */
export function getPostureOverride(): PostureOverride {
  return postureOverride;
}

/**
 * Set directive freeze state
 */
export function setDirectiveFreeze(frozen: boolean) {
  directivesFrozen = frozen;
}

/**
 * Check if directives are frozen
 */
export function areDirectivesFrozen(): boolean {
  return directivesFrozen;
}

/**
 * Push manual directive
 */
export function pushManualDirective(directive: {
  target: string;
  action: string;
  reason: string;
  source?: string;
}, operator: string = "auren") {
  manualDirective = {
    ...directive,
    source: directive.source || "operator",
    timestamp: new Date().toISOString(),
  };
  
  // INHERITANCE MODE: Record override if inheritance is active
  if (isInheritanceModeActive()) {
    recordOperatorOverride(operator, {
      subsystem: directive.target,
      reason: directive.reason,
    });
  }
}

/**
 * Get manual directive
 */
export function getManualDirective(): typeof manualDirective {
  return manualDirective;
}

/**
 * Clear manual directive (after it's been applied)
 */
export function clearManualDirective() {
  manualDirective = null;
}
