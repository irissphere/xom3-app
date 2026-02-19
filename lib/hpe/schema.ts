// Healthcare Pipeline Engine (HPE) - Phase I
// Pipeline Schema Alignment
// Maps Airtable structure to unified EXOM3 pipeline structure

export interface PipelineClient {
  // Core identity
  id: string;
  airtableId: string;
  tenant: string;
  
  // Client info
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  
  // Pipeline state
  stage: PipelineStage;
  previousStage?: PipelineStage;
  stageHistory: StageTransition[];
  
  // Status tracking
  onboardingStatus?: string;
  subscriptionTier?: string;
  
  // Relationships
  tasks: PipelineTask[];
  complianceLogs: ComplianceLog[];
  billingEvents: BillingEvent[];
  interactions: Interaction[];
  
  // Metadata
  createdAt: string;
  lastUpdated: string;
  lastContact?: string;
  notes?: string;
}

export type PipelineStage = 
  | "Prospect"
  | "Intake"
  | "Active"
  | "Compliance"
  | "Closed";

export interface StageTransition {
  id: string;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  timestamp: string;
  userId?: string;
  reason?: string;
  metadata?: Record<string, any>;
  auditLogged: boolean;
  complianceLogged: boolean;
  automationTriggered: boolean;
}

export interface PipelineTask {
  id: string;
  airtableId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  dueDate?: string;
  completedDate?: string;
  createdAt: string;
}

export type TaskStatus = 
  | "To Do"
  | "In Progress"
  | "Blocked"
  | "Done"
  | "Cancelled";

export type TaskPriority = 
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

export interface ComplianceLog {
  id: string;
  airtableId: string;
  eventType: ComplianceEventType;
  description: string;
  status: ComplianceStatus;
  date: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export type ComplianceEventType = 
  | "Audit"
  | "Review"
  | "Violation"
  | "Correction"
  | "Approval";

export type ComplianceStatus = 
  | "Pending"
  | "In Review"
  | "Approved"
  | "Rejected"
  | "Resolved";

export interface BillingEvent {
  id: string;
  airtableId: string;
  invoiceId: string;
  amount: number;
  status: BillingStatus;
  dueDate: string;
  paidDate?: string;
  stripeLink?: string;
  stripeCustomerId?: string;
  notes?: string;
  createdAt: string;
}

export type BillingStatus = 
  | "Draft"
  | "Sent"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export interface Interaction {
  id: string;
  airtableId: string;
  date: string;
  channel: InteractionChannel;
  type: InteractionType;
  notes: string;
  outcome: InteractionOutcome;
  createdBy?: string;
  createdAt: string;
}

export type InteractionChannel = 
  | "Slack"
  | "Email"
  | "Call"
  | "Meeting"
  | "SMS"
  | "LinkedIn";

export type InteractionType = 
  | "Inquiry"
  | "Support"
  | "Sales"
  | "Follow-up"
  | "Onboarding";

export type InteractionOutcome = 
  | "Resolved"
  | "Pending"
  | "Escalated"
  | "Closed";

// Pipeline configuration
export interface PipelineConfig {
  stages: PipelineStage[];
  defaultStage: PipelineStage;
  stageOrder: PipelineStage[];
  stageRules?: Record<PipelineStage, StageRule>;
}

export interface StageRule {
  allowedTransitions: PipelineStage[];
  requiredTasks?: string[];
  requiredCompliance?: string[];
  autoTriggers?: string[];
}

// Default pipeline configuration
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  stages: ["Prospect", "Intake", "Active", "Compliance", "Closed"],
  defaultStage: "Prospect",
  stageOrder: ["Prospect", "Intake", "Active", "Compliance", "Closed"],
  stageRules: {
    Prospect: {
      allowedTransitions: ["Intake", "Closed"],
      autoTriggers: ["welcome-email"]
    },
    Intake: {
      allowedTransitions: ["Active", "Prospect", "Closed"],
      requiredTasks: ["intake-form"],
      autoTriggers: ["intake-workflow"]
    },
    Active: {
      allowedTransitions: ["Compliance", "Intake", "Closed"],
      requiredCompliance: ["initial-review"],
      autoTriggers: ["active-monitoring"]
    },
    Compliance: {
      allowedTransitions: ["Active", "Closed"],
      requiredCompliance: ["compliance-review"],
      autoTriggers: ["compliance-audit"]
    },
    Closed: {
      allowedTransitions: [],
      autoTriggers: ["closure-workflow"]
    }
  }
};
