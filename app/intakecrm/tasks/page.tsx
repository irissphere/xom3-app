"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";
import Link from "next/link";
import { useIntakecrmHeaders, useIntakecrmTenantPreference } from "../ui/intakecrm-tenant-preference";

type Task = {
  taskId: string;
  leadId: string;
  type: string;
  status: "pending" | "completed" | "overdue";
  priority: "normal" | "high";
  dueAt: string;
  assignedTo?: string;
  escalated?: boolean;
};

export default function IntakecrmTasksPage() {
  const { tenant, setTenant } = useIntakecrmTenantPreference();
  const headers = useIntakecrmHeaders({ tenant, actorLabel: "intakecrm_tasks" });
  const [items, setItems] = useState<Task[]>([]);
  const [status, setStatus] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (assignedTo) params.set("assignedTo", assignedTo);
      const res = await fetch(`/api/intakecrm/tasks?${params.toString()}`, { headers, cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) throw new Error(String(json?.error || "tasks_load_failed"));
      setItems(json.items || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "tasks_load_error");
    } finally {
      setLoading(false);
    }
  }, [assignedTo, headers, status]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => load().catch(() => {}), 3000);
    return () => clearInterval(interval);
  }, [load]);

  const counts = useMemo(() => {
    const c = { pending: 0, overdue: 0, completed: 0, escalated: 0 };
    for (const t of items) {
      c[t.status] += 1;
      if (t.escalated) c.escalated += 1;
    }
    return c;
  }, [items]);

  const completeTask = async (taskId: string) => {
    try {
      await fetch(`/api/intakecrm/tasks/${encodeURIComponent(taskId)}/complete`, { method: "POST", headers });
      await load();
    } catch {
      // ignore
    }
  };

  const evaluateSla = async () => {
    try {
      await fetch("/api/intakecrm/tasks/evaluate", { method: "POST", headers });
      await load();
    } catch {
      // ignore
    }
  };

  return (
    <SurfaceFrame
      title="intakecrm — Tasks"
      description="Follow-ups, SLA breaches, and completion."
      activation={counts.overdue > 0 ? "active" : "dormant"}
      links={[
        { href: "/intakecrm/dashboard", label: "Dashboard" },
        { href: "/intakecrm/leads", label: "Leads" },
      ]}
    >
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)" }}>
            TENANT
          </div>
          <input value={tenant} onChange={(e) => setTenant(e.target.value)} style={{ width: 220, ...inputStyle() }} />
          <div style={{ flex: 1 }} />
          <Link className="xom3-btn xom3-btnSecondary" href="/intakecrm">
            IntakeCRM
          </Link>
        </div>
      </div>

      {error ? (
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, color: "rgb(239,68,68)" }}>
          {error}
        </div>
      ) : null}

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
            pending: {counts.pending} • overdue: {counts.overdue} • escalated: {counts.escalated} • completed: {counts.completed} • total: {items.length}
            {loading ? " • loading…" : ""}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select
              aria-label="Task status filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: 190, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--text-0)" }}
            >
              <option value="">All statuses</option>
              <option value="pending">pending</option>
              <option value="overdue">overdue</option>
              <option value="completed">completed</option>
            </select>
            <input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="assignedTo (optional)"
              style={{ width: 210, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--text-0)" }}
            />
            <button className="xom3-btn xom3-btnSecondary" onClick={evaluateSla}>
              Evaluate SLA
            </button>
          </div>
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        {items.length === 0 ? (
          <div style={{ color: "var(--text-2)" }}>{loading ? "loading…" : "No tasks."}</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.slice(0, 200).map((t) => (
              <div key={t.taskId} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800 }}>
                    {t.type} • {t.status}
                    {t.priority === "high" ? " • high" : ""}
                    {t.escalated ? " • escalated" : ""}
                  </div>
                  <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                    lead:{" "}
                    <Link href={`/intakecrm/leads/${encodeURIComponent(t.leadId)}`} style={{ color: "color-mix(in srgb, var(--xom3-primary) 80%, white)" }}>
                      {t.leadId}
                    </Link>{" "}
                    • due: {new Date(t.dueAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <button className="xom3-btn xom3-btnSecondary" onClick={() => completeTask(t.taskId)} disabled={t.status === "completed"}>
                    {t.status === "completed" ? "Completed" : "Complete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SurfaceFrame>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    height: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--text-0)",
    outline: "none",
  };
}
