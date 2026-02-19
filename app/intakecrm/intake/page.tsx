"use client";

import { useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

export default function IntakecrmManualIntakePage() {
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", source: "manual" });
  const [status, setStatus] = useState<string | null>(null);

  const submit = async () => {
    setStatus("submitting");
    try {
      const res = await fetch("/api/intakecrm/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const json = await res.json();
      if (!json?.ok) {
        setStatus(`error: ${json?.error || "intake_failed"}`);
        return;
      }
      setStatus(`ok: ${json.action} ${json.lead?.leadId}`);
      setDraft({ name: "", email: "", phone: "", source: "manual" });
    } catch (e: any) {
      setStatus(`error: ${e?.message || "network_error"}`);
    }
  };

  return (
    <SurfaceFrame
      title="intakecrm — Manual Intake"
      description="Create a lead directly into the tenant lane."
      activation="active"
      links={[
        { href: "/intakecrm/leads", label: "Leads" },
        { href: "/intakecrm/tasks", label: "Tasks" },
      ]}
    >
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
          <div style={{ gridColumn: "span 6" }}>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Name
            </div>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Full name"
              style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--text-0)" }}
            />
          </div>
          <div style={{ gridColumn: "span 6" }}>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Source
            </div>
            <input
              value={draft.source}
              onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
              placeholder="manual / api / web"
              style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--text-0)" }}
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Email
            </div>
            <input
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="email@example.com"
              style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--text-0)" }}
            />
          </div>
          <div style={{ gridColumn: "span 6" }}>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Phone
            </div>
            <input
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="+1..."
              style={{ marginTop: 6, width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--text-0)" }}
            />
          </div>

          <div style={{ gridColumn: "span 12", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <div className="xom3-mono" style={{ color: status?.startsWith("error") ? "rgb(239,68,68)" : "var(--text-2)", fontSize: 12 }}>
              {status || "ready"}
            </div>
            <button className="xom3-btn xom3-btnPrimary" onClick={submit} disabled={status === "submitting"}>
              {status === "submitting" ? "Submitting…" : "Submit intake"}
            </button>
          </div>
        </div>
      </div>
    </SurfaceFrame>
  );
}
