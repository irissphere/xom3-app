"use client";

import { useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type Lead = {
  tenantId: string;
  leadId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  posture?: string;
  timeline?: Array<{ eventId: string; type: string; timestamp: string; payload: any }>;
};

export default function RevenueLoopTimelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const [lRes, sRes] = await Promise.all([
          fetch("/api/intakecrm/leads", { cache: "no-store" }),
          fetch("/api/signals/recent?prefix=revenue.loop.&limit=120", { cache: "no-store" }),
        ]);
        const [lJson, sJson] = await Promise.all([lRes.json(), sRes.json()]);
        if (stopped) return;
        if (!lJson?.ok) throw new Error(String(lJson?.error || "leads_load_failed"));
        setLeads(Array.isArray(lJson?.items) ? lJson.items : []);
        setSignals(Array.isArray(sJson?.items) ? sJson.items : []);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "timeline_load_error");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 4500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  const chain = useMemo(() => {
    const events: Array<{ kind: "crm" | "loop"; ts: string; label: string; detail?: string }> = [];

    for (const l of leads) {
      for (const evt of l.timeline || []) {
        const t = String(evt.type || "");
        if (!t.startsWith("intakecrm.") && !t.startsWith("revenue.loop.")) continue;
        events.push({
          kind: t.startsWith("revenue.loop.") ? "loop" : "crm",
          ts: evt.timestamp,
          label: t,
          detail: l.leadId,
        });
      }
    }

    // Also include revenue loop signals (these are global, not per-lead timeline)
    for (const s of signals) {
      events.push({
        kind: "loop",
        ts: s.timestamp,
        label: s.type,
        detail: s.payload?.leadId || s.payload?.taskId || "",
      });
    }

    return events
      .filter((e) => e.ts)
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 160);
  }, [leads, signals]);

  return (
    <SurfaceFrame
      title="Revenue Loop — Timeline"
      description="Combined chain: intakecrm timeline events + revenue loop enqueues."
      activation={chain.length > 0 ? "active" : "dormant"}
      links={[
        { href: "/revenue-loop", label: "Loop Dashboard" },
        { href: "/revenue-loop/triggers", label: "Trigger Controls" },
      ]}
      footerNote="Revenue Loop writes timeline events onto the lead when it enqueues a post (revenue.loop.post.enqueued)."
    >
      {error ? (
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, color: "rgb(239,68,68)" }}>
          {error}
        </div>
      ) : null}

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
          rows: {chain.length} • sources: intakecrm.timeline + revenue.loop.signals
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {chain.map((e, idx) => (
          <div
            key={`${e.ts}_${idx}`}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
              background: e.kind === "loop" ? "rgba(34,197,94,0.08)" : "rgba(0,0,0,0.18)",
              padding: "10px 12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 800 }}>{e.label}</div>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                {new Date(e.ts).toLocaleString()}
              </div>
            </div>
            {e.detail ? (
              <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                {e.detail}
              </div>
            ) : null}
          </div>
        ))}
        {chain.length === 0 ? <div style={{ color: "var(--text-2)" }}>No chain events yet.</div> : null}
      </div>
    </SurfaceFrame>
  );
}
