"use client";

import Link from "next/link";
import type { OperatorDashboardContext } from "../page";
import { OperatorPanelFrame, PanelEmpty, PanelError, PostureChip, useOperatorPanel } from "./OperatorDashboardPanelKit";

type Task = {
  taskId: string;
  leadId: string;
  type: string;
  status: "pending" | "completed" | "overdue";
  dueAt: string;
  assignedTo: string | null;
  escalated?: boolean;
};

async function loadOverdue(ctx: OperatorDashboardContext): Promise<{ items: Task[] }> {
  const res = await fetch("/api/intakecrm/tasks?status=overdue", { headers: ctx.headers, cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(String(json?.error || "sla_overdue_load_failed"));
  const raw: Task[] = Array.isArray(json.items) ? json.items : [];
  return { items: raw };
}

function severityTone(t: Task) {
  if (t.escalated) return "error" as const;
  return "degraded" as const;
}

export default function SlaBreachPanel(props: { ctx: OperatorDashboardContext }) {
  const { state } = useOperatorPanel({
    ctx: props.ctx,
    panel: "sla_breaches",
    refreshMs: 3500,
    load: loadOverdue,
  });

  const overdue = (state.data?.items || [])
    .filter((t) => {
      if (props.ctx.role !== "agent") return true;
      if (!props.ctx.actorId) return true;
      return String(t.assignedTo || "") === props.ctx.actorId;
    })
    .slice()
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const escalatedCount = overdue.filter((t) => t.escalated).length;

  return (
    <OperatorPanelFrame
      title="SLA Breaches"
      hint={`overdue=${overdue.length} • escalated=${escalatedCount}`}
      right={
        <Link className="xom3-btn xom3-btnSecondary" href="/intakecrm/tasks">
          SLA surface
        </Link>
      }
    >
      {state.error ? <PanelError label="SLA degraded" error={state.error} /> : null}
      {!state.error && overdue.length === 0 ? <PanelEmpty label="No SLA breaches." /> : null}

      {!state.error && overdue.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {overdue.slice(0, 8).map((t) => (
            <div key={t.taskId} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>
                  {t.type} • <span className="xom3-subtle">{t.status}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <PostureChip label={t.escalated ? "ESCALATED" : "OVERDUE"} tone={severityTone(t)} />
                  <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                    due {new Date(t.dueAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                lead {t.leadId} • assignedTo {t.assignedTo || "—"}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </OperatorPanelFrame>
  );
}
