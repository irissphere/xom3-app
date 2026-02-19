import { emitSignal } from "@/lib/uoi/signals";
import { recordSignal } from "@/lib/signals/signal-store";

function mapSeverity(priority: any): "info" | "warning" | "error" {
  const p = String(priority || "").toLowerCase();
  if (p === "critical" || p === "high") return "error";
  if (p === "medium") return "warning";
  return "info";
}

export function emitIntakecrmSignal(input: {
  tenantId: string;
  type: string;
  priority: "low" | "medium" | "high" | "critical";
  payload: any;
}) {
  const s = emitSignal({
    source: "intakecrm",
    type: input.type,
    priority: input.priority,
    payload: { tenantId: input.tenantId, ...input.payload },
  });

  // Disk-backed observability (additive; does not change signal shapes).
  recordSignal({
    tenantId: input.tenantId,
    type: input.type,
    severity: mapSeverity(input.priority),
    payload: { tenantId: input.tenantId, ...input.payload },
    timestamp: s.timestamp,
  });

  return s;
}
