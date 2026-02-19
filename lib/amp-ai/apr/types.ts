// AMP-AI: Autonomous Pipeline Rewriting (APR) - Type Definitions

export type PipelineStage = 
  | "source"
  | "pre_clean"
  | "transform"
  | "validate"
  | "normalize"
  | "insert"
  | "post_workflow"
  | "retry"
  | "audit"
  | "ai_detect"
  | "auto_map";

export type RewriteTrigger = 
  | "schema_drift"
  | "repeated_errors"
  | "tenant_behavior"
  | "workflow_bottleneck"
  | "ppo_prediction"
  | "performance_degradation"
  | "error_spike";

export interface PipelineNode {
  id: string;
  type: PipelineStage;
  config: Record<string, any>;
  position: number;
  enabled: boolean;
  metadata?: {
    addedBy?: "apr" | "user" | "system";
    addedAt?: string;
    reason?: string;
    confidence?: number;
  };
}

export interface PipelineRewrite {
  pipelineId: string;
  tenant: string;
  trigger: RewriteTrigger;
  changes: PipelineChange[];
  confidence: number;
  applied: boolean;
  appliedAt?: string;
  explanation: string;
  beforeState: PipelineStructure;
  afterState: PipelineStructure;
}

export interface PipelineChange {
  type: "add_stage" | "remove_stage" | "reorder_stage" | "modify_stage" | "insert_node";
  stage?: PipelineStage;
  node?: PipelineNode;
  position?: number;
  oldPosition?: number;
  newPosition?: number;
  config?: Record<string, any>;
  reason: string;
  confidence: number;
}

export interface PipelineStructure {
  stages: PipelineNode[];
  workflowHooks: WorkflowHook[];
  notificationRules: NotificationRule[];
  validationRules: ValidationRule[];
  metadata: {
    version: number;
    lastModified: string;
    modifiedBy: "apr" | "user" | "system";
  };
}

export interface WorkflowHook {
  id: string;
  workflowId: string;
  trigger: "on_success" | "on_error" | "on_partial" | "conditional";
  condition?: string;
  position: number;
  enabled: boolean;
  metadata?: {
    addedBy?: "apr" | "user";
    addedAt?: string;
    reason?: string;
  };
}

export interface NotificationRule {
  id: string;
  type: "alert" | "email" | "slack" | "webhook";
  trigger: "drift_detected" | "error_spike" | "throughput_drop" | "workflow_failure" | "retry_success" | "workflow_success";
  condition?: string;
  channels: string[];
  enabled: boolean;
  metadata?: {
    addedBy?: "apr" | "user";
    addedAt?: string;
    reason?: string;
  };
}

export interface ValidationRule {
  id: string;
  field: string;
  ruleType: "required" | "format" | "range" | "enum" | "fallback" | "custom";
  rule: any;
  position: number;
  enabled: boolean;
  metadata?: {
    addedBy?: "apr" | "user";
    addedAt?: string;
    reason?: string;
    confidence?: number;
  };
}

export interface RewriteSuggestion {
  trigger: RewriteTrigger;
  changes: PipelineChange[];
  confidence: number;
  reason: string;
  impact: "high" | "medium" | "low";
  explanation: string;
}
