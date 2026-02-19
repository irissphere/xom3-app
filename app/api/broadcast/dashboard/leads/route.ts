// Broadcast Engine - Dashboard Leads API
// GET /api/broadcast/dashboard/leads - Get leads for operations view

import { NextResponse } from "next/server";
import { getNormalizedSignals } from "@/lib/broadcast/signal-store";
import { scoreAndClassifyLead } from "@/lib/broadcast/lead-scoring-engine";
import { normalizedToEngagement } from "@/lib/broadcast/signal-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const tier = searchParams.get("tier"); // hot, warm, interested, cold
    const platform = searchParams.get("platform");
    
    // Get recent normalized signals
    const signals = getNormalizedSignals({
      platform: platform as any,
      since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
      limit: 1000
    });
    
    // Score and classify leads
    const leads = [];
    for (const signal of signals.slice(0, limit)) {
      try {
        const engagement = normalizedToEngagement(signal);
        const classification = scoreAndClassifyLead(engagement, {
          content: signal.content,
          sentiment: signal.sentiment,
          keywords: signal.keywords
        });
        
        // Filter by tier if specified
        if (tier && classification.score.tier !== tier) {
          continue;
        }
        
        // Skip noise
        if (classification.score.tier === "noise") {
          continue;
        }
        
        leads.push({
          id: signal.id,
          user_id: signal.userId,
          username: signal.username,
          platform: signal.platform,
          lead_score: classification.score.total,
          lead_tier: classification.score.tier,
          urgency: classification.score.urgency,
          content: signal.content,
          sentiment: signal.sentiment,
          keywords: signal.keywords,
          source_post_id: signal.postId,
          pipeline_entry_point: classification.pipelineEntryPoint,
          agent_assignment: classification.agentAssignment,
          task_description: classification.taskDescription,
          detected_at: signal.timestamp
        });
      } catch (error: any) {
        console.error(`[Dashboard] Failed to score signal:`, error);
      }
    }
    
    // Sort by score (highest first)
    leads.sort((a, b) => b.lead_score - a.lead_score);
    
    return NextResponse.json({
      success: true,
      leads: leads.slice(0, limit),
      count: leads.length,
      breakdown: {
        hot: leads.filter(l => l.lead_tier === "hot").length,
        warm: leads.filter(l => l.lead_tier === "warm").length,
        interested: leads.filter(l => l.lead_tier === "interested").length,
        cold: leads.filter(l => l.lead_tier === "cold").length
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Dashboard leads error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
