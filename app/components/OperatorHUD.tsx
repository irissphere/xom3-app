"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getOperatorState, subscribeOperatorState, updateOperatorState } from "@/lib/operator";

type OperatorState = ReturnType<typeof getOperatorState>;

function postureChip(posture: string) {
  if (posture === "debug") return { bg: "rgba(245,158,11,0.14)", fg: "rgb(245,158,11)", border: "rgba(245,158,11,0.26)" };
  if (posture === "demo") return { bg: "rgba(236,72,153,0.14)", fg: "rgb(236,72,153)", border: "rgba(236,72,153,0.26)" };
  if (posture === "gtm") return { bg: "rgba(34,197,94,0.14)", fg: "rgb(34,197,94)", border: "rgba(34,197,94,0.26)" };
  if (posture === "ritual") return { bg: "rgba(155,93,229,0.16)", fg: "rgb(155,93,229)", border: "rgba(155,93,229,0.28)" };
  return { bg: "rgba(59,130,246,0.12)", fg: "rgb(147,197,253)", border: "rgba(59,130,246,0.24)" };
}

function viewFromPath(pathname: string | null) {
  const p = pathname || "/";
  if (p.startsWith("/benefits")) return "crm";
  if (p.startsWith("/broadcast")) return "broadcast";
  if (p.startsWith("/rituals")) return "rituals";
  if (p.startsWith("/timeline")) return "timeline";
  if (p.startsWith("/sovereigns")) return "constellation";
  if (p.startsWith("/system")) return "system";
  if (p.startsWith("/uoi")) return "uoi";
  return "cockpit";
}

export default function OperatorHUD() {
  const pathname = usePathname();
  const [state, setState] = useState<OperatorState>(() => getOperatorState());
  const [visible, setVisible] = useState(true);
  const [lastActiveAt, setLastActiveAt] = useState<number>(() => Date.now());

  useEffect(() => {
    const unsub = subscribeOperatorState((next) => setState({ ...next }));
    return () => unsub();
  }, []);

  useEffect(() => {
    updateOperatorState({ view: viewFromPath(pathname) });
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
    }, 700);
    return () => clearInterval(t);
  }, [lastActiveAt]);

  useEffect(() => {
    document.body.dataset.operatorPosture = state.posture;
  }, [state.posture]);

  const chip = useMemo(() => postureChip(state.posture), [state.posture]);

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
      aria-label="Operator HUD"
    >
      <div
        className="xom3-glass xom3-glassEdge"
        style={{
          padding: 12,
          width: 320,
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 850 }}>Operator HUD</div>
          <div
            style={{
              padding: "2px 8px",
              borderRadius: 999,
              background: chip.bg,
              border: `1px solid ${chip.border}`,
              color: chip.fg,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
            }}
          >
            {String(state.posture).toUpperCase()}
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <Row k="lane" v={state.activeLane || state.view || "—"} />
          <Row k="lastRitual" v={state.lastRitual || "—"} />
          <Row k="activeRitual" v={state.activeRitual || "—"} />
          <Row k="nextRitual" v={state.nextRitual || "—"} />
        </div>
      </div>
    </div>
  );
}

function Row(props: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{props.k}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)", textAlign: "right" }}>{props.v}</div>
    </div>
  );
}
