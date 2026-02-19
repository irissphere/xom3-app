// HPE Compliance Dashboard Data Engine
// Aggregates data for compliance dashboard: overdue tasks, missing documents,
// compliance gaps, audit trails, agent performance

import Airtable from "airtable";
import { getClientComplianceSummary, getClientComplianceLogs } from "./compliance-engine";
import { getClientBillingSummary } from "./billing-engine";
import { getClientInteractionSummary } from "./interaction-engine";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

export interface ComplianceDashboardData {
  overdueTasks: OverdueTask[];
  missingDocuments: MissingDocument[];
  complianceGaps: ComplianceGap[];
  recentAuditTrail: AuditTrailEntry[];
  agentPerformance: AgentPerformance[];
  summary: DashboardSummary;
}

export interface OverdueTask {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  dueDate: string;
  daysOverdue: number;
  priority: string;
  assignee?: string;
}

export interface MissingDocument {
  clientId: string;
  clientName: string;
  stage: string;
  requiredDocument: string;
  status: string;
}

export interface ComplianceGap {
  clientId: string;
  clientName: string;
  stage: string;
  gapType: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entityId: string;
  user: string;
  details: Record<string, any>;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  tasksCompleted: number;
  tasksOverdue: number;
  interactionsLogged: number;
  complianceLogsCreated: number;
  clientsManaged: number;
}

export interface DashboardSummary {
  totalClients: number;
  totalTasks: number;
  overdueTasks: number;
  totalComplianceLogs: number;
  pendingCompliance: number;
  overdueCompliance: number;
  totalBilling: number;
  overdueBilling: number;
  totalInteractions: number;
}

/**
 * Get full compliance dashboard data
 */
export async function getComplianceDashboard(
  tenant?: string,
  agentId?: string
): Promise<ComplianceDashboardData> {
  const [overdueTasks, missingDocuments, complianceGaps, recentAuditTrail, agentPerformance, summary] = await Promise.all([
    getOverdueTasks(tenant, agentId),
    getMissingDocuments(tenant),
    getComplianceGaps(tenant),
    getRecentAuditTrail(tenant, 50),
    getAgentPerformance(tenant, agentId),
    getDashboardSummary(tenant)
  ]);

  return {
    overdueTasks,
    missingDocuments,
    complianceGaps,
    recentAuditTrail,
    agentPerformance,
    summary
  };
}

/**
 * Get overdue tasks
 */
async function getOverdueTasks(tenant?: string, agentId?: string): Promise<OverdueTask[]> {
  try {
    const conditions: string[] = [
      `{Status} != 'Done'`,
      `{Status} != 'Cancelled'`,
      `{Due Date} != ''`,
    ];
    if (tenant) conditions.push(`{Tenant} = '${tenant}'`);
    if (agentId) conditions.push(`{Assignee} = '${agentId}'`);

    const records = await base("Tasks")
      .select({
        filterByFormula: `AND(${conditions.join(", ")})`,
        sort: [{ field: "Due Date", direction: "asc" }],
      })
      .all();
    const now = new Date();
    const overdue: OverdueTask[] = [];

    for (const record of records) {
      const fields = record.fields as any;
      const dueDate = fields["Due Date"];
      if (!dueDate) continue;

      const due = new Date(dueDate);
      if (due < now) {
        const clientId = fields.Client?.[0];
        let clientName = "Unknown Client";
        
        if (clientId) {
          try {
            const client = await base("Clients").find(clientId);
            clientName = (client.fields as any).Name || "Unknown Client";
          } catch {
            // Continue without client name
          }
        }

        overdue.push({
          id: record.id,
          clientId: clientId || "",
          clientName,
          title: fields.Title || "Untitled Task",
          dueDate,
          daysOverdue: Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)),
          priority: fields.Priority || "Medium",
          assignee: fields.Assignee
        });
      }
    }

    return overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
  } catch (error: any) {
    console.error("Failed to get overdue tasks:", error);
    return [];
  }
}

/**
 * Get missing documents (based on stage requirements)
 */
async function getMissingDocuments(tenant?: string): Promise<MissingDocument[]> {
  // This would check against a document requirements matrix
  // For now, return empty array - can be enhanced with actual document tracking
  return [];
}

/**
 * Get compliance gaps
 */
async function getComplianceGaps(tenant?: string): Promise<ComplianceGap[]> {
  try {
    const clients = await base("Clients")
      .select({
        view: "Grid view",
        ...(tenant ? { filterByFormula: `{Tenant} = '${tenant}'` } : {}),
      })
      .all();
    const gaps: ComplianceGap[] = [];

    for (const client of clients) {
      const fields = client.fields as any;
      const clientId = client.id;
      const clientName = fields.Name || "Unknown Client";
      const stage = fields.Status || "Prospect";

      // Check compliance summary
      const complianceSummary = await getClientComplianceSummary(clientId);
      
      if (complianceSummary.overdue > 0) {
        gaps.push({
          clientId,
          clientName,
          stage,
          gapType: "Overdue Compliance",
          description: `${complianceSummary.overdue} overdue compliance items`,
          severity: complianceSummary.overdue > 3 ? "high" : complianceSummary.overdue > 1 ? "medium" : "low"
        });
      }

      if (complianceSummary.pending > 5) {
        gaps.push({
          clientId,
          clientName,
          stage,
          gapType: "Pending Compliance",
          description: `${complianceSummary.pending} pending compliance items`,
          severity: "medium"
        });
      }
    }

    return gaps;
  } catch (error: any) {
    console.error("Failed to get compliance gaps:", error);
    return [];
  }
}

