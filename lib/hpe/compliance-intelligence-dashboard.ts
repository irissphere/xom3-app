// HPE Phase II - Strike 5: Compliance Intelligence Dashboard
// The cockpit's unified operational intelligence panel

import Airtable from "airtable";
import { queryComplianceEvents, getComplianceStatistics } from "./compliance-memory-engine";
import { getBillingStatistics } from "./billing-query-service";
import { getInteractionStatistics } from "./interaction-query-service";
import { getClientInteractions } from "./interaction-query-service";
import { getGlobalState, queryState } from "@/lib/hse";
import { getPendingSignals } from "@/lib/uoi/signals";

/**
 * Get Airtable base instance
 */
function getAirtableBase() {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_USHA_BASE_ID) {
    throw new Error("Airtable configuration missing");
  }
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_USHA_BASE_ID);
}

/**
 * Compliance Score (0-100)
 */
export interface ComplianceScore {
  overall: number;
  taskCompletion: number;
  documentStatus: number;
  billingHealth: number;
  interactionFrequency: number;
  stageVelocity: number;
  automationSuccess: number;
  errorVolume: number;
  factors: {
    positive: string[];
    negative: string[];
  };
}

/**
 * Compliance Heatmap Zone
 */
export type HeatmapZone = "critical" | "elevated" | "nominal" | "optimal";

/**
 * Agent Performance Score
 */
export interface AgentPerformanceScore {
  agentId: string;
  agentName: string;
  complianceScore: number;
  taskCompletionRate: number;
  interactionVolume: number;
  billingImpact: number;
  stageVelocity: number;
  errorRate: number;
  clientsManaged: number;
  recentActivity: number;
}

/**
 * Pipeline Risk Indicator
 */
export interface PipelineRiskIndicator {
  clientId: string;
  clientName: string;
  stage: string;
  riskType: "stalled" | "overdue_renewal" | "missing_document" | "billing_anomaly" | "low_interaction" | "high_risk_transition";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Compliance Timeline Entry
 */
export interface ComplianceTimelineEntry {
  id: string;
  timestamp: string;
  type: "interaction" | "billing" | "stage_transition" | "automation" | "compliance" | "error" | "override";
  category: string;
  description: string;
  clientId?: string;
  agentId?: string;
  stage?: string;
  metadata?: Record<string, any>;
}

/**
 * Unified Compliance Dashboard Data
 */
export interface ComplianceIntelligenceDashboard {
  // Overview
  summary: {
    totalClients: number;
    overdueTasks: number;
    missingDocuments: number;
    complianceGaps: number;
    billingAnomalies: number;
    stageTransitions: number;
    agentCount: number;
    automationFailures: number;
    syncErrors: number;
  };
  
  // Real-time scoring
  complianceScores: {
    overall: number;
    byClient: Array<{ clientId: string; clientName: string; score: ComplianceScore }>;
    byAgent: AgentPerformanceScore[];
    byStage: Array<{ stage: string; score: number }>;
  };
  
  // Heatmap
  heatmap: {
    zones: Array<{
      zone: HeatmapZone;
      count: number;
      items: Array<{ clientId: string; clientName: string; stage: string; reason: string }>;
    }>;
  };
  
  // Agent performance
  agentPerformance: AgentPerformanceScore[];
  
  // Risk indicators
  riskIndicators: PipelineRiskIndicator[];
  
  // Timeline
  timeline: ComplianceTimelineEntry[];
  
  // HSE integration
  hseState: {
    overall: "nominal" | "elevated" | "degraded" | "critical";
    subsystems: Record<string, {
      load: number;
      errors: number;
      status: "nominal" | "elevated" | "degraded" | "critical";
    }>;
    vectors: {
      risk: number;
      pressure: number;
    };
  };
  
