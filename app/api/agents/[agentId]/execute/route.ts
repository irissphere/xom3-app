/**
 * Agent Execution API
 * Execute specific actions on individual agents
 * 
 * POST /api/agents/{agentId}/execute
 */

import { NextRequest, NextResponse } from 'next/server';
import { AGENTS } from '@/lib/agents/extended-registry';
import { executeAgent, getAgentState, getAgentExecutions } from '@/lib/agents/agent-engine';

interface RouteParams {
  params: Promise<{ agentId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const { action, payload, mode = 'direct', priority = 'normal' } = body;

    const agent = AGENTS[agentId];
    if (!agent) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const result = await executeAgent({
      agentId,
      action,
      payload,
      mode,
      priority,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Agent execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute agent action' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params;

    const agent = AGENTS[agentId];
    if (!agent) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }

    const state = getAgentState(agentId);
    const recentExecutions = getAgentExecutions(agentId, 10);

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        title: agent.title,
        domain: agent.domain,
        sovereign: agent.sovereign,
        icon: agent.icon,
        color: agent.color,
        capabilities: agent.capabilities,
        responsibilities: agent.responsibilities,
      },
      state,
      recentExecutions,
    });
  } catch (error) {
    console.error('Agent GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent status' },
      { status: 500 }
    );
  }
}























