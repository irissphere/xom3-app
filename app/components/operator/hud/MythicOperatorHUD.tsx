"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { getOperatorState, subscribeOperatorState, updateOperatorState } from "@/lib/operator";
import { getPersona } from "@/lib/sovereigns/personas";
import { OperatorIntent } from "@/lib/operator";

import { OperatorAura } from "./OperatorAura";
import { PersonaResonance } from "./PersonaResonance";
import { EpochHalo, type EpochView } from "./EpochHalo";
import { ConstellationPulse } from "./ConstellationPulse";

type OperatorState = ReturnType<typeof getOperatorState>;

function postureColor(posture: string) {
  if (posture === "debug") return "#ff6b6b";
  if (posture === "demo") return "#fee440";
  if (posture === "gtm") return "#fee440";
  if (posture === "ritual") return "#f15bb5";
  return "#00bbf9";
}

function viewFromPath(pathname: string | null) {
  const p = pathname || "/";
  if (p.startsWith("/benefits")) return "crm";
  if (p.startsWith("/broadcast")) return "broadcast";
  if (p.startsWith("/rituals")) return "ritual";
  if (p.startsWith("/timeline")) return "analysis";
  if (p.startsWith("/sovereigns")) return "analysis";
  if (p.startsWith("/system")) return "debug";
  if (p.startsWith("/uoi")) return "analysis";
  return "navigation";
}

function personaForView(view: string) {
  if (view === "broadcast") return getPersona("broadcast");
  if (view === "crm") return getPersona("system");
  if (view === "ritual") return getPersona("rituals");
  if (view === "analysis") return getPersona("uoi");
  if (view === "debug") return getPersona("hse");
  return null;
}

