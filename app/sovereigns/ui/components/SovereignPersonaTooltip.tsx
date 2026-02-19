"use client";

import type { SovereignPersona } from "@/lib/sovereigns/personas";

export function SovereignPersonaTooltip(props: { persona: SovereignPersona }) {
  const c = props.persona.color;
  return (
    <div
      style={{
        position: "absolute",
        top: -12,
        left: 26,
        width: 260,
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(0,0,0,0.72)",
        border: `1px solid ${c}44`,
        boxShadow: `0 12px 40px rgba(0,0,0,0.55)`,
        color: "var(--text-0)",
        pointerEvents: "none",
      }}
      role="tooltip"
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>
          <span style={{ color: c, marginRight: 8 }}>{props.persona.glyph}</span>
          {props.persona.name}
        </div>
        <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{props.persona.id}</div>
      </div>
      <div style={{ marginTop: 6, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
        archetype: <span style={{ color: "var(--text-1)" }}>{props.persona.archetype}</span>
      </div>
      <div style={{ marginTop: 4, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
        tone: <span style={{ color: "var(--text-1)" }}>{props.persona.tone}</span>
      </div>
      <div style={{ marginTop: 8, color: "var(--text-1)", fontSize: 12, lineHeight: 1.45 }}>{props.persona.description}</div>
    </div>
  );
}
