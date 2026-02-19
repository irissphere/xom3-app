// Broadcast Engine - Dashboard Stats API
// GET /api/broadcast/dashboard/stats - Get dashboard statistics

import { NextResponse } from "next/server";
import { getAllQueueStats } from "@/lib/broadcast/queue/queue-store";
import { getWorkerManager } from "@/lib/broadcast/queue/worker-manager";
import { getIngestionStats } from "@/lib/broadcast/ingestion-orchestrator";
import { processTrends } from "@/lib/broadcast/trend-engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view"); // system, operations, executive
    
    // Get worker stats
    const workerManager = getWorkerManager();
    const workerStats = workerManager.getStats();
    const queueStats = getAllQueueStats();
    
    // Get ingestion stats
    const ingestionStats = getIngestionStats();
    
    // Get trend stats
    const { trends, actions } = await processTrends();
    
    // Base stats
    const stats = {
      workers: {
        total: Object.values(workerStats).reduce((sum, count) => sum + count, 0),
        byType: workerStats
      },
      queues: queueStats,
      ingestion: ingestionStats,
      trends: {
        total: trends.length,
        byCategory: {
          breakout: trends.filter(t => t.category === "breakout").length,
          sustained: trends.filter(t => t.category === "sustained").length,
          seasonal: trends.filter(t => t.category === "seasonal").length,
          micro: trends.filter(t => t.category === "micro").length
        },
        actions: actions.length
      },
      timestamp: new Date().toISOString()
    };
    
    // View-specific stats
    if (view === "system") {
      // System view: worker queues, job throughput, failures
      return NextResponse.json({
        success: true,
        view: "system",
        stats: {
          ...stats,
          system: {
            workerHealth: Object.entries(workerStats).map(([type, count]) => ({
              type,
              count,
              queue: queueStats[`${type.replace("_worker", "_queue")}` as keyof typeof queueStats],
              health: "healthy" // In production, check actual health
            })),
            apiHealth: {
              posting: "healthy",
              scraping: "healthy",
              trends: "healthy",
              leads: "healthy",
              funnel: "healthy"
            }
          }
        }
      });
    }
    
    if (view === "operations") {
      // Operations view: leads, scores, assignments
      return NextResponse.json({
        success: true,
        view: "operations",
        stats: {
          ...stats,
          operations: {
            recentLeads: 0, // In production, query from DB
            leadBreakdown: {
              hot: 0,
              warm: 0,
              interested: 0,
              cold: 0
            },
            pendingAssignments: 0,
            activeAgents: 0
          }
        }
      });
    }
    
    if (view === "executive") {
      // Executive view: conversions, revenue, growth
      return NextResponse.json({
        success: true,
        view: "executive",
        stats: {
          ...stats,
          executive: {
            contentToLeadConversion: 0, // In production, calculate from DB
            leadToClientConversion: 0,
            revenueAttribution: 0,
            platformPerformance: [],
            trendPerformance: [],
            agentPerformance: [],
            growthCurves: {
              posts: [],
              leads: [],
              conversions: []
            }
          }
        }
      });
    }
    
    // Default: return all stats
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error("[Broadcast API] Dashboard stats error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