export default function MythicOperatorHUD() {
  const pathname = usePathname();
  const [state, setState] = useState<OperatorState>(() => getOperatorState());
  const [intent, setIntent] = useState(() => OperatorIntent.getOperatorIntent());
  const [visible, setVisible] = useState(true);
  const [lastActiveAt, setLastActiveAt] = useState<number>(() => Date.now());
  const [pulseAt, setPulseAt] = useState<number | null>(null);
  const [epoch, setEpoch] = useState<EpochView | null>(null);
  const [epochTransitionAt, setEpochTransitionAt] = useState<number | null>(null);

  useEffect(() => {
    const unsub = subscribeOperatorState((next) => setState({ ...next }));
    const unsubIntent = OperatorIntent.subscribeOperatorIntent((next) => setIntent(next));
    return () => {
      unsub();
      unsubIntent();
    };
  }, []);

  useEffect(() => {
    const view = viewFromPath(pathname);
    updateOperatorState({ view });
    if (view === "analysis") OperatorIntent.updateOperatorIntent(OperatorIntent.IntentSignals.analysis(2, "route"));
    else if (view === "debug") OperatorIntent.updateOperatorIntent(OperatorIntent.IntentSignals.debug(3, "route"));
    else if (view === "ritual") OperatorIntent.updateOperatorIntent(OperatorIntent.IntentSignals.ritual(3, "route"));
    else if (view === "crm" || view === "broadcast") OperatorIntent.updateOperatorIntent(OperatorIntent.IntentSignals.gtm(3, "route"));
    else OperatorIntent.updateOperatorIntent(OperatorIntent.IntentSignals.navigation(1, "route"));
  }, [pathname]);

  useEffect(() => {
    const onAny = () => setLastActiveAt(Date.now());
    window.addEventListener("mousemove", onAny);
    window.addEventListener("keydown", onAny);
    window.addEventListener("click", onAny);
    return () => {
      window.removeEventListener("mousemove", onAny);
      window.removeEventListener("keydown", onAny);
      window.removeEventListener("click", onAny);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const idle = Date.now() - lastActiveAt > 4500;
      setVisible(!idle);
      if (idle) OperatorIntent.updateOperatorIntent(OperatorIntent.IntentSignals.idle(1, "idle"));
    }, 900);
    return () => clearInterval(t);
  }, [lastActiveAt]);

  // Constellation pulse: soft cadence with intent bias (until we wire live sync ticks in MOH-1 v2).
  useEffect(() => {
    const interval = intent.intent === "ritual" ? 1200 : intent.intent === "analysis" ? 1600 : 2200;
    const h = setInterval(() => setPulseAt(Date.now()), interval);
    return () => clearInterval(h);
  }, [intent.intent]);

  const persona = useMemo(() => personaForView(state.view || "navigation"), [state.view]);
  const auraColor = useMemo(() => (persona?.color ? persona.color : postureColor(state.posture)), [persona, state.posture]);

  // CE-1: epoch truth (poll; purely additive).
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      const res = await fetch("/api/constellation/epoch", { cache: "no-store" });
      const json = await res.json();
      if (stopped) return;
      const next = json?.current || json?.epoch || null;
      if (next?.id) {
        setEpoch((prev) => {
          if (prev && prev.id !== next.id) setEpochTransitionAt(Date.now());
          return { id: next.id, name: next.name, description: next.description, color: next.color, glyph: next.glyph } as EpochView;
        });
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 2500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        right: 14,
        bottom: 14,
        zIndex: 60,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(6px)",
        transition: "opacity 250ms ease, transform 250ms ease",
        pointerEvents: "none",
      }}
      aria-label="Mythic Operator HUD"
    >
      <div
        className="xom3-glass xom3-glassEdge"
        style={{
          padding: 12,
          width: 360,
          position: "relative",
          borderRadius: 18,
          border: `1px solid ${auraColor}22`,
        }}
      >
        <OperatorAura posture={state.posture} color={auraColor} visible={visible} pulseAt={pulseAt} />
        <ConstellationPulse color={auraColor} pulseAt={pulseAt} visible={visible} />

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Mythic Crown</div>
          <EpochHalo epoch={epoch} intent={intent.intent} />
        </div>

        <div style={{ marginTop: 10 }}>
          <PersonaResonance persona={persona} />
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <Row k="posture" v={state.posture} accent={auraColor} />
          <Row k="intent" v={`${intent.intent} (${Math.round(intent.confidence * 100)}%)`} accent={auraColor} />
          <Row k="lane" v={state.activeLane || state.view || "—"} />
          <Row k="lastRitual" v={state.lastRitual || "—"} />
          <Row k="activeRitual" v={state.activeRitual || "—"} />
          <Row k="nextRitual" v={state.nextRitual || "—"} />
        </div>

        {/* OET-1: epoch transition micro-overlay (brief, non-blocking) */}
        {epoch && epochTransitionAt && Date.now() - epochTransitionAt < 2200 ? (
          <div
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              top: -10,
              padding: "10px 12px",
              borderRadius: 16,
              background: "rgba(0,0,0,0.78)",
              border: `1px solid ${epoch.color}55`,
              boxShadow: `0 12px 40px rgba(0,0,0,0.55)`,
              color: "var(--text-0)",
              pointerEvents: "none",
              animation: "epochIn 2200ms ease-out forwards",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 950 }}>
                <span style={{ color: epoch.color, marginRight: 8 }}>{epoch.glyph}</span>
                {epoch.name}
              </div>
              <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 11 }}>EPOCH SHIFT</div>
            </div>
            <div style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>{epoch.description}</div>
            <style jsx>{`
              @keyframes epochIn {
                0% {
                  opacity: 0;
                  transform: translateY(-6px);
                }
                15% {
                  opacity: 1;
                  transform: translateY(0px);
                }
                85% {
                  opacity: 1;
                }
                100% {
                  opacity: 0;
                }
              }
            `}</style>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row(props: { k: string; v: string; accent?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{props.k}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: props.accent ? props.accent : "var(--text-1)", textAlign: "right" }}>
        {props.v}
      </div>
    </div>
  );
}
