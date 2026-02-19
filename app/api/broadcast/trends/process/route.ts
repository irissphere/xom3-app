// Broadcast Engine - Process Trends API
// POST /api/broadcast/trends/process - Process trends and execute actions

import { NextResponse } from "next/server";
import { processTrends } from "@/lib/broadcast/trend-engine";
import { executeTrendAction } from "@/lib/broadcast/trend-action-executor";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { executeActions = false } = body;
    
    // Process trends
    const { trends, actions, hseState } = await processTrends();
    
    // Execute actions if requested
    const executedCampaigns = [];
    if (executeActions) {
      // Execute high-priority actions only
      const highPriorityActions = actions.filter(a => a.priority === "high");
      
      for (const action of highPriorityActions.slice(0, 3)) { // Limit to 3 campaigns
        try {
          const campaign = await executeTrendAction(action);
          executedCampaigns.push(campaign);
        } catch (error: any) {
          console.error(`[Trend Engine] Failed to execute action ${action.trendId}:`, error);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      trends: {
        total: trends.length,
        byCategory: {
          breakout: trends.filter(t => t.category === "breakout").length,
          sustained: trends.filter(t => t.category === "sustained").length,
          seasonal: trends.filter(t => t.category === "seasonal").length,
          micro: trends.filter(t => t.category === "micro").length
        }
      },
      actions: {
        total: actions.length,
        highPriority: actions.filter(a => a.priority === "high").length,
        mediumPriority: actions.filter(a => a.priority === "medium").length,
        lowPriority: actions.filter(a => a.priority === "low").length
      },
      executed: {
        campaigns: executedCampaigns.length,
        items: executedCampaigns
      },
      hseState,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Broadcast API] Process trends error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
