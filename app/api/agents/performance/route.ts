// Agent Performance API
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { calculateAgentPerformance, getAgentPerformanceSummary } from "@/lib/agents/performance";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");
    const summary = searchParams.get("summary") === "true";
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const tenant = searchParams.get("tenant") || undefined;

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId required" },
        { status: 400 }
      );
    }

    if (summary) {
      const performanceSummary = await getAgentPerformanceSummary(agentId, tenant);
      return NextResponse.json({ success: true, summary: performanceSummary });
    }

    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end dates required for detailed metrics" },
        { status: 400 }
      );
    }

    const metrics = await calculateAgentPerformance(
      agentId,
      { start, end },
      tenant
    );

    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    console.error("Error getting agent performance:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
