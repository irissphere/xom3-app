// Enterprise Data Transformation Engine - Type Definitions

export type FieldType = 
  | "string" 
  | "number" 
  | "boolean" 
  | "date" 
  | "email" 
  | "phone" 
  | "url" 
  | "array" 
  | "object";

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string; // Transformation function name
  defaultValue?: any;
  required?: boolean;
}

export interface SchemaMapping {
  id: string;
  name: string;
  description?: string;
  sourceSchema: SchemaDefinition;
  targetSchema: SchemaDefinition;
  fieldMappings: FieldMapping[];
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchemaDefinition {
  name: string;
  fields: FieldDefinition[];
}

export interface FieldDefinition {
  name: string;
  type: FieldType;
  required?: boolean;
  format?: string; // e.g., "YYYY-MM-DD" for dates
  validation?: ValidationRule[];
  description?: string;
}

export interface ValidationRule {
  type: "required" | "format" | "range" | "pattern" | "custom";
  value?: any;
  message?: string;
  validator?: string; // Function name for custom validation
}

export interface TransformationFunction {
  name: string;
  description: string;
  execute: (value: any, params?: any) => any;
}

export interface TransformationProfile {
  id: string;
  name: string;
  description?: string;
  schemaMappingId: string;
  cleaningRules: CleaningRule[];
  validationRules: ValidationRule[];
  transformationRules: TransformationRule[];
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CleaningRule {
  field: string;
  operation: "trim" | "lowercase" | "uppercase" | "removeWhitespace" | "normalizePhone" | "normalizeEmail" | "normalizeDate" | "removeSpecialChars" | "custom";
  params?: any;
}

export interface TransformationRule {
  field: string;
  operation: string; // Function name from transformation registry
  params?: any;
  condition?: string; // Conditional logic
}

export interface PipelineDefinition {
  id: string;
  name: string;
  description?: string;
  source: DataSource;
  target: DataTarget;
  transformationProfileId: string;
  schedule?: string; // Cron expression
  tenantId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DataSource {
  type: "airtable" | "csv" | "json" | "api" | "database";
  config: any;
}

export interface DataTarget {
  type: "airtable" | "csv" | "json" | "api" | "database";
  config: any;
}

export interface TransformationResult {
  success: boolean;
  recordsProcessed: number;
  recordsTransformed: number;
  recordsFailed: number;
  errors: TransformationError[];
  warnings: string[];
  executionTime: number;
}

export interface TransformationError {
  recordIndex: number;
  field?: string;
  message: string;
  value?: any;
}

export interface PipelineExecution {
  id: string;
  pipelineId: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: TransformationResult;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}
