// Broadcast Engine - Multi-Agent Collaboration: Assignment Matrix
// Decides who gets what lead, ensuring no collisions and optimal distribution

import { LeadObject } from "../funnel-modules/lead-intake";
import { RoutingDecision } from "../funnel-modules/routing";
import { Agent, getAvailableAgents } from "../funnel-modules/agent-assignment";

export type CollaborationMode = 
  | "parallel"      // Multiple agents act on different leads simultaneously
  | "sequential"     // Lead passes from one agent to another
  | "escalation"     // Lead escalates to senior agent
  | "assist"         // Secondary agent joins primary agent
  | "broadcast";     // Multiple agents push coordinated outreach

export interface AgentAssignment {
  agentId: string;
  leadId: string;
  mode: CollaborationMode;
  role: "primary" | "secondary" | "escalation" | "coordinator";
  reasoning: string;
  confidence: number; // 0-1
  assignedAt: string;
}

export interface AssignmentMatrix {
  leadId: string;
  assignments: AgentAssignment[];
  mode: CollaborationMode;
  lockUntil?: string; // Prevents reassignment until this time
  createdAt: string;
}

/**
 * Determine collaboration mode for a lead
 */
export function determineCollaborationMode(
  lead: LeadObject,
  routing: RoutingDecision
): CollaborationMode {
  // High urgency leads may need escalation
  if (routing.urgency === "high" && lead.leadTier === "hot") {
    return "escalation";
  }
  
  // Trend campaigns use broadcast mode
  if (routing.entryPoint === "trend_spike") {
    return "broadcast";
  }
  
  // Complex leads may need assist mode
  if (lead.leadScore > 80 && lead.leadTier === "hot") {
    return "assist";
  }
  
  // Pipeline stage transitions use sequential mode
  if (routing.pipelineStage === "Intake" || routing.pipelineStage === "Active") {
    return "sequential";
  }
  
  // Default: parallel mode
  return "parallel";
}

/**
 * Assign agents using assignment matrix
 */
export async function assignAgentsWithMatrix(
  lead: LeadObject,
  routing: RoutingDecision,
  existingAssignments?: AssignmentMatrix[]
): Promise<AssignmentMatrix> {
  const mode = determineCollaborationMode(lead, routing);
  const agents = await getAvailableAgents();
  
  // Check for existing assignment
  const existing = existingAssignments?.find(a => a.leadId === lead.id);
  if (existing && existing.lockUntil && new Date(existing.lockUntil) > new Date()) {
    return existing; // Assignment is locked
  }
  
  const assignments: AgentAssignment[] = [];
  
  switch (mode) {
    case "parallel":
      // Single agent assignment (standard)
      const primaryAgent = await selectBestAgent(lead, routing, agents, []);
      if (primaryAgent) {
        assignments.push({
          agentId: primaryAgent.id,
          leadId: lead.id,
          mode: "parallel",
          role: "primary",
          reasoning: `Parallel mode: ${primaryAgent.name} assigned for ${lead.platform} lead`,
          confidence: 0.8,
          assignedAt: new Date().toISOString()
        });
      }
      break;
      
    case "sequential":
      // Primary agent for initial stage
      const intakeAgent = await selectBestAgent(lead, routing, agents, []);
      if (intakeAgent) {
        assignments.push({
          agentId: intakeAgent.id,
          leadId: lead.id,
          mode: "sequential",
          role: "primary",
          reasoning: `Sequential mode: ${intakeAgent.name} assigned for intake stage`,
          confidence: 0.8,
          assignedAt: new Date().toISOString()
        });
      }
      break;
      
    case "escalation":
      // Senior agent for escalation
      const seniorAgents = agents.filter(a => 
        a.performance.conversionRate > 0.5 && 
        a.performance.avgResponseTime < 30
      );
      const escalationAgent = seniorAgents.length > 0 
        ? seniorAgents.sort((a, b) => b.performance.conversionRate - a.performance.conversionRate)[0]
        : null;
      
      if (escalationAgent) {
        assignments.push({
          agentId: escalationAgent.id,
          leadId: lead.id,
          mode: "escalation",
          role: "escalation",
          reasoning: `Escalation mode: ${escalationAgent.name} assigned for high-urgency lead`,
          confidence: 0.9,
          assignedAt: new Date().toISOString()
        });
      }
      break;
      
    case "assist":
      // Primary + secondary agent
      const primary = await selectBestAgent(lead, routing, agents, []);
      if (primary) {
        assignments.push({
          agentId: primary.id,
          leadId: lead.id,
          mode: "assist",
          role: "primary",
          reasoning: `Assist mode: ${primary.name} as primary agent`,
          confidence: 0.8,
          assignedAt: new Date().toISOString()
        });
        
        // Find secondary agent
        const secondary = await selectBestAgent(lead, routing, agents, [primary.id]);
        if (secondary) {
          assignments.push({
            agentId: secondary.id,
            leadId: lead.id,
            mode: "assist",
            role: "secondary",
            reasoning: `Assist mode: ${secondary.name} as secondary agent`,
            confidence: 0.7,
            assignedAt: new Date().toISOString()
          });
        }
      }
      break;
      
    case "broadcast":
      // Multiple agents for coordinated outreach
      const broadcastAgents = agents
        .filter(a => a.availability === "available")
        .sort((a, b) => b.performance.conversionRate - a.performance.conversionRate)
        .slice(0, 3); // Top 3 agents
      
      for (let i = 0; i < broadcastAgents.length; i++) {
        assignments.push({
          agentId: broadcastAgents[i].id,
          leadId: lead.id,
          mode: "broadcast",
          role: i === 0 ? "coordinator" : "primary",
          reasoning: `Broadcast mode: ${broadcastAgents[i].name} assigned for trend campaign`,
          confidence: 0.8,
          assignedAt: new Date().toISOString()
        });
      }
      break;
  }
  
  // Lock assignment for 1 hour to prevent collisions
  const lockUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  
  return {
    leadId: lead.id,
    assignments,
    mode,
    lockUntil,
    createdAt: new Date().toISOString()
  };
}

