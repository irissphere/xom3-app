import { listDueOutboundItems, updateOutboundItem } from "./outboundLedger";
import { dispatchOutboundItem } from "./platformConnectors";
import { gtmOutboundFailed, gtmOutboundSent } from "./outboundSignals";

type GlobalScheduler = {
  __xom3_gtm_outbound_timer__?: NodeJS.Timeout | null;
  __xom3_gtm_outbound_timer_at__?: number | null;
};

function g(): GlobalScheduler {
  return globalThis as any;
}

export async function outboundSchedulerTick(options?: { limit?: number }) {
  const now = Date.now();
  const due = listDueOutboundItems(now, options?.limit ?? 6);

  for (const item of due) {
    updateOutboundItem(item.id, { status: "sending" });
    const result = await dispatchOutboundItem(item);
    if (result.ok) {
      updateOutboundItem(item.id, { status: "sent", externalId: result.externalId });
      gtmOutboundSent(item.id, item.platform, result.externalId);
    } else {
      const errorCode = "errorCode" in result ? result.errorCode : "dispatch_failed";
      updateOutboundItem(item.id, { status: "failed", errorCode });
      gtmOutboundFailed(item.id, item.platform, errorCode);
    }
  }

  // Re-arm after processing.
  ensureOutboundSchedulerArmed();
  return { processed: due.length };
}

export function ensureOutboundSchedulerArmed() {
  const gg = g();
  if (gg.__xom3_gtm_outbound_timer__) {
    // timer already armed; leave it unless it looks stale
    return;
  }

  // Find next scheduled time among queued items.
  // We intentionally keep this lightweight: arm for the nearest due boundary.
  const now = Date.now();
  const next = listDueOutboundItems(now + 365 * 24 * 60 * 60 * 1000, 50) // huge window, returns earliest by scheduledAt
    .filter((i) => i.status === "queued" && Number.isFinite(Date.parse(i.scheduledAt)))
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0];

  if (!next) return;

  const at = Date.parse(next.scheduledAt);
  const delayMs = Math.max(0, Math.min(60 * 60 * 1000, at - now)); // cap at 1h; re-arm on tick

  gg.__xom3_gtm_outbound_timer_at__ = at;
  gg.__xom3_gtm_outbound_timer__ = setTimeout(() => {
    gg.__xom3_gtm_outbound_timer__ = null;
    gg.__xom3_gtm_outbound_timer_at__ = null;
    void outboundSchedulerTick({ limit: 8 }).catch(() => {});
  }, delayMs);
}