/**
 * Get recent audit trail
 */
async function getRecentAuditTrail(tenant?: string, limit: number = 50): Promise<AuditTrailEntry[]> {
  try {
    const records = await base("Audit Logs")
      .select({
        sort: [{ field: "Timestamp", direction: "desc" }],
        maxRecords: limit,
        ...(tenant ? { filterByFormula: `{Tenant} = '${tenant}'` } : {}),
      })
      .all();

    return records.map(record => {
      const fields = record.fields as any;
      let details = {};
      try {
        details = JSON.parse(fields.Details || "{}");
      } catch {
        details = {};
      }

      return {
        id: record.id,
        timestamp: fields.Timestamp || new Date().toISOString(),
        action: fields.Action || "Unknown",
        entity: fields.Entity || "unknown",
        entityId: fields["Entity ID"] || "",
        user: fields.User || "system",
        details
      };
    });
  } catch (error: any) {
    console.error("Failed to get audit trail:", error);
    return [];
  }
}

/**
 * Get agent performance metrics
 */
async function getAgentPerformance(tenant?: string, agentId?: string): Promise<AgentPerformance[]> {
  try {
    // Get all tasks to calculate agent metrics
    const tasks = await base("Tasks")
      .select({
        view: "Grid view",
        ...(tenant ? { filterByFormula: `{Tenant} = '${tenant}'` } : {}),
      })
      .all();
    const agentMap = new Map<string, AgentPerformance>();

    tasks.forEach(task => {
      const fields = task.fields as any;
      const assignee = fields.Assignee;
      if (!assignee) return;

      if (agentId && assignee !== agentId) return;

      if (!agentMap.has(assignee)) {
        agentMap.set(assignee, {
          agentId: assignee,
          agentName: assignee,
          tasksCompleted: 0,
          tasksOverdue: 0,
          interactionsLogged: 0,
          complianceLogsCreated: 0,
          clientsManaged: 0
        });
      }

      const agent = agentMap.get(assignee)!;
      if (fields.Status === "Done") {
        agent.tasksCompleted++;
      } else if (fields["Due Date"]) {
        const due = new Date(fields["Due Date"]);
        if (due < new Date() && fields.Status !== "Done") {
          agent.tasksOverdue++;
        }
      }
    });

    // Get interactions and compliance logs
    // (Simplified - in production would aggregate more efficiently)
    const agents = Array.from(agentMap.values());
    
    return agents;
  } catch (error: any) {
    console.error("Failed to get agent performance:", error);
    return [];
  }
}

/**
 * Get dashboard summary
 */
async function getDashboardSummary(tenant?: string): Promise<DashboardSummary> {
  try {
    const clients = await base("Clients")
      .select({
        view: "Grid view",
        ...(tenant ? { filterByFormula: `{Tenant} = '${tenant}'` } : {}),
      })
      .all();
    const clientIds = clients.map(c => c.id);

    // Get tasks
    const tasks = await base("Tasks")
      .select({
        view: "Grid view",
        ...(tenant ? { filterByFormula: `{Tenant} = '${tenant}'` } : {}),
      })
      .all();
    const now = new Date();
    const overdueTasks = tasks.filter(t => {
      const fields = t.fields as any;
      const dueDate = fields["Due Date"];
      if (!dueDate) return false;
      return new Date(dueDate) < now && fields.Status !== "Done" && fields.Status !== "Cancelled";
    });

    // Get compliance logs
    let complianceQuery = base("Compliance Logs").select({
      view: "Grid view"
    });

    const complianceLogs = await complianceQuery.all();
    const pendingCompliance = complianceLogs.filter(c => {
      const fields = c.fields as any;
      return fields.Status === "Pending" || fields.Status === "In Review";
    });

    const overdueCompliance = complianceLogs.filter(c => {
      const fields = c.fields as any;
      const dueDate = fields["Due Date"];
      if (!dueDate) return false;
      const status = fields.Status;
      return new Date(dueDate) < now && status !== "Resolved" && status !== "Approved";
    });

    // Get billing
    let billingQuery = base("Billing").select({
      view: "Grid view"
    });

    const billing = await billingQuery.all();
    const overdueBilling = billing.filter(b => {
      const fields = b.fields as any;
      return fields.Status === "Overdue";
    });

    // Get interactions
    let interactionQuery = base("Interactions").select({
      view: "Grid view"
    });

    const interactions = await interactionQuery.all();

    return {
      totalClients: clients.length,
      totalTasks: tasks.length,
      overdueTasks: overdueTasks.length,
      totalComplianceLogs: complianceLogs.length,
      pendingCompliance: pendingCompliance.length,
      overdueCompliance: overdueCompliance.length,
      totalBilling: billing.length,
      overdueBilling: overdueBilling.length,
      totalInteractions: interactions.length
    };
  } catch (error: any) {
    console.error("Failed to get dashboard summary:", error);
    return {
      totalClients: 0,
      totalTasks: 0,
      overdueTasks: 0,
      totalComplianceLogs: 0,
      pendingCompliance: 0,
      overdueCompliance: 0,
      totalBilling: 0,
      overdueBilling: 0,
      totalInteractions: 0
    };
  }
}
