// The Sovereign Engine (TSE) - Type Definitions
// The crowned intelligence of the cockpit

export interface SovereignRules {
  dataQuality: {
    minAccuracy: number;
    maxErrorRate: number;
    requiredFields: string[];
  };
  workflowSLAs: {
    maxExecutionTime: number;
    maxQueueLength: number;
    minSuccessRate: number;
  };
  errorBudgets: {
    dailyErrorLimit: number;
    errorSpikeThreshold: number;
    autoPauseThreshold: number;
  };
  complianceRules: {
    requiredAudit: boolean;
    requiredNotifications: string[];
    dataRetention: number;
  };
  tenantConstraints: Record<string, {
    maxThroughput: number;
    allowedProfiles: string[];
    customRules: Record<string, any>;
  }>;
}

export interface SovereignPriorities {
  goals: Array<{
    id: string;
    type: "minimize_errors" | "maximize_throughput" | "maintain_compliance" | "reduce_drift" | "improve_accuracy" | "optimize_workflows" | "protect_tenants" | "expand_capabilities";
    weight: number;
    target: number;
    current: number;
    status: "achieved" | "progressing" | "failing";
  }>;
  activePriorities: string[];
  lastUpdated: string;
}

export interface SovereignState {
  pipelines: PipelineState[];
  workflows: WorkflowState[];
  tenants: TenantState[];
  mappings: MappingState[];
  errors: ErrorState[];
  predictions: PredictionState[];
  transformations: TransformationState[];
  lastUpdated: string;
}

export interface PipelineState {
  id: string;
  tenant: string;
  status: "active" | "paused" | "evolving" | "error" | "protected";
  metrics: {
    throughput: number;
    accuracy: number;
    errorRate: number;
    lastExecution: string;
  };
  protection: {
    shielded: boolean;
    rerouted: boolean;
    paused: boolean;
    reason?: string;
  };
}

export interface WorkflowState {
  id: string;
  status: "active" | "paused" | "overloaded" | "error";
  metrics: {
    executionTime: number;
    queueLength: number;
    failureRate: number;
    lastExecution: string;
  };
  load: number;
}

export interface TenantState {
  id: string;
  status: "active" | "monitored" | "protected" | "anomaly";
  metrics: {
    totalPipelines: number;
    totalErrors: number;
    avgThroughput: number;
    complianceScore: number;
  };
  constraints: Record<string, any>;
}

export interface MappingState {
  profileKey: string;
  status: "active" | "evolving" | "deprecated" | "new";
  metrics: {
    usageCount: number;
    successRate: number;
    lastUsed: string;
  };
  tenants: string[];
}

export interface ErrorState {
  id: string;
  type: string;
  frequency: number;
  trend: "increasing" | "decreasing" | "stable";
  resolution: "pending" | "resolved" | "protected";
  lastSeen: string;
}

export interface PredictionState {
  type: string;
  confidence: number;
  timeframe: string;
  action: string;
  status: "active" | "resolved" | "expired";
}

export interface TransformationState {
  type: string;
  rules: number;
  effectiveness: number;
  lastOptimized: string;
}

export interface SovereignDecision {
  id: string;
  timestamp: string;
  type: "governance" | "protection" | "optimization" | "expansion" | "regulation" | "balancing" | "direction";
  decision: string;
  reason: string;
  actions: Array<{
    action: string;
    target: string;
    applied: boolean;
    result?: string;
  }>;
  confidence: number;
  outcome?: string;
  explanation: string;
}

export interface SovereignExpansion {
  type: "pipeline" | "workflow" | "profile" | "rule" | "path";
  created: boolean;
  id?: string;
  reason: string;
  confidence: number;
  metadata: Record<string, any>;
}

export interface SovereignBalance {
  dimension: "load" | "throughput" | "error_rate" | "workflow_queue" | "tenant_priority" | "resource_allocation";
  current: number;
  target: number;
  adjustment: number;
  reason: string;
  applied: boolean;
}
