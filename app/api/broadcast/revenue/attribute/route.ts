// Broadcast Engine - Revenue Attribution API
// POST /api/broadcast/revenue/attribute - Attribute revenue to broadcast content

import { NextResponse } from "next/server";
import { processRevenueEvent } from "@/lib/broadcast/revenue-attribution-engine";
import { ConversionData } from "@/lib/broadcast/agent-workflow/close";
import { normalizeDetectedLead, LeadObject } from "@/lib/broadcast/funnel-modules/lead-intake";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      clientId,
      agentId,
      amount,
      source,
      conversion,
      lead
    } = body;
    
    if (!clientId || !agentId || !amount || !source || !conversion || !lead) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, agentId, amount, source, conversion, lead" },
        { status: 400 }
      );
    }
    
    // Normalize lead
    const leadObject = normalizeDetectedLead(lead);
    
    // Process revenue event
    const result = await processRevenueEvent(
      clientId,
      agentId,
      amount,
      source,
      conversion as ConversionData,
      leadObject,
      body.metadata
    );
    
    return NextResponse.json({
      success: true,
      revenueId: result.revenueId,
      attribution: result.attribution,
      rois: {
        content: result.contentROI,
        platform: result.platformROI,
        trend: result.trendROI,
        agent: result.agentROI,
        funnel: result.funnelROI
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Revenue attribution error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
