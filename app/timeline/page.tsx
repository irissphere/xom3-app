"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type TimelineEntry = {
  id: string;
  timestamp: string;
  sovereign: "uoi" | "system" | "broadcast" | "hse" | "sync" | "cockpit" | string;
  kind: string;
  severity: "info" | "warning" | "error" | "success" | string;
  title: string;
  description?: string;
  meta?: Record<string, any>;
};

type TimelineResponse = {
  ok: boolean;
  timestamp: string;
  items: TimelineEntry[];
  sources?: Record<string, any>;
};

type SovereignEvent = {
  id: string;
  sovereign: "uoi" | "system" | "broadcast" | "hse" | "sync" | "rituals" | "cockpit" | string;
  type: string;
  severity: "info" | "warning" | "error" | string;
  timestamp: string;
  payload: any;
  parentEventId?: string;
  tags?: string[];
};

function sevStyles(sev: string) {
  if (sev === "success") return { bg: "rgba(34,197,94,0.14)", fg: "rgb(34,197,94)", border: "rgba(34,197,94,0.28)" };
  if (sev === "error") return { bg: "rgba(239,68,68,0.14)", fg: "rgb(239,68,68)", border: "rgba(239,68,68,0.28)" };
  if (sev === "warning") return { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)", border: "rgba(245,158,11,0.26)" };
  return { bg: "rgba(148,163,184,0.10)", fg: "rgb(148,163,184)", border: "rgba(148,163,184,0.22)" };
}

function sovereignStyles(s: string) {
  if (s === "uoi") return { bg: "rgba(168,85,247,0.10)", fg: "rgb(168,85,247)", border: "rgba(168,85,247,0.24)" };
  if (s === "system") return { bg: "rgba(6,182,212,0.10)", fg: "rgb(6,182,212)", border: "rgba(6,182,212,0.22)" };
  if (s === "broadcast") return { bg: "rgba(34,197,94,0.08)", fg: "rgb(34,197,94)", border: "rgba(34,197,94,0.18)" };
  if (s === "hse") return { bg: "rgba(245,158,11,0.10)", fg: "rgb(245,158,11)", border: "rgba(245,158,11,0.22)" };
  if (s === "sync") return { bg: "rgba(59,130,246,0.10)", fg: "rgb(59,130,246)", border: "rgba(59,130,246,0.22)" };
  if (s === "rituals") return { bg: "rgba(236,72,153,0.10)", fg: "rgb(236,72,153)", border: "rgba(236,72,153,0.22)" };
  return { bg: "rgba(148,163,184,0.10)", fg: "rgb(148,163,184)", border: "rgba(148,163,184,0.22)" };
}

