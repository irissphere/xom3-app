"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type Trigger = {
  triggerId: string;
  source: string;
  eventType: string;
  enabled: boolean;
  actions: any[];
};

function inputStyle(): React.CSSProperties {
  return {
    height: 38,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--text-0)",
    outline: "none",
    width: "100%",
  };
}

export default function OrchestrationTriggersPage() {
  const [tenantId, setTenantId] = useState("xom3");
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const headers = useMemo(() => ({ "Content-Type": "application/json", "x-xom3-tenant": tenantId }), [tenantId]);

  const load = useCallback(async () => {
    const res = await fetch("/api/orchestration/triggers", { headers, cache: "no-store" });
    const json = await res.json();
    if (!json?.ok) throw new Error("load_failed");
    setTriggers(Array.isArray(json.triggers) ? json.triggers : []);
  }, [headers]);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        await load();
        if (stopped) return;
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "error");
      }
    };
    tick().catch(() => {});
    const interval = setInterval(() => tick().catch(() => {}), 3500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [load]);

  const updateTrigger = async (triggerId: string, patch: any) => {
    setSaving(triggerId);
    try {
      const res = await fetch("/api/orchestration/triggers/update", { method: "POST", headers, body: JSON.stringify({ triggerId, patch }) });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "update_failed");
      setTriggers(Array.isArray(json.triggers) ? json.triggers : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "update_error");
    } finally {
      setSaving(null);
    }
  };

  const editActionField = (t: Trigger, idx: number, patch: Record<string, any>) => {
    const next = (t.actions || []).map((a, i) => (i === idx ? { ...a, ...patch } : a));
    void updateTrigger(t.triggerId, { actions: next });
  };

  return (
    <SurfaceFrame
      title="Orchestration — Trigger Controls"
      description="Enable/disable cross-lane triggers and edit template/platform targets. Tenant-scoped."
      activation="active"
      links={[
        { href: "/orchestration", label: "Orchestration Dashboard" },
        { href: "/orchestration/timeline", label: "Timeline" },
      ]}
      footerNote="Trigger config is stored in .xom3/orchestration/triggers.json (tenant-scoped)."
    >
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
            TENANT
          </div>
          <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} style={{ ...inputStyle(), width: 220 }} placeholder="xom3" />
          <div style={{ flex: 1 }} />
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
            triggers={triggers.length} • saving={saving ? saving : "—"}
          </div>
        </div>
        {error ? (
          <div className="xom3-mono" style={{ marginTop: 10, color: "rgb(239,68,68)", fontSize: 12 }}>
            {error}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {triggers.map((t) => (
          <div key={t.triggerId} className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{t.triggerId}</div>
                <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                  on {t.eventType} • source={t.source}
                </div>
              </div>

              <button
                className={t.enabled ? "xom3-btn xom3-btnPrimary" : "xom3-btn xom3-btnSecondary"}
                onClick={() => updateTrigger(t.triggerId, { enabled: !t.enabled })}
                disabled={saving === t.triggerId}
              >
                {t.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {(t.actions || []).map((a, idx) => (
                <div
                  key={`${t.triggerId}:${idx}`}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(0,0,0,0.18)",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 750 }}>{a.type}</div>
                    <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                      action #{idx + 1}
                    </div>
                  </div>

                  {a.type === "enqueue_social" ? (
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <label style={{ display: "grid", gap: 6 }}>
                        <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                          platform
                        </div>
                        <input
                          style={inputStyle()}
                          value={String(a.platform || "")}
                          onChange={(e) => editActionField(t, idx, { platform: e.target.value })}
                        />
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                          templateId
                        </div>
                        <input
                          style={inputStyle()}
                          value={String(a.templateId || "")}
                          onChange={(e) => editActionField(t, idx, { templateId: e.target.value })}
                        />
                      </label>
                    </div>
                  ) : null}

                  {a.type === "enqueue_outbound" ? (
                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      <label style={{ display: "grid", gap: 6 }}>
                        <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                          templateId
                        </div>
                        <input
                          style={inputStyle()}
                          value={String(a.templateId || "")}
                          onChange={(e) => editActionField(t, idx, { templateId: e.target.value })}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              ))}
              {(t.actions || []).length === 0 ? <div className="xom3-subtle">No actions.</div> : null}
            </div>
          </div>
        ))}
        {triggers.length === 0 ? <div className="xom3-subtle">No triggers found.</div> : null}
      </div>
    </SurfaceFrame>
  );
}
