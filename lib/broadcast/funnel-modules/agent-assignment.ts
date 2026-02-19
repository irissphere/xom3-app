// Broadcast Engine - Funnel Engine: Agent Assignment Module
// Assigns agents based on availability, performance, specialization, domain

import { LeadObject } from "./lead-intake";
import { RoutingDecision } from "./routing";

export interface Agent {
  id: string;
  name: string;
  specialization?: "healthcare" | "legacy" | "commerce" | "general";
  availability: "available" | "busy" | "unavailable";
  currentWorkload: number; // Number of active tasks
  performance: {
    avgResponseTime: number; // Minutes
    conversionRate: number; // 0-1
    avgLeadScore: number; // Average lead score of assigned leads
  };
}

export interface AgentAssignment {
  agentId: string;
  reasoning: string;
  confidence: number; // 0-1
}

/**
 * Get available agents (placeholder - implement actual agent retrieval)
 */
export async function getAvailableAgents(): Promise<Agent[]> {
  // In production, fetch from HPE agent system or database
  // For now, return empty array
  return [];
}

/**
 * Assign agent to lead
 */
export async function assignAgentToLead(
  lead: LeadObject,
  routing: RoutingDecision
): Promise<AgentAssignment | null> {
  try {
    // Get available agents
    const agents = await getAvailableAgents();
    
    if (agents.length === 0) {
      // No agents available - emit signal for manual assignment
      const { emitSignal } = await import("@/lib/uoi/signals");
      emitSignal({
        source: "broadcast_engine",
        type: "agent_assignment_requested",
        payload: {
          leadId: lead.id,
          leadScore: lead.leadScore,
          leadTier: lead.leadTier,
          urgency: lead.urgency,
          platform: lead.platform,
          reasoning: "No agents available - manual assignment required"
        },
        priority: routing.urgency === "high" ? "high" : "medium"
      });
      
      return null;
    }
    
    // Filter by specialization if lead has domain context
    let candidateAgents = agents;
    
    // In production, filter by:
    // - Specialization (healthcare, legacy, commerce)
    // - Availability
    // - Current workload
    // - Performance metrics
    
    // For now, use round-robin or best performer
    const availableAgents = candidateAgents.filter(a => a.availability === "available");
    
    if (availableAgents.length === 0) {
      // No available agents - use best performer
      candidateAgents = agents.sort((a, b) => b.performance.conversionRate - a.performance.conversionRate);
    } else {
      candidateAgents = availableAgents.sort((a, b) => {
        // Sort by: availability > performance > workload
        if (a.availability !== b.availability) {
          return a.availability === "available" ? -1 : 1;
        }
        if (Math.abs(a.performance.conversionRate - b.performance.conversionRate) > 0.1) {
          return b.performance.conversionRate - a.performance.conversionRate;
        }
        return a.currentWorkload - b.currentWorkload;
      });
    }
    
    const selectedAgent = candidateAgents[0];
    
    if (!selectedAgent) {
      return null;
    }
    
    // Calculate confidence based on match quality
    let confidence = 0.7; // Base confidence
    
    // Boost confidence if specialization matches
    // Boost confidence if agent has high performance
    if (selectedAgent.performance.conversionRate > 0.5) {
      confidence += 0.2;
    }
    
    // Boost confidence if agent has low workload
    if (selectedAgent.currentWorkload < 5) {
      confidence += 0.1;
    }
    
    confidence = Math.min(1.0, confidence);
    
    return {
      agentId: selectedAgent.id,
      reasoning: `Assigned ${selectedAgent.name} (specialization: ${selectedAgent.specialization || "general"}, performance: ${(selectedAgent.performance.conversionRate * 100).toFixed(1)}%, workload: ${selectedAgent.currentWorkload})`,
      confidence
    };
  } catch (error: any) {
    console.error("[Funnel Agent] Agent assignment failed:", error);
    return null;
  }
}

/**
 * Batch assign agents to leads
 */
export async function batchAssignAgents(
  leads: LeadObject[],
  routings: RoutingDecision[]
): Promise<(AgentAssignment | null)[]> {
  const assignments: (AgentAssignment | null)[] = [];
  
  for (let i = 0; i < leads.length; i++) {
    const assignment = await assignAgentToLead(leads[i], routings[i]);
    assignments.push(assignment);
  }
  
  return assignments;
}
