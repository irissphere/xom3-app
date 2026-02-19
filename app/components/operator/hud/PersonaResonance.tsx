"use client";

import type { SovereignPersona } from "@/lib/sovereigns/personas";

export function PersonaResonance(props: { persona: SovereignPersona | null }) {
  if (!props.persona) return null;
  const c = props.persona.color;
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "8px 10px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${c}33`,
      }}
      aria-label="Persona resonance"
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          color: c,
          background: "rgba(0,0,0,0.30)",
          border: `1px solid ${c}44`,
          boxShadow: `0 0 16px ${c}22`,
          fontWeight: 900,
        }}
      >
        {props.persona.glyph}
      </div>
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ fontWeight: 850, lineHeight: 1.1 }}>{props.persona.name}</div>
        <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
          {props.persona.archetype}
        </div>
      </div>
    </div>
  );
}
