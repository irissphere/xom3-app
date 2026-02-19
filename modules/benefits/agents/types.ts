// Benefits CRM Agent Types

/**
 * Benefits Lead Intake Data
 */
export interface BenefitsLeadIntake {
  // Contact Information
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  
  // Lead Source
  source?: string; // "web_form", "vanillasoft", "referral", "call", "email", etc.
  
  // Benefits-Specific
  dateOfBirth?: string;
  zipCode?: string;
  state?: string;
  leadType?: "ACA" | "Medicare" | "Employer" | "Individual/Family";
  employerName?: string;
  currentCoverage?: string;
  interestedIn?: string; // Benefits they're interested in
  householdSize?: number;
  income?: number;
  preferredContactMethod?: "SMS" | "Email" | "Phone";
  smsOptIn?: boolean;
  
  // Metadata
  referralSource?: string;
  notes?: string;
  submittedAt?: string;
  
  // Raw payload for processing
  rawPayload?: Record<string, any>;
}

/**
 * Normalized Benefits Lead
 */
export interface NormalizedBenefitsLead {
  // Identifiers
  email: string;
  phone?: string;
  
  // Personal Info
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  zipCode?: string;
  state?: string;
  
  // Benefits Info
  leadType: "ACA" | "Medicare" | "Employer" | "Individual/Family";
  employerName?: string;
  currentCoverage?: string;
  interestedIn?: string;
  householdSize?: number;
  income?: number;
  
  // Contact Preferences
  preferredContactMethod?: "SMS" | "Email" | "Phone";
  smsOptIn?: boolean;
  
  // Metadata
  source: string;
  referralSource?: string;
  notes?: string;
  submittedAt: string;
  
  // Classification
  eligibilityCategory?: string;
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
  leadType: "ACA" | "Medicare" | "Employer" | "Individual/Family";
  eligibilityCategory?: string;
  priority: "low" | "medium" | "high" | "urgent";
  routing: string;
  confidence: number;
  reasoning: string;
}

/**
 * Benefits Follow-up Task
 */
export interface BenefitsFollowUpTask {
  id?: string;
  clientId: string;
  title: string;
  description?: string;
  dueDate: string;
  status: "pending" | "due_now" | "overdue" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  type: "follow_up" | "appointment" | "check_in" | "reminder" | "enrollment";
  leadType?: "ACA" | "Medicare" | "Employer" | "Individual/Family";
  assignedTo?: string;
  createdAt?: string;
  completedAt?: string;
  smsSent?: boolean;
  smsTemplate?: string;
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

/**
 * SMS Template
 */
export interface SMSTemplate {
  id: string;
  name: string;
  leadType: "ACA" | "Medicare" | "Employer" | "Individual/Family" | "all";
  sequenceNumber?: number; // 1st, 2nd, 3rd follow-up
  taskType?: "follow_up" | "appointment" | "check_in" | "reminder" | "enrollment";
  template: string; // Template with {{variables}}
  variables?: string[]; // Available variables
  compliance?: {
    optInRequired: boolean;
    disclaimer?: string;
  };
  lastUpdated?: string;
}
