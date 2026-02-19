/**
 * Sovereign Agent API
 * Execute actions on all agents within a sovereign
 * 
 * GET  /api/agents/sovereign/{sovereignId} - Get sovereign status
 * POST /api/agents/sovereign/{sovereignId} - Execute sovereign action
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  SOVEREIGNS, 
  getAgentsBySovereign,
  SovereignId 
} from '@/lib/agents/extended-registry';
import { 
  executeSovereign, 
  getAllAgentStates,
  getSovereignExecutions 
} from '@/lib/agents/agent-engine';

interface RouteParams {
  params: Promise<{ sovereignId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sovereignId } = await params;
    
    if (!SOVEREIGNS[sovereignId as SovereignId]) {
      return NextResponse.json(
        { error: `Sovereign not found: ${sovereignId}` },
        { status: 404 }
      );
    }

    const sovereign = SOVEREIGNS[sovereignId as SovereignId];
    const agents = getAgentsBySovereign(sovereignId as SovereignId);
    const allStates = getAllAgentStates();
    const agentStates = allStates.filter(s => agents.some(a => a.id === s.id));
    const recentExecutions = getSovereignExecutions(sovereignId as SovereignId, 20);

    return NextResponse.json({
      sovereign: {
        id: sovereign.id,
        name: sovereign.name,
        description: sovereign.description,
        color: sovereign.color,
        icon: sovereign.icon,
        targetRevenue: sovereign.targetRevenue,
      },
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        title: agent.title,
        icon: agent.icon,
        color: agent.color,
        state: agentStates.find(s => s.id === agent.id) || {
          status: 'idle',
          metrics: { runsToday: 0, runsTotal: 0 },
        },
      })),
      recentExecutions,
      stats: {
        totalAgents: agents.length,
        activeAgents: agentStates.filter(s => s.status === 'active').length,
        errorAgents: agentStates.filter(s => s.status === 'error').length,
        totalExecutions: recentExecutions.length,
      },
    });
  } catch (error) {
    console.error('Sovereign GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sovereign status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sovereignId } = await params;
    const body = await request.json();
    const { action, payload } = body;

    if (!SOVEREIGNS[sovereignId as SovereignId]) {
      return NextResponse.json(
        { error: `Sovereign not found: ${sovereignId}` },
        { status: 404 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const results = await executeSovereign(sovereignId as SovereignId, action, payload);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failed === 0,
      sovereignId,
      action,
      summary: {
        total: results.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error('Sovereign POST error:', error);
    return NextResponse.json(
      { error: 'Failed to execute sovereign action' },
      { status: 500 }
    );
  }
}























