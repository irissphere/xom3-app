// The Multi-Organism Federation (MOF) - Type Definitions
// The federated cockpit

export type SovereignDomain = 
  | "healthcare"
  | "healthcrm"
  | "benefitscrm"
  | "compliance"
  | "workflow"
  | "notification"
  | "migration"
  | "analytics"
  | "commerce"
  | "crm"
  | "content";

export interface SovereignUnit {
  id: string;
  domain: SovereignDomain;
  name: string;
  goals: Array<{
    id: string;
    type: string;
    weight: number;
    target: number;
    current: number;
  }>;
  memory: {
    patterns: Pattern[];
    decisions: Decision[];
    lastUpdated: string;
  };
  evolutionRules: EvolutionRule[];
  orchestrationGraph: any;
  predictiveEngine: any;
  state: "active" | "paused" | "evolving" | "error";
  lastActivity: string;
}

export interface Pattern {
  id: string;
  type: string;
  domain: SovereignDomain;
  pattern: any;
  confidence: number;
  shared: boolean;
  sharedWith: SovereignDomain[];
  discoveredAt: string;
}

export interface Decision {
  id: string;
  timestamp: string;
  decision: string;
  reason: string;
  confidence: number;
  domain: SovereignDomain;
}

export interface EvolutionRule {
  id: string;
  condition: string;
  action: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface ISPSignal {
  id: string;
  from: SovereignDomain;
  to: SovereignDomain | "all" | "council";
  type: "pattern" | "event" | "request" | "response" | "alert" | "negotiation";
  payload: any;
  priority: "low" | "medium" | "high" | "critical";
  timestamp: string;
  requiresResponse: boolean;
}

export interface ISPEvent {
  id: string;
  domain: SovereignDomain;
  type: "drift_detected" | "error_spike" | "bottleneck" | "anomaly" | "compliance_risk" | "pattern_discovered";
  severity: "info" | "warning" | "critical";
  payload: any;
  timestamp: string;
  broadcast: boolean;
}

export interface Negotiation {
  id: string;
  participants: SovereignDomain[];
  topic: string;
  proposals: Array<{
    domain: SovereignDomain;
    proposal: any;
    priority: number;
    timestamp: string;
  }>;
  resolution?: {
    decision: any;
    arbitrator: "council" | SovereignDomain;
    confidence: number;
    timestamp: string;
  };
  status: "pending" | "resolved" | "conflict";
}

export interface CouncilDecision {
  id: string;
  conflict: {
    type: string;
    participants: SovereignDomain[];
    issue: string;
  };
  decision: string;
  reasoning: string;
  confidence: number;
  applied: boolean;
  timestamp: string;
}

export interface CrossDomainPattern {
  sourceDomain: SovereignDomain;
  targetDomain: SovereignDomain;
  pattern: Pattern;
  sharedAt: string;
  applied: boolean;
  effectiveness: number;
}

export interface LoadBalanceNegotiation {
  id: string;
  participants: SovereignDomain[];
  currentLoad: Record<SovereignDomain, number>;
  proposedAdjustments: Record<SovereignDomain, number>;
  resolution: {
    adjustments: Record<SovereignDomain, number>;
    reason: string;
    confidence: number;
  };
  timestamp: string;
}

export interface CrossDomainEvolution {
  id: string;
  domains: SovereignDomain[];
  evolutionType: "coordinate" | "merge" | "split" | "spawn";
  changes: Array<{
    domain: SovereignDomain;
    change: any;
    reason: string;
  }>;
  applied: boolean;
  timestamp: string;
}

export interface FederatedProtection {
  id: string;
  detectedBy: SovereignDomain;
  threat: {
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  };
  responses: Array<{
    domain: SovereignDomain;
    action: string;
    applied: boolean;
    result?: string;
  }>;
  resolved: boolean;
  resolvedAt?: string;
}

export interface SovereignExpansion {
  id: string;
  parentDomain: SovereignDomain;
  newDomain?: SovereignDomain;
  type: "create" | "split" | "merge" | "spawn";
  reason: string;
  applied: boolean;
  timestamp: string;
}

export interface FederatedExplanation {
  id: string;
  domains: SovereignDomain[];
  decision: string;
  reason: string;
  actions: Array<{
    domain: SovereignDomain;
    action: string;
    result: string;
  }>;
  timestamp: string;
  explanation: string;
}

export interface MOFState {
  sovereigns: Record<SovereignDomain, SovereignUnit>;
  signals: ISPSignal[];
  events: ISPEvent[];
  negotiations: Negotiation[];
  councilDecisions: CouncilDecision[];
  sharedPatterns: CrossDomainPattern[];
  loadBalances: LoadBalanceNegotiation[];
  evolutions: CrossDomainEvolution[];
  protections: FederatedProtection[];
  expansions: SovereignExpansion[];
  lastUpdated: string;
}
