// Agent Signal Utility
// Agents emit signals into UOI so the cockpit + HSE can observe and route them.

export interface AgentSignalPayload {
  agentId: string;
  agentName?: string;
  laneId: string;
  signalType?: string;
  payload?: any;
  metadata?: any;
  success?: boolean;
  duration?: number;
  executionId?: string;
}

/**
 * Trigger agent signal into UOI
 * Closed-loop: Agent → UOI Signal → Cockpit/HSE → Workflow Sovereign (n8n) → Airtable
 */
export async function triggerAgentSignal(signal: AgentSignalPayload): Promise<void> {
  try {
    const { emitSignal } = await import("@/lib/uoi");
    emitSignal({
      source: "benefitscrm",
      type: `benefitscrm.${signal.laneId}.${signal.signalType || "agent_execution"}`,
      priority: signal.success === false ? "high" : "medium",
      payload: {
        agentId: signal.agentId,
        agentName: signal.agentName || signal.agentId,
        laneId: signal.laneId,
        signalType: signal.signalType || "agent_execution",
        payload: signal.payload || {},
        metadata: {
          ...(signal.metadata || {}),
          duration: signal.duration,
          executionId: signal.executionId,
          success: signal.success !== false,
        },
      },
    });
  } catch (error) {
    // Best-effort: do not fail agent execution due to signal emission issues.
    console.error("[Agent Signal] Error emitting signal:", error);
  }
}
