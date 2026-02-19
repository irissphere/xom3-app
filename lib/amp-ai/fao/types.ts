// AMP-AI: Full Autonomous Orchestration (FAO) - Type Definitions

export interface PipelineAgent {
  id: string;
  pipelineId: string;
  tenant: string;
  goals: AgentGoal[];
  triggers: AgentTrigger[];
  behaviors: AgentBehavior[];
  memory: AgentMemory;
  evolutionRules: EvolutionRule[];
  state: "active" | "paused" | "evolving" | "error";
  lastDecision: string;
  lastDecisionAt: string;
}

export interface AgentGoal {
  id: string;
  type: "throughput" | "accuracy" | "latency" | "reliability" | "cost";
  target: number;
  current: number;
  priority: number;
  status: "achieved" | "progressing" | "failing";
}

export interface AgentTrigger {
  id: string;
  type: "schedule" | "event" | "condition" | "signal";
  condition: string;
  action: "run" | "pause" | "accelerate" | "retry" | "backoff" | "reconfigure";
  enabled: boolean;
}

export interface AgentBehavior {
  id: string;
  type: "routing" | "scheduling" | "error_handling" | "optimization";
  config: Record<string, any>;
  enabled: boolean;
}

export interface AgentMemory {
  executionHistory: ExecutionRecord[];
  errorPatterns: ErrorPattern[];
  performanceMetrics: PerformanceMetric[];
  decisions: DecisionRecord[];
  lastUpdated: string;
}

export interface ExecutionRecord {
  timestamp: string;
  status: string;
  rowsProcessed: number;
  rowsFailed: number;
  executionTime: number;
  decisions: string[];
}

export interface ErrorPattern {
  type: string;
  frequency: number;
  lastSeen: string;
  resolution: string;
}

export interface PerformanceMetric {
  metric: string;
  value: number;
  timestamp: string;
  trend: "improving" | "degrading" | "stable";
}

export interface DecisionRecord {
  timestamp: string;
  decision: string;
  reason: string;
  outcome: string;
  confidence: number;
}

export interface EvolutionRule {
  id: string;
  condition: string;
  action: "rewrite" | "split" | "merge" | "deprecate";
  config: Record<string, any>;
  enabled: boolean;
}

export interface OrchestrationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  weights: Record<string, number>;
  lastUpdated: string;
}

export interface GraphNode {
  id: string;
  type: "pipeline" | "workflow" | "trigger" | "tenant" | "profile";
  data: any;
  position: { x: number; y: number };
  metadata: {
    confidence: number;
    priority: number;
    urgency: number;
    lastActivity: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "dependency" | "condition" | "signal" | "data_flow";
  weight: number;
  condition?: string;
  metadata: {
    confidence: number;
    frequency: number;
    lastUsed: string;
  };
}

export interface AutonomousSchedule {
  pipelineId: string;
  tenant: string;
  nextRun?: string;
  schedule: "immediate" | "delayed" | "paused" | "accelerated" | "backoff";
  reason: string;
  confidence: number;
  factors: Array<{
    factor: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }>;
}

export interface AutonomousRoute {
  source: string;
  target: string;
  path: string[];
  reason: string;
  confidence: number;
  estimatedTime: number;
  factors: Array<{
    factor: string;
    impact: "positive" | "negative";
    description: string;
  }>;
}

export interface WorkflowChain {
  id: string;
  workflows: string[];
  conditions: string[];
  order: number[];
  enabled: boolean;
  metadata: {
    createdBy: "fao" | "user";
    createdAt: string;
    successRate: number;
    avgExecutionTime: number;
  };
}

export interface AutonomousErrorHandling {
  errorId: string;
  errorType: string;
  classification: "transient" | "permanent" | "data" | "system";
  actions: Array<{
    action: "repair" | "retry" | "rewrite" | "notify" | "audit";
    applied: boolean;
    result: string;
  }>;
  resolved: boolean;
  resolvedAt?: string;
}

export interface ProfileManagement {
  action: "create" | "split" | "merge" | "deprecate" | "evolve" | "assign";
  profileKey: string;
  newProfileKey?: string;
  tenant?: string;
  reason: string;
  confidence: number;
  applied: boolean;
  appliedAt?: string;
}

export interface DriftResponse {
  driftType: string;
  detectedAt: string;
  responses: Array<{
    type: "pipeline_rewrite" | "mapping_rewrite" | "cleaning_rewrite" | "validation_rewrite" | "workflow_rewrite";
    applied: boolean;
    reason: string;
    confidence: number;
  }>;
  resolved: boolean;
  resolvedAt?: string;
}

export interface OrchestrationExplanation {
  timestamp: string;
  decision: string;
  reason: string;
  factors: string[];
  confidence: number;
  outcome?: string;
  explanation: string;
}
