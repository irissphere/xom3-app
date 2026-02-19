// Broadcast Engine - Funnel Integration Engine API
// POST /api/broadcast/funnel - Push leads into EXOM3 pipeline

import { NextResponse } from "next/server";
import { integrateLeadIntoFunnel } from "@/lib/broadcast/funnel-engine";
import { DetectedLead, LeadSignal } from "@/lib/broadcast/types";
import { detectLead } from "@/lib/broadcast/lead-detection-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Option 1: Single lead integration
    if (body.leadId || body.leadSignal) {
      let lead: DetectedLead;
      
      if (body.leadId) {
        // In production, fetch from database
        // For now, create from leadSignal if provided
        if (!body.leadSignal) {
          return NextResponse.json(
            { error: "leadSignal required when using leadId" },
            { status: 400 }
          );
        }
        
        lead = {
          id: body.leadId,
          leadSignal: body.leadSignal as LeadSignal,
          funnelStage: "New Lead",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        // Create detected lead from lead signal
        const leadSignal = body.leadSignal as LeadSignal;
        lead = {
          id: `detected_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          leadSignal,
          funnelStage: "New Lead",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      const integration = await integrateLeadIntoFunnel(lead, {
        autoAssign: body.autoAssign !== false,
        skipAirtable: body.skipAirtable === true
      });
      
      return NextResponse.json({
        success: true,
        integration,
        lead: {
          id: lead.id,
          score: lead.leadSignal.score,
          type: lead.leadSignal.type,
          urgency: lead.leadSignal.urgency
        }
      });
    }
    
    // Option 2: Batch integration
    if (body.leadIds && Array.isArray(body.leadIds)) {
      // In production, fetch leads from database
      // For now, return error
      return NextResponse.json(
        { error: "Batch integration requires database implementation" },
        { status: 501 }
      );
    }
    
    // Option 3: Direct from engagement (auto-detect and integrate)
    if (body.engagement) {
      const leadSignal = detectLead(body.engagement, body.context);
      
      // Only integrate if score is high enough
      if (leadSignal.score < 20) {
        return NextResponse.json({
          success: false,
          reason: "lead_score_too_low",
          leadSignal
        });
      }
      
      const lead: DetectedLead = {
        id: `detected_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        leadSignal,
        funnelStage: "New Lead",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const integration = await integrateLeadIntoFunnel(lead, {
        autoAssign: body.autoAssign !== false,
        skipAirtable: body.skipAirtable === true
      });
      
      return NextResponse.json({
        success: true,
        integration,
        leadSignal
      });
    }
    
    return NextResponse.json(
      { error: "leadId, leadSignal, or engagement is required" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Broadcast API] Funnel integration error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");
    const clientId = searchParams.get("clientId");
    
    // In production, fetch from database
    // For now, return empty
    
    return NextResponse.json({
      success: true,
      integrations: [],
      count: 0
    });
  } catch (error: any) {
    console.error("[Broadcast API] Get funnel integration error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
