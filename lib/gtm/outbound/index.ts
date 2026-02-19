import { getCurrentEpoch } from "@/lib/constellation/epochs";
import { formatOutboundText } from "./outboundFormatter";
import { insertOutboundItems, getOutboundItem, listOutboundItems, getOutboundQueueCounts } from "./outboundLedger";
import type { EnqueueOutboundItemSpec, OutboundItem, OutboundPlatform } from "./types";
import { gtmOutboundQueued, gtmOutboundScheduled } from "./outboundSignals";
import { isCloneVoiceId } from "./cloneVoiceRegistry";
import { ensureOutboundSchedulerArmed, outboundSchedulerTick } from "./outboundScheduler";

function normalizePlatforms(platforms: any): OutboundPlatform[] {
  const allowed: OutboundPlatform[] = ["youtube", "instagram", "tiktok", "twitter", "linkedin", "generic"];
  if (!Array.isArray(platforms)) return [];
  return platforms.filter((p) => allowed.includes(p));
}

export function enqueueOutboundItem(spec: EnqueueOutboundItemSpec) {
  const platforms = normalizePlatforms(spec.platforms);
  if (platforms.length === 0) throw new Error("platforms_required");

  const text = String(spec.content?.text || "").trim();
  if (!text) throw new Error("content_text_required");

  const cloneVoice = String(spec.cloneVoice || "");
  if (!isCloneVoiceId(cloneVoice)) throw new Error("cloneVoice_invalid");

  const persona = String(spec.persona || "broadcast");
  const epoch = spec.epochId ? String(spec.epochId) : String(getCurrentEpoch().current?.id || "activation");
  const intent = String(spec.intent || "gtm");

  const scheduleMode = spec.scheduleMode;
  const scheduledAt =
    scheduleMode === "sendNow"
      ? new Date().toISOString()
      : typeof spec.scheduledAt === "string" && Number.isFinite(Date.parse(spec.scheduledAt))
        ? new Date(spec.scheduledAt).toISOString()
        : null;

  if (!scheduledAt) throw new Error("scheduledAt_required");

  const created = insertOutboundItems(
    platforms.map((platform) => {
      const formatted = formatOutboundText({ platform, text, personaId: persona, cloneVoiceId: cloneVoice, epochId: epoch });
      return {
        platform,
        content: { text, mediaRef: spec.content?.mediaRef || null },
        formattedText: formatted,
        cloneVoice,
        persona,
        epochId: epoch,
        intent,
        scheduleMode,
        scheduledAt,
        status: "queued",
      } satisfies Omit<OutboundItem, "id" | "createdAt" | "updatedAt">;
    })
  );

  for (const item of created) {
    gtmOutboundQueued(item.id, item.platform);
    gtmOutboundScheduled(item.id, item.platform, item.scheduledAt);
  }

  // Ensure scheduler is armed even if the sync pulse is dormant (purely additive).
  ensureOutboundSchedulerArmed();
  // If "sendNow", kick a dispatch immediately for operator feel.
  if (scheduleMode === "sendNow") {
    void outboundSchedulerTick({ limit: created.length }).catch(() => {});
  }

  return { items: created, count: created.length };
}

export function getRecentOutboundItems(limit = 50) {
  return listOutboundItems(limit);
}

export function getOutboundItemStatus(id: string) {
  return getOutboundItem(id);
}

export { getOutboundQueueCounts };

export type { EnqueueOutboundItemSpec, OutboundItem, OutboundPlatform } from "./types";
export { outboundSchedulerTick, ensureOutboundSchedulerArmed } from "./outboundScheduler";
export { cloneVoices } from "./cloneVoiceRegistry";
