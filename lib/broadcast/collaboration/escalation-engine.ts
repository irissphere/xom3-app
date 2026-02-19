// Broadcast Engine - Multi-Agent Collaboration: Escalation Engine
// Routes urgent leads upward to senior agents

import { LeadObject } from "../funnel-modules/lead-intake";
import { RoutingDecision } from "../funnel-modules/routing";
import { Agent, getAvailableAgents } from "../funnel-modules/agent-assignment";
import { AssignmentMatrix } from "./assignment-matrix";

export interface EscalationRule {
  id: string;
  condition: (lead: LeadObject, routing: RoutingDecision) => boolean;
  targetAgentLevel: "senior" | "manager" | "executive";
  urgency: "high" | "critical";
  autoEscalate: boolean;
}

export interface EscalationEvent {
  id: string;
  leadId: string;
  fromAgentId?: string;
  toAgentId: string;
  reason: string;
  urgency: "high" | "critical";
  escalatedAt: string;
  resolvedAt?: string;
}

/**
 * Default escalation rules
 */
export function getDefaultEscalationRules(): EscalationRule[] {
  return [
    {
      id: "hot_lead_high_urgency",
      condition: (lead, routing) => 
        lead.leadTier === "hot" && routing.urgency === "high",
      targetAgentLevel: "senior",
      urgency: "high",
      autoEscalate: true
    },
    {
      id: "revenue_threshold",
      condition: (lead, routing) => 
        lead.leadScore > 90 && routing.urgency === "high",
      targetAgentLevel: "senior",
      urgency: "high",
      autoEscalate: true
    },
    {
      id: "critical_timeout",
      condition: (lead, routing) => {
        // In production, check if lead has been waiting > 1 hour
        return routing.urgency === "high";
      },
      targetAgentLevel: "manager",
      urgency: "high",
      autoEscalate: true
    }
  ];
}

/**
 * Check if lead should be escalated
 */
export function shouldEscalate(
  lead: LeadObject,
  routing: RoutingDecision,
  rules: EscalationRule[] = getDefaultEscalationRules()
): {
  shouldEscalate: boolean;
  rule?: EscalationRule;
  reason: string;
} {
  for (const rule of rules) {
    if (rule.condition(lead, routing)) {
      return {
        shouldEscalate: true,
        rule,
        reason: `Escalation triggered by rule: ${rule.id} (${rule.targetAgentLevel} agent required)`
      };
    }
  }
  
  return {
    shouldEscalate: false,
    reason: "No escalation rules matched"
  };
}

/**
 * Find escalation agent
 */
export async function findEscalationAgent(
  rule: EscalationRule,
  currentAgentId?: string
): Promise<Agent | null> {
  const agents = await getAvailableAgents();
  
  // Filter by agent level (in production, agents would have level metadata)
  // For now, use performance as proxy
  let candidates = agents.filter(a => a.id !== currentAgentId);
  
  switch (rule.targetAgentLevel) {
    case "senior":
      // Senior agents: >50% conversion rate, <30min response time
      candidates = candidates.filter(a => 
        a.performance.conversionRate > 0.5 &&
        a.performance.avgResponseTime < 30
      );
      break;
      
    case "manager":
      // Manager agents: >60% conversion rate, <20min response time
      candidates = candidates.filter(a => 
        a.performance.conversionRate > 0.6 &&
        a.performance.avgResponseTime < 20
      );
      break;
      
    case "executive":
      // Executive agents: >70% conversion rate, <15min response time
      candidates = candidates.filter(a => 
        a.performance.conversionRate > 0.7 &&
        a.performance.avgResponseTime < 15
      );
      break;
  }
  
  if (candidates.length === 0) {
    // Fallback to best available agent
    candidates = agents
      .filter(a => a.id !== currentAgentId)
      .sort((a, b) => b.performance.conversionRate - a.performance.conversionRate);
  }
  
  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Escalate lead
 */
export async function escalateLead(
  lead: LeadObject,
  routing: RoutingDecision,
  currentAgentId?: string
): Promise<EscalationEvent | null> {
  const escalationCheck = shouldEscalate(lead, routing);
  
  if (!escalationCheck.shouldEscalate || !escalationCheck.rule) {
    return null;
  }
  
  const escalationAgent = await findEscalationAgent(escalationCheck.rule, currentAgentId);
  
  if (!escalationAgent) {
    // Emit signal for manual escalation
    const { emitSignal } = await import("@/lib/uoi/signals");
    emitSignal({
      source: "broadcast_engine",
      type: "escalation_agent_not_found",
      payload: {
        leadId: lead.id,
        rule: escalationCheck.rule.id,
        targetLevel: escalationCheck.rule.targetAgentLevel,
        urgency: escalationCheck.rule.urgency,
        recommendation: "Manual escalation required"
      },
      priority: escalationCheck.rule.urgency === "critical" ? "critical" : "high"
    });
    
    return null;
  }
  
  const escalation: EscalationEvent = {
    id: `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    leadId: lead.id,
    fromAgentId: currentAgentId,
    toAgentId: escalationAgent.id,
    reason: escalationCheck.reason,
    urgency: escalationCheck.rule.urgency,
    escalatedAt: new Date().toISOString()
  };
  
  // Update HSE state
  const { updateHSEState } = await import("../funnel-modules/hyperstate-uoi");
  const posture = escalationCheck.rule.urgency === "critical" ? "critical" : "elevated";
  await updateHSEState(
    ["lead_escalated", posture],
    {
      reason: `Lead escalated: ${escalationCheck.reason}`,
      leadId: lead.id,
      escalationId: escalation.id,
    }
  );
  
  // Emit escalation signal
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "lead_escalated",
    payload: escalation,
    priority: escalationCheck.rule.urgency === "critical" ? "critical" : "high"
  });
  
  return escalation;
}

/**
 * Resolve escalation
 */
export function resolveEscalation(
  escalation: EscalationEvent,
  outcome: "resolved" | "closed" | "transferred"
): EscalationEvent {
  return {
    ...escalation,
    resolvedAt: new Date().toISOString()
  };
}
