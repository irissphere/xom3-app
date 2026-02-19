// Agent Performance Metrics
// Compliance score, task completion, interaction volume, revenue impact, stage velocity, error rate, HSE impact

import { getAgentTasks } from "./tasks";
import { AgentIdentity } from "./identity";

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

export interface AgentPerformanceMetrics {
  agentId: string;
  period: {
    start: string;
    end: string;
  };
  complianceScore: number; // 0-100
  taskCompletionRate: number; // 0-100
  interactionVolume: number;
  revenueImpact: number;
  stageVelocity: {
    averageDaysPerStage: number;
    fastestTransition: number;
    slowestTransition: number;
  };
  errorRate: number; // 0-100
  hseImpact: {
    signalsGenerated: number;
    stateUpdates: number;
    anomaliesDetected: number;
  };
}

/**
 * Calculate agent performance metrics
 */
export async function calculateAgentPerformance(
  agentId: string,
  period: { start: string; end: string },
  tenant?: string
): Promise<AgentPerformanceMetrics> {
  // Get all tasks
  const tasks = await getAgentTasks(agentId, undefined, tenant);
  const periodTasks = tasks.filter(task => {
    const taskDate = new Date(task.createdAt);
    return taskDate >= new Date(period.start) && taskDate <= new Date(period.end);
  });

  // Task completion rate
  const completedTasks = periodTasks.filter(t => t.status === "Done").length;
  const taskCompletionRate = periodTasks.length > 0
    ? (completedTasks / periodTasks.length) * 100
    : 0;

  // Get interactions
  const base = await getBase();
  let interactionQuery = base("Interactions").select({
    filterByFormula: `AND(
      FIND('${agentId}', {Created By}),
      IS_AFTER({Date}, '${period.start}'),
      IS_BEFORE({Date}, '${period.end}')
    )`,
  });
  if (tenant) {
    interactionQuery = base("Interactions").select({
      filterByFormula: `AND(
        FIND('${agentId}', {Created By}),
        {Tenant} = '${tenant}',
        IS_AFTER({Date}, '${period.start}'),
        IS_BEFORE({Date}, '${period.end}')
      )`,
    });
  }
  const interactions = await interactionQuery.all();
  const interactionVolume = interactions.length;

  // Get compliance logs
  const baseCompliance = await getBase();
  const complianceLogs = await baseCompliance("Compliance Logs")
    .select({
      filterByFormula: `AND(
        FIND('${agentId}', {Notes}),
        IS_AFTER({Date}, '${period.start}'),
        IS_BEFORE({Date}, '${period.end}')
      )`,
    })
    .all();

  // Calculate compliance score
  const approvedLogs = complianceLogs.filter((log: any) => log.fields.Status === "Approved").length;
  const totalLogs = complianceLogs.length;
  const complianceScore = totalLogs > 0
    ? (approvedLogs / totalLogs) * 100
    : 100; // Default to 100 if no logs

  // Get billing records linked to agent's clients
  const clientIds = new Set<string>();
  periodTasks.forEach(task => {
    if (task.clientId) clientIds.add(task.clientId);
  });

  let revenueImpact = 0;
  if (clientIds.size > 0) {
    const clientArray = Array.from(clientIds);
    const baseBilling = await getBase();
    const billingRecords = await baseBilling("Billing")
      .select({
        filterByFormula: `OR(${clientArray.map(id => `FIND('${id}', ARRAYJOIN({Client}))`).join(", ")})`,
      })
      .all();

    revenueImpact = billingRecords.reduce((sum: number, record: any) => {
      const amount = record.fields.Amount || 0;
      return sum + amount;
    }, 0);
  }

  // Calculate stage velocity (placeholder - would need stage transition logs)
  const stageVelocity = {
    averageDaysPerStage: 7,
    fastestTransition: 2,
    slowestTransition: 14,
  };

  // Calculate error rate (placeholder - would need error tracking)
  const errorRate = 0;

  // HSE impact (placeholder - would need HSE integration)
  const hseImpact = {
    signalsGenerated: 0,
    stateUpdates: 0,
    anomaliesDetected: 0,
  };

  return {
    agentId,
    period,
    complianceScore: Math.round(complianceScore * 100) / 100,
    taskCompletionRate: Math.round(taskCompletionRate * 100) / 100,
    interactionVolume,
    revenueImpact,
    stageVelocity,
    errorRate,
    hseImpact,
  };
}

/**
 * Get agent performance summary
 */
export async function getAgentPerformanceSummary(
  agentId: string,
  tenant?: string
): Promise<{
  today: Partial<AgentPerformanceMetrics>;
  week: Partial<AgentPerformanceMetrics>;
  month: Partial<AgentPerformanceMetrics>;
}> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [todayMetrics, weekMetrics, monthMetrics] = await Promise.all([
    calculateAgentPerformance(agentId, {
      start: today.toISOString(),
      end: now.toISOString(),
    }, tenant),
    calculateAgentPerformance(agentId, {
      start: weekAgo.toISOString(),
      end: now.toISOString(),
    }, tenant),
    calculateAgentPerformance(agentId, {
      start: monthAgo.toISOString(),
      end: now.toISOString(),
    }, tenant),
  ]);

  return {
    today: {
      taskCompletionRate: todayMetrics.taskCompletionRate,
      interactionVolume: todayMetrics.interactionVolume,
      complianceScore: todayMetrics.complianceScore,
    },
    week: {
      taskCompletionRate: weekMetrics.taskCompletionRate,
      interactionVolume: weekMetrics.interactionVolume,
      complianceScore: weekMetrics.complianceScore,
      revenueImpact: weekMetrics.revenueImpact,
    },
    month: {
      taskCompletionRate: monthMetrics.taskCompletionRate,
      interactionVolume: monthMetrics.interactionVolume,
      complianceScore: monthMetrics.complianceScore,
      revenueImpact: monthMetrics.revenueImpact,
      stageVelocity: monthMetrics.stageVelocity,
    },
  };
}
