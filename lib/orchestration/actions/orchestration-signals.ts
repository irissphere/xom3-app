import { emitSignal } from "@/lib/uoi/signals";
import { recordSignal } from "@/lib/signals/signal-store";

function mapSeverity(priority: any): "info" | "warning" | "error" {
  const p = String(priority || "").toLowerCase();
  if (p === "critical" || p === "high") return "error";
  if (p === "medium") return "warning";
  return "info";
}

export function emitOrchestrationSignal(input: {
  tenantId: string;
  type: string;
  priority: "low" | "medium" | "high" | "critical";
  payload: any;
}) {
  const s = emitSignal({
    source: "orchestration",
    type: input.type as any,
    priority: input.priority,
    payload: { tenantId: input.tenantId, ...input.payload },
  } as any);

  // Disk-backed observability (truthful + additive).
  recordSignal({
    tenantId: input.tenantId,
    type: input.type,
    severity: mapSeverity(input.priority),
    payload: { tenantId: input.tenantId, ...input.payload },
    timestamp: s.timestamp,
  });

  return s;
}