  // UOI integration
  uoiSignals: {
    recent: Array<{
      type: string;
      source: string;
      priority: string;
      timestamp: string;
    }>;
    active: number;
  };
}

/**
 * Calculate compliance score for a client
 */
async function calculateClientComplianceScore(clientId: string): Promise<ComplianceScore> {
  const factors = {
    positive: [] as string[],
    negative: [] as string[]
  };
  
  let taskCompletion = 100;
  let documentStatus = 100;
  let billingHealth = 100;
  let interactionFrequency = 100;
  let stageVelocity = 100;
  let automationSuccess = 100;
  let errorVolume = 100;
  
  try {
    const base = getAirtableBase();
    
    // Task completion
    const tasks = await base("Tasks")
      .select({
        filterByFormula: `{Client} = '${clientId}'`,
        maxRecords: 100
      })
      .all();
    
    if (tasks.length > 0) {
      const completed = tasks.filter(t => (t.fields as any).Status === "Completed" || (t.fields as any).Status === "Done").length;
      taskCompletion = (completed / tasks.length) * 100;
      
      if (taskCompletion < 70) {
        factors.negative.push(`Low task completion: ${taskCompletion.toFixed(0)}%`);
      } else {
        factors.positive.push(`Good task completion: ${taskCompletion.toFixed(0)}%`);
      }
    }
    
    // Billing health
    const billingStats = await getBillingStatistics({ clientId });
    if (billingStats.overdueCount > 0) {
      billingHealth = Math.max(0, 100 - (billingStats.overdueCount * 20));
      factors.negative.push(`${billingStats.overdueCount} overdue billing items`);
    } else {
      factors.positive.push("No overdue billing");
    }
    
    // Interaction frequency
    const interactionStats = await getInteractionStatistics({ clientId });
    if (interactionStats.recentActivity === 0) {
      interactionFrequency = 50;
      factors.negative.push("No recent interactions (7 days)");
    } else if (interactionStats.recentActivity >= 3) {
      factors.positive.push(`Active: ${interactionStats.recentActivity} interactions in last 7 days`);
    }
    
    // Error volume
    const complianceStats = await getComplianceStatistics({ clientId });
    if (complianceStats.recentErrors > 0) {
      errorVolume = Math.max(0, 100 - (complianceStats.recentErrors * 15));
      factors.negative.push(`${complianceStats.recentErrors} recent errors`);
    }
    
    // Calculate overall score (weighted average)
    const overall = (
      taskCompletion * 0.25 +
      documentStatus * 0.15 +
      billingHealth * 0.20 +
      interactionFrequency * 0.15 +
      stageVelocity * 0.10 +
      automationSuccess * 0.10 +
      errorVolume * 0.05
    );
    
    return {
      overall: Math.round(overall),
      taskCompletion: Math.round(taskCompletion),
      documentStatus: Math.round(documentStatus),
      billingHealth: Math.round(billingHealth),
      interactionFrequency: Math.round(interactionFrequency),
      stageVelocity: Math.round(stageVelocity),
      automationSuccess: Math.round(automationSuccess),
      errorVolume: Math.round(errorVolume),
      factors
    };
  } catch (error) {
    console.error("[Compliance Intelligence] Failed to calculate score:", error);
    return {
      overall: 0,
      taskCompletion: 0,
      documentStatus: 0,
      billingHealth: 0,
      interactionFrequency: 0,
      stageVelocity: 0,
      automationSuccess: 0,
      errorVolume: 0,
      factors
    };
  }
}

/**
 * Calculate agent performance score
 */
async function calculateAgentPerformanceScore(agentId: string): Promise<AgentPerformanceScore> {
  try {
    const base = getAirtableBase();
    
    // Get agent's clients
    const clients = await base("Clients")
      .select({
        filterByFormula: `OR({Agent} = '${agentId}', {Assigned To} = '${agentId}')`,
        maxRecords: 1000
      })
      .all();
    
    const clientIds = clients.map(c => c.id);
    
    // Get tasks
    const tasks = await base("Tasks")
      .select({
        filterByFormula: `OR(${clientIds.map(id => `{Client} = '${id}'`).join(", ")})`,
        maxRecords: 1000
      })
      .all();
    
    const completed = tasks.filter(t => (t.fields as any).Status === "Completed" || (t.fields as any).Status === "Done").length;
    const taskCompletionRate = tasks.length > 0 ? (completed / tasks.length) * 100 : 100;
    
    // Get interactions
    const interactionStats = await getInteractionStatistics({ agentId });
    
    // Get billing impact
    const billingStats = await getBillingStatistics({ agentId });
    
    // Calculate compliance score (average of client scores)
    let complianceScore = 100;
    if (clientIds.length > 0) {
      const scores = await Promise.all(
        clientIds.slice(0, 10).map(id => calculateClientComplianceScore(id))
      );
      complianceScore = scores.reduce((sum, s) => sum + s.overall, 0) / scores.length;
    }
    
    return {
      agentId,
      agentName: agentId, // Would fetch from Users table in production
      complianceScore: Math.round(complianceScore),
      taskCompletionRate: Math.round(taskCompletionRate),
      interactionVolume: interactionStats.total,
      billingImpact: billingStats.totalRevenue,
      stageVelocity: 0, // Would calculate from stage transitions
      errorRate: 0, // Would calculate from errors
      clientsManaged: clientIds.length,
      recentActivity: interactionStats.recentActivity
    };
  } catch (error) {
    console.error("[Compliance Intelligence] Failed to calculate agent score:", error);
    return {
      agentId,
      agentName: agentId,
      complianceScore: 0,
      taskCompletionRate: 0,
      interactionVolume: 0,
      billingImpact: 0,
      stageVelocity: 0,
      errorRate: 0,
      clientsManaged: 0,
      recentActivity: 0
    };
  }
}

/**
 * Detect pipeline risk indicators
 */
async function detectPipelineRisks(): Promise<PipelineRiskIndicator[]> {
  const risks: PipelineRiskIndicator[] = [];
  
  try {
    const base = getAirtableBase();
    const clients = await base("Clients").select({ maxRecords: 1000 }).all();
    
    for (const client of clients.slice(0, 50)) { // Limit for performance
      const clientId = client.id;
      const fields = client.fields as any;
      const clientName = fields.Name || "Unknown Client";
      const stage = fields.Status || "Unknown";
      
      // Check for stalled clients (no interactions in 30 days)
      const interactions = await getClientInteractions(clientId, {
        limit: 1,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      if (interactions.length === 0 && stage !== "Active" && stage !== "Closed") {
        risks.push({
          clientId,
          clientName,
          stage,
          riskType: "stalled",
          severity: "medium",
          description: "No interactions in last 30 days"
        });
      }
      
      // Check for billing anomalies
      const billingStats = await getBillingStatistics({ clientId });
      if (billingStats.overdueCount > 0) {
        risks.push({
          clientId,
          clientName,
          stage,
          riskType: "billing_anomaly",
          severity: billingStats.overdueCount > 2 ? "high" : "medium",
          description: `${billingStats.overdueCount} overdue billing items`,
          metadata: { overdueAmount: billingStats.overdueAmount }
        });
      }
      
      // Check for low interaction clients
      const interactionStats = await getInteractionStatistics({ clientId });
      if (interactionStats.recentActivity === 0 && stage !== "Active" && stage !== "Closed") {
        risks.push({
          clientId,
          clientName,
          stage,
          riskType: "low_interaction",
          severity: "low",
          description: "No recent interactions"
        });
      }
    }
    
    return risks.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  } catch (error) {
    console.error("[Compliance Intelligence] Failed to detect risks:", error);
    return [];
  }
}

/**
 * Build compliance timeline
 */
async function buildComplianceTimeline(limit: number = 100): Promise<ComplianceTimelineEntry[]> {
  const timeline: ComplianceTimelineEntry[] = [];
  
  try {
    // Get compliance events
    const complianceEvents = await queryComplianceEvents({ limit });
    
    for (const event of complianceEvents) {
      timeline.push({
        id: event.id || `compliance-${Date.now()}`,
        timestamp: event.timestamp,
        type: event.category === "interaction" ? "interaction" :
              event.category === "billing" ? "billing" :
              event.category === "pipeline" ? "stage_transition" :
              event.category === "automation" ? "automation" :
              event.category === "error" ? "error" :
              "compliance",
        category: event.category,
        description: event.description,
        clientId: event.clientId,
        agentId: event.agentId,
        stage: event.stage,
        metadata: event.metadata
      });
    }
    
    // Sort by timestamp (newest first)
    return timeline.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error("[Compliance Intelligence] Failed to build timeline:", error);
    return [];
  }
}

/**
 * Build compliance heatmap
 */
function buildComplianceHeatmap(
  clientScores: Array<{ clientId: string; clientName: string; score: ComplianceScore }>,
  risks: PipelineRiskIndicator[]
): ComplianceIntelligenceDashboard["heatmap"] {
  const zones = {
    critical: [] as Array<{ clientId: string; clientName: string; stage: string; reason: string }>,
    elevated: [] as Array<{ clientId: string; clientName: string; stage: string; reason: string }>,
    nominal: [] as Array<{ clientId: string; clientName: string; stage: string; reason: string }>,
    optimal: [] as Array<{ clientId: string; clientName: string; stage: string; reason: string }>
  };
  
  // Categorize by score
  for (const { clientId, clientName, score } of clientScores) {
    const risk = risks.find(r => r.clientId === clientId);
    const stage = risk?.stage || "Unknown";
    
    if (score.overall < 50 || risk?.severity === "critical") {
      zones.critical.push({
        clientId,
        clientName,
        stage,
        reason: `Score: ${score.overall}, ${risk?.description || "Low compliance score"}`
      });
    } else if (score.overall < 70 || risk?.severity === "high") {
      zones.elevated.push({
        clientId,
        clientName,
        stage,
        reason: `Score: ${score.overall}, ${risk?.description || "Moderate compliance score"}`
      });
    } else if (score.overall < 85) {
      zones.nominal.push({
        clientId,
        clientName,
        stage,
        reason: `Score: ${score.overall}`
      });
    } else {
      zones.optimal.push({
        clientId,
        clientName,
        stage,
        reason: `Score: ${score.overall}`
      });
    }
  }
  
  return {
    zones: [
      { zone: "critical", count: zones.critical.length, items: zones.critical },
      { zone: "elevated", count: zones.elevated.length, items: zones.elevated },
      { zone: "nominal", count: zones.nominal.length, items: zones.nominal },
      { zone: "optimal", count: zones.optimal.length, items: zones.optimal }
    ]
  };
}

/**
 * Get unified compliance intelligence dashboard
 */
export async function getComplianceIntelligenceDashboard(
  options: {
    clientId?: string;
    agentId?: string;
    limit?: number;
  } = {}
): Promise<ComplianceIntelligenceDashboard> {
  const { clientId, agentId, limit = 100 } = options;
  
  try {
    const base = getAirtableBase();
    
    // Get summary data
    const clients = await base("Clients").select({ maxRecords: 1000 }).all();
    const tasks = await base("Tasks").select({ maxRecords: 1000 }).all();
    const now = new Date();
    const overdueTasks = tasks.filter(t => {
      const fields = t.fields as any;
      const dueDate = fields["Due Date"];
      if (!dueDate) return false;
      return new Date(dueDate) < now && fields.Status !== "Done" && fields.Status !== "Cancelled";
    });
    
    // Get compliance statistics
    const complianceStats = await getComplianceStatistics({ clientId, agentId });
    
    // Get billing statistics
    const billingStats = await getBillingStatistics({ clientId, agentId });
    
    // Get interaction statistics
    const interactionStats = await getInteractionStatistics({ clientId, agentId });
    
    // Calculate client scores
    const clientScores: Array<{ clientId: string; clientName: string; score: ComplianceScore }> = [];
    const clientsToScore = clientId 
      ? clients.filter(c => c.id === clientId)
      : clients.slice(0, 50); // Limit for performance
    
    for (const client of clientsToScore) {
      const score = await calculateClientComplianceScore(client.id);
      clientScores.push({
        clientId: client.id,
        clientName: (client.fields as any).Name || "Unknown Client",
        score
      });
    }
    
    // Calculate agent scores
    const agentScores: AgentPerformanceScore[] = [];
    if (agentId) {
      agentScores.push(await calculateAgentPerformanceScore(agentId));
    } else {
      // Get all agents (simplified - would fetch from Users table)
      const agentIds = new Set<string>();
      tasks.forEach(t => {
        const assignee = (t.fields as any).Assignee;
        if (assignee) agentIds.add(assignee);
      });
      
      for (const agentId of Array.from(agentIds).slice(0, 10)) {
        agentScores.push(await calculateAgentPerformanceScore(agentId));
      }
    }
    
    // Detect risks
    const risks = await detectPipelineRisks();
    
    // Build timeline
    const timeline = await buildComplianceTimeline(limit);
    
    // Build heatmap
    const heatmap = buildComplianceHeatmap(clientScores, risks);
    
    // Get HSE state
    const hseState = getGlobalState();
    const hseOverall = hseState 
      ? (hseState.vectors.risk.aggregate_risk > 0.7 ? "critical" :
         hseState.vectors.risk.aggregate_risk > 0.5 ? "degraded" :
         hseState.vectors.pressure.aggregate_pressure > 0.7 ? "elevated" :
         "nominal")
      : "nominal";
    
    // Get UOI signals
    const uoiSignals = getPendingSignals();
    
    // Calculate overall compliance score
    const overallScore = clientScores.length > 0
      ? clientScores.reduce((sum, c) => sum + c.score.overall, 0) / clientScores.length
      : 100;
    
    return {
      summary: {
        totalClients: clients.length,
        overdueTasks: overdueTasks.length,
        missingDocuments: 0, // Would calculate from document requirements
        complianceGaps: risks.length,
        billingAnomalies: billingStats.overdueCount,
        stageTransitions: complianceStats.byEventType["stage_transition"] || 0,
        agentCount: agentScores.length,
        automationFailures: complianceStats.byEventType["automation_failure"] || 0,
        syncErrors: complianceStats.byEventType["sync_error"] || 0
      },
      complianceScores: {
        overall: Math.round(overallScore),
        byClient: clientScores,
        byAgent: agentScores,
        byStage: [] // Would calculate from stage data
      },
      heatmap,
      agentPerformance: agentScores,
      riskIndicators: risks,
      timeline,
      hseState: {
        overall: hseOverall as any,
        subsystems: hseState ? Object.entries(hseState.subsystems).reduce((acc, [name, health]) => {
          acc[name] = {
            load: health.load,
            errors: health.errors,
            status: (health.errors > 10 ? "critical" :
                    health.load > 0.8 ? "elevated" :
                    health.errors > 5 ? "degraded" :
                    "nominal") as any
          };
          return acc;
        }, {} as Record<string, any>) : {},
        vectors: {
          risk: hseState?.vectors.risk.aggregate_risk || 0,
          pressure: hseState?.vectors.pressure.aggregate_pressure || 0
        }
      },
      uoiSignals: {
        recent: uoiSignals.slice(0, 20).map(s => ({
          type: s.type,
          source: s.source,
          priority: s.priority,
          timestamp: s.timestamp
        })),
        active: uoiSignals.length
      }
    };
  } catch (error: any) {
    console.error("[Compliance Intelligence] Failed to build dashboard:", error);
    throw error;
  }
}
