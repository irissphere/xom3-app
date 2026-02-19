import { onSignal, getPendingSignals } from "@/lib/uoi/signals";
import { recordSignal } from "./signal-store";

type GlobalGuard = {
  __xom3_signal_bridge_bound__?: boolean;
  __xom3_signal_bridge_unsub__?: (() => void) | null;
  __xom3_signal_bridge_seen__?: Set<string>;
};

function g(): GlobalGuard {
  return globalThis as any;
}

function mapSeverity(priority: any): "info" | "warning" | "error" {
  const p = String(priority || "").toLowerCase();
  if (p === "critical" || p === "high") return "error";
  if (p === "medium") return "warning";
  return "info";
}

export function ensureSignalsBridgeBound() {
  const gg = g();
  if (gg.__xom3_signal_bridge_bound__) return;
  gg.__xom3_signal_bridge_bound__ = true;
  gg.__xom3_signal_bridge_seen__ = gg.__xom3_signal_bridge_seen__ || new Set<string>();

  const ingest = (signal: any) => {
    try {
      const id = String(signal?.id || "");
      if (id) {
        if (gg.__xom3_signal_bridge_seen__!.has(id)) return;
        gg.__xom3_signal_bridge_seen__!.add(id);
      }

      const tenantId = String(signal?.payload?.tenantId || signal?.payload?.tenant || "xom3");
      recordSignal({
        tenantId,
        type: String(signal?.type || "unknown"),
        severity: mapSeverity(signal?.priority),
        payload: signal?.payload,
        timestamp: signal?.timestamp ? new Date(signal.timestamp).toISOString() : new Date().toISOString(),
      });
    } catch {
      // best-effort
    }
  };

  // Backfill: bridge should reflect truth even if bound after signals emitted.
  try {
    for (const s of getPendingSignals()) ingest(s as any);
  } catch {
    // ignore
  }

  gg.__xom3_signal_bridge_unsub__ = onSignal((signal: any) => ingest(signal));
}
