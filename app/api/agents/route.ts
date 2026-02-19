import { NextResponse } from "next/server";

/**
 * Get all registered agents
 * Aggregates agents from all domains
 * 
 * Returns array of agent status objects with:
 * - id: Agent identifier
 * - name: Display name
 * - type: Agent type (e.g., "benefits-intake")
 * - status: Current status (idle, active, error)
 * - load: Current load percentage (0-100)
 * - tasksActive: Number of active tasks
 * - lastActivity: ISO timestamp of last activity
 */
export async function GET() {
  const agents: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    load: number;
    tasksActive: number;
    lastActivity: string;
  }> = [];

  // Load Benefits CRM agents
  try {
    const { getAllBenefitsAgents } = await import("@/modules/benefits/agents/registry");
    const benefitsAgents = getAllBenefitsAgents();
    agents.push(...benefitsAgents);
  } catch (error) {
    // Benefits agents module not available, continue
    console.warn("[agents] Benefits agents module not available:", error);
  }

  // Load Health CRM agents
  try {
    const { getAllHealthAgents } = await import("@/modules/healthcare/agents/registry");
    const healthAgents = getAllHealthAgents();
    agents.push(...healthAgents);
  } catch (error) {
    // Health agents module not available, continue
    console.warn("[agents] Health agents module not available:", error);
  }

  return NextResponse.json(agents, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
