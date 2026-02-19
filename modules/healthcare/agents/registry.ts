// Health CRM Agent Registry
// Registers health agents with the cockpit system

import { AgentStatus } from "@/lib/cockpit/types";

/**
 * Health CRM Agents Registry
 */
export const HEALTH_AGENTS: AgentStatus[] = [
  {
    id: "health-intake",
    name: "Health Intake Agent",
    type: "health-intake",
    status: "idle",
    load: 0,
    tasksActive: 0,
    lastActivity: new Date().toISOString(),
  },
  {
    id: "health-followup",
    name: "Health Follow-up Agent",
    type: "health-followup",
    status: "idle",
    load: 0,
    tasksActive: 0,
    lastActivity: new Date().toISOString(),
  },
];

/**
 * Get health agent by ID
 */
export function getHealthAgent(agentId: string): AgentStatus | undefined {
  return HEALTH_AGENTS.find((agent) => agent.id === agentId);
}

/**
 * Get all health agents
 */
export function getAllHealthAgents(): AgentStatus[] {
  return HEALTH_AGENTS;
}
