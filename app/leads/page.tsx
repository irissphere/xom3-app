"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FeatureGate } from "@/app/components/FeatureGate";
import LeadDetailPanel from "@/app/components/LeadDetailPanel";

type Lead = {
  leadId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  posture: "new" | "working" | "closed" | string;
  assignedTo: string | null;
  tags: string[];
  source?: string | null;
  createdAt: string;
  updatedAt: string;
};

type LeadsResponse = { ok: boolean; items?: Lead[]; total?: number };

type PipelineResponse = {
  ok: boolean;
  comingSoon?: boolean;
  message?: string;
  byPersona?: Record<string, { total: number; byStatus: Record<string, number> }>;
  personas?: string[];
  total?: number;
};

type Filter = "all" | "new" | "working" | "closed";

export default function LeadsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [personaFilter, setPersonaFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createPosture, setCreatePosture] = useState<"idle" | "saving" | "error">("idle");
  const [createForm, setCreateForm] = useState({ name: "", email: "", phone: "", source: "manual", tags: "" });

  const postureParam = filter === "all" ? "" : filter;

  const visible = useMemo(() => {
    return items;
  }, [items]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const url = new URL("/api/intakecrm/leads", window.location.origin);
        if (q.trim()) url.searchParams.set("q", q.trim());
        if (postureParam) url.searchParams.set("posture", postureParam);
        if (personaFilter) url.searchParams.set("persona", personaFilter);
        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = (await res.json()) as LeadsResponse;
        if (cancelled) return;
        setItems(Array.isArray(json?.items) ? json.items : []);
      } catch {
        if (cancelled) return;
        setItems([]);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    load().catch(() => {});
    const t = setTimeout(() => load().catch(() => {}), 2500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, postureParam, personaFilter]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/intakecrm/pipeline", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: PipelineResponse) => {
        if (!cancelled) setPipeline(json?.ok ? json : null);
      })
      .catch(() => { if (!cancelled) setPipeline(null); });
    return () => { cancelled = true; };
  }, []);

  const createLead = async () => {
    setCreatePosture("saving");
    try {
      const body = {
        name: createForm.name.trim() || undefined,
        email: createForm.email.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        source: createForm.source.trim() || "manual",
        tags: createForm.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await fetch("/api/intakecrm/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(String(json?.error || "create_failed"));
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", phone: "", source: "manual", tags: "" });
      setCreatePosture("idle");
      // Refresh list
      setQ((v) => v);
    } catch {
      setCreatePosture("error");
      setTimeout(() => setCreatePosture("idle"), 1200);
    }
  };

  return (
    <FeatureGate feature="leads">
      <main className="xom3-home">
        <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 24 }}>
          <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
                LEADS
              </div>
              <h1 style={{ margin: "10px 0 6px 0", fontSize: 28, fontWeight: 860, letterSpacing: "-0.02em" }}>
                Leads
              </h1>
              <p className="xom3-subtle" style={{ margin: 0, maxWidth: 720 }}>
                Click a lead to open the detail panel. Works great on phone too.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="xom3-btn xom3-btnPrimary" onClick={() => setCreateOpen(true)}>
                Add lead
              </button>
            </div>
          </header>

          {/* Persona funnel */}
          {pipeline?.comingSoon && (
            <section className="xom3-section" style={{ marginTop: 14 }}>
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 14 }}>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em", marginBottom: 6 }}>FUNNEL BY PERSONA</div>
                <div className="xom3-muted" style={{ fontSize: 13 }}>Coming soon – connect Opus 1 (USE_OPUS1_DATA=true) for live persona funnel</div>
              </div>
            </section>
          )}
          {pipeline?.personas && pipeline.personas.length > 0 && !pipeline.comingSoon && (
            <section className="xom3-section" style={{ marginTop: 14 }}>
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 14 }}>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em", marginBottom: 10 }}>FUNNEL BY PERSONA</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <FilterButton active={!personaFilter} onClick={() => setPersonaFilter("")}>
                    All personas
                  </FilterButton>
                  {pipeline.personas.map((p) => (
                    <FilterButton key={p} active={personaFilter === p} onClick={() => setPersonaFilter(p)}>
                      {p} ({pipeline.byPersona?.[p]?.total ?? 0})
                    </FilterButton>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="xom3-section" style={{ marginTop: 14 }}>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
                  All
                </FilterButton>
                <FilterButton active={filter === "new"} onClick={() => setFilter("new")}>
                  New
                </FilterButton>
                <FilterButton active={filter === "working"} onClick={() => setFilter("working")}>
                  Working
                </FilterButton>
                <FilterButton active={filter === "closed"} onClick={() => setFilter("closed")}>
                  Closed
                </FilterButton>
              </div>
              <div style={{ flex: 1 }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, phone, tag, source…"
                className="xom3-input"
                style={{ width: "min(520px, 100%)" }}
              />
            </div>
          </section>

          <section className="xom3-section" style={{ marginTop: 14 }}>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: 14, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                <div style={{ fontWeight: 850 }}>Lead list</div>
                <div className="xom3-muted" style={{ fontSize: 13 }}>
                  {loading ? "Loading…" : `${visible.length} visible`}
                </div>
              </div>

              {visible.length === 0 ? (
                <div className="xom3-empty" style={{ paddingTop: 40, paddingBottom: 44 }}>
                  <div className="xom3-empty-icon">👥</div>
                  <div className="xom3-empty-title">No leads yet</div>
                  <div className="xom3-empty-description">Add your first lead, or connect socials to start capturing automatically.</div>
                </div>
              ) : (
                <div style={{ width: "100%", overflowX: "auto" }}>
                  <table className="xom3-table">
                    <thead>
                      <tr>
                        <th>Lead</th>
                        <th>Status</th>
                        <th>Source</th>
                        <th>Contact</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.slice(0, 200).map((l) => (
                        <tr
                          key={l.leadId}
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedLeadId(l.leadId)}
                        >
                          <td>
                            <div style={{ fontWeight: 750 }}>{l.name || l.email || l.phone || l.leadId}</div>
                            <div className="xom3-muted" style={{ fontSize: 12, marginTop: 2 }}>
                              {l.leadId}
                            </div>
                          </td>
                          <td>
                            <StatusPill posture={l.posture} />
                          </td>
                          <td className="xom3-subtle">{l.source || "—"}</td>
                          <td>
                            <div className="xom3-subtle">{l.email || "—"}</div>
                            <div className="xom3-subtle">{l.phone || "—"}</div>
                          </td>
                          <td className="xom3-subtle">{new Date(l.updatedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Commerce Engines - Link to Funnel Builder & Ad Engine */}
          <section className="xom3-section" style={{ marginTop: 20 }}>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em", marginBottom: 10 }}>COMMERCE ENGINES</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              <Link href="/commerce/products?engine=funnel" className="xom3-glass xom3-glassEdge" style={{ padding: 16, borderRadius: 12, textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 22 }}>🔄</span>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Funnel Builder</div>
                <div className="xom3-muted" style={{ fontSize: 12 }}>AI-powered landing pages, upsells, checkout</div>
              </Link>
              <Link href="/commerce/products?engine=ad" className="xom3-glass xom3-glassEdge" style={{ padding: 16, borderRadius: 12, textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 22 }}>📢</span>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Ad Engine</div>
                <div className="xom3-muted" style={{ fontSize: 12 }}>Ad creatives, targeting, multi-platform campaigns</div>
              </Link>
            </div>
          </section>
        </div>

        <LeadDetailPanel
          leadId={selectedLeadId}
          open={Boolean(selectedLeadId)}
          onClose={() => setSelectedLeadId(null)}
          onLeadUpdated={() => {
            // Refresh list without flashing
            setQ((v) => v);
          }}
        />

        {createOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add lead"
            onClick={() => setCreateOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              background: "rgba(6, 8, 12, 0.82)",
              backdropFilter: "blur(10px)",
              display: "grid",
              placeItems: "center",
              padding: 16,
            }}
          >
            <div
              className="xom3-glass xom3-glassEdge"
              onClick={(e) => e.stopPropagation()}
              style={{ width: "min(560px, 96vw)", padding: 18 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 860, fontSize: 16 }}>Add lead</div>
                  <div className="xom3-muted" style={{ fontSize: 13, marginTop: 4 }}>
                    Email or phone is required.
                  </div>
                </div>
                <button className="xom3-btn xom3-btnSecondary" onClick={() => setCreateOpen(false)}>
                  Close
                </button>
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <div className="xom3-grid xom3-grid2">
                  <Field label="Name">
                    <input className="xom3-input" value={createForm.name} onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))} />
                  </Field>
                  <Field label="Source">
                    <input className="xom3-input" value={createForm.source} onChange={(e) => setCreateForm((s) => ({ ...s, source: e.target.value }))} />
                  </Field>
                  <Field label="Email">
                    <input className="xom3-input" value={createForm.email} onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))} />
                  </Field>
                  <Field label="Phone">
                    <input className="xom3-input" value={createForm.phone} onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Tags (comma-separated)">
                  <input className="xom3-input" value={createForm.tags} onChange={(e) => setCreateForm((s) => ({ ...s, tags: e.target.value }))} />
                </Field>
              </div>

              <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="xom3-btn xom3-btnSecondary" onClick={() => setCreateOpen(false)} disabled={createPosture === "saving"}>
                  Cancel
                </button>
                <button className="xom3-btn xom3-btnPrimary" onClick={createLead} disabled={createPosture === "saving"}>
                  {createPosture === "saving" ? "Saving…" : createPosture === "error" ? "Try again" : "Save lead"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </FeatureGate>
  );
}

function FilterButton(props: { active: boolean; children: React.ReactNode; onClick: () => void }) {
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
        fontWeight: 800,
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

















