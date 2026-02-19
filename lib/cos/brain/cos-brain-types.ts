export type OrchestrationPolicyScope = "scene" | "graph" | "global";

export type PolicyCondition = {
  source: "gtm" | "campaigns" | "funnels" | "rituals" | "epochs" | "operator";
  key: string;
  comparator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "includes" | "truthy";
  value?: any;
};

export type PolicyAction =
  | { kind: "boostScene"; sceneId: string; weightDelta: number }
  | { kind: "suppressScene"; sceneId: string; weightDelta: number }
  | { kind: "boostGraph"; graphId: string; weightDelta: number }
  | { kind: "suppressGraph"; graphId: string; weightDelta: number }
  | { kind: "preferCrew"; crewId: string }
  | { kind: "setRoutingHint"; key: string; value: any };

export type OrchestrationPolicy = {
  id: string;
  name: string;
  description: string;
  scope: OrchestrationPolicyScope;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
};

export type CosBrainPostureSnapshot = {
  at: number;
  epochId?: string;
  operatorIntent?: string | null;
  outbound: { total: number; queued: number; sending: number; sent: number; failed: number };
  campaigns: { activeCount: number };
  funnels: { conversionRate?: number | null };
  rituals: { runningCount: number };
};

export type CosBrainRoutingContext = {
  lastEvaluationAt: number | null;
  sceneWeights: Record<string, number>;
  graphWeights: Record<string, number>;
  routingHints: Record<string, any>;
  posture: CosBrainPostureSnapshot | null;
  activePolicies: Array<{ policyId: string; matched: boolean }>;
};
