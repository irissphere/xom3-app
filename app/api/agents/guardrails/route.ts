// Agent Guardrails API
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dynamic imports to avoid build-time initialization issues
async function getAgentIdentity(id: string) {
  const { getAgentIdentity: getIdentity } = await import("@/lib/agents/identity");
  return getIdentity(id);
}

async function canMoveClientToStage(clientId: string, newStage: string, agent: any) {
  const { canMoveClientToStage: canMove } = await import("@/lib/agents/guardrails");
  return canMove(clientId, newStage, agent);
}

async function enforceStageTransition(clientId: string, newStage: string, agent: any) {
  const { enforceStageTransition: enforce } = await import("@/lib/agents/guardrails");
  return enforce(clientId, newStage, agent);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, clientId, newStage, agentId } = body;

    if (!action || !clientId || !agentId) {
      return NextResponse.json(
        { error: "action, clientId, and agentId required" },
        { status: 400 }
      );
    }

    const agent = await getAgentIdentity(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    if (action === "checkTransition") {
      if (!newStage) {
        return NextResponse.json(
          { error: "newStage required for checkTransition" },
          { status: 400 }
        );
      }

      const check = await canMoveClientToStage(clientId, newStage, agent);
      return NextResponse.json({ success: true, check });
    }

    if (action === "enforceTransition") {
      if (!newStage) {
        return NextResponse.json(
          { error: "newStage required for enforceTransition" },
          { status: 400 }
        );
      }

      const result = await enforceStageTransition(clientId, newStage, agent);
      return NextResponse.json({ success: result.success, check: result.check });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error checking guardrails:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
