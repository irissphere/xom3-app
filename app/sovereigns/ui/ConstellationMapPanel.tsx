"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SovereignNode } from "./components/SovereignNode";
import { ReflexEdges } from "./components/ReflexEdges";
import { SyncWave } from "./components/SyncWave";
import { RitualArcs } from "./components/RitualArcs";
import { RitualGlyphOverlay } from "./components/RitualGlyphOverlay";
import { SequencerTimeline } from "./components/SequencerTimeline";
import { SequencerControls } from "./components/SequencerControls";

type PlaybackFrame = { at: number; events: Array<{ at: number; type: string; payload: any }> };
type RitualArc = { id?: string; from: string; to: string; intensity?: number; color?: string; at: number };
type RitualGlyph = { id: string; ritualId: string; step: string; svg: string; sovereign?: string; at: number; color?: string };
type Epoch = { id: string; name: string; description: string; color: string; glyph: string };
type ReflexChainArc = { from: string; to: string; intensity: number; color: string; at: number };
type ReflexChainGlyph = { id: string; svg: string; sovereign: string; at: number; color: string };

type SovereignStatus = {
  id: string;
  label: string;
  posture: string;
  startedAt?: number;
  stoppedAt?: number;
  lastTickAt?: number;
  tickCount: number;
  lastError?: { message: string; at: number } | undefined;
  intervalMs: number | null;
  running: boolean;
};

type OverviewResponse = { sovereigns: SovereignStatus[] };

type SovereignEvent = {
  id: string;
  sovereign: string;
  type: string;
  severity: "info" | "warning" | "error";
  timestamp: string;
  payload: any;
  parentEventId?: string;
  tags?: string[];
};

type NodeLayout = {
  id: string;
  x: number;
  y: number;
  href: string;
};

const LAYOUT: NodeLayout[] = [
  { id: "hse", x: 50, y: 10, href: "/hse" },
  { id: "broadcast", x: 25, y: 32, href: "/broadcast/operations" },
  { id: "uoi", x: 75, y: 32, href: "/uoi" },
  { id: "rituals", x: 40, y: 56, href: "/rituals" },
  { id: "sync", x: 62, y: 56, href: "/timeline" },
  { id: "system", x: 50, y: 78, href: "/system/status" },
];

function nowMs() {
  return Date.now();
}

function postureColor(posture: string) {
  if (posture === "error") return { fg: "rgb(239,68,68)", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.24)" };
  if (posture === "running") return { fg: "rgb(34,197,94)", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.20)" };
  if (posture === "starting") return { fg: "rgb(59,130,246)", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.22)" };
  if (posture === "draining") return { fg: "rgb(245,158,11)", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.22)" };
  if (posture === "stopped") return { fg: "rgb(148,163,184)", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.18)" };
  return { fg: "rgb(148,163,184)", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.18)" };
}

