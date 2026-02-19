// Benefits CRM Types (Cockpit-facing)

export type BenefitsCrmLeadType = "ACA" | "Medicare" | "Employer" | "Individual/Family";
export type BenefitsCrmPriority = "low" | "medium" | "high" | "urgent";

export type BenefitsCrmClientStatus =
  | "New"
  | "Contacted"
  | "In Progress"
  | "Qualified"
  | "Enrolled"
  | "Lost"
  | "On Hold";

export interface BenefitsCrmClient {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  leadType: BenefitsCrmLeadType | null;
  eligibilityCategory: string | null;
  priority: BenefitsCrmPriority | null;
  status: BenefitsCrmClientStatus | null;
  onboardingStatus: string | null;
  nextFollowUp: string | null;
  lastContact: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  notes: string | null;
}

export type BenefitsCrmFollowUpStatus = "pending" | "due_now" | "overdue" | "completed" | "cancelled";

export interface BenefitsCrmFollowUp {
  id: string;
  clientId: string | null;
  clientName: string | null;
  type: string | null;
  title: string | null;
  dueDate: string | null;
  status: BenefitsCrmFollowUpStatus | null;
  priority: BenefitsCrmPriority | null;
  smsSent: boolean;
  createdAt: string | null;
  completedAt: string | null;
}

export type BenefitsCrmEligibilityStatus = "pending" | "verified" | "eligible" | "ineligible" | "needs_review" | "error";

export interface BenefitsCrmEligibilityCheck {
  id: string;
  clientId: string | null;
  clientName: string | null;
  leadType: BenefitsCrmLeadType | null;
  eligibilityCategory: string | null;
  status: BenefitsCrmEligibilityStatus | null;
  requestedAt: string | null;
  checkedAt: string | null;
  notes: string | null;
  confidence: number | null;
}

export interface BenefitsCrmStatusSummary {
  posture: "nominal" | "degraded" | "critical";
  lastSync: string;
  counts: {
    clients: number;
    byStatus: Record<string, number>;
    byLeadType: Record<string, number>;
    followups: { total: number; pending: number; overdue: number; completed: number };
    eligibility: { total: number; pending: number; verified: number; denied: number; needsInfo: number; avgMinutes: number | null };
  };
}

export interface BenefitsCrmApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
