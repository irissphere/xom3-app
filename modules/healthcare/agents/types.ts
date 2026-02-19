// Health CRM Agent Types

/**
 * Health Lead Intake Data
 */
export interface HealthLeadIntake {
  // Contact Information
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  
  // Lead Source
  source?: string; // "web_form", "referral", "call", "email", etc.
  
  // Healthcare-Specific
  dateOfBirth?: string;
  insurance?: string;
  primaryCareProvider?: string;
  reasonForContact?: string;
  preferredContactMethod?: string;
  
  // Metadata
  referralSource?: string;
  notes?: string;
  submittedAt?: string;
  
  // Raw payload for processing
  rawPayload?: Record<string, any>;
}

/**
 * Normalized Health Lead
 */
export interface NormalizedHealthLead {
  // Identifiers
  email: string;
  phone?: string;
  
  // Personal Info
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  
  // Healthcare Info
  insurance?: string;
  primaryCareProvider?: string;
  reasonForContact?: string;
  
  // Metadata
  source: string;
  referralSource?: string;
  notes?: string;
  submittedAt: string;
  
  // Classification
  classification?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  routing?: string;
}

/**
 * Deduplication Result
 */
export interface DeduplicationResult {
  isDuplicate: boolean;
  existingClientId?: string;
  confidence: number;
  matchFields: string[];
}

/**
 * Classification Result
 */
export interface ClassificationResult {
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  routing: string;
  confidence: number;
  reasoning: string;
}

/**
 * Health Follow-up Task
 */
export interface HealthFollowUpTask {
  id?: string;
  clientId: string;
  title: string;
  description?: string;
  dueDate: string;
  status: "pending" | "due_now" | "overdue" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  type: "follow_up" | "appointment" | "check_in" | "reminder";
  assignedTo?: string;
  createdAt?: string;
  completedAt?: string;
}

/**
 * Agent Execution Result
 */
export interface AgentExecutionResult {
  success: boolean;
  data?: any;
  errors?: Array<{ field: string; message: string }>;
  warnings?: string[];
  metadata?: {
    executionId: string;
    duration: number;
    processedCount?: number;
    createdCount?: number;
    updatedCount?: number;
  };
}
