import { NextResponse } from "next/server";

// STRIKE 6: v0 stub endpoint (static JSON)
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      sovereigns: [
        { id: "content", name: "Content", status: "unknown", lastRunAt: null, errors: 0, workload: 0, pipelines: [] },
        { id: "crm", name: "CRM", status: "unknown", lastRunAt: null, errors: 0, workload: 0, pipelines: [] },
        { id: "commerce", name: "Commerce", status: "unknown", lastRunAt: null, errors: 0, workload: 0, pipelines: [] },
        { id: "analytics", name: "Analytics", status: "unknown", lastRunAt: null, errors: 0, workload: 0, pipelines: [] },
        { id: "workflow", name: "Workflow", status: "unknown", lastRunAt: null, errors: 0, workload: 0, pipelines: [] },
        { id: "notification", name: "Notification", status: "unknown", lastRunAt: null, errors: 0, workload: 0, pipelines: [] },
        { id: "migration", name: "Migration", status: "unknown", lastRunAt: null, errors: 0, workload: 0, pipelines: [] },
        { id: "compliance", name: "Compliance", status: "unknown", lastRunAt: null, errors: 0, workload: 0, pipelines: [] },
        { id: "healthcare", name: "Healthcare", status: "unknown", lastRunAt: null, errors: 0, workload: 0, pipelines: [] },
      ],
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
