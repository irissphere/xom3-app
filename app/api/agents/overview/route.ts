/**
 * Agents Overview API
 * Get status of all agents and sovereigns
 * 
 * GET /api/agents/overview
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  SOVEREIGNS, 
  AGENTS, 
  getAllSovereigns,
  getAllAgents,
  getAgentsBySovereign,
  getSovereignStats 
} from '@/lib/agents/extended-registry';
import { 
  getAllAgentStates, 
  getExecutionHistory 
} from '@/lib/agents/agent-engine';

export async function GET(request: NextRequest) {
  try {
    const allStates = getAllAgentStates();
    const allAgents = getAllAgents();
    const allSovereigns = getAllSovereigns();
    const recentExecutions = getExecutionHistory(50);
    const sovereignStats = getSovereignStats();

    // Calculate summary stats
    const activeAgents = allStates.filter(s => s.status === 'active').length;
    const idleAgents = allStates.filter(s => s.status === 'idle').length;
    const errorAgents = allStates.filter(s => s.status === 'error').length;
    const disabledAgents = allStates.filter(s => s.status === 'disabled').length;

    const totalExecutions = recentExecutions.length;
    const successfulExecutions = recentExecutions.filter(e => e.status === 'completed').length;
    const failedExecutions = recentExecutions.filter(e => e.status === 'failed').length;

    // Build sovereign summaries
    const sovereignSummaries = allSovereigns.map(sovereign => {
      const agents = getAgentsBySovereign(sovereign.id);
      const sovereignStates = allStates.filter(s => agents.some(a => a.id === s.id));
      
      return {
        id: sovereign.id,
        name: sovereign.name,
        icon: sovereign.icon,
        color: sovereign.color,
        targetRevenue: sovereign.targetRevenue,
        stats: {
          totalAgents: agents.length,
          active: sovereignStates.filter(s => s.status === 'active').length,
          idle: sovereignStates.filter(s => s.status === 'idle').length,
          error: sovereignStates.filter(s => s.status === 'error').length,
        },
        agents: agents.map(a => ({
          id: a.id,
          name: a.name,
          icon: a.icon,
          status: allStates.find(s => s.id === a.id)?.status || 'idle',
        })),
      };
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        totalSovereigns: allSovereigns.length,
        totalAgents: allAgents.length,
        agentsByStatus: {
          active: activeAgents,
          idle: idleAgents,
          error: errorAgents,
          disabled: disabledAgents,
        },
        executions: {
          total: totalExecutions,
          successful: successfulExecutions,
          failed: failedExecutions,
          successRate: totalExecutions > 0 
            ? Math.round((successfulExecutions / totalExecutions) * 100) 
            : 100,
        },
      },
      sovereigns: sovereignSummaries,
      recentExecutions: recentExecutions.slice(0, 20),
    });
  } catch (error) {
    console.error('Agents overview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents overview' },
      { status: 500 }
    );
  }
}























