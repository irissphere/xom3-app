// Broadcast Engine - Lead Scoring API
// POST /api/broadcast/lead-score - Score and classify lead

import { NextResponse } from "next/server";
import { scoreAndClassifyLead, calculateLeadScore } from "@/lib/broadcast/lead-scoring-engine";
import { ScrapedEngagement } from "@/lib/broadcast/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const engagement: ScrapedEngagement = body.engagement;
    const context = body.context || {};
    
    if (!engagement) {
      return NextResponse.json(
        { error: "engagement is required" },
        { status: 400 }
      );
    }
    
    // Score and classify lead
    const classification = scoreAndClassifyLead(engagement, context);
    
    return NextResponse.json({
      success: true,
      classification: {
        leadId: classification.leadId,
        score: {
          total: classification.score.total,
          tier: classification.score.tier,
          urgency: classification.score.urgency,
          breakdown: {
            intent: classification.score.intent,
            engagement: classification.score.engagement,
            behavior: classification.score.behavior,
            identity: classification.score.identity,
            trend: classification.score.trend
          },
          signals: classification.score.breakdown
        },
        pipelineEntryPoint: classification.pipelineEntryPoint,
        agentAssignment: classification.agentAssignment,
        taskDescription: classification.taskDescription,
        hseState: classification.hseState,
        uoiSignal: classification.uoiSignal
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Lead scoring error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Return scoring engine capabilities
    return NextResponse.json({
      success: true,
      capabilities: {
        scoring: true,
        classification: true,
        tiering: true,
        pipelineMapping: true,
        agentAssignment: true
      },
      tiers: {
        hot: { min: 80, max: 100, description: "Direct intent, immediate response" },
        warm: { min: 60, max: 79, description: "Strong engagement, assigned agent" },
        interested: { min: 40, max: 59, description: "Link click, multiple views" },
        cold: { min: 20, max: 39, description: "Likes, occasional comments" },
        noise: { min: 0, max: 19, description: "Spam, bots, irrelevant" }
      },
      scoringWeights: {
        intent: "40%",
        engagement: "20%",
        behavior: "20%",
        identity: "15%",
        trend: "5%"
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Get scoring capabilities error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
