import { NextResponse } from "next/server";
import { getActivityEvents } from "@/lib/cockpit/activity-events";
import { getTimeline as getLegacyTimeline } from "@/lib/uoi/store";
import { getHeartbeatLog } from "@/lib/uoi";
import { getSystemSovereignLog, getSystemSovereignStatus } from "@/lib/system/system-sovereign";
import { getBroadcastLog, getBroadcastStatus, getBroadcastQueue } from "@/lib/broadcast/broadcast-sovereign";
import { getSovereignEventHistory } from "@/lib/sovereigns/event-bus";

export const dynamic = "force-dynamic";

type TimelineEntry = {
  id: string;
  timestamp: string;
  sovereign: "uoi" | "system" | "broadcast" | "hse" | "sync" | "rituals" | "cockpit";
  kind: string;
  severity: "info" | "warning" | "error" | "success";
  title: string;
  description?: string;
  meta?: Record<string, any>;
};

function safeIso(ts: any): string | null {
  if (typeof ts !== "string") return null;
  const t = Date.parse(ts);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function mapPriorityToSeverity(priority: any): TimelineEntry["severity"] {
  if (priority === "critical" || priority === "high") return "error";
  if (priority === "medium") return "warning";
  return "info";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.max(10, Math.min(300, Number(limitParam) || 120)) : 120;

  const includeTicks = url.searchParams.get("ticks") !== "0";

  // 1) Cockpit activity events (best unified store right now)
  const activity = getActivityEvents(undefined, limit);
  const activityEntries: TimelineEntry[] = activity.events.map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    sovereign:
      e.type === "uoi_decision" ? "uoi" :
      e.type === "hse_transition" ? "hse" :
      e.type === "automation" ? "system" :
      e.type === "error" ? "system" :
      "cockpit",
    kind: e.type,
    severity: e.severity,
    title: e.title,
    description: e.description,
    meta: e.metadata,
  }));

  // 2) Legacy UOI timeline (console feed today)
  const legacy = getLegacyTimeline();
  const legacyEntries: TimelineEntry[] = legacy.slice(0, limit).map((e: any) => ({
    id: String(e.id),
    timestamp: e.timestamp || new Date().toISOString(),
    sovereign: e.type === "broadcast" ? "broadcast" : "uoi",
    kind: `legacy_${e.type || "event"}`,
    severity: e.type === "error" ? "error" : "info",
    title: e.type ? String(e.type).toUpperCase() : "LEGACY",
    description: e.description,
    meta: e.metadata,
  }));

  // 3) Sovereign ticks/logs
  const tickEntries: TimelineEntry[] = [];

  if (includeTicks) {
    const uoiTicks = getHeartbeatLog(60);
    uoiTicks.forEach((t: any, idx: number) => {
      const ts = safeIso(t.tickAt) || (typeof t.timestamp === "number" ? new Date(t.timestamp).toISOString() : null) || new Date().toISOString();
      tickEntries.push({
        id: `uoi_tick_${ts}_${idx}`,
        timestamp: ts,
        sovereign: "uoi",
        kind: "uoi_tick",
        severity: t.error ? "error" : (t.directivesCreated && t.directivesCreated > 0 ? "warning" : "info"),
        title: t.error ? "UOI tick error" : "UOI tick",
        description: t.error ? String(t.error) : `${t.signalsProcessed ?? 0} signals → ${t.directivesCreated ?? 0} directives`,
        meta: t,
      });
    });

    const sys = getSystemSovereignStatus();
    const sysTicks = getSystemSovereignLog(60);
    sysTicks.forEach((t: any, idx: number) => {
      const ts = safeIso(t.tickAt) || new Date().toISOString();
      tickEntries.push({
        id: `sys_tick_${ts}_${idx}`,
        timestamp: ts,
        sovereign: "system",
        kind: "system_tick",
        severity: t.error ? "error" : (t.heartbeat?.status === "critical" ? "error" : t.heartbeat?.status === "degraded" ? "warning" : "info"),
        title: `System tick (${sys.posture})`,
        description: t.error
          ? String(t.error)
          : `heartbeat=${t.heartbeat?.status || "unknown"} • uptime=${t.heartbeat?.uptime ?? "--"}s`,
        meta: t,
      });
    });

    const bStatus = getBroadcastStatus();
    const bLog = getBroadcastLog(60);
    bLog.forEach((entry: any, idx: number) => {
      const ts = safeIso(entry.tickAt) || safeIso(entry.result?.dispatchedAt) || new Date().toISOString();
      tickEntries.push({
        id: `bcast_dispatch_${ts}_${idx}`,
        timestamp: ts,
        sovereign: "broadcast",
        kind: "broadcast_dispatch",
        severity: entry.result?.ok ? "success" : "error",
        title: `Broadcast dispatch (${bStatus.posture})`,
        description: entry.result?.ok
          ? `dispatched ${entry.message?.channel || "internal"}: ${entry.message?.title || "message"}`
          : `failed ${entry.message?.channel || "internal"}: ${entry.result?.error || "unknown_error"}`,
        meta: entry,
      });
    });

    // Include queue pressure snapshot as an info tick (helps demo feel alive)
    const q = getBroadcastQueue(200);
    tickEntries.push({
      id: `bcast_queue_${Date.now()}`,
      timestamp: new Date().toISOString(),
      sovereign: "broadcast",
      kind: "broadcast_queue",
      severity: q.counts.failed > 0 ? "warning" : "info",
      title: "Broadcast queue snapshot",
      description: `queued=${q.counts.queued} • dispatched=${q.counts.dispatched} • failed=${q.counts.failed}`,
      meta: { counts: q.counts },
    });
  }

  // 4) Sovereign Event Bus (interlink ledger + reflex tags)
  const busEntries: TimelineEntry[] = getSovereignEventHistory(limit).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    sovereign: e.sovereign,
    kind: `bus_${e.type}`,
    severity: e.severity === "error" ? "error" : e.severity === "warning" ? "warning" : "info",
    title: `EventBus: ${e.sovereign}`,
    description: e.type,
    meta: e,
  }));

  const merged = [...activityEntries, ...legacyEntries, ...tickEntries, ...busEntries]
    .filter((e) => Boolean(e.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  return NextResponse.json(
    {
      ok: true,
      timestamp: new Date().toISOString(),
      sources: {
        activityEvents: activity.total,
        legacyTimeline: legacy.length,
        uoiTicks: includeTicks ? 60 : 0,
      },
      items: merged,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