/**
 * Select best agent for assignment
 */
async function selectBestAgent(
  lead: LeadObject,
  routing: RoutingDecision,
  agents: Agent[],
  excludeAgentIds: string[]
): Promise<Agent | null> {
  // Filter out excluded agents
  let candidates = agents.filter(a => !excludeAgentIds.includes(a.id));
  
  // Filter by availability
  candidates = candidates.filter(a => a.availability === "available");
  
  if (candidates.length === 0) {
    // Fallback to busy agents if none available
    candidates = agents.filter(a => !excludeAgentIds.includes(a.id) && a.availability === "busy");
  }
  
  if (candidates.length === 0) {
    return null;
  }
  
  // Sort by: specialization match > performance > workload
  candidates.sort((a, b) => {
    // Specialization match (if lead has domain context)
    // In production, check lead metadata for domain
    
    // Performance
    if (Math.abs(a.performance.conversionRate - b.performance.conversionRate) > 0.1) {
      return b.performance.conversionRate - a.performance.conversionRate;
    }
    
    // Workload
    return a.currentWorkload - b.currentWorkload;
  });
  
  return candidates[0];
}

/**
 * Check for assignment collisions
 */
export function checkForCollisions(
  newAssignment: AssignmentMatrix,
  existingAssignments: AssignmentMatrix[]
): {
  hasCollision: boolean;
  conflictingLeads: string[];
  conflictingAgents: string[];
} {
  const conflictingLeads: string[] = [];
  const conflictingAgents: string[] = [];
  
  for (const existing of existingAssignments) {
    // Check if same lead is assigned to multiple agents in parallel mode
    if (existing.leadId === newAssignment.leadId && 
        existing.mode === "parallel" && 
        newAssignment.mode === "parallel" &&
        existing.lockUntil && 
        new Date(existing.lockUntil) > new Date()) {
      conflictingLeads.push(existing.leadId);
    }
    
    // Check if same agent is assigned to multiple leads (workload check)
    for (const newAssign of newAssignment.assignments) {
      for (const existingAssign of existing.assignments) {
        if (newAssign.agentId === existingAssign.agentId &&
            existingAssign.role === "primary" &&
            newAssign.role === "primary") {
          conflictingAgents.push(newAssign.agentId);
        }
      }
    }
  }
  
  return {
    hasCollision: conflictingLeads.length > 0 || conflictingAgents.length > 0,
    conflictingLeads,
    conflictingAgents
  };
}

/**
 * Batch assign with collision detection
 */
export async function batchAssignWithMatrix(
  leads: LeadObject[],
  routings: RoutingDecision[]
): Promise<AssignmentMatrix[]> {
  const assignments: AssignmentMatrix[] = [];
  
  for (let i = 0; i < leads.length; i++) {
    const assignment = await assignAgentsWithMatrix(leads[i], routings[i], assignments);
    
    // Check for collisions
    const collision = checkForCollisions(assignment, assignments);
    
    if (!collision.hasCollision) {
      assignments.push(assignment);
    } else {
      // Emit signal for manual resolution
      const { emitSignal } = await import("@/lib/uoi/signals");
      emitSignal({
        source: "broadcast_engine",
        type: "assignment_collision_detected",
        payload: {
          leadId: leads[i].id,
          collisions: collision,
          recommendation: "Manual assignment required"
        },
        priority: "medium"
      });
    }
  }
  
  return assignments;
}
