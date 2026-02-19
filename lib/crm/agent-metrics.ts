// Agent Performance Metrics Calculator
// Team optimization and performance tracking

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  leadsHandled: number;
  conversionRate: number; // Percentage
  tasksCompleted: number;
  appointmentsHeld: number;
  policiesWritten: number;
  renewalRetention: number; // Percentage
  averageResponseTime: number; // Hours
  totalRevenue?: number;
  activeClients: number;
  period: {
    start: string;
    end: string;
  };
}

export interface AgentMetricsFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  carrier?: string;
  policyType?: string;
  agentId?: string;
}

/**
 * Calculate agent performance metrics from raw data
 */
export function calculateAgentMetrics(
  rawData: {
    leads: number;
    conversions: number;
    tasks: number;
    appointments: number;
    policies: number;
    renewals: number;
    totalRenewals: number;
    responseTimes: number[];
    revenue?: number;
    activeClients: number;
  }
): Omit<AgentMetrics, "agentId" | "agentName" | "period"> {
  const conversionRate = rawData.leads > 0 
    ? (rawData.conversions / rawData.leads) * 100 
    : 0;

  const renewalRetention = rawData.totalRenewals > 0
    ? (rawData.renewals / rawData.totalRenewals) * 100
    : 0;

  const averageResponseTime = rawData.responseTimes.length > 0
    ? rawData.responseTimes.reduce((a, b) => a + b, 0) / rawData.responseTimes.length
    : 0;

  return {
    leadsHandled: rawData.leads,
    conversionRate: Math.round(conversionRate * 100) / 100,
    tasksCompleted: rawData.tasks,
    appointmentsHeld: rawData.appointments,
    policiesWritten: rawData.policies,
    renewalRetention: Math.round(renewalRetention * 100) / 100,
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    totalRevenue: rawData.revenue,
    activeClients: rawData.activeClients,
  };
}

/**
 * Get performance level based on metrics
 */
export function getPerformanceLevel(metrics: AgentMetrics): "excellent" | "good" | "fair" | "needs-improvement" {
  let score = 0;

  // Conversion rate (0-30 points)
  if (metrics.conversionRate >= 30) score += 30;
  else if (metrics.conversionRate >= 20) score += 20;
  else if (metrics.conversionRate >= 10) score += 10;

  // Renewal retention (0-25 points)
  if (metrics.renewalRetention >= 90) score += 25;
  else if (metrics.renewalRetention >= 75) score += 20;
  else if (metrics.renewalRetention >= 60) score += 15;
  else if (metrics.renewalRetention >= 50) score += 10;

  // Response time (0-20 points)
  if (metrics.averageResponseTime <= 2) score += 20;
  else if (metrics.averageResponseTime <= 4) score += 15;
  else if (metrics.averageResponseTime <= 8) score += 10;
  else if (metrics.averageResponseTime <= 24) score += 5;

  // Activity level (0-25 points)
  const activityScore = Math.min(25, (metrics.tasksCompleted + metrics.appointmentsHeld) / 10);
  score += activityScore;

  if (score >= 70) return "excellent";
  if (score >= 50) return "good";
  if (score >= 30) return "fair";
  return "needs-improvement";
}
