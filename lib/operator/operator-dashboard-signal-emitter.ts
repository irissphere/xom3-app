import { emitSignal } from "@/lib/uoi/signals";
import { recordSignal } from "@/lib/signals/signal-store";

function mapSeverity(priority: any): "info" | "warning" | "error" {
  const p = String(priority || "").toLowerCase();
  if (p === "critical" || p === "high") return "error";
  if (p === "medium") return "warning";
  return "info";
}

export function emitOperatorDashboardSignal(input: {
  tenantId: string;
  type: "operator.dashboard.viewed" | "operator.dashboard.error";
  priority: "low" | "medium" | "high";
  payload: any;
}) {
  const s = emitSignal({
    source: "operator",
    type: input.type,
    priority: input.priority,
    payload: { tenantId: input.tenantId, ...input.payload },
  });

  recordSignal({
    tenantId: input.tenantId,
    type: input.type,
    severity: mapSeverity(input.priority),
    payload: { tenantId: input.tenantId, ...input.payload },
    timestamp: s.timestamp,
  });

  return s;
}
