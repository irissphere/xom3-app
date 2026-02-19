import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/usage
 * Returns usage analytics data. Client-side events are stored in localStorage;
 * this endpoint aggregates server-side metrics (agent executions, API calls, etc.)
 */
export async function GET() {
  try {
    // Aggregate server-side metrics
    const { getExecutionHistory, getAllAgentStates } = await import("@/lib/agents/agent-engine");
    const { WORKFLOW_REGISTRY } = await import("@/lib/n8n/workflow-registry");

    const executions = getExecutionHistory(200);
    const agentStates = getAllAgentStates();
    const workflows = Object.values(WORKFLOW_REGISTRY);

    // Agent execution metrics
    const agentMetrics = agentStates.map((state) => ({
      id: state.id,
      status: state.status,
      runsToday: state.metrics.runsToday,
      runsTotal: state.metrics.runsTotal,
      successRate: state.metrics.successRate,
      lastRun: state.lastRun || null,
      avgExecutionTime: state.metrics.executionTime,
    }));

    // Sovereign rollup
    const sovereignMap: Record<string, { runs: number; errors: number; agents: number }> = {};
    for (const exec of executions) {
      const sid = exec.sovereignId;
      if (!sovereignMap[sid]) sovereignMap[sid] = { runs: 0, errors: 0, agents: 0 };
      sovereignMap[sid].runs++;
      if (exec.status === "failed") sovereignMap[sid].errors++;
    }

    // Workflow health
    const workflowHealth = {
      total: workflows.length,
      active: workflows.filter((w) => w.active).length,
      inactive: workflows.filter((w) => !w.active).length,
      byDomain: workflows.reduce<Record<string, { active: number; total: number }>>((acc, w) => {
        if (!acc[w.domain]) acc[w.domain] = { active: 0, total: 0 };
        acc[w.domain].total++;
        if (w.active) acc[w.domain].active++;
        return acc;
      }, {}),
    };

    // Recent execution timeline (last 50)
    const recentExecutions = executions.slice(0, 50).map((e) => ({
      id: e.id,
      agentId: e.agentId,
      sovereignId: e.sovereignId,
      action: e.action,
      status: e.status,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
      executionTime: e.metrics?.executionTime || 0,
    }));

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      agents: {
        total: agentMetrics.length,
        active: agentMetrics.filter((a) => a.status === "active").length,
        idle: agentMetrics.filter((a) => a.status === "idle").length,
        error: agentMetrics.filter((a) => a.status === "error").length,
        metrics: agentMetrics,
      },
      sovereigns: sovereignMap,
      workflows: workflowHealth,
      recentExecutions,
    });
  } catch (err: any) {
    console.error("[analytics/usage]", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/usage
 * Receive client-side usage events in batch
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = body.events || [];

    // In a production system, store these in Supabase.
    // For now, acknowledge receipt — client stores in localStorage.
    return NextResponse.json({
      ok: true,
      received: events.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
