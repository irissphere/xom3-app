export type IntakeCrmRole = "operator" | "agent" | "viewer";

export type IntakeCrmLeadPosture = "new" | "duplicate" | "updated" | "working" | "closed";

export type IntakeCrmTaskType = "call" | "text" | "email" | "review";
export type IntakeCrmTaskStatus = "pending" | "completed" | "overdue";

export type IntakeCrmLead = {
  leadId: string;
  tenant: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  timestamp: number;
  posture: IntakeCrmLeadPosture;
  assignedTo: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastIntakeAt: string;
  dedupeKey: string;
};

export type IntakeCrmTask = {
  taskId: string;
  tenant: string;
  leadId: string;
  type: IntakeCrmTaskType;
  dueAt: string;
  assignedTo: string | null;
  status: IntakeCrmTaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  overdueAt: string | null;
  overdueSignalAt: string | null;
  notes: string | null;
};

export type IntakeCrmAuditEvent = {
  auditId: string;
  tenant: string;
  actor: { role: IntakeCrmRole; id: string | null; label: string | null };
  action: string;
  entity: { type: "lead" | "task"; id: string };
  at: string;
  payload?: Record<string, unknown>;
};

export type IntakeCrmIntakePayload = {
  leadId?: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  timestamp?: number;
  assignedTo?: string;
  tags?: string[];
  // passthrough fields (kept in UOI signal payload)
  [k: string]: unknown;
};

export type IntakeCrmIntakeResult = {
  ok: true;
  lead: IntakeCrmLead;
  action: "created" | "updated" | "duplicate";
  tasksCreated: IntakeCrmTask[];
};
