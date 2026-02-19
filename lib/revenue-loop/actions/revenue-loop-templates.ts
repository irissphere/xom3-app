import type { RevenueLoopTriggerType } from "../triggers/revenue-loop-triggers";

export const Templates: Record<Exclude<RevenueLoopTriggerType, "lead_contacted">, string> = {
  lead_created: "A new lead just entered the lane. Momentum is building.",
  task_completed: "Follow-up completed. Staying sharp and responsive.",
  lead_closed: "Another win. The system is working.",
  task_overdue: "High demand. We're expanding the team.",
};

export function resolveRevenueLoopTemplate(templateId: string): string | null {
  const v = (Templates as any)[templateId];
  return typeof v === "string" ? v : null;
}

export function renderRevenueLoopTemplate(template: string, vars: Record<string, string | number | null | undefined>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, String(v ?? ""));
  }
  return out;
}
