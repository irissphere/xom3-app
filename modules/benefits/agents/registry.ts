// Benefits CRM Agent Registry
// Registers benefits agents with the cockpit system

import { AgentStatus } from "@/lib/cockpit/types";

/**
 * Benefits CRM Agents Registry
 */
export const BENEFITS_AGENTS: AgentStatus[] = [
  {
    id: "benefits-intake",
    name: "Benefits Intake Agent",
    type: "benefits-intake",
    status: "idle",
    load: 0,
    tasksActive: 0,
    lastActivity: new Date().toISOString(),
  },
  {
    id: "benefits-followup",
    name: "Benefits Follow-up Agent",
    type: "benefits-followup",
    status: "idle",
    load: 0,
    tasksActive: 0,
    lastActivity: new Date().toISOString(),
  },
];

/**
 * Get benefits agent by ID
 */
export function getBenefitsAgent(agentId: string): AgentStatus | undefined {
  return BENEFITS_AGENTS.find((agent) => agent.id === agentId);
}

/**
 * Get all benefits agents
 */
export function getAllBenefitsAgents(): AgentStatus[] {
  return BENEFITS_AGENTS;
}
