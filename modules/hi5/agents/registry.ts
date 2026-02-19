/**
 * HI5 Agents Registry
 * Registry of all HI5-specific agents with their configurations
 */

import {
  Hi5CostOptimizationAgent,
  Hi5UsageAnalyticsAgent,
  Hi5IntelligentCachingAgent,
  Hi5PerformanceMonitorAgent
} from './index';
import { AgentConfig } from '@/lib/agents/types';

export const HI5_AGENTS = {
  'hi5-cost-optimization': Hi5CostOptimizationAgent,
  'hi5-usage-analytics': Hi5UsageAnalyticsAgent,
  'hi5-caching-agent': Hi5IntelligentCachingAgent,
  'hi5-performance-monitor': Hi5PerformanceMonitorAgent,
};

export const HI5_AGENT_CONFIGS: Record<string, Partial<AgentConfig>> = {
  'hi5-cost-optimization': {
    sovereign: 'agents-sovereign',
    enabled: true,
    autoStart: true,
    schedule: '0 9 * * *', // Daily at 9 AM
  },
  'hi5-usage-analytics': {
    sovereign: 'agents-sovereign',
    enabled: true,
    autoStart: true,
    schedule: '0 */4 * * *', // Every 4 hours
  },
  'hi5-caching-agent': {
    sovereign: 'agents-sovereign',
    enabled: true,
    autoStart: true,
    schedule: '0 * * * *', // Every hour
  },
  'hi5-performance-monitor': {
    sovereign: 'agents-sovereign',
    enabled: true,
    autoStart: true,
    schedule: '*/5 * * * *', // Every 5 minutes
  },
};

export function getHi5AgentConfig(agentId: string): Partial<AgentConfig> | undefined {
  return HI5_AGENT_CONFIGS[agentId];
}

export function getAllHi5Agents(): Array<{ id: string; agent: any; config: Partial<AgentConfig> }> {
  return Object.entries(HI5_AGENTS).map(([id, agentClass]) => ({
    id,
    agent: agentClass,
    config: HI5_AGENT_CONFIGS[id] || {},
  }));
}


