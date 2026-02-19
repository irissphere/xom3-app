// AMP-AI: Adaptive Profile Evolution (APE) - Type Definitions

export interface EvolutionSignal {
  type: "success" | "error" | "tenant_override" | "drift" | "workflow_outcome";
  timestamp: string;
  pipelineId: string;
  tenant: string;
  profileKey: string;
  column?: string;
  targetField?: string;
  success: boolean;
  metadata: Record<string, any>;
}

export interface ColumnMappingFrequency {
  column: string;
  targetField: string;
  successCount: number;
  totalCount: number;
  confidence: number; // successCount / totalCount
  lastSeen: string;
}

export interface ErrorPattern {
  column: string;
  errorType: string;
  errorMessage: string;
  frequency: number;
  lastSeen: string;
  suggestedFix?: string;
}

export interface TenantOverride {
  tenant: string;
  profileKey: string;
  column: string;
  originalMapping: string;
  overrideMapping: string;
  timestamp: string;
}

export interface SchemaDrift {
  profileKey: string;
  tenant: string;
  type: "new_column" | "missing_column" | "type_change";
  column: string;
  oldValue?: any;
  newValue?: any;
  detectedAt: string;
}

export interface EvolutionMemory {
  profileKey: string;
  tenant: string;
  columnMappings: Record<string, ColumnMappingFrequency>;
  errorPatterns: ErrorPattern[];
  tenantOverrides: TenantOverride[];
  schemaDrifts: SchemaDrift[];
  lastUpdated: string;
}

export interface EvolutionSuggestion {
  type: "mapping_update" | "new_mapping" | "cleaning_rule" | "validation_rule" | "workflow_trigger";
  priority: "high" | "medium" | "low";
  confidence: number;
  description: string;
  currentState: any;
  proposedChange: any;
  impact: string;
  reason: string;
}

export interface ProfileEvolution {
  profileKey: string;
  tenant: string;
  changes: Array<{
    type: "mapping_added" | "mapping_updated" | "mapping_removed" | "rule_added" | "rule_updated";
    field: string;
    oldValue?: any;
    newValue: any;
    confidence: number;
    reason: string;
  }>;
  confidence: number;
  applied: boolean;
  appliedAt?: string;
  explanation: string;
}

export interface CleaningRuleEvolution {
  field: string;
  pattern: string;
  transformation: string;
  frequency: number;
  confidence: number;
  applied: boolean;
}

export interface ValidationRuleEvolution {
  field: string;
  ruleType: "required" | "format" | "range" | "enum" | "fallback";
  rule: any;
  frequency: number;
  confidence: number;
  applied: boolean;
}

export interface WorkflowTriggerEvolution {
  condition: string;
  workflowId: string;
  frequency: number;
  successRate: number;
  confidence: number;
  applied: boolean;
}
