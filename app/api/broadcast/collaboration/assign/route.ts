// Broadcast Engine - Multi-Agent Collaboration API
// POST /api/broadcast/collaboration/assign - Assign agents with collaboration matrix

import { NextResponse } from "next/server";
import { batchAssignWithMatrix } from "@/lib/broadcast/collaboration/assignment-matrix";
import { normalizeDetectedLead, LeadObject } from "@/lib/broadcast/funnel-modules/lead-intake";
import { routeLead, RoutingDecision } from "@/lib/broadcast/funnel-modules/routing";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leads } = body;
    
    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json(
        { error: "Missing or invalid leads array" },
        { status: 400 }
      );
    }
    
    // Normalize leads and route
    const normalizedLeads: LeadObject[] = [];
    const routings: RoutingDecision[] = [];
    
    for (const lead of leads) {
      const normalized = normalizeDetectedLead(lead);
      const routing = routeLead(normalized);
      normalizedLeads.push(normalized);
      routings.push(routing);
    }
    
    // Batch assign with matrix
    const assignments = await batchAssignWithMatrix(normalizedLeads, routings);
    
    return NextResponse.json({
      success: true,
      assignments: assignments.map(a => ({
        leadId: a.leadId,
        mode: a.mode,
        agents: a.assignments.map(assign => ({
          agentId: assign.agentId,
          role: assign.role,
          reasoning: assign.reasoning,
          confidence: assign.confidence
        }))
      }))
    });
  } catch (error: any) {
    console.error("[Broadcast API] Collaboration assignment error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
