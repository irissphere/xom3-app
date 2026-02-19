
// --- Operator Timeline Schema ---

export type TimelineEventType = 
  | 'seal'         // Day close / Task completion
  | 'activation'   // Day start / System boot
  | 'ritual'       // Scheduled habit / checkpoint
  | 'decision'     // Operator manual override
  | 'insight'      // High-value system realization
  | 'error'        // Critical failure blocking progress
  | 'broadcast'    // Outbound communication
  | 'automation';  // Automated system action

export interface OperatorTimelineEvent {
  id: string;
  timestamp: string;
  type: TimelineEventType;
  source: 'operator' | 'system' | 'agent';
  agentId?: string; // If agent-initiated
  description: string;
  metadata?: Record<string, any>;
  artifacts?: string[]; // Links to generated assets
  context?: string; // Current system state/focus
}

export interface OperatorTimeline {
  events: OperatorTimelineEvent[];
  lastSync: string;
  activeContext: string;
}

// --- Agent Registry Schema ---

export type AgentStatus = "active" | "inactive";

export interface AgentRole {
  id: string;
  name: string;
  domain: string;
  description: string;
  capabilities: string[];
  status: AgentStatus;
}

export interface AgentCrew {
  id: string;
  name: string;
  domain: string;
  purpose: string;
  roles: AgentRole[];
  status: AgentStatus;
  leadAgentId?: string;
}

export interface AgentRegistry {
  crews: AgentCrew[];
  lastUpdated: string;
}

// --- UOI SSOT / Unified Data Model ---

export interface PipelineRecord {
  id: string;
  tenant: string;
  domain: string;
  source: string;
  target: string;
  mapping: Record<string, any>;
  status: "active" | "paused" | "completed" | "failed" | string;
  metrics: {
    throughput: number;
    accuracy: number;
    errorRate: number;
    lastExecution: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRecord {
  id: string;
  tenant: string;
  domain: string;
  name?: string;
  status: "active" | "paused" | "failed" | "unknown" | string;
  lastRun?: string;
  nextRun?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface TenantRecord {
  id: string;
  name: string;
  domains: string[];
  constraints: Record<string, any>;
  preferences: Record<string, any>;
  metrics: {
    totalPipelines: number;
    totalWorkflows: number;
    avgThroughput: number;
    avgAccuracy: number;
    complianceScore: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionRecord {
  id: string;
  pipelineId: string;
  tenant: string;
  domain: string;
  status: string;
  rowsProcessed: number;
  rowsFailed: number;
  executionTime: number;
  timestamp: string;
}

export interface ErrorRecord {
  id: string;
  pipelineId: string;
  tenant: string;
  domain: string;
  type: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical" | string;
  resolved: boolean;
  timestamp: string;
  [key: string]: any;
}

export interface PatternRecord {
  id: string;
  tenant?: string;
  domain?: string;
  pattern: string;
  prediction?: string;
  frequency?: number;
  shared: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface OptimizationRecord {
  id: string;
  tenant?: string;
  domain?: string;
  type?: string;
  description?: string;
  applied?: boolean;
  timestamp?: string;
  [key: string]: any;
}

export interface UnifiedDataModel {
  pipelines: PipelineRecord[];
  workflows: WorkflowRecord[];
  tenants: TenantRecord[];
  executions: ExecutionRecord[];
  errors: ErrorRecord[];
  patterns: PatternRecord[];
  optimizations: OptimizationRecord[];
  lastUpdated: string;
}

// --- UOI Orchestration / Mission ---

export interface OrchestrationDecision {
  id: string;
  type: "priority" | "conflict" | "resource" | "load" | "schedule" | string;
  decision: string;
  reasoning: string;
  participants: string[];
  applied: boolean;
  timestamp: string;
}

export interface UnifiedMission {
  goals: Array<{
    id: string;
    name: string;
    target: number;
    current: number;
    priority: number;
  }>;
  principles: string[];
  constraints: Record<string, any>;
  lastUpdated: string;
}

// --- UOI Intelligence Bus ---

export interface IntelligenceSignal {
  id: string;
  source: string;
  type: "prediction" | "adaptation" | "optimization" | "pattern" | "anomaly";
  payload: any;
  priority: "low" | "medium" | "high" | "critical";
  timestamp: string;
  consumed: boolean;
  consumedBy: string[];
}
