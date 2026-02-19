import { NextResponse } from "next/server";
import type {
  AgentTriggerRequest,
  AgentTriggerResponse,
  AgentTriggerErrorResponse,
} from "@/lib/cockpit/agent-api-types";

function errorResponse(
  code: AgentTriggerErrorResponse["error"]["code"],
  message: string,
  extras?: Partial<AgentTriggerErrorResponse["error"]>
) {
  const body: AgentTriggerErrorResponse = {
    success: false,
    error: {
      code,
      message,
      retryable: false,
      ...extras,
    },
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: 400, headers: { "Cache-Control": "no-store" } });
}

async function executeAgent(agentId: string, reqBody: AgentTriggerRequest) {
  // Try Benefits resolver, then Health resolver.
  // Keep dynamic imports so this route doesn't pull modules into the route bundle.
  try {
    const benefits = await import("@/modules/benefits/agents/handlers");
    const res = await benefits.resolveBenefitsAgentHandler(agentId, reqBody.action, reqBody.payload);
    if (res) return res;
  } catch {
    // ignore
  }

  try {
    const health = await import("@/modules/healthcare/agents/handlers");
    const res = await health.resolveHealthAgentHandler(agentId, reqBody.action, reqBody.payload);
    if (res) return res;
  } catch {
    // ignore
  }

  return null;
}

export async function POST(request: Request, ctx: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await ctx.params;

  // Extract request ID from header for tracing
  const requestId = request.headers.get("x-request-id") || undefined;

  let body: AgentTriggerRequest;
  try {
    body = (await request.json()) as AgentTriggerRequest;
  } catch {
    return errorResponse("INVALID_PAYLOAD", "invalid_json");
  }

  const action = String(body?.action || "").trim();
  if (!action) return errorResponse("INVALID_ACTION", "missing_action");

  const nowIso = new Date().toISOString();

  const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (body?.options?.async === true) {
    return errorResponse("INVALID_ACTION", "async_not_supported", { executionId });
  }

  const start = Date.now();
  const result = await executeAgent(agentId, body);

  if (!result) {
    console.error(`[Agent API] Agent not found: ${agentId}`, { requestId, executionId, agentId });
    return errorResponse("AGENT_NOT_FOUND", `Unknown agent: ${agentId}`, { executionId, requestId });
  }

  if (!result.success) {
    const err: AgentTriggerErrorResponse = {
      success: false,
      error: {
        code: "EXECUTION_FAILED",
        message: result.message || "execution_failed",
        executionId,
        requestId,
        retryable: false,
      },
      agent: { id: agentId, status: "error" },
      timestamp: new Date().toISOString(),
    };
    console.error(`[Agent API] Execution failed: ${agentId}`, { requestId, executionId, agentId, error: result.message });
    return NextResponse.json(err, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  const duration = Date.now() - start;

  const response: AgentTriggerResponse = {
    success: true,
    execution: {
      executionId,
      agentId,
      status: "completed",
      result: result.result,
      startedAt: nowIso,
      completedAt: new Date().toISOString(),
      duration,
    },
    agent: {
      id: agentId,
      name: agentId,
      type: agentId.split("-")[0] || "agent",
      status: "active",
      load: 0,
    },
    decisions: result.decisions || [],
    message: result.message || `Agent executed: ${agentId}`,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}
