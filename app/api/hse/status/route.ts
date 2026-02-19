import { NextResponse } from "next/server";
import { getListenerCount, initializeGlobalState, isHSEInitialized, queryState } from "@/lib/hse";

export const dynamic = "force-dynamic";

function deriveHsePosture(state: ReturnType<typeof queryState>) {
  if (!state) return "idle";
  const risk = state.stability?.risk_level || "low";
  if (risk === "critical") return "recovery";
  if (risk === "high") return "protective";
  if (risk === "medium") return "normal";
  return "aggressive";
}

export async function GET() {
  if (!isHSEInitialized()) {
    initializeGlobalState();
  }

  const state = queryState();

  return NextResponse.json(
    {
      ok: true,
      timestamp: new Date().toISOString(),
      initialized: isHSEInitialized(),
      posture: deriveHsePosture(state),
      listenerCount: getListenerCount(),
      state: state
        ? {
            lastUpdated: state.lastUpdated,
            stability: state.stability,
            vectors: {
              risk: state.vectors.risk,
              pressure: state.vectors.pressure,
              throughput: state.vectors.throughput,
              drift: state.vectors.drift,
            },
            anomalies: {
              count: state.anomalies.length,
              critical: state.anomalies.filter((a) => a.severity === "critical").length,
              high: state.anomalies.filter((a) => a.severity === "high").length,
            },
            subsystems: state.subsystems,
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
