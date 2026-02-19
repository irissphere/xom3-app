// Broadcast Engine - Multi-Agent Collaboration: Performance Tracker
// Logs who did what, when, and how effective

import { AgentAction } from "../agent-workflow/action";
import { AssignmentMatrix } from "./assignment-matrix";
import { TaskSync } from "./task-sync";
import { EscalationEvent } from "./escalation-engine";
import { CollaborationMessage } from "./collaboration-chat";
import { ConversionData } from "../agent-workflow/close";

export interface AgentPerformanceLog {
  agentId: string;
  leadId: string;
  actions: AgentAction[];
  assignments: AssignmentMatrix[];
  syncs: TaskSync[];
  escalations: EscalationEvent[];
  collaborationMessages: CollaborationMessage[];
  conversions: ConversionData[];
  metrics: {
    totalActions: number;
    totalLeads: number;
    totalConversions: number;
    avgResponseTime: number; // Minutes
    avgConversionTime: number; // Minutes
    collaborationScore: number; // 0-100
    effectiveness: number; // 0-100
  };
  period: {
    start: string;
    end: string;
  };
}

/**
 * Track agent action
 */
export function trackAgentAction(
  action: AgentAction,
  existingLogs: AgentPerformanceLog[]
): AgentPerformanceLog[] {
  const agentLog = existingLogs.find(log => 
    log.agentId === action.agentId &&
    new Date(log.period.end) > new Date()
  );
  
  if (agentLog) {
    agentLog.actions.push(action);
    agentLog.metrics.totalActions++;
    agentLog.metrics.totalLeads = new Set(agentLog.actions.map(a => a.leadId)).size;
  } else {
    // Create new log
    const newLog: AgentPerformanceLog = {
      agentId: action.agentId,
      leadId: action.leadId,
      actions: [action],
      assignments: [],
      syncs: [],
      escalations: [],
      collaborationMessages: [],
      conversions: [],
      metrics: {
        totalActions: 1,
        totalLeads: 1,
        totalConversions: 0,
        avgResponseTime: 0,
        avgConversionTime: 0,
        collaborationScore: 0,
        effectiveness: 0
      },
      period: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    };
    
    existingLogs.push(newLog);
  }
  
  return existingLogs;
}

/**
 * Track conversion
 */
export function trackConversion(
  conversion: ConversionData,
  existingLogs: AgentPerformanceLog[]
): AgentPerformanceLog[] {
  const agentLog = existingLogs.find(log => 
    log.agentId === conversion.agentId &&
    new Date(log.period.end) > new Date()
  );
  
  if (agentLog) {
    agentLog.conversions.push(conversion);
    agentLog.metrics.totalConversions++;
    
    // Update conversion time
    if (conversion.conversionTime) {
      const conversionTimes = agentLog.conversions
        .filter(c => c.conversionTime)
        .map(c => c.conversionTime || 0);
      agentLog.metrics.avgConversionTime = conversionTimes.length > 0
        ? conversionTimes.reduce((sum, t) => sum + t, 0) / conversionTimes.length
        : 0;
    }
  }
  
  return existingLogs;
}

/**
 * Calculate collaboration score
 */
export function calculateCollaborationScore(
  agentId: string,
  logs: AgentPerformanceLog[],
  threads: Array<{ agentIds: string[]; messages: CollaborationMessage[] }>
): number {
  const agentLog = logs.find(log => 
    log.agentId === agentId &&
    new Date(log.period.end) > new Date()
  );
  
  if (!agentLog) {
    return 0;
  }
  
  let score = 0;
  
  // Collaboration messages sent
  const messagesSent = agentLog.collaborationMessages.length;
  score += Math.min(20, messagesSent * 2); // Max 20 points
  
  // Assist requests responded to
  const assistRequests = threads
    .flatMap(t => t.messages)
    .filter(m => 
      m.type === "assist_request" && 
      m.toAgentIds.includes(agentId)
    ).length;
  score += Math.min(30, assistRequests * 5); // Max 30 points
  
  // Handoffs coordinated
  const handoffs = agentLog.collaborationMessages.filter(m => m.type === "handoff").length;
  score += Math.min(25, handoffs * 5); // Max 25 points
  
  // Escalations handled
  const escalationsHandled = agentLog.escalations.filter(e => 
    e.toAgentId === agentId && e.resolvedAt
  ).length;
  score += Math.min(25, escalationsHandled * 5); // Max 25 points
  
  return Math.min(100, score);
}

