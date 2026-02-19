// UOI Federation - Full federation mode activation
// When active, UOI treats all subsystems as one unified ecosystem

export interface FederationState {
  active: boolean;
  activatedAt?: string;
  subsystems: string[];
  crossDomainPatterns: CrossDomainPattern[];
  federatedDecisions: number;
  lastCycle: string;
}

export interface CrossDomainPattern {
  id: string;
  pattern: string;
  subsystems: string[];
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: string;
  resolved: boolean;
}

// Federation state
let federationState: FederationState = {
  active: false,
  subsystems: ["amp", "workflow", "compliance", "notification", "analytics"],
  crossDomainPatterns: [],
  federatedDecisions: 0,
  lastCycle: new Date().toISOString(),
};

/**
 * Activate federation mode
 */
export function activateFederation(): FederationState {
  federationState = {
    ...federationState,
    active: true,
    activatedAt: new Date().toISOString(),
  };
  
  console.log("[UOI] 🔥 FEDERATION MODE ACTIVATED");
  console.log("[UOI] All subsystems unified under UOI governance");
  console.log("[UOI] Cross-domain intelligence active");
  console.log("[UOI] Cockpit operating as single organism");
  
  return federationState;
}

/**
 * Deactivate federation mode
 */
export function deactivateFederation(): FederationState {
  federationState = {
    ...federationState,
    active: false,
  };
  
  console.log("[UOI] Federation mode deactivated");
  return federationState;
}

/**
 * Get federation state
 */
export function getFederationState(): FederationState {
  return { ...federationState };
}

/**
 * Check if federation is active
 */
export function isFederationActive(): boolean {
  return federationState.active;
}

/**
 * Record cross-domain pattern
 */
export function recordCrossDomainPattern(
  pattern: string,
  subsystems: string[],
  severity: CrossDomainPattern["severity"] = "medium"
): CrossDomainPattern {
  const crossPattern: CrossDomainPattern = {
    id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pattern,
    subsystems,
    severity,
    detectedAt: new Date().toISOString(),
    resolved: false,
  };
  
  federationState.crossDomainPatterns.push(crossPattern);
  
  // Keep only last 100 patterns
  if (federationState.crossDomainPatterns.length > 100) {
    federationState.crossDomainPatterns.shift();
  }
  
  return crossPattern;
}

/**
 * Record federated decision
 */
export function recordFederatedDecision(): void {
  federationState.federatedDecisions++;
  federationState.lastCycle = new Date().toISOString();
}

/**
 * Get active cross-domain patterns
 */
export function getActiveCrossDomainPatterns(): CrossDomainPattern[] {
  return federationState.crossDomainPatterns.filter(p => !p.resolved);
}
