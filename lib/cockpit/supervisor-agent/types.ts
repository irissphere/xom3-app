// Supervisor Agent - Type Definitions
// The monitoring and orchestration system for all agents in the Vieron Cockpit

export type AgentStatus = "healthy" | "degraded" | "failed" | "restarting" | "offline";
export type FailureSeverity = "low" | "medium" | "high" | "critical";
export type EscalationLevel = "none" | "operator" | "steward" | "emergency";

export interface AgentHealth {
  agentId: string;
  agentName: string;
  agentType: "pipeline" | "workflow" | "lane" | "system" | "custom";
  status: AgentStatus;
  health: number; // 0-100
  lastHeartbeat: number;
  lastSuccess?: number;
  lastFailure?: number;
  consecutiveFailures: number;
  totalExecutions: number;
  successRate: number; // 0-100
  averageLatency: number; // ms
  errorRate: number; // 0-100
  metadata: Record<string, any>;
}

export interface WorkflowHealth {
  workflowId: string;
  workflowName: string;
  laneId: string;
  status: AgentStatus;
  lastExecution?: number;
  lastSuccess?: number;
  lastFailure?: number;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number; // ms
  errorRate: number; // 0-100
  lastError?: string;
}

export interface AgentFailure {
  id: string;
  agentId: string;
  agentName: string;
  agentType: string;
  failureType: "timeout" | "error" | "crash" | "degraded" | "heartbeat_missed";
  severity: FailureSeverity;
  detectedAt: number;
  resolvedAt?: number;
  error?: string;
  stackTrace?: string;
  context: Record<string, any>;
  restartAttempts: number;
  escalated: boolean;
  escalationLevel: EscalationLevel;
}

export interface Anomaly {
  id: string;
  type: "spike" | "drop" | "outlier" | "pattern" | "drift";
  source: string; // Agent ID or system component
  description: string;
  severity: FailureSeverity;
  detectedAt: number;
  resolved: boolean;
  resolvedAt?: number;
  metrics: Record<string, number>;
  threshold: Record<string, number>;
}

export interface LaneRegistry {
  laneId: string;
  laneName: string;
  description: string;
  agents: string[]; // Agent IDs
  workflows: string[]; // Workflow IDs
  status: AgentStatus;
  health: number; // 0-100
  lastUpdated: number;
  metadata: {
    priority: number; // 1-10
    owner?: string;
    dependencies: string[]; // Other lane IDs
    governanceRules: string[];
  };
}

export interface GlobalState {
  timestamp: number;
  totalAgents: number;
  healthyAgents: number;
  failedAgents: number;
  degradedAgents: number;
  totalWorkflows: number;
  activeWorkflows: number;
  failedWorkflows: number;
  lanes: LaneRegistry[];
  recentFailures: AgentFailure[];
  activeAnomalies: Anomaly[];
  systemHealth: number; // 0-100
  governanceViolations: GovernanceViolation[];
}

export interface GovernanceViolation {
  id: string;
  rule: string;
  agentId?: string;
  laneId?: string;
  severity: FailureSeverity;
  detectedAt: number;
  description: string;
  resolved: boolean;
  resolvedAt?: number;
}

export interface RestartAction {
  id: string;
  agentId: string;
  agentName: string;
  initiatedAt: number;
  completedAt?: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  restartType: "soft" | "hard" | "full";
  attempts: number;
  maxAttempts: number;
  error?: string;
}

export interface SupervisorConfig {
  monitoringInterval: number; // ms
  heartbeatTimeout: number; // ms
  failureThreshold: number; // consecutive failures before restart
  restartCooldown: number; // ms between restart attempts
  maxRestartAttempts: number;
  anomalyDetectionEnabled: boolean;
  governanceEnforcementEnabled: boolean;
  slackAlertsEnabled: boolean;
  escalationEnabled: boolean;
  lanes: LaneConfig[];
}

export interface LaneConfig {
  laneId: string;
  laneName: string;
  agents: string[];
  workflows: string[];
  priority: number;
  governanceRules: string[];
}

export interface AlertPayload {
  type: "failure" | "anomaly" | "governance_violation" | "escalation" | "restart" | "health_degraded";
  severity: FailureSeverity;
  title: string;
  message: string;
  agentId?: string;
  agentName?: string;
  laneId?: string;
  laneName?: string;
  details: Record<string, any>;
  timestamp: number;
  escalationLevel?: EscalationLevel;
}
