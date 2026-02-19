// Unified Cockpit - Type Definitions
// The system that fuses all engines into one organism

export type CockpitView = "system" | "operations" | "executive" | "agent" | "ritual";
export type EngineStatus = "healthy" | "warning" | "critical" | "offline";
export type SignalSeverity = "low" | "medium" | "high" | "critical";

export interface CockpitEngine {
  id: string;
  name: string;
  type: "broadcast" | "commerce" | "hse" | "hpe" | "uoi" | "agent" | "optimization" | "revenue";
  status: EngineStatus;
  health: number; // 0-100
  lastSignal?: string;
  metrics: EngineMetrics;
}

export interface EngineMetrics {
  requests: number;
  errors: number;
  latency: number; // ms
  throughput: number; // operations per second
  lastUpdated: string;
}

export interface CockpitSignal {
  id: string;
  source: string; // Engine ID
  type: string;
  severity: SignalSeverity;
  payload: Record<string, any>;
  timestamp: number;
  processed: boolean;
}

export interface CockpitIntelligence {
  pressure: number; // 0-100
  load: number; // 0-100
  anomalies: CockpitAnomaly[];
  trends: CockpitTrend[];
  decisions: CockpitDecision[];
  lastUpdated: string;
}

export interface CockpitAnomaly {
  id: string;
  type: "spike" | "drop" | "outlier" | "pattern";
  source: string;
  description: string;
  severity: SignalSeverity;
  detectedAt: string;
  resolved: boolean;
}

export interface CockpitTrend {
  id: string;
  type: "revenue" | "traffic" | "conversion" | "engagement";
  direction: "rising" | "falling" | "stable";
  confidence: number; // 0-100
  impact: "high" | "medium" | "low";
  detectedAt: string;
}

export interface CockpitDecision {
  id: string;
  type: "adjustment" | "alert" | "optimization" | "routing";
  source: string;
  target: string;
  action: string;
  reason: string;
  executed: boolean;
  executedAt?: string;
}

export interface SystemView {
  engines: CockpitEngine[];
  signals: CockpitSignal[];
  loops: CockpitLoop[];
  health: number; // 0-100
}

export interface CockpitLoop {
  id: string;
  name: string;
  engines: string[]; // Engine IDs
  status: "active" | "paused" | "error";
  lastCycle: string;
  cycleCount: number;
}

export interface OperationsView {
  tasks: OperationTask[];
  leads: OperationLead[];
  orders: OperationOrder[];
  posts: OperationPost[];
  ads: OperationAd[];
  anomalies: CockpitAnomaly[];
}

export interface OperationTask {
  id: string;
  source: "hpe" | "agent" | "commerce" | "broadcast";
  type: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  priority: "low" | "medium" | "high" | "critical";
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationLead {
  id: string;
  source: "broadcast" | "commerce" | "organic";
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  value: number;
  createdAt: string;
}

export interface OperationOrder {
  id: string;
  source: "commerce";
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  value: number;
  createdAt: string;
}

export interface OperationPost {
  id: string;
  source: "broadcast";
  platform: string;
  status: "draft" | "scheduled" | "published" | "archived";
  performance?: {
    views: number;
    engagement: number;
    conversions: number;
  };
  createdAt: string;
}

export interface OperationAd {
  id: string;
  source: "commerce";
  platform: string;
  status: "draft" | "active" | "paused" | "archived";
  performance?: {
    spend: number;
    revenue: number;
    roas: number;
  };
  createdAt: string;
}

export interface ExecutiveView {
  revenue: RevenueMetrics;
  trends: CockpitTrend[];
  ltv: LTVMetrics;
  roas: ROASMetrics;
  pipeline: PipelineMetrics;
  pressure: PressureMetrics;
}

export interface RevenueMetrics {
  total: number;
  healthcare: number;
  commerce: number;
  period: {
    start: string;
    end: string;
  };
  trend: "rising" | "falling" | "stable";
  change: number; // percentage
}

export interface LTVMetrics {
  average: number;
  healthcare: number;
  commerce: number;
  trend: "rising" | "falling" | "stable";
}

export interface ROASMetrics {
  average: number;
  byPlatform: Record<string, number>;
  trend: "rising" | "falling" | "stable";
}

export interface PipelineMetrics {
  total: number;
  active: number;
  velocity: number; // clients per week
  conversion: number; // percentage
  trend: "rising" | "falling" | "stable";
}

export interface PressureMetrics {
  system: number; // 0-100
  operator: number; // 0-100
  engines: Record<string, number>; // Engine ID → pressure
  trend: "rising" | "falling" | "stable";
}

export interface AgentView {
  agents: AgentStatus[];
  tasks: AgentTask[];
  scripts: AgentScript[];
  performance: AgentPerformance;
  bottlenecks: AgentBottleneck[];
}

export interface AgentStatus {
  id: string;
  name: string;
  type: string;
  status: "idle" | "active" | "busy" | "error";
  load: number; // 0-100
  tasksActive: number;
  lastActivity: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  type: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentScript {
  id: string;
  name: string;
  type: string;
  status: "active" | "paused" | "archived";
  executionCount: number;
  successRate: number; // 0-100
  lastExecuted: string;
}

export interface AgentPerformance {
  totalTasks: number;
  completedTasks: number;
  successRate: number; // 0-100
  averageLatency: number; // ms
  throughput: number; // tasks per hour
}

export interface AgentBottleneck {
  id: string;
  agentId: string;
  type: "overload" | "error" | "latency" | "resource";
  description: string;
  severity: SignalSeverity;
  detectedAt: string;
}

export interface RitualView {
  rituals: CockpitRitual[];
  schedule: RitualSchedule;
  status: RitualStatus;
}

export interface CockpitRitual {
  id: string;
  name: string;
  type: "morning" | "nightly" | "weekly" | "optimization" | "custom" | "monthly" | "seasonal" | "legacy";
  description: string;
  steps: RitualStep[];
  enabled: boolean;
  lastExecuted?: string;
  nextExecution?: string;
  cycleType?: "daily" | "weekly" | "monthly" | "seasonal" | "legacy";
}

export interface RitualStep {
  id: string;
  name: string;
  action: string;
  order: number;
  required: boolean;
}

export interface RitualSchedule {
  morning: string; // Time
  nightly: string; // Time
  weekly: string; // Day + Time
  optimization: string; // Frequency
}

export interface RitualStatus {
  current: string | null; // Ritual ID
  lastCompleted: string | null; // Ritual ID
  nextScheduled: string | null; // Ritual ID
  inProgress: boolean;
}

export interface CrossEngineSignal {
  from: string; // Engine ID
  to: string; // Engine ID
  type: string;
  payload: Record<string, any>;
  timestamp: number;
  processed: boolean;
}

export interface CockpitState {
  view: CockpitView;
  intelligence: CockpitIntelligence;
  systemView: SystemView;
  operationsView: OperationsView;
  executiveView: ExecutiveView;
  agentView: AgentView;
  ritualView: RitualView;
  lastUpdated: string;
}
