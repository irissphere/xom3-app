"use client";

import type { SovereignPersona } from "@/lib/sovereigns/personas";

export function SovereignPersonaBadge(props: {
  persona: SovereignPersona;
  pulsing?: boolean;
}) {
  const c = props.persona.color;
  return (
    <div
      title={`${props.persona.name} · ${props.persona.archetype}`}
      style={{
        position: "absolute",
        top: -10,
        left: -10,
        width: 26,
        height: 26,
        borderRadius: 10,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,0.40)",
        border: `1px solid ${c}55`,
        color: c,
        boxShadow: props.pulsing ? `0 0 18px ${c}55` : `0 0 10px ${c}22`,
        pointerEvents: "none",
        fontWeight: 900,
      }}
    >
      <span style={{ transform: "translateY(-0.5px)" }}>{props.persona.glyph}</span>
    </div>
  );
}
