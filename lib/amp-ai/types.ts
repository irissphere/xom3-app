// AMP-AI Type Definitions

export interface ColumnAnalysis {
  name: string;
  type: "email" | "phone" | "date" | "name" | "status" | "text" | "number" | "unknown";
  confidence: number;
  patterns: string[];
  suggestedMapping?: string;
}

export interface SchemaAnalysis {
  columns: ColumnAnalysis[];
  suggestedProfile?: string;
  confidence: number;
  autoMappings: Record<string, string>;
}

export interface ProfileMatch {
  profileKey: string;
  profileName: string;
  score: number;
  matchedColumns: number;
  totalColumns: number;
  confidence: number;
}

export interface CleaningResult {
  cleaned: Record<string, any>;
  changes: Array<{
    field: string;
    original: any;
    cleaned: any;
    reason: string;
  }>;
}

export interface RepairSuggestion {
  field: string;
  originalValue: any;
  suggestedValue: any;
  confidence: number;
  reason: string;
  safe: boolean;
}

export interface RepairResult {
  repaired: Record<string, any>;
  suggestions: RepairSuggestion[];
  applied: boolean;
  retryable: boolean;
}

export interface OptimizationInsight {
  type: "mapping" | "cleaning" | "validation" | "profile";
  description: string;
  impact: "high" | "medium" | "low";
  recommendation: string;
  confidence: number;
}

export interface PatternEvent {
  type: "spike" | "error_rate" | "bottleneck" | "compliance" | "anomaly";
  severity: "critical" | "warning" | "info";
  description: string;
  metrics: Record<string, any>;
  timestamp: string;
}

export interface AIExplanation {
  action: string;
  description: string;
  details: Record<string, any>;
  timestamp: string;
  confidence?: number;
}

export interface AMPAIContext {
  tenant: string;
  pipelineId?: string;
  executionId?: string;
  explanations: AIExplanation[];
}
