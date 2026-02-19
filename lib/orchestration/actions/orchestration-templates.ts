export function renderOrchestrationTemplate(templateId: string, ctx: { tenantId: string; leadId?: string; taskId?: string; eventType: string }) {
  const id = String(templateId || "").trim();
  const lead = ctx.leadId ? ` lead=${ctx.leadId}` : "";
  const task = ctx.taskId ? ` task=${ctx.taskId}` : "";

  if (id === "welcome_message") {
    return `Welcome — intake received.${lead} (tenant=${ctx.tenantId})`;
  }
  if (id === "operator_in_action") {
    return `Operator in action: task completed.${lead}${task} (tenant=${ctx.tenantId})`;
  }
  if (id === "revenue_loop_nudge") {
    return `Revenue loop fired (${ctx.eventType}). Re-engage.${lead} (tenant=${ctx.tenantId})`;
  }

  // Default: stable, truthful stub (no hallucinated content).
  return `Orchestration template=${id || "unknown"} event=${ctx.eventType}.${lead}${task} (tenant=${ctx.tenantId})`;
}
