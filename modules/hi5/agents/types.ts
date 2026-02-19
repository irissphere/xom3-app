/**
 * HI5 Agent Types
 * Type definitions for HI5-specific agents
 */

export interface OpenAIUsage {
  callsThisMonth: number;
  tokensUsed: number;
  costThisMonth: number;
  averageTokensPerCall: number;
  efficiency: number; // 0-1
}

export interface ApiCallMetrics {
  callsThisMonth: number;
  successRate: number;
  averageResponseTime: number;
  costThisMonth: number;
  errorRate: number;
}

export interface LeadQualityMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  averageLeadScore: number;
  sourceDistribution: Record<string, number>;
}

export interface SystemHealthMetrics {
  uptime: number;
  averageResponseTime: number;
  errorRate: number;
  activeWorkflows: number;
  queueDepth: number;
}

export interface CostBreakdown {
  infrastructure: number;
  aiProcessing: number;
  dataEnrichment: number;
  workflowAutomation: number;
  total: number;
}

export interface OptimizationResult {
  optimizationId: string;
  applied: boolean;
  impact: number; // percentage savings
  confidence: number; // 0-1
  description: string;
  appliedAt?: string;
}

export interface PerformanceBaseline {
  targetMetrics: {
    maxMonthlyCost: number;
    minLeadQuality: number;
    maxResponseTime: number;
    minUptime: number;
  };
  currentMetrics: {
    monthlyCost: number;
    leadQuality: number;
    responseTime: number;
    uptime: number;
  };
}


