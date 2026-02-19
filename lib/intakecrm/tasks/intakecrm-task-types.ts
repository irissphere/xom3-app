export type TaskType = "call" | "text" | "email";
export type TaskStatus = "pending" | "completed" | "overdue";
export type TaskPriority = "normal" | "high";

export type Task = {
  taskId: string;
  tenantId: string;
  leadId: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string;
  createdAt: string;
  dueAt: string;
  completedAt?: string;
  escalated?: boolean;
};
