// Broadcast Engine - Optimization Loop API
// POST /api/broadcast/optimize - Run optimization cycle

import { NextResponse } from "next/server";
import { runOptimizationCycle, applyOptimizationCycle } from "@/lib/broadcast/optimization-loop";
import { getLearningMemory } from "@/lib/broadcast/learning-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apply = false } = body;
    
    // In production, fetch all data from database
    // For now, use empty arrays and learning memory
    const learningMemory = getLearningMemory();
    
    const cycle = await runOptimizationCycle(
      [], // contentROIs - fetch from database
      [], // platformROIs - fetch from database
      [], // trendROIs - fetch from database
      [], // agentROIs - fetch from database
      [], // funnelROIs - fetch from database
      [], // conversions - fetch from database
      [], // attributions - fetch from database
      [], // currentStrategies - fetch from database
      [] // trends - fetch from database
    );
    
    let result: any = {
      success: true,
      cycle: {
        id: cycle.id,
        startedAt: cycle.startedAt,
        analysis: {
          winners: {
            content: cycle.analysis.winners.content.length,
            platforms: cycle.analysis.winners.platforms.length,
            trends: cycle.analysis.winners.trends.length,
            agents: cycle.analysis.winners.agents.length,
            funnelEntryPoints: cycle.analysis.winners.funnelEntryPoints.length
          },
          losers: {
            content: cycle.analysis.losers.content.length,
            platforms: cycle.analysis.losers.platforms.length,
            trends: cycle.analysis.losers.trends.length,
            agents: cycle.analysis.losers.agents.length,
            funnelEntryPoints: cycle.analysis.losers.funnelEntryPoints.length
          },
          anomalies: cycle.analysis.anomalies.length,
          opportunities: cycle.analysis.opportunities.length
        },
        patterns: cycle.patterns.length,
        adjustments: cycle.adjustments.length,
        contentEvolutions: cycle.contentEvolutions.length,
        funnelOptimizations: cycle.funnelOptimizations.length,
        impact: cycle.impact
      }
    };
    
    // Apply if requested
    if (apply) {
      const applyResult = await applyOptimizationCycle(cycle, []);
      result.applied = applyResult.success;
      result.strategiesUpdated = applyResult.strategiesUpdated.length;
      result.contentGenerated = applyResult.contentGenerated;
      result.optimizationsApplied = applyResult.optimizationsApplied;
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Broadcast API] Optimization cycle error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
