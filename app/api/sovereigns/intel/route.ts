import { NextResponse } from "next/server";
import { loadHeartbeat } from "@/lib/system/hi5-heartbeat-store";
import { listRecentGolden } from "@/lib/system/hi5-golden-path-store";
import { getTenantKey } from "@/lib/system/tenant";

type SovereignId =
  | "content"
  | "crm"
  | "commerce"
  | "analytics"
  | "workflow"
  | "notification"
  | "migration"
  | "compliance"
  | "healthcare";

type SovereignStatus = "online" | "degraded" | "error" | "unknown";

type SovereignIntel = {
  status: SovereignStatus;
  errors: number;
  workload: number;
  lastRunAt: string | null;
  pipelines: string[];
};

function tenantKey(): string {
  return getTenantKey();
}

function summarizeHeartbeat(snapshot: any): { status: SovereignStatus; errors: number; workload: number; lastRunAt: string | null } {
  const entries = snapshot?.entries || {};
  const values = Object.values(entries) as any[];
  if (values.length === 0) return { status: "unknown", errors: 0, workload: 0, lastRunAt: null };

  const statuses = values.map((e) => String(e?.status || "unknown"));
  const errors = values.filter((e) => String(e?.status || "unknown") === "error").length;
  const degraded = values.filter((e) => String(e?.status || "unknown") === "degraded").length;
  const workload = values.filter((e) => String(e?.status || "unknown") !== "healthy").length;

  const lastRunAt = values
    .map((e) => (e?.lastRunAt ? String(e.lastRunAt) : null))
    .filter(Boolean)
    .sort()
    .slice(-1)[0] as string | undefined;

  const status: SovereignStatus =
    errors > 0 ? "error" : degraded > 0 ? "degraded" : "online";

  return { status, errors, workload, lastRunAt: lastRunAt ?? null };
}

// STRIKE 8: intelligence first, behavior later. This endpoint is the single source of truth.
export async function GET() {
  const tenant = tenantKey();

  // Inputs (safe, local)
  const workflowsHb = loadHeartbeat("workflow", tenant);
  const scrapersHb = loadHeartbeat("scraper", tenant);
  const pipeline = listRecentGolden(tenant, 25);

  const wf = summarizeHeartbeat(workflowsHb);
  const sc = summarizeHeartbeat(scrapersHb);

  const pipelineErrors = pipeline.filter((r) => r.lastError).length;
  const pipelineWorkload = pipeline.filter((r) => (r.step || "").toLowerCase() !== "complete").length;
  const pipelineLastRunAt =
    pipeline
      .map((r) => (r.updatedAt ? String(r.updatedAt) : null))
      .filter(Boolean)
      .sort()
      .slice(-1)[0] ?? null;

  // Computed intel (mock-but-grounded). We can refine mappings once each sovereign has true signals.
  const intel: Record<SovereignId, SovereignIntel> = {
    workflow: {
      status: wf.status,
      errors: wf.errors + pipelineErrors,
      workload: wf.workload + pipelineWorkload,
      lastRunAt: wf.lastRunAt ?? pipelineLastRunAt,
      pipelines: ["golden_path"],
    },
    content: {
      status: sc.status,
      errors: sc.errors,
      workload: sc.workload,
      lastRunAt: sc.lastRunAt,
      pipelines: [],
    },
    crm: {
      status: pipelineErrors > 0 ? "degraded" : pipeline.length > 0 ? "online" : "unknown",
      errors: pipelineErrors,
      workload: pipelineWorkload,
      lastRunAt: pipelineLastRunAt,
      pipelines: ["golden_path"],
    },
    healthcare: {
      status: pipelineErrors > 0 ? "degraded" : pipeline.length > 0 ? "online" : "unknown",
      errors: pipelineErrors,
      workload: pipelineWorkload,
      lastRunAt: pipelineLastRunAt,
      pipelines: ["golden_path"],
    },
    commerce: { status: "unknown", errors: 0, workload: 0, lastRunAt: null, pipelines: [] },
    analytics: { status: "unknown", errors: 0, workload: 0, lastRunAt: null, pipelines: [] },
    notification: { status: "unknown", errors: 0, workload: 0, lastRunAt: null, pipelines: [] },
    migration: { status: "unknown", errors: 0, workload: 0, lastRunAt: null, pipelines: [] },
    compliance: { status: "unknown", errors: 0, workload: 0, lastRunAt: null, pipelines: [] },
  };

  return NextResponse.json(
    {
      ok: true,
      tenant,
      intel,
      computedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
