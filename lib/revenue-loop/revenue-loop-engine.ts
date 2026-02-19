import { onSignal, emitSignal } from "@/lib/uoi/signals";
import { listRevenueLoopTriggers, type RevenueLoopTriggerType, type RevenueLoopPlatformTarget } from "./triggers/revenue-loop-triggers";
import { resolveRevenueLoopTemplate, renderRevenueLoopTemplate } from "./actions/revenue-loop-templates";
import { patchRevenueLoopState } from "./state/revenue-loop-state";
import { createPost } from "@/lib/social/store";
import { emitPostCreated, emitPostScheduled } from "@/lib/social/signals";
import type { SocialPlatform } from "@/lib/social/types";
import { appendTimelineEvent } from "@/lib/intakecrm/store/intakecrm-store";

type GlobalGuard = {
  __xom3_revenue_loop_bound__?: boolean;
  __xom3_revenue_loop_unsub__?: (() => void) | null;
};

function g(): GlobalGuard {
  return globalThis as any;
}

function mapPlatform(target: RevenueLoopPlatformTarget): SocialPlatform {
  if (target === "x") return "twitter";
  if (target === "linkedin") return "linkedin";
  return "instagram";
}

function signalTypeToTriggerType(uoiType: string): RevenueLoopTriggerType | null {
  switch (uoiType) {
    case "intakecrm.lead.created":
      return "lead_created";
    case "intakecrm.task.completed":
      return "task_completed";
    case "intakecrm.task.overdue":
      return "task_overdue";
    case "intakecrm.lead.closed":
      return "lead_closed";
    default:
      return null;
  }
}

function safeString(v: any): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function enqueuePostNow(input: { tenantId: string; platform: RevenueLoopPlatformTarget; content: string; context?: { leadId?: string; triggerType?: string } }) {
  const scheduledAt = new Date().toISOString();
  const post = createPost({
    platform: mapPlatform(input.platform) as any,
    content: input.content,
    status: "scheduled",
    scheduledAt,
    clientId: input.tenantId,
    clientName: input.tenantId,
    campaignId: `revenue-loop:${safeString(input.context?.triggerType) || "unknown"}`,
    createdBy: "revenue-loop",
  });

  emitPostCreated(post);
  emitPostScheduled(post);

  if (input.context?.leadId) {
    appendTimelineEvent(input.tenantId, input.context.leadId, {
      type: "revenue.loop.post.enqueued",
      payload: { postId: post.id, platform: input.platform, scheduledAt },
    });
  }

  return post;
}

function handleSignal(signal: any) {
  const rawType = safeString(signal?.type);
  const tenantId = safeString(signal?.payload?.tenantId || signal?.payload?.tenant || "xom3");
  const triggerType = signalTypeToTriggerType(rawType);
  if (!triggerType) return;

  const leadId = safeString(signal?.payload?.leadId || "");
  const taskId = safeString(signal?.payload?.taskId || "");
  const at = new Date().toISOString();

  try {
    const triggers = listRevenueLoopTriggers(tenantId).filter((t) => t.enabled && t.type === triggerType);
    if (triggers.length === 0) return;

    emitSignal({
      source: "revenue-loop",
      type: "revenue.loop.triggered" as any,
      priority: "low",
      payload: { tenantId, triggerType, count: triggers.length, leadId: leadId || undefined, taskId: taskId || undefined, at },
    } as any);

    patchRevenueLoopState(tenantId, { lastTriggeredAt: at, lastTriggerType: triggerType, lastError: undefined });

    for (const trig of triggers) {
      const template = resolveRevenueLoopTemplate(trig.templateId) || resolveRevenueLoopTemplate(triggerType as any) || "";
      const content = renderRevenueLoopTemplate(template || "", {
        tenantId,
        leadId: leadId || undefined,
        taskId: taskId || undefined,
        timestamp: at,
      });

      for (const p of trig.platformTargets) {
        const post = enqueuePostNow({ tenantId, platform: p, content, context: { leadId: leadId || undefined, triggerType } });
        patchRevenueLoopState(tenantId, { lastPostId: post.id });
        emitSignal({
          source: "revenue-loop",
          type: "revenue.loop.post.enqueued" as any,
          priority: "low",
          payload: { tenantId, triggerType, triggerId: trig.triggerId, platform: p, postId: post.id, scheduledAt: post.scheduledAt, at },
        } as any);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "revenue_loop_error";
    patchRevenueLoopState(tenantId, { lastError: msg, lastTriggeredAt: at, lastTriggerType: triggerType });
    emitSignal({
      source: "revenue-loop",
      type: "revenue.loop.error" as any,
      priority: "high",
      payload: { tenantId, triggerType, leadId: leadId || undefined, taskId: taskId || undefined, error: msg, at },
    } as any);
  }
}

export function ensureRevenueLoopBound() {
  const gg = g();
  if (gg.__xom3_revenue_loop_bound__) return;
  gg.__xom3_revenue_loop_bound__ = true;
  gg.__xom3_revenue_loop_unsub__ = onSignal((signal) => {
    try {
      handleSignal(signal as any);
    } catch {
      // passive lane
    }
  });
}

export function getRevenueLoopStatus() {
  const gg = g();
  return { bound: Boolean(gg.__xom3_revenue_loop_bound__) };
}
