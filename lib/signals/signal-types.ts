export type SignalSeverity = "info" | "warning" | "error";

export type SignalRecord = {
  signalId: string;
  tenantId: string;
  type: string;
  severity: SignalSeverity;
  timestamp: string; // ISO
  payload: any;
};

export type SignalQuery = {
  tenantId?: string;
  prefix?: string; // e.g. "intakecrm."
  severity?: SignalSeverity;
  limit?: number;
};
