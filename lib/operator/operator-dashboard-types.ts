export type OperatorDashboardPosture = "OK" | "Missing" | "Error" | "Degraded";

export type OperatorDashboardPostureRow = {
  key: string;
  label: string;
  posture: OperatorDashboardPosture;
  detail?: string | null;
};

export type OperatorTenantConfigPosture = {
  ok: boolean;
  tenantId: string;
  posture: OperatorDashboardPostureRow[];
  timestamp: string;
};

export type OperatorSocialQueuePosture = {
  ok: boolean;
  counts: { scheduled: number; publishing: number; failed: number; draft: number };
  nextPublishAt: string | null;
  total: number;
  timestamp: string;
};

export type OperatorSocialErrorItem = {
  id: string;
  platform: string;
  status: string;
  errorMessage: string | null;
  retryCount: number;
  scheduledAt: string | null;
  createdAt: string;
};

export type OperatorRevenueLoopState = {
  ok: boolean;
  counts: { queued: number; sending: number; sent: number; failed: number };
  lastTriggeredAt: string | null;
  lastAutoPostAt: string | null;
  nextScheduledAt: string | null;
  timestamp: string;
};

export type OperatorRevenueLoopTrigger = {
  id: string;
  label: string;
  enabled: boolean;
  detail?: string | null;
};

export type OperatorSignalsItem = {
  signalId: string;
  tenantId: string;
  type: string;
  severity: "info" | "warning" | "error";
  timestamp: string;
  payload: any;
  domain?: "intakecrm" | "social" | "revenue-loop" | "other";
};
