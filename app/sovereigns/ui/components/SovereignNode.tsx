"use client";

import Link from "next/link";
import { getPersona } from "@/lib/sovereigns/personas";
import { SovereignPersonaBadge } from "./SovereignPersonaBadge";
import { SovereignPersonaTooltip } from "./SovereignPersonaTooltip";

type Props = {
  id: string;
  href: string;
  label: string;
  posture: string;
  tickCount: number;
  lastTickAt: number | null;
  lastError: string | null;
  intervalMs: number | null;
  running: boolean;
  hot: boolean;
  color: { fg: string; bg: string; border: string };
  risk?: number; // 0..1 (PR-1 / CC-1 replay)
  predictedState?: "healthy" | "degraded" | "error" | string;
};

function fmtAgo(ms: number | null) {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 0) return "0s";
  if (diff < 1000) return "<1s";
  if (diff < 60000) return `${Math.round(diff / 1000)}s`;
  return `${Math.round(diff / 60000)}m`;
}

export function SovereignNode(props: Props) {
  const risk = typeof props.risk === "number" ? Math.max(0, Math.min(1, props.risk)) : 0;
  const riskColor =
    risk >= 0.85 ? "rgba(239,68,68,0.65)" :
    risk >= 0.6 ? "rgba(249,115,22,0.55)" :
    risk >= 0.35 ? "rgba(245,158,11,0.45)" :
    risk > 0 ? "rgba(34,197,94,0.22)" :
    "rgba(148,163,184,0.10)";
  const riskGlow =
    risk >= 0.85 ? "0 0 22px rgba(239,68,68,0.35)" :
    risk >= 0.6 ? "0 0 18px rgba(249,115,22,0.28)" :
    risk >= 0.35 ? "0 0 16px rgba(245,158,11,0.22)" :
    risk > 0 ? "0 0 14px rgba(34,197,94,0.14)" :
    "none";

  const persona = getPersona(props.id);

  return (
    <Link
      href={props.href}
      style={{
        display: "block",
        width: 220,
        textDecoration: "none",
        color: "inherit",
      }}
      aria-label={`Open ${props.id} observatory`}
    >
      <div
        style={{
          position: "relative",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.22)",
          padding: "12px 12px",
          boxShadow: props.posture === "error" ? `0 0 18px rgba(239,68,68,0.45)` : riskGlow,
          transition: "box-shadow 160ms ease",
        }}
      >
        {/* Persona overlay */}
        {persona ? (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <SovereignPersonaBadge persona={persona} pulsing={Boolean(props.hot)} />
          </div>
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: 20,
            border: `2px solid ${props.hot ? props.color.border : "rgba(255,255,255,0.06)"}`,
            opacity: props.hot ? 1 : 0.35,
            filter: props.hot ? "blur(0px)" : "blur(0px)",
            pointerEvents: "none",
          }}
        />

        {risk > 0 ? (
          <div
            style={{
              position: "absolute",
              inset: -10,
              borderRadius: 22,
              border: `1px solid ${riskColor}`,
              pointerEvents: "none",
              opacity: 0.9,
            }}
          />
        ) : null}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>{props.label}</div>
          <div
            style={{
              padding: "2px 8px",
              borderRadius: 999,
              background: props.color.bg,
              border: `1px solid ${props.color.border}`,
              color: props.color.fg,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
            }}
          >
            {String(props.posture).toUpperCase()}
          </div>
        </div>

        {risk > 0 ? (
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>risk</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>
              {Math.round(risk * 100)}%
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>tickCount</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>{props.tickCount}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>lastTick</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>{fmtAgo(props.lastTickAt)}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>interval</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>
              {props.intervalMs ? `${props.intervalMs}ms` : "—"}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>running</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>{props.running ? "yes" : "no"}</div>
          </div>
        </div>

        {props.lastError ? (
          <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
            <div style={{ color: "rgb(239,68,68)", fontFamily: "var(--font-mono)", fontSize: 12 }}>lastError</div>
            <div style={{ marginTop: 4, color: "var(--text-2)", fontSize: 12, whiteSpace: "pre-wrap" }}>{props.lastError}</div>
          </div>
        ) : null}

        {/* Tooltip (CSS hover) */}
        {persona ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: 0,
              transition: "opacity 120ms ease",
            }}
            className="xom3PersonaTooltip"
          >
            <SovereignPersonaTooltip persona={persona} />
          </div>
        ) : null}
      </div>

      <style jsx>{`
        a:hover :global(.xom3PersonaTooltip) {
          opacity: 1;
        }
      `}</style>
    </Link>
  );
}
