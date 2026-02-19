import { publish } from "@/lib/sovereigns/event-bus";

export function gtmOutboundQueued(itemId: string, platform: string) {
  publish({
    sovereign: "broadcast",
    type: "gtm.outbound.queued",
    severity: "info",
    payload: { itemId, platform },
    tags: ["gtm", "outbound"],
  });
}

export function gtmOutboundScheduled(itemId: string, platform: string, scheduledAt: string) {
  publish({
    sovereign: "broadcast",
    type: "gtm.outbound.scheduled",
    severity: "info",
    payload: { itemId, platform, scheduledAt },
    tags: ["gtm", "outbound"],
  });
}

export function gtmOutboundSent(itemId: string, platform: string, externalId: string) {
  publish({
    sovereign: "broadcast",
    type: "gtm.outbound.sent",
    severity: "info",
    payload: { itemId, platform, externalId },
    tags: ["gtm", "outbound"],
  });
}

export function gtmOutboundFailed(itemId: string, platform: string, errorCode: string) {
  publish({
    sovereign: "broadcast",
    type: "gtm.outbound.failed",
    severity: "warning",
    payload: { itemId, platform, errorCode },
    tags: ["gtm", "outbound"],
  });
}