/**
 * Calculate effectiveness
 */
export function calculateEffectiveness(
  agentLog: AgentPerformanceLog
): number {
  let effectiveness = 0;
  
  // Conversion rate
  const conversionRate = agentLog.metrics.totalLeads > 0
    ? agentLog.metrics.totalConversions / agentLog.metrics.totalLeads
    : 0;
  effectiveness += conversionRate * 50; // Max 50 points
  
  // Response time (faster = better)
  const responseTimeScore = agentLog.metrics.avgResponseTime > 0
    ? Math.max(0, 30 - agentLog.metrics.avgResponseTime) / 30 * 30 // Max 30 points
    : 0;
  effectiveness += responseTimeScore;
  
  // Collaboration score
  effectiveness += agentLog.metrics.collaborationScore * 0.2; // Max 20 points
  
  return Math.min(100, effectiveness);
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(
  agentId: string,
  logs: AgentPerformanceLog[],
  threads: Array<{ agentIds: string[]; messages: CollaborationMessage[] }>
): AgentPerformanceLog {
  const agentLog = logs.find(log => 
    log.agentId === agentId &&
    new Date(log.period.end) > new Date()
  ) || {
    agentId,
    leadId: "",
    actions: [],
    assignments: [],
    syncs: [],
    escalations: [],
    collaborationMessages: [],
    conversions: [],
    metrics: {
      totalActions: 0,
      totalLeads: 0,
      totalConversions: 0,
      avgResponseTime: 0,
      avgConversionTime: 0,
      collaborationScore: 0,
      effectiveness: 0
    },
    period: {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  };
  
  // Calculate metrics
  agentLog.metrics.collaborationScore = calculateCollaborationScore(agentId, logs, threads);
  agentLog.metrics.effectiveness = calculateEffectiveness(agentLog);
  
  return agentLog;
}

/**
 * Get team performance summary
 */
export function getTeamPerformanceSummary(
  logs: AgentPerformanceLog[]
): {
  totalAgents: number;
  totalActions: number;
  totalLeads: number;
  totalConversions: number;
  avgCollaborationScore: number;
  avgEffectiveness: number;
  topPerformers: Array<{
    agentId: string;
    effectiveness: number;
    conversions: number;
  }>;
} {
  const activeLogs = logs.filter(log => new Date(log.period.end) > new Date());
  
  const totalAgents = new Set(activeLogs.map(log => log.agentId)).size;
  const totalActions = activeLogs.reduce((sum, log) => sum + log.metrics.totalActions, 0);
  const totalLeads = new Set(activeLogs.flatMap(log => log.actions.map(a => a.leadId))).size;
  const totalConversions = activeLogs.reduce((sum, log) => sum + log.metrics.totalConversions, 0);
  
  const avgCollaborationScore = activeLogs.length > 0
    ? activeLogs.reduce((sum, log) => sum + log.metrics.collaborationScore, 0) / activeLogs.length
    : 0;
  
  const avgEffectiveness = activeLogs.length > 0
    ? activeLogs.reduce((sum, log) => sum + log.metrics.effectiveness, 0) / activeLogs.length
    : 0;
  
  const topPerformers = activeLogs
    .map(log => ({
      agentId: log.agentId,
      effectiveness: log.metrics.effectiveness,
      conversions: log.metrics.totalConversions
    }))
    .sort((a, b) => b.effectiveness - a.effectiveness)
    .slice(0, 5);
  
  return {
    totalAgents,
    totalActions,
    totalLeads,
    totalConversions,
    avgCollaborationScore,
    avgEffectiveness,
    topPerformers
  };
}