export default function ConstellationMapPanel() {
  const [statuses, setStatuses] = useState<Record<string, SovereignStatus>>({});
  const [liveConnected, setLiveConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<Record<string, number>>({});
  const [edgePulseAt, setEdgePulseAt] = useState<Record<string, number>>({});
  const [syncWaveAt, setSyncWaveAt] = useState<number | null>(null);
  const [ritualArc, setRitualArc] = useState<{ at: number; targetId: string | null } | null>(null);
  const [ritualArcs, setRitualArcs] = useState<RitualArc[]>([]);
  const [ritualGlyphs, setRitualGlyphs] = useState<RitualGlyph[]>([]);
  const [reflexChainArcs, setReflexChainArcs] = useState<ReflexChainArc[]>([]);
  const [reflexChainGlyphs, setReflexChainGlyphs] = useState<ReflexChainGlyph[]>([]);

  const [riskBySovereign, setRiskBySovereign] = useState<Record<string, number>>({});
  const [predictedStateBySovereign, setPredictedStateBySovereign] = useState<Record<string, string>>({});

  const [memoryMode, setMemoryMode] = useState(false);
  const [memorySnapshot, setMemorySnapshot] = useState<any | null>(null);

  const [sequencerFrames, setSequencerFrames] = useState<PlaybackFrame[]>([]);
  const [sequencerIndex, setSequencerIndex] = useState(0);
  const [sequencerPlaying, setSequencerPlaying] = useState(false);
  const [sequencerSpeed, setSequencerSpeed] = useState(1);
  const [sequencerOpen, setSequencerOpen] = useState(false);
  const [replayPostureById, setReplayPostureById] = useState<Record<string, string>>({});
  const [epoch, setEpoch] = useState<Epoch | null>(null);
  const [epochShift, setEpochShift] = useState<{ at: number; from: string | null; to: string } | null>(null);
  const [clock, setClock] = useState(() => nowMs());

  useEffect(() => {
    const t = setInterval(() => setClock(nowMs()), 500);
    return () => clearInterval(t);
  }, []);

  // Kernel truth refresh (polling) – SSE is for animation, not truth.
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      const res = await fetch("/api/sovereigns/overview", { cache: "no-store" });
      const json = (await res.json()) as OverviewResponse;
      if (stopped) return;
      const next: Record<string, SovereignStatus> = {};
      (json?.sovereigns || []).forEach((s) => (next[s.id] = s));
      setStatuses(next);
    };

    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 2500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  // SSE presence + animation triggers
  useEffect(() => {
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
        setLiveConnected(false);
      };
      es.onmessage = (msg) => {
        if (stopped) return;
        try {
          const evt = JSON.parse(msg.data) as SovereignEvent;
          if (!evt?.sovereign) return;

          setLastEventAt((prev) => ({ ...prev, [evt.sovereign]: nowMs() }));

          // Edge pulse: use event type as the key.
          setEdgePulseAt((prev) => ({ ...prev, [evt.type]: nowMs() }));

          if (evt.type === "sync.pulse") {
            setSyncWaveAt(nowMs());
          }

          if (evt.tags?.includes("ritual")) {
            // Ritual arcs: infer target from step kind (when available)
            const kind = evt.payload?.kind;
            const targetId =
              kind === "broadcast.enqueue" ? "broadcast" :
              kind === "uoi.directive" ? "uoi" :
              kind === "sovereign.sync" ? "sync" :
              null;
            setRitualArc({ at: nowMs(), targetId });
          }

          if (evt.type === "ritual.cinematic") {
            const payload = evt.payload || {};
            const arcs = Array.isArray(payload.arcs) ? payload.arcs : [];
            const glyph = payload.glyph || null;
            const glyphs = Array.isArray(payload.glyphs) ? payload.glyphs : [];
            const at = Number(payload.at || Date.now());

            if (arcs.length > 0) {
              setRitualArcs((prev) => [
                ...prev,
                ...arcs.map((a: any) => ({
                  id: a.id,
                  from: String(a.from),
                  to: String(a.to),
                  intensity: typeof a.intensity === "number" ? a.intensity : 0.7,
                  color: String(a.color || "rgba(236,72,153,0.85)"),
                  at,
                })),
              ].slice(-40));
            }

            // Primary glyph (legacy + RC-1)
            if (glyph && typeof glyph.svg === "string") {
              setRitualGlyphs((prev) => [
                ...prev,
                {
                  id: String(glyph.id || evt.id),
                  ritualId: String(glyph.ritualId || payload.ritualId || "unknown"),
                  step: String(glyph.step || payload.step || "step"),
                  svg: String(glyph.svg),
                  sovereign: String(glyph.sovereign || payload.sovereign || "rituals"),
                  at,
                },
              ].slice(-60));
            }

            // PRT-1: persona glyph trails (additive)
            if (glyphs.length > 0) {
              setRitualGlyphs((prev) =>
                [
                  ...prev,
                  ...glyphs
                    .filter((g: any) => g && typeof g.svg === "string")
                    .map((g: any) => ({
                      id: String(g.id || `${evt.id}_${Math.random().toString(36).slice(2, 6)}`),
                      ritualId: String(g.ritualId || payload.ritualId || "unknown"),
                      step: String(g.step || payload.step || "step"),
                      svg: String(g.svg),
                      sovereign: String(g.sovereign || payload.sovereign || "rituals"),
                      at,
                      color: typeof g.color === "string" ? g.color : undefined,
                    })),
                ].slice(-80)
              );
            }
          }

          if (evt.type === "predictive.signal") {
            const signal = evt.payload || {};
            const sovereign = String(signal.sovereign || evt.sovereign);
            const risk = typeof signal.risk === "number" ? signal.risk : null;
            if (risk !== null && Number.isFinite(risk)) {
              setRiskBySovereign((prev) => ({ ...prev, [sovereign]: Math.max(0, Math.min(1, risk)) }));
              setPredictedStateBySovereign((prev) => ({ ...prev, [sovereign]: String(signal.predictedState || "unknown") }));
            }
          }

          if (evt.type === "constellation.epoch.changed") {
            const to = evt.payload?.to;
            if (to?.id) {
              setEpoch({ id: to.id, name: to.name, description: to.description, color: to.color, glyph: to.glyph });
              setEpochShift({ at: nowMs(), from: evt.payload?.from?.id || null, to: to.id });
            }
          }

          if (evt.type === "reflex.chain.cinematic") {
            const p = evt.payload || {};
            const from = String(p.from || "system");
            const to = String(p.to || "system");
            const color = String(p.color || "rgba(59,130,246,0.65)");
            const intensity = typeof p.intensity === "number" ? p.intensity : 0.8;
            const at = nowMs();
            setReflexChainArcs((prev) => [...prev, { from, to, intensity, color, at }].slice(-60));
            const svg = typeof p.glyphSvg === "string" ? p.glyphSvg : "";
            if (svg) {
              setReflexChainGlyphs((prev) => [...prev, { id: `${p.runId || "crx"}_${at}_${Math.random().toString(36).slice(2, 6)}`, svg, sovereign: to, at, color }].slice(-80));
            }
          }
        } catch {
          // ignore malformed
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
  }, []);

  // CE-1: epoch truth refresh (poll) so UI is accurate even without SSE.
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      const res = await fetch("/api/constellation/epoch", { cache: "no-store" });
      const json = await res.json();
      if (stopped) return;
      const cur = json?.current || null;
      if (cur?.id) setEpoch({ id: cur.id, name: cur.name, description: cur.description, color: cur.color, glyph: cur.glyph });
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 3000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  // Memory Mode snapshot
  useEffect(() => {
    if (!memoryMode) return;
    let stopped = false;
    const load = async () => {
      const res = await fetch("/api/constellation/memory", { cache: "no-store" });
      const json = await res.json();
      if (stopped) return;
      setMemorySnapshot(json);
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 4000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [memoryMode]);

  // Sequencer frames
  useEffect(() => {
    if (!sequencerOpen) return;
    let stopped = false;
    const load = async () => {
      const res = await fetch("/api/constellation/sequencer", { cache: "no-store" });
      const json = await res.json();
      if (stopped) return;
      setSequencerFrames(Array.isArray(json.frames) ? json.frames : []);
      setSequencerIndex(0);
    };
    load().catch(() => {});
    return () => {
      stopped = true;
    };
  }, [sequencerOpen]);

  // Sequencer playback
  useEffect(() => {
    if (!sequencerPlaying) return;
    if (!sequencerFrames || sequencerFrames.length === 0) return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setSequencerIndex((idx) => {
        const next = Math.min(idx + 1, sequencerFrames.length - 1);
        if (next >= sequencerFrames.length - 1) {
          setSequencerPlaying(false);
        }
        return next;
      });
    };

    const handle = setInterval(tick, Math.max(30, 140 / Math.max(0.1, sequencerSpeed)));
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [sequencerPlaying, sequencerFrames, sequencerSpeed]);

  // Apply current frame → overlays (purely visual replay)
  useEffect(() => {
    const frame = sequencerFrames[sequencerIndex];
    if (!frame) return;

    const now = nowMs();
    for (const e of frame.events || []) {
      if (e.type === "reflex") {
        setEdgePulseAt((prev) => ({ ...prev, [String(e.payload?.type || "reflex")]: now }));
      }

      if (e.type === "health") {
        const id = String(e.payload?.id || "");
        const score = typeof e.payload?.score === "number" ? e.payload.score : null;
        if (id && score !== null) {
          setRiskBySovereign((prev) => ({ ...prev, [id]: Math.max(0, Math.min(1, 1 - score)) }));
        }
      }

      if (e.type === "posture") {
        const id = String(e.payload?.id || "");
        const posture = String(e.payload?.posture || "");
        if (id && posture) {
          setReplayPostureById((prev) => ({ ...prev, [id]: posture }));
        }
      }

      if (e.type === "ritual") {
        // Minimal replay choreography: started/completed/step transitions.
        const ritualId = String(e.payload?.ritualId || "unknown");
        const step = String(e.payload?.step || "");
        const sovereign = String(e.payload?.sovereign || "system");
        const normalized =
          step.includes("ritual.started") ? "ritual.started" :
          step.includes("ritual.completed") ? "ritual.completed" :
          step.includes("ritual.step.completed") ? "ritual.step.completed" :
          step;

        const color =
          normalized.includes("failed") ? "rgba(239,68,68,0.80)" :
          normalized.includes("completed") ? "rgba(0,245,212,0.75)" :
          normalized.includes("started") ? "rgba(155,93,229,0.75)" :
          "rgba(241,91,181,0.75)";

        if (normalized.includes("started")) {
          setRitualArcs((prev) => [...prev, { from: "rituals", to: sovereign, intensity: 1, color, at: now }].slice(-40));
        } else if (normalized.includes("completed")) {
          setRitualArcs((prev) => [...prev, { from: sovereign, to: "rituals", intensity: 0.55, color, at: now }].slice(-40));
        } else if (normalized.includes("step.completed")) {
          setRitualArcs((prev) => [...prev, { from: sovereign, to: "system", intensity: 0.8, color, at: now }].slice(-40));
        }

        // glyph
        void import("@/lib/rituals/cinematics")
          .then(({ ritualGlyphs }) => ritualGlyphs[normalized] || ritualGlyphs.default)
          .then((svg) => {
            setRitualGlyphs((prev) => [
              ...prev,
              { id: `${ritualId}_${now}_${Math.random().toString(36).slice(2, 6)}`, ritualId, step: normalized, svg, sovereign, at: now, color },
            ].slice(-60));
          })
          .catch(() => {});
      }

      // CRX-1: replay reflex chain cinematics from event memory (scrubbable).
      if (e.type === "event" && e.payload?.type === "reflex.chain.cinematic") {
        const compact = e.payload?.payload || {};
        const from = String(compact.from || "system");
        const to = String(compact.to || "system");
        const color = String(compact.color || "rgba(59,130,246,0.65)");
        const intensity = typeof compact.intensity === "number" ? compact.intensity : 0.8;
        setReflexChainArcs((prev) => [...prev, { from, to, intensity, color, at: now }].slice(-60));

        const glyph = String(compact.glyph || "\u25C9");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="rgba(0,0,0,0.55)" stroke="${color}" stroke-width="2"/><text x="24" y="29" text-anchor="middle" font-size="18" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" fill="${color}">${glyph}</text></svg>`;
        setReflexChainGlyphs((prev) => [...prev, { id: `crx_${now}_${Math.random().toString(36).slice(2, 6)}`, svg, sovereign: to, at: now, color }].slice(-80));
      }
    }
  }, [sequencerFrames, sequencerIndex]);

  const layoutById = useMemo(() => {
    const map: Record<string, NodeLayout> = {};
    LAYOUT.forEach((n) => (map[n.id] = n));
    return map;
  }, []);

  const orderedNodes = useMemo(() => {
    return LAYOUT.map((n) => {
      const status = statuses[n.id];
      return { ...n, status };
    });
  }, [statuses]);

  const density = useMemo(() => {
    if (!sequencerFrames || sequencerFrames.length === 0) return [];
    return sequencerFrames.map((f) => (Array.isArray(f.events) ? f.events.length : 0));
  }, [sequencerFrames]);

  const epochMarkers = useMemo(() => {
    if (!sequencerFrames || sequencerFrames.length === 0) return [];
    const markers: { index: number; glyph: string; color: string; title: string }[] = [];
    for (let i = 0; i < sequencerFrames.length; i++) {
      const frame = sequencerFrames[i];
      const epochEvt = (frame?.events || []).find((e: any) => e?.type === "event" && e?.payload?.type === "constellation.epoch.changed");
      const compact = epochEvt?.payload?.payload;
      if (compact?.toId) {
        markers.push({
          index: i,
          glyph: String(compact.toGlyph || "\u25C9"),
          color: String(compact.toColor || "rgba(59,130,246,0.9)"),
          title: `epoch → ${String(compact.toName || compact.toId)}`,
        });
      }
    }
    return markers;
  }, [sequencerFrames]);

  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800 }}>Constellation</div>
          <div
            style={{
              padding: "2px 8px",
              borderRadius: 999,
              background: liveConnected ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.10)",
              border: `1px solid ${liveConnected ? "rgba(34,197,94,0.22)" : "rgba(245,158,11,0.22)"}`,
              color: liveConnected ? "rgb(34,197,94)" : "rgb(245,158,11)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
            }}
            title="SSE posture"
          >
            {liveConnected ? "LIVE" : "LIVE (DISCONNECTED)"}
          </div>
          <button
            onClick={() => setMemoryMode((v) => !v)}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: memoryMode ? "rgba(59,130,246,0.16)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${memoryMode ? "rgba(59,130,246,0.28)" : "rgba(255,255,255,0.08)"}`,
              color: memoryMode ? "rgb(147,197,253)" : "var(--text-2)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
            title="CM-1: Memory Mode"
          >
            {memoryMode ? "MEMORY MODE" : "LIVE MODE"}
          </button>
          <button
            onClick={() => setSequencerOpen((v) => !v)}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: sequencerOpen ? "rgba(245,158,11,0.14)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${sequencerOpen ? "rgba(245,158,11,0.26)" : "rgba(255,255,255,0.08)"}`,
              color: sequencerOpen ? "rgb(245,158,11)" : "var(--text-2)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
            title="CC-1: Cinematic Sequencer"
          >
            SEQUENCER
          </button>
        </div>
        <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          source: <Link href="/api/sovereigns/overview">/api/sovereigns/overview</Link>
        </div>
      </div>

      {/* CE-1: epoch indicator */}
      {epoch ? (
        <div style={{ marginTop: 10 }}>
          <div
            className="xom3-glass xom3-glassEdge"
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${epoch.color}33`,
              background: `linear-gradient(90deg, ${epoch.color}10, rgba(255,255,255,0.02))`,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ color: epoch.color, fontWeight: 950 }}>{epoch.glyph}</div>
              <div style={{ fontWeight: 850 }}>{epoch.name}</div>
              <div style={{ color: "var(--text-2)", fontSize: 12 }}>{epoch.description}</div>
            </div>
            <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>epoch: {epoch.id}</div>

            {epochShift && clock - epochShift.at < 2200 ? (
              <div
                style={{
                  position: "absolute",
                  inset: -2,
                  borderRadius: 16,
                  border: `1px solid ${epoch.color}55`,
                  boxShadow: `0 0 30px ${epoch.color}22`,
                  pointerEvents: "none",
                  animation: "epochShiftPulse 2200ms ease-out forwards",
                }}
              />
            ) : null}

            <style jsx>{`
              @keyframes epochShiftPulse {
                0% {
                  opacity: 0;
                }
                20% {
                  opacity: 1;
                }
                100% {
                  opacity: 0;
                }
              }
            `}</style>
          </div>
        </div>
      ) : null}

      {sequencerOpen ? (
        <div style={{ marginTop: 12 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 800 }}>Cinematic Sequencer</div>
              <SequencerControls
                playing={sequencerPlaying}
                speed={sequencerSpeed}
                onPlayPause={() => setSequencerPlaying((v) => !v)}
                onSpeed={(s) => setSequencerSpeed(s)}
                onJumpStart={() => setSequencerIndex(0)}
                onJumpEnd={() => setSequencerIndex(Math.max(0, sequencerFrames.length - 1))}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <SequencerTimeline
                totalFrames={sequencerFrames.length}
                currentIndex={sequencerIndex}
                density={density}
                markers={epochMarkers}
                onSeek={(idx) => {
                  setSequencerIndex(idx);
                  setSequencerPlaying(false);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {memoryMode && memorySnapshot ? (
        <div style={{ marginTop: 12 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 800 }}>Constellation Memory</div>
              <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                epochs: posture {memorySnapshot.sovereignPosture?.length || 0} · health {memorySnapshot.sovereignHealth?.length || 0} · events{" "}
                {memorySnapshot.events?.length || 0} · reflex {memorySnapshot.reflexes?.length || 0} · rituals {memorySnapshot.rituals?.length || 0}
              </div>
            </div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>latest posture</div>
                <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                  {(memorySnapshot.sovereignPosture || []).slice(-6).reverse().map((e: any, idx: number) => (
                    <div key={idx} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>
                      {String(e?.data?.id)} → {String(e?.data?.posture)}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>latest health</div>
                <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                  {(memorySnapshot.sovereignHealth || []).slice(-6).reverse().map((e: any, idx: number) => (
                    <div key={idx} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>
                      {String(e?.data?.id)} · {String(e?.data?.state)} · score {Math.round((Number(e?.data?.score || 0) as number) * 100)}%
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          marginTop: 14,
          position: "relative",
          height: 520,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "radial-gradient(1200px 600px at 50% 30%, rgba(59,130,246,0.06), rgba(0,0,0,0.22))",
          overflow: "hidden",
        }}
      >
        <SyncWave
          triggerAt={syncWaveAt}
          origin={layoutById.sync}
        />

        <ReflexEdges layoutById={layoutById} pulseAtByType={edgePulseAt} now={clock} />
        <RitualArcs layoutById={layoutById} ritualArc={ritualArc} arcs={ritualArcs} now={clock} />
        <RitualGlyphOverlay layoutById={layoutById} glyphs={ritualGlyphs} now={clock} />
        <RitualArcs layoutById={layoutById} ritualArc={null as any} arcs={reflexChainArcs as any} now={clock} />
        <RitualGlyphOverlay layoutById={layoutById} glyphs={reflexChainGlyphs as any} now={clock} />

        {orderedNodes.map((n) => {
          const status = n.status;
          const lastPulseAt = lastEventAt[n.id] || 0;
          const isHot = clock - lastPulseAt < 2000;
          const posture = (sequencerOpen ? replayPostureById[n.id] : null) || status?.posture || "unknown";
          const colors = postureColor(posture);
          const risk = riskBySovereign[n.id];
          const predictedState = predictedStateBySovereign[n.id];

          return (
            <div
              key={n.id}
              style={{
                position: "absolute",
                left: `${n.x}%`,
                top: `${n.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <SovereignNode
                id={n.id}
                href={n.href}
                label={status?.label || n.id.toUpperCase()}
                posture={posture}
                tickCount={status?.tickCount ?? 0}
                lastTickAt={status?.lastTickAt ?? null}
                lastError={status?.lastError?.message || null}
                intervalMs={status?.intervalMs ?? null}
                running={status?.running ?? false}
                hot={isHot}
                color={colors}
                risk={typeof risk === "number" ? risk : undefined}
                predictedState={typeof predictedState === "string" ? (predictedState as any) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
