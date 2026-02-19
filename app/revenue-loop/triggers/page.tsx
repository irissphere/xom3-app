"use client";

import { useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type Trigger = {
  triggerId: string;
  type: string;
  platformTargets: string[];
  templateId: string;
  enabled: boolean;
};

const PLATFORM_OPTIONS = ["x", "linkedin", "instagram"] as const;

export default function RevenueLoopTriggersPage() {
  const [tenantId, setTenantId] = useState<string>("xom3");
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const enabledCount = useMemo(() => triggers.filter((t) => t.enabled).length, [triggers]);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch("/api/revenue-loop/triggers", { cache: "no-store" });
        const json = await res.json();
        if (stopped) return;
        if (!json?.ok) throw new Error(String(json?.error || "triggers_load_failed"));
        setTenantId(String(json?.tenantId || tenantId));
        setTriggers(Array.isArray(json?.triggers) ? json.triggers : []);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "triggers_load_error");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 6000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patchTrigger(triggerId: string, patch: Partial<Pick<Trigger, "enabled" | "platformTargets" | "templateId">>) {
    setSaving(triggerId);
    try {
      const res = await fetch("/api/revenue-loop/triggers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerId, patch }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(String(json?.error || "trigger_update_failed"));
      setTriggers(Array.isArray(json?.triggers) ? json.triggers : triggers);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "trigger_update_error");
    } finally {
      setSaving(null);
    }
  }

  return (
    <SurfaceFrame
      title="Revenue Loop — Triggers"
      description="Operator controls: enable/disable and platform targets (tenant-scoped)."
      activation={enabledCount > 0 ? "active" : "dormant"}
      links={[
        { href: "/revenue-loop", label: "Loop Dashboard" },
        { href: "/revenue-loop/timeline", label: "Loop Timeline" },
      ]}
      footerNote="These triggers are stored at xom3-app/.xom3/revenue-loop/triggers.json under byTenant."
    >
      {error ? (
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, color: "rgb(239,68,68)" }}>
          {error}
        </div>
      ) : null}

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
          tenant: {tenantId} • enabled: {enabledCount}/{triggers.length}
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {triggers.map((t) => (
          <div key={t.triggerId} className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900 }}>{t.type}</div>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, marginTop: 6 }}>
                  triggerId: {t.triggerId} • templateId: {t.templateId}
                </div>
              </div>
              <button
                className="xom3-btn xom3-btnSecondary"
                onClick={() => patchTrigger(t.triggerId, { enabled: !t.enabled })}
                disabled={saving === t.triggerId}
              >
                {saving === t.triggerId ? "saving…" : t.enabled ? "Disable" : "Enable"}
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                platform targets
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {PLATFORM_OPTIONS.map((p) => {
                  const checked = t.platformTargets.includes(p);
                  return (
                    <label key={p} className="xom3-glass xom3-glassEdge" style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(0,0,0,0.18)" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked ? t.platformTargets.filter((x) => x !== p) : [...t.platformTargets, p];
                          patchTrigger(t.triggerId, { platformTargets: next });
                        }}
                        disabled={saving === t.triggerId}
                        style={{ marginRight: 8 }}
                      />
                      <span className="xom3-mono" style={{ fontSize: 12 }}>
                        {p}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                template preview
              </div>
              <div className="xom3-mono" style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "pre-wrap" }}>
                {previewTemplate(t.templateId)}
              </div>
            </div>
          </div>
        ))}
        {triggers.length === 0 ? <div style={{ color: "var(--text-2)" }}>No triggers loaded.</div> : null}
      </div>
    </SurfaceFrame>
  );
}

function previewTemplate(templateId: string) {
  const map: Record<string, string> = {
    lead_created: "A new lead just entered the lane. Momentum is building.",
    task_completed: "Follow-up completed. Staying sharp and responsive.",
    lead_closed: "Another win. The system is working.",
    task_overdue: "High demand. We're expanding the team.",
  };
  return map[templateId] || map["lead_created"];
}
