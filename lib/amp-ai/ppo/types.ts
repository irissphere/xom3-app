// AMP-AI: Predictive Pipeline Optimization (PPO) - Type Definitions

export interface SchemaDriftPrediction {
  type: "new_column" | "missing_column" | "type_change" | "naming_drift" | "value_drift";
  column?: string;
  confidence: number;
  timeframe: "immediate" | "short_term" | "medium_term" | "long_term";
  description: string;
  indicators: string[];
  recommendedAction: string;
}

export interface FailurePrediction {
  column?: string;
  tenant?: string;
  profileKey?: string;
  failureType: string;
  confidence: number;
  timeframe: string;
  description: string;
  historicalPattern: {
    frequency: number;
    trend: "increasing" | "decreasing" | "stable";
    lastOccurrence: string;
  };
  recommendedAction: string;
}

export interface BottleneckPrediction {
  workflowId: string;
  workflowName: string;
  bottleneckType: "execution_time" | "queue_length" | "failure_rate" | "resource_limit";
  confidence: number;
  predictedTime: string;
  predictedDuration?: number;
  currentMetrics: {
    avgExecutionTime: number;
    queueLength: number;
    failureRate: number;
  };
  recommendedAction: string;
}

export interface ErrorSpikePrediction {
  type: "time_based" | "tenant_based" | "source_based" | "schema_based";
  source: string;
  confidence: number;
  predictedTime: string;
  predictedErrorRate: number;
  currentErrorRate: number;
  increasePercentage: number;
  description: string;
  recommendedAction: string;
}

export interface ProfilePrediction {
  currentProfile: string;
  suggestedProfile: string;
  confidence: number;
  reason: string;
  similarityScore: number;
  driftDetected: boolean;
  recommendedAction: string;
}

export interface ThroughputPrediction {
  pipelineId: string;
  predictedRowsPerSecond: number;
  predictedTotalTime: number;
  predictedRows: number;
  confidence: number;
  factors: Array<{
    factor: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }>;
  recommendedAction: string;
}

export interface TenantIssuePrediction {
  tenant: string;
  issueType: "mapping_drift" | "schema_change" | "workflow_failure" | "compliance_risk";
  confidence: number;
  timeframe: string;
  description: string;
  indicators: string[];
  recommendedAction: string;
}

export interface PreventativeAction {
  type: "pre_clean" | "pre_map" | "pre_validate" | "pre_normalize" | "pre_adjust_profile" | "pre_trigger_workflow" | "pre_notify";
  target: string;
  action: any;
  confidence: number;
  reason: string;
  autoTrigger: boolean;
}

export interface PredictionExplanation {
  predictionType: string;
  prediction: any;
  confidence: number;
  basis: string;
  timeframe: string;
  explanation: string;
  recommendedAction: string;
}

export interface PPOPrediction {
  schemaDrift?: SchemaDriftPrediction[];
  failures?: FailurePrediction[];
  bottlenecks?: BottleneckPrediction[];
  errorSpikes?: ErrorSpikePrediction[];
  profiles?: ProfilePrediction[];
  throughput?: ThroughputPrediction[];
  tenantIssues?: TenantIssuePrediction[];
  preventativeActions?: PreventativeAction[];
  overallRisk: "low" | "medium" | "high" | "critical";
  summary: string;
}
