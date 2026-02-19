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
  priority?: string;
};

async function loadTasks(ctx: OperatorDashboardContext): Promise<{ items: Task[] }> {
  const res = await fetch("/api/intakecrm/tasks?status=pending", { headers: ctx.headers, cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(String(json?.error || "tasks_load_failed"));
  const raw: Task[] = Array.isArray(json.items) ? json.items : [];
  return { items: raw };
}

function byAssignee(items: Task[]) {
  const map = new Map<string, number>();
  for (const t of items) {
    const k = String(t.assignedTo || "unassigned");
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
}

export default function TaskQueuePanel(props: { ctx: OperatorDashboardContext }) {
  const { state, refresh } = useOperatorPanel({
    ctx: props.ctx,
    panel: "task_queue",
    refreshMs: 3200,
    load: loadTasks,
  });

  const items = (state.data?.items || [])
    .filter((t) => {
      if (props.ctx.role !== "agent") return true;
      if (!props.ctx.actorId) return true;
      return String(t.assignedTo || "") === props.ctx.actorId;
    })
    .slice()
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const workload = byAssignee(items);

  const completeTask = async (taskId: string) => {
    await fetch(`/api/intakecrm/tasks/${encodeURIComponent(taskId)}/complete`, { method: "POST", headers: props.ctx.headers }).catch(() => {});
    await refresh();
  };

  return (
    <OperatorPanelFrame
      title="Task Queue"
      hint={`pending=${items.length} • workload=${workload.length ? workload.map(([k, v]) => `${k}:${v}`).join(" ") : "—"}`}
      right={
        <Link className="xom3-btn xom3-btnSecondary" href="/intakecrm/tasks">
          Open tasks
        </Link>
      }
    >
      {state.error ? <PanelError label="Tasks degraded" error={state.error} /> : null}
      {!state.error && items.length === 0 ? <PanelEmpty label="No pending tasks." /> : null}

      {!state.error && items.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {items.slice(0, 8).map((t) => (
            <div key={t.taskId} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>
                  {t.type} • <span className="xom3-subtle">{t.status}</span>
                  {t.escalated ? " • escalated" : ""}
                </div>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                  due {new Date(t.dueAt).toLocaleString()} • assignedTo {t.assignedTo || "—"}
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <Link className="xom3-btn xom3-btnSecondary" href={`/intakecrm/leads/${encodeURIComponent(t.leadId)}`}>
                  View lead
                </Link>
                <button className="xom3-btn xom3-btnPrimary" onClick={() => completeTask(t.taskId)}>
                  Complete
                </button>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {workload.map(([k, v]) => (
              <PostureChip key={k} label={`${k}:${v}`} tone={k === "unassigned" ? "degraded" : "neutral"} />
            ))}
          </div>
        </div>
      ) : null}
    </OperatorPanelFrame>
  );
}
