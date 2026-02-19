"use client";

import { useEffect, useMemo, useState } from "react";

type Lead = {
  leadId: string;
  airtableId?: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  posture: "new" | "working" | "closed" | string;
  assignedTo: string | null;
  tags: string[];
  source?: string | null;
  createdAt: string;
  updatedAt: string;
  timeline?: Array<{ eventId: string; type: string; timestamp: string; payload: any }>;
  messagesSent?: number | null;
  totalCallAttempts?: number | null;
  responseCount?: number | null;
};

type ActivityItem = {
  id: string;
  type: "call" | "sms" | "email" | "note" | "status_change";
  label: string;
  timestamp: string;
  payload?: Record<string, unknown>;
};

type Task = {
  taskId: string;
  leadId: string;
  type: string;
  dueAt: string;
  status: string;
  assignedTo: string | null;
};

type LeadDetailResponse = { ok: boolean; lead?: Lead; tasks?: Task[] };

type Tab = "overview" | "notes" | "tasks" | "activity";

export default function LeadDetailPanel(props: {
  open: boolean;
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [detail, setDetail] = useState<LeadDetailResponse | null>(null);

  const lead = detail?.lead || null;
  const tasks = Array.isArray(detail?.tasks) ? detail!.tasks! : [];

  const [edit, setEdit] = useState({
    name: "",
    email: "",
    phone: "",
    posture: "new",
    assignedTo: "",
    tags: "",
  });

  const notes = useMemo(() => {
    const t = lead?.timeline || [];
    return t
      .filter((e) => e.type === "intakecrm.lead.note")
      .map((e) => ({ id: e.eventId, at: e.timestamp, text: String(e.payload?.text || "") }))
      .filter((n) => n.text.trim().length > 0);
  }, [lead?.timeline]);

  const [noteText, setNoteText] = useState("");
  const [notePosture, setNotePosture] = useState<"idle" | "saving" | "error">("idle");
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [actionPosture, setActionPosture] = useState<"idle" | "loading" | "error">("idle");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open || !props.leadId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/intakecrm/leads/${encodeURIComponent(props.leadId)}`, { cache: "no-store" });
        const json = (await res.json()) as LeadDetailResponse;
        if (cancelled) return;
        setDetail(json?.ok ? json : null);
        const l = json?.lead;
        if (l) {
          setEdit({
            name: l.name || "",
            email: l.email || "",
            phone: l.phone || "",
            posture: (String(l.posture || "new") as any) || "new",
            assignedTo: l.assignedTo || "",
            tags: Array.isArray(l.tags) ? l.tags.join(", ") : "",
          });
        }
      } catch {
        if (cancelled) return;
        setDetail(null);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };
    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [props.open, props.leadId]);

  useEffect(() => {
    if (props.open && props.leadId && tab === "activity") {
      let cancelled = false;
      setActivityLoading(true);
      fetch(`/api/intakecrm/leads/${encodeURIComponent(props.leadId)}/activity`, { cache: "no-store" })
        .then((r) => r.json())
        .then((json) => {
          if (!cancelled && json?.ok) setActivityItems(json.items || []);
        })
        .finally(() => {
          if (!cancelled) setActivityLoading(false);
        });
      return () => { cancelled = true; };
    }
  }, [props.open, props.leadId, tab]);

  const runLeadAction = async (action: string) => {
    if (!lead?.leadId) return;
    setActionPosture("loading");
    setActionMessage(null);
    try {
      const res = await fetch(`/api/intakecrm/leads/${encodeURIComponent(lead.leadId)}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json?.comingSoon) {
        setActionMessage(json.message || "Coming soon");
        setActionPosture("idle");
        setTimeout(() => setActionMessage(null), 4000);
        return;
      }
      if (!res.ok || !json?.ok) throw new Error(json?.error || "action_failed");
      if (action === "schedule_appointment" && json.calendarUrl) {
        window.open(json.calendarUrl, "_blank");
      }
      props.onLeadUpdated?.();
      const r2 = await fetch(`/api/intakecrm/leads/${encodeURIComponent(lead.leadId)}`, { cache: "no-store" });
      const j2 = (await r2.json()) as LeadDetailResponse;
      setDetail(j2?.ok ? j2 : null);
      setActionPosture("idle");
    } catch {
      setActionPosture("error");
      setTimeout(() => setActionPosture("idle"), 1200);
    }
  };

  useEffect(() => {
    if (!props.open) {
      setTab("overview");
      setDetail(null);
      setSaving("idle");
      setNoteText("");
      setNotePosture("idle");
      setActionMessage(null);
    }
  }, [props.open]);

  const saveLead = async () => {
    if (!lead?.leadId) return;
    setSaving("saving");
    try {
      const patch = {
        name: edit.name.trim() || null,
        email: edit.email.trim() || null,
        phone: edit.phone.trim() || null,
        posture: edit.posture,
        assignedTo: edit.assignedTo.trim() || null,
        tags: edit.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await fetch(`/api/intakecrm/leads/${encodeURIComponent(lead.leadId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error("save_failed");
      setSaving("saved");
      props.onLeadUpdated?.();
      setTimeout(() => setSaving("idle"), 800);
      // Reload
      const r2 = await fetch(`/api/intakecrm/leads/${encodeURIComponent(lead.leadId)}`, { cache: "no-store" });
      const j2 = (await r2.json()) as LeadDetailResponse;
      setDetail(j2?.ok ? j2 : null);
    } catch {
      setSaving("error");
      setTimeout(() => setSaving("idle"), 1200);
    }
  };

  const addNote = async () => {
    if (!lead?.leadId) return;
    const text = noteText.trim();
    if (!text) return;
    setNotePosture("saving");
    try {
      const res = await fetch(`/api/intakecrm/leads/${encodeURIComponent(lead.leadId)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error("note_failed");
      setNoteText("");
      setNotePosture("idle");
      // Reload
      const r2 = await fetch(`/api/intakecrm/leads/${encodeURIComponent(lead.leadId)}`, { cache: "no-store" });
      const j2 = (await r2.json()) as LeadDetailResponse;
      setDetail(j2?.ok ? j2 : null);
    } catch {
      setNotePosture("error");
      setTimeout(() => setNotePosture("idle"), 1200);
    }
  };

  if (!props.open) return null;

  const title = lead?.name || lead?.email || lead?.phone || (props.leadId ? `Lead ${props.leadId}` : "Lead");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lead details"
      onClick={props.onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 180,
        background: "rgba(6, 8, 12, 0.82)",
        backdropFilter: "blur(10px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="xom3-glass xom3-glassEdge"
        style={{
          width: "min(560px, 100vw)",
          height: "100%",
          borderRadius: 0,
          borderLeft: "1px solid rgba(255,255,255,0.10)",
          padding: 16,
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
              LEAD DETAILS
            </div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", wordBreak: "break-word" }}>
              {title}
            </div>
            <div className="xom3-muted" style={{ fontSize: 12, marginTop: 6 }}>
              {lead?.leadId ? lead.leadId : "—"}
            </div>
          </div>
          <button className="xom3-btn xom3-btnSecondary" onClick={props.onClose}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {lead?.phone ? (
            <a className="xom3-btn xom3-btnSecondary" href={`tel:${lead.phone}`} style={{ textDecoration: "none" }}>
              Call
            </a>
          ) : null}
          {lead?.email ? (
            <a className="xom3-btn xom3-btnSecondary" href={`mailto:${lead.email}`} style={{ textDecoration: "none" }}>
              Email
            </a>
          ) : null}
          {lead?.phone ? (
            <a className="xom3-btn xom3-btnSecondary" href={`sms:${lead.phone}`} style={{ textDecoration: "none" }}>
              Text
            </a>
          ) : null}
          <div style={{ flex: 1 }} />
          <span style={{ alignSelf: "center" }}>
            <StatusPill posture={String(lead?.posture || "new")} />
          </span>
        </div>

        {/* Action buttons: Calls */}
        {lead?.phone && (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="xom3-mono" style={{ fontSize: 11, color: "var(--text-2)", alignSelf: "center" }}>CALL ACTIONS</span>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => runLeadAction("transfer")} disabled={actionPosture === "loading"} style={{ fontSize: 12, padding: "6px 10px" }}>Transfer</button>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => runLeadAction("schedule_appointment")} disabled={actionPosture === "loading"} style={{ fontSize: 12, padding: "6px 10px" }}>Schedule</button>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => runLeadAction("doesnt_qualify")} disabled={actionPosture === "loading"} style={{ fontSize: 12, padding: "6px 10px" }}>Doesn&apos;t qualify</button>
          </div>
        )}

        {actionMessage && (
          <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)", fontSize: 13 }}>
            {actionMessage}
          </div>
        )}

        {/* Action buttons: Text/Email */}
        {(lead?.phone || lead?.email) && (
          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="xom3-mono" style={{ fontSize: 11, color: "var(--text-2)", alignSelf: "center" }}>TEXT/EMAIL</span>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => runLeadAction("schedule_appointment")} disabled={actionPosture === "loading"} style={{ fontSize: 12, padding: "6px 10px" }}>Schedule appointment</button>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => runLeadAction("take_over")} disabled={actionPosture === "loading"} style={{ fontSize: 12, padding: "6px 10px" }}>Take over</button>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => runLeadAction("mark_hot")} disabled={actionPosture === "loading"} style={{ fontSize: 12, padding: "6px 10px" }}>Mark hot</button>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => runLeadAction("nurture")} disabled={actionPosture === "loading"} style={{ fontSize: 12, padding: "6px 10px" }}>Nurture</button>
          </div>
        )}

        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
            Overview
          </TabButton>
          <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>
            Notes ({notes.length})
          </TabButton>
          <TabButton active={tab === "tasks"} onClick={() => setTab("tasks")}>
            Tasks ({tasks.length})
          </TabButton>
          <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>
            Activity
          </TabButton>
        </div>

        <div style={{ marginTop: 14 }}>
          {loading ? (
            <div className="xom3-empty" style={{ paddingTop: 40, paddingBottom: 40 }}>
              <div className="xom3-empty-icon">⏳</div>
              <div className="xom3-empty-title">Loading…</div>
              <div className="xom3-empty-description">Fetching lead details.</div>
            </div>
          ) : !lead ? (
            <div className="xom3-empty" style={{ paddingTop: 40, paddingBottom: 40 }}>
              <div className="xom3-empty-icon">⚠️</div>
              <div className="xom3-empty-title">Lead not found</div>
              <div className="xom3-empty-description">This lead may have been deleted or moved.</div>
            </div>
          ) : tab === "overview" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 14, background: "rgba(255,255,255,0.02)" }}>
                <div className="xom3-grid xom3-grid2" style={{ gap: 10 }}>
                  <Field label="Name">
                    <input className="xom3-input" value={edit.name} onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value }))} />
                  </Field>
                  <Field label="Status">
                    <select className="xom3-input" value={edit.posture} onChange={(e) => setEdit((s) => ({ ...s, posture: e.target.value }))}>
                      <option value="new">New</option>
                      <option value="working">Working</option>
                      <option value="closed">Closed</option>
                    </select>
                  </Field>
                  <Field label="Email">
                    <input className="xom3-input" value={edit.email} onChange={(e) => setEdit((s) => ({ ...s, email: e.target.value }))} />
                  </Field>
                  <Field label="Phone">
                    <input className="xom3-input" value={edit.phone} onChange={(e) => setEdit((s) => ({ ...s, phone: e.target.value }))} />
                  </Field>
                  <Field label="Assigned to">
                    <input className="xom3-input" value={edit.assignedTo} onChange={(e) => setEdit((s) => ({ ...s, assignedTo: e.target.value }))} placeholder="Optional" />
                  </Field>
                  <Field label="Tags">
                    <input className="xom3-input" value={edit.tags} onChange={(e) => setEdit((s) => ({ ...s, tags: e.target.value }))} placeholder="comma, separated" />
                  </Field>
                </div>
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                  <div className="xom3-muted" style={{ fontSize: 12, marginRight: "auto" }}>
                    Updated {new Date(lead.updatedAt).toLocaleString()}
                  </div>
                  <div className="xom3-muted" style={{ fontSize: 12 }}>
                    {saving === "saving" ? "Saving…" : saving === "saved" ? "Saved" : saving === "error" ? "Could not save" : ""}
                  </div>
                  <button className="xom3-btn xom3-btnPrimary" onClick={saveLead} disabled={saving === "saving"}>
                    Save changes
                  </button>
                </div>
              </div>
            </div>
          ) : tab === "activity" ? (
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 14, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontWeight: 850 }}>Activity</div>
              <div className="xom3-muted" style={{ fontSize: 12, marginTop: 4 }}>Texts, calls, emails, and notes</div>
              {activityLoading ? (
                <div className="xom3-muted" style={{ marginTop: 12 }}>Loading…</div>
              ) : activityItems.length === 0 ? (
                <div className="xom3-muted" style={{ marginTop: 12 }}>No activity yet.</div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  {activityItems.map((a) => (
                    <div key={a.id} style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 14 }}>{a.type === "call" ? "📞" : a.type === "sms" ? "💬" : a.type === "email" ? "✉️" : "📝"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 650 }}>{a.label}</div>
                        <div className="xom3-muted" style={{ fontSize: 11, marginTop: 2 }}>{new Date(a.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : tab === "notes" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 14, background: "rgba(255,255,255,0.02)" }}>
                <Field label="Add note">
                  <textarea
                    className="xom3-input"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={4}
                    placeholder="Write a note you can refer back to later…"
                    style={{ height: "auto", paddingTop: 10, paddingBottom: 10, resize: "vertical" }}
                  />
                </Field>
                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div className="xom3-muted" style={{ fontSize: 12 }}>
                    {notePosture === "saving" ? "Saving…" : notePosture === "error" ? "Could not save" : ""}
                  </div>
                  <button className="xom3-btn xom3-btnPrimary" onClick={addNote} disabled={notePosture === "saving"}>
                    Add note
                  </button>
                </div>
              </div>

              <div className="xom3-glass xom3-glassEdge" style={{ padding: 14, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ fontWeight: 850 }}>Notes</div>
                {notes.length === 0 ? (
                  <div className="xom3-muted" style={{ marginTop: 8 }}>
                    No notes yet.
                  </div>
                ) : (
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {notes.map((n) => (
                      <div key={n.id} style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                        <div className="xom3-muted" style={{ fontSize: 12 }}>
                          {new Date(n.at).toLocaleString()}
                        </div>
                        <div style={{ marginTop: 6, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{n.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 14, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontWeight: 850 }}>Tasks</div>
              {tasks.length === 0 ? (
                <div className="xom3-muted" style={{ marginTop: 8 }}>
                  No tasks yet.
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {tasks.slice(0, 50).map((t) => (
                    <div key={t.taskId} style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 750 }}>{t.type}</div>
                        <div className="xom3-muted" style={{ fontSize: 12 }}>
                          {t.status}
                        </div>
                      </div>
                      <div className="xom3-subtle" style={{ marginTop: 6, fontSize: 13 }}>
                        Due {new Date(t.dueAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 860px) {
          div[role="dialog"][aria-label="Lead details"] > div {
            width: 100vw !important;
          }
        }
      `}</style>
    </div>
  );
}

function TabButton(props: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      className="xom3-btn xom3-btnSecondary"
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        background: props.active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
        borderColor: props.active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.10)",
        color: props.active ? "var(--text-0)" : "var(--text-1)",
      }}
    >
      {props.children}
    </button>
  );
}

function StatusPill(props: { posture: string }) {
  const p = String(props.posture || "new").toLowerCase();
  const styles =
    p === "closed"
      ? { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.22)", fg: "#4ade80", label: "Closed" }
      : p === "working"
        ? { bg: "rgba(10,132,255,0.12)", border: "rgba(10,132,255,0.22)", fg: "#60a5fa", label: "Working" }
        : { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.22)", fg: "#fbbf24", label: "New" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.fg,
        fontWeight: 900,
        fontSize: 12,
      }}
    >
      {styles.label}
    </span>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div className="xom3-mono" style={{ fontSize: 12, color: "var(--text-2)", letterSpacing: "0.08em" }}>
        {props.label.toUpperCase()}
      </div>
      {props.children}
    </label>
  );
}

















