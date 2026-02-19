// Broadcast Engine - Lead Detection Engine API
// POST /api/broadcast/lead-detect - Detect leads from engagement

import { NextResponse } from "next/server";
import { detectLead, batchDetectLeads } from "@/lib/broadcast/lead-detection-engine";
import { scoreAndClassifyLead, batchScoreAndClassifyLeads } from "@/lib/broadcast/lead-scoring-engine";
import { ScrapedEngagement } from "@/lib/broadcast/types";
import { emitSignal } from "@/lib/uoi/signals";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Option 1: Single engagement
    if (body.engagement) {
      const engagement: ScrapedEngagement = body.engagement;
      const context = body.context || {};
      
      // Use new scoring engine for comprehensive classification
      const classification = scoreAndClassifyLead(engagement, context);
      
      // Convert to lead signal format
      const lead = detectLead(engagement, context);
      
      // Emit signal with classification
      emitSignal({
        source: "broadcast_engine",
        type: classification.uoiSignal as any,
        payload: {
          leadId: lead.id,
          score: classification.score.total,
          tier: classification.score.tier,
          type: lead.type,
          urgency: classification.score.urgency,
          platform: lead.platform,
          pipelineEntryPoint: classification.pipelineEntryPoint
        },
        priority: classification.score.urgency === "high" ? "high" : "medium"
      });
      
      return NextResponse.json({
        success: true,
        lead,
        classification: {
          tier: classification.score.tier,
          pipelineEntryPoint: classification.pipelineEntryPoint,
          agentAssignment: classification.agentAssignment,
          taskDescription: classification.taskDescription
        }
      });
    }
    
    // Option 2: Batch engagements
    if (body.engagements && Array.isArray(body.engagements)) {
      const engagements: ScrapedEngagement[] = body.engagements;
      const context = body.context || {};
      
      // Use new scoring engine for batch classification
      const classifications = batchScoreAndClassifyLeads(engagements, context);
      
      // Convert to lead signals
      const leads = batchDetectLeads(engagements, context);
      
      // Emit signal with tier breakdown
      if (classifications.length > 0) {
        emitSignal({
          source: "broadcast_engine",
          type: "leads_detected",
          payload: {
            count: classifications.length,
            hot: classifications.filter(c => c.score.tier === "hot").length,
            warm: classifications.filter(c => c.score.tier === "warm").length,
            interested: classifications.filter(c => c.score.tier === "interested").length,
            cold: classifications.filter(c => c.score.tier === "cold").length,
            noise: classifications.filter(c => c.score.tier === "noise").length
          },
          priority: classifications.some(c => c.score.urgency === "high") ? "high" : "medium"
        });
      }
      
      return NextResponse.json({
        success: true,
        leads,
        classifications: classifications.map(c => ({
          tier: c.score.tier,
          score: c.score.total,
          pipelineEntryPoint: c.pipelineEntryPoint,
          agentAssignment: c.agentAssignment
        })),
        count: leads.length,
        summary: {
          hot: classifications.filter(c => c.score.tier === "hot").length,
          warm: classifications.filter(c => c.score.tier === "warm").length,
          interested: classifications.filter(c => c.score.tier === "interested").length,
          cold: classifications.filter(c => c.score.tier === "cold").length,
          noise: classifications.filter(c => c.score.tier === "noise").length
        }
      });
    }
    
    return NextResponse.json(
      { error: "engagement or engagements array is required" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Broadcast API] Lead detection error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scoreMin = searchParams.get("scoreMin");
    const type = searchParams.get("type");
    const urgency = searchParams.get("urgency");
    
    // In production, fetch from database
    // For now, return empty (this would be a database query)
    
    return NextResponse.json({
      success: true,
      leads: [],
      count: 0,
      filters: {
        scoreMin: scoreMin ? parseInt(scoreMin) : undefined,
        type,
        urgency
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Get leads error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