export default function TimelinePage() {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [sovereignFilter, setSovereignFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [reflexOnly, setReflexOnly] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);
  const [lastEventBySovereign, setLastEventBySovereign] = useState<Record<string, string>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());

  const fetchTimeline = useCallback(async () => {
    const res = await fetch("/api/timeline?limit=200", { cache: "no-store" });
    const json = (await res.json()) as TimelineResponse;
    setData(json);
  }, []);

  useEffect(() => {
    fetchTimeline().catch(() => {});
    // Poll fallback: only when live mode is off.
    if (!liveMode) {
      const interval = setInterval(() => fetchTimeline().catch(() => {}), 2500);
      return () => clearInterval(interval);
    }
    return;
  }, [fetchTimeline, liveMode]);

  // A lightweight clock so presence indicators can decay without waiting for new events.
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const appendEntry = useCallback((entry: TimelineEntry) => {
    setData((prev) => {
      const existing = prev?.items || [];
      if (existing.some((e) => e.id === entry.id)) return prev;
      const nextItems = [entry, ...existing].slice(0, 300);
      return {
        ok: true,
        timestamp: new Date().toISOString(),
        items: nextItems,
        sources: prev?.sources,
      };
    });
  }, []);

  const onSseEvent = useCallback(
    (evt: SovereignEvent) => {
      setLastEventBySovereign((prev) => ({ ...prev, [evt.sovereign]: evt.timestamp }));

      const entry: TimelineEntry = {
        id: evt.id,
        timestamp: evt.timestamp,
        sovereign: evt.sovereign,
        kind: `bus_${evt.type}`,
        severity: evt.severity,
        title: `EventBus: ${evt.sovereign}`,
        description: evt.type,
        meta: evt,
      };
      appendEntry(entry);
    },
    [appendEntry]
  );

  // Live Mode (SSE): EventSource subscription to /api/events/stream
  useEffect(() => {
    if (!liveMode) {
      setLiveConnected(false);
      return;
    }

    let es: EventSource | null = null;
    let stopped = false;

    try {
      es = new EventSource("/api/events/stream");
      es.onopen = () => {
        if (stopped) return;
        setLiveConnected(true);
      };
      es.onerror = () => {
        if (stopped) return;
        // Drop to disconnected state; UI still has manual refresh + toggle.
        setLiveConnected(false);
      };
      es.onmessage = (msg) => {
        if (stopped) return;
        try {
          const parsed = JSON.parse(msg.data) as SovereignEvent;
          if (parsed && parsed.id) {
            onSseEvent(parsed);
          }
        } catch {
          // ignore malformed events
        }
      };
    } catch {
      setLiveConnected(false);
    }

    return () => {
      stopped = true;
      setLiveConnected(false);
      if (es) es.close();
    };
  }, [liveMode, onSseEvent]);

  const items = useMemo(() => {
    const all = data?.items || [];
    return all.filter((e) => {
      const okS = sovereignFilter === "all" ? true : e.sovereign === sovereignFilter;
      const okV = severityFilter === "all" ? true : e.severity === severityFilter;
      const isReflex = Boolean((e.meta as any)?.tags?.includes?.("reflex")) || String(e.kind || "").includes("reflex") || Boolean((e.meta as any)?.reflex);
      const okR = reflexOnly ? isReflex : true;
      return okS && okV && okR;
    });
  }, [data, sovereignFilter, severityFilter, reflexOnly]);

  const byId = useMemo(() => {
    const map = new Map<string, TimelineEntry>();
    (data?.items || []).forEach((e) => map.set(e.id, e));
    return map;
  }, [data]);

  const refresh = async () => {
    setBusy(true);
    try {
      await fetchTimeline();
    } finally {
      setBusy(false);
    }
  };

  const sovereignPulse = useCallback(
    (sovereign: string) => {
      const ts = lastEventBySovereign[sovereign];
      if (!ts) return { hot: false, label: "—" };
      const ageMs = nowMs - new Date(ts).getTime();
      return { hot: ageMs >= 0 && ageMs < 3000, label: `${Math.max(0, Math.round(ageMs / 1000))}s` };
    },
    [lastEventBySovereign, nowMs]
  );

  return (
    <SurfaceFrame
      title="Operator Timeline"
      description="Unified sovereign event stream: UOI ticks, System heartbeat, Broadcast dispatches, and cockpit activity events. Single pane of truth."
      activation="active"
      links={[
        { href: "/console", label: "Operator Console" },
        { href: "/uoi", label: "UOI Observatory" },
        { href: "/system/status", label: "System Status" },
        { href: "/broadcast/operations", label: "Broadcast Operations" },
        { href: "/rituals", label: "Rituals" },
      ]}
    >
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              last seen: {data?.timestamp || "--"} • items: {items.length}
            </div>
            <div
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                background: liveMode ? (liveConnected ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.12)") : "rgba(148,163,184,0.10)",
                border: `1px solid ${
                  liveMode ? (liveConnected ? "rgba(34,197,94,0.28)" : "rgba(245,158,11,0.26)") : "rgba(148,163,184,0.22)"
                }`,
                color: liveMode ? (liveConnected ? "rgb(34,197,94)" : "rgb(245,158,11)") : "rgb(148,163,184)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
              }}
              title="Live Mode (SSE) status"
            >
              {liveMode ? (liveConnected ? "LIVE" : "LIVE (DISCONNECTED)") : "HISTORICAL"}
            </div>
          </div>
          <button className="xom3-btn xom3-btnSecondary" onClick={refresh} disabled={busy}>
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
          <div style={{ gridColumn: "span 4", minWidth: 220 }}>
            <div style={{ color: "var(--text-2)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>Sovereign</div>
            <select
              value={sovereignFilter}
              onChange={(e) => setSovereignFilter(e.target.value)}
              style={{
                marginTop: 6,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "var(--text-0)",
              }}
            >
              <option value="all">all</option>
              <option value="uoi">uoi</option>
              <option value="system">system</option>
              <option value="broadcast">broadcast</option>
              <option value="hse">hse</option>
              <option value="sync">sync</option>
              <option value="rituals">rituals</option>
              <option value="cockpit">cockpit</option>
            </select>
          </div>

          <div style={{ gridColumn: "span 4", minWidth: 220 }}>
            <div style={{ color: "var(--text-2)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>Severity</div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{
                marginTop: 6,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "var(--text-0)",
              }}
            >
              <option value="all">all</option>
              <option value="success">success</option>
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="error">error</option>
            </select>
          </div>

          <div style={{ gridColumn: "span 4", minWidth: 220 }}>
            <div style={{ color: "var(--text-2)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>Sources</div>
            <div style={{ marginTop: 8, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              {data?.sources ? JSON.stringify(data.sources) : "--"}
            </div>
          </div>
          <div style={{ gridColumn: "span 12", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                <input type="checkbox" checked={liveMode} onChange={(e) => setLiveMode(e.target.checked)} />
                live mode
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                <input type="checkbox" checked={reflexOnly} onChange={(e) => setReflexOnly(e.target.checked)} />
                reflex only
              </label>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {["uoi", "system", "broadcast", "hse", "sync", "rituals"].map((s) => {
                const p = sovereignPulse(s);
                const ss = sovereignStyles(s);
                return (
                  <div
                    key={s}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: ss.bg,
                      border: `1px solid ${ss.border}`,
                      color: ss.fg,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      boxShadow: p.hot ? `0 0 14px ${ss.fg}` : "none",
                      opacity: p.hot ? 1 : 0.65,
                    }}
                    title={p.hot ? "recent event (<3s)" : "no recent event"}
                  >
                    {s.toUpperCase()} • {p.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Stream</div>
        {items.length === 0 ? (
          <div style={{ padding: "12px 0", color: "var(--text-2)" }}>No entries match filters.</div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {items.slice(0, 80).map((e) => {
              const sev = sevStyles(String(e.severity));
              const sov = sovereignStyles(String(e.sovereign));
              const isReflex = Boolean((e.meta as any)?.tags?.includes?.("reflex")) || String(e.kind || "").includes("reflex") || Boolean((e.meta as any)?.reflex);
              const isRitual = Boolean((e.meta as any)?.tags?.includes?.("ritual")) || String(e.kind || "").includes("ritual");
              const parentEventId = (e.meta as any)?.parentEventId;
              const chain = parentEventId ? buildChain(byId, parentEventId, 6) : [];
              return (
                <details
                  key={e.id}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(0,0,0,0.18)",
                    padding: "10px 12px",
                  }}
                >
                  <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: sov.bg,
                          border: `1px solid ${sov.border}`,
                          color: sov.fg,
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          letterSpacing: "0.08em",
                        }}
                      >
                        {String(e.sovereign).toUpperCase()}
                      </span>
                      {isReflex ? (
                        <span
                          title="reflex"
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(245,158,11,0.10)",
                            border: "1px solid rgba(245,158,11,0.22)",
                            color: "rgb(245,158,11)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.08em",
                          }}
                        >
                          ⚡ REFLEX
                        </span>
                      ) : null}
                      {isRitual ? (
                        <span
                          title="ritual"
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(236,72,153,0.10)",
                            border: "1px solid rgba(236,72,153,0.22)",
                            color: "rgb(236,72,153)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.08em",
                          }}
                        >
                          RITUAL
                        </span>
                      ) : null}
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: sev.bg,
                          border: `1px solid ${sev.border}`,
                          color: sev.fg,
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          letterSpacing: "0.08em",
                        }}
                      >
                        {String(e.severity).toUpperCase()}
                      </span>
                      <span style={{ fontWeight: 650 }}>{e.title}</span>
                      <span style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{e.kind}</span>
                    </div>
                    <span style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {e.description ? e.description.slice(0, 60) : ""}
                    </span>
                  </summary>
                  {e.description ? <div style={{ marginTop: 10, color: "var(--text-2)", whiteSpace: "pre-wrap" }}>{e.description}</div> : null}
                  {chain.length > 0 ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>chain</div>
                      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                        {chain.map((c) => (
                          <div
                            key={c.id}
                            style={{
                              borderRadius: 10,
                              border: "1px solid rgba(255,255,255,0.06)",
                              background: "rgba(255,255,255,0.02)",
                              padding: "8px 10px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>
                                {new Date(c.timestamp).toLocaleTimeString()}
                              </span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>
                                {String(c.sovereign).toUpperCase()}
                              </span>
                              <span style={{ fontWeight: 650 }}>{c.title}</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>{c.kind}</span>
                            </div>
                            {c.description ? <div style={{ marginTop: 6, color: "var(--text-2)" }}>{c.description}</div> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <pre
                    style={{
                      marginTop: 10,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--text-1)",
                    }}
                  >
                    {JSON.stringify(e.meta || {}, null, 2)}
                  </pre>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </SurfaceFrame>
  );
}

function buildChain(byId: Map<string, TimelineEntry>, startId: string, maxDepth: number): TimelineEntry[] {
  const chain: TimelineEntry[] = [];
  let currentId: string | undefined = startId;
  let depth = 0;
  const seen = new Set<string>();

  while (currentId && depth < maxDepth && !seen.has(currentId)) {
    seen.add(currentId);
    const found = byId.get(currentId);
    if (!found) break;
    chain.push(found);
    currentId = (found.meta as any)?.parentEventId;
    depth += 1;
  }

  return chain;
}
