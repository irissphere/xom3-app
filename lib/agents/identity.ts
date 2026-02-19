// Agent Identity Layer
// Core foundation: unique identity, role, permissions, Airtable linkage, UOI identity, HSE impact profile

import { Role } from "../auth/roles";
import { canAccess } from "../auth/permissions";

async function getBase() {
  // Dynamic import to avoid build-time initialization
  const Airtable = (await import("airtable")).default;
  
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_USHA_BASE_ID;
  
  if (!apiKey || !baseId) {
    throw new Error("Airtable configuration missing");
  }
  
  return new Airtable({ apiKey }).base(baseId);
}

export interface AgentIdentity {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: string[];
  airtableRecordId?: string;
  uoiIdentityId?: string;
  hseImpactProfileId?: string;
  tenant?: string;
  active: boolean;
  createdAt: string;
  lastActiveAt?: string;
}

export interface AgentProfile {
  identity: AgentIdentity;
  stats: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    activeClients: number;
    complianceScore: number;
    interactionCount: number;
    revenueImpact: number;
  };
}

/**
 * Get agent identity by email or ID
 */
export async function getAgentIdentity(
  identifier: string,
  byEmail: boolean = false
): Promise<AgentIdentity | null> {
  try {
    // For now, we'll use a simple lookup
    // In production, this would query Airtable Users table or session
    // This is a placeholder that returns a basic identity structure
    
    // Check if identifier looks like an email
    const isEmail = identifier.includes("@");
    
    // For now, return a mock identity based on role resolution
    // In production, this would:
    // 1. Query Airtable Users table
    // 2. Get role from session/auth
    // 3. Build permissions from role
    // 4. Link to UOI and HSE
    
    return {
      id: identifier,
      email: isEmail ? identifier : `${identifier}@example.com`,
      name: identifier.split("@")[0] || identifier,
      role: "agent" as Role,
      permissions: getPermissionsForRole("agent"),
      active: true,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting agent identity:", error);
    return null;
  }
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: Role): string[] {
  const permissions: Record<Role, string[]> = {
    admin: [
      "view:all",
      "edit:all",
      "delete:all",
      "manage:agents",
      "manage:clients",
      "manage:pipeline",
      "manage:compliance",
      "manage:billing",
      "view:analytics",
      "manage:settings",
    ],
    manager: [
      "view:all",
      "edit:clients",
      "edit:pipeline",
      "view:compliance",
      "view:billing",
      "view:analytics",
      "assign:tasks",
      "manage:agents",
    ],
    agent: [
      "view:assigned",
      "edit:assigned",
      "view:clients",
      "edit:clients",
      "move:stages",
      "log:interactions",
      "view:tasks",
      "complete:tasks",
      "view:compliance",
    ],
    viewer: [
      "view:all",
    ],
  };

  return permissions[role] || [];
}

/**
 * Check if agent has permission
 */
export function agentHasPermission(
  agent: AgentIdentity,
  permission: string
): boolean {
  return agent.permissions.includes(permission) || 
         agent.permissions.includes("view:all") ||
         agent.permissions.includes("edit:all");
}

/**
 * Get agent profile with stats
 */
export async function getAgentProfile(
  agentId: string,
  tenant?: string
): Promise<AgentProfile | null> {
  const identity = await getAgentIdentity(agentId);
  if (!identity) return null;

  try {
    // Get tasks assigned to agent
    const base = await getBase();
    let taskQuery = base("Tasks").select({
      filterByFormula: `{Assignee} = '${agentId}'`,
    });
    if (tenant) {
      taskQuery = base("Tasks").select({
        filterByFormula: `AND({Assignee} = '${agentId}', {Tenant} = '${tenant}')`,
      });
    }
    const tasks = await taskQuery.all();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t: any) => t.fields.Status === "Done"
    ).length;
    const overdueTasks = tasks.filter((t: any) => {
      const dueDate = t.fields["Due Date"];
      if (!dueDate) return false;
      return new Date(dueDate) < new Date() && t.fields.Status !== "Done";
    }).length;

    // Get clients assigned to agent (via tasks or direct assignment)
    const clientIds = new Set<string>();
    tasks.forEach((t: any) => {
      if (t.fields.Client) {
        const clientArray = Array.isArray(t.fields.Client)
          ? t.fields.Client
          : [t.fields.Client];
        clientArray.forEach((c: string) => clientIds.add(c));
      }
    });
    const activeClients = clientIds.size;

    // Get interactions logged by agent
    let interactionQuery = base("Interactions").select({
      filterByFormula: `{Created By} = '${agentId}'`,
    });
    if (tenant) {
      interactionQuery = base("Interactions").select({
        filterByFormula: `AND({Created By} = '${agentId}', {Tenant} = '${tenant}')`,
      });
    }
    const interactions = await interactionQuery.all();
    const interactionCount = interactions.length;

    // Calculate compliance score (placeholder - would need compliance logs)
    const complianceScore = 95; // Placeholder

    // Calculate revenue impact (placeholder - would need billing data)
    const revenueImpact = 0; // Placeholder

    return {
      identity,
      stats: {
        totalTasks,
        completedTasks,
        overdueTasks,
        activeClients,
        complianceScore,
        interactionCount,
        revenueImpact,
      },
    };
  } catch (error) {
    console.error("Error getting agent profile:", error);
    return {
      identity,
      stats: {
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        activeClients: 0,
        complianceScore: 0,
        interactionCount: 0,
        revenueImpact: 0,
      },
    };
  }
}

/**
 * Link agent to UOI identity
 */
export async function linkAgentToUOI(
  agentId: string,
  uoiIdentityId: string
): Promise<boolean> {
  try {
    // In production, this would update Airtable Users table
    // For now, this is a placeholder
    return true;
  } catch (error) {
    console.error("Error linking agent to UOI:", error);
    return false;
  }
}

/**
 * Link agent to HSE impact profile
 */
export async function linkAgentToHSE(
  agentId: string,
  hseProfileId: string
): Promise<boolean> {
  try {
    // In production, this would update Airtable Users table
    // For now, this is a placeholder
    return true;
  } catch (error) {
    console.error("Error linking agent to HSE:", error);
    return false;
  }
}
