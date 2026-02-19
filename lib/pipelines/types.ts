// Automated Migration Pipelines (AMP) - Type Definitions
// This is the schema for self-running migration pipelines

export type PipelineSourceType = 
  | "csv-upload" 
  | "csv-s3" 
  | "api-endpoint" 
  | "webhook" 
  | "scheduled-csv";

export type PipelineSchedule = 
  | "manual" 
  | "hourly" 
  | "daily" 
  | "weekly" 
  | "on-upload" 
  | "on-webhook"
  | string; // Cron expression

export interface PipelineSource {
  type: PipelineSourceType;
  // For CSV uploads
  filePath?: string;
  // For S3
  s3Bucket?: string;
  s3Key?: string;
  // For API
  apiUrl?: string;
  apiHeaders?: Record<string, string>;
  apiMethod?: "GET" | "POST";
  // For webhook
  webhookPath?: string;
}

export interface PipelineMapping {
  profileKey: string; // Transformation profile key
  autoDetect?: boolean; // Auto-detect and suggest mapping
}

export interface PipelineValidation {
  requiredFields?: string[];
  emailValidation?: boolean;
  phoneValidation?: boolean;
  customRules?: Array<{
    field: string;
    rule: string; // e.g., "minLength:5", "regex:^[A-Z]"
  }>;
}

export interface PipelineWorkflow {
  triggerOnSuccess?: boolean;
  triggerOnError?: boolean;
  workflowId?: string; // n8n workflow ID
  workflowWebhook?: string; // n8n webhook path
  payload?: Record<string, any>; // Additional payload
}

export interface PipelineNotification {
  onSuccess?: boolean;
  onError?: boolean;
  channels?: ("slack" | "email" | "webhook")[];
  customMessage?: string;
}

export interface PipelineAudit {
  logSource?: boolean;
  logMapping?: boolean;
  logValidation?: boolean;
  logWorkflows?: boolean;
  logErrors?: boolean;
  customFields?: Record<string, any>;
}

export interface MigrationPipeline {
  id: string;
  name: string;
  tenant: string;
  description?: string;
  
  // Source configuration
  source: PipelineSource;
  
  // Transformation
  mapping: PipelineMapping;
  
  // Validation
  validation?: PipelineValidation;
  
  // Target
  targetTable: string; // Airtable table name
  
  // Scheduling
  schedule: PipelineSchedule;
  scheduleConfig?: {
    cron?: string;
    timezone?: string;
    enabled?: boolean;
  };
  
  // Automation
  workflow?: PipelineWorkflow;
  notification?: PipelineNotification;
  audit?: PipelineAudit;
  
  // Status
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PipelineExecution {
  id: string;
  pipelineId: string;
  status: "running" | "success" | "error" | "partial";
  startedAt: string;
  completedAt?: string;
  
  // Results
  rowsProcessed?: number;
  rowsImported?: number;
  rowsFailed?: number;
  errors?: Array<{
    row: number;
    error: string;
    field?: string;
  }>;
  
  // AMP-ER: Error Row Capture
  failedRows?: Array<Record<string, any>>; // Raw row data that failed
  errorMessages?: string[]; // Array of error strings
  
  // Execution details
  source?: string;
  mappingProfile?: string;
  workflowTriggered?: boolean;
  notificationsSent?: boolean;
  auditLogged?: boolean;
  
  // Metadata
  executionTime?: number; // milliseconds
  details?: Record<string, any>;
}

export interface SchemaDetectionResult {
  columns: string[];
  suggestedMapping?: Record<string, string>;
  suggestedProfile?: string;
  confidence?: number; // 0-1
}
