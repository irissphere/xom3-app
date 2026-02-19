"use client";

import { useMemo } from "react";

type NodeLayout = { id: string; x: number; y: number; href: string };

type Glyph = {
  id: string;
  ritualId: string;
  step: string;
  svg: string;
  sovereign?: string;
  at: number;
  color?: string;
};

function centerPx(container: { width: number; height: number }, node: NodeLayout) {
  return { x: (node.x / 100) * container.width, y: (node.y / 100) * container.height };
}

function stepColor(step: string) {
  if (step.includes("failed")) return "rgb(239,68,68)";
  if (step.includes("completed")) return "rgb(0,245,212)";
  if (step.includes("started")) return "rgb(155,93,229)";
  return "rgb(241,91,181)";
}

export function RitualGlyphOverlay(props: {
  layoutById: Record<string, NodeLayout>;
  glyphs: Glyph[];
  now: number;
}) {
  const dims = useMemo(() => ({ width: 1000, height: 520 }), []);

  const active = useMemo(() => {
    return props.glyphs
      .filter((g) => props.now - g.at < 2200)
      .map((g) => {
        const sid = g.sovereign || "rituals";
        const node = props.layoutById[sid] || props.layoutById["rituals"];
        if (!node) return null;
        const c = centerPx(dims, node);
        const age = props.now - g.at;
        const t = Math.max(0, Math.min(1, age / 2200));
        const scale = t < 0.25 ? 0.65 + t * 1.6 : 1;
        const opacity = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
        return { ...g, x: c.x, y: c.y, scale, opacity };
      })
      .filter(Boolean) as Array<Glyph & { x: number; y: number; scale: number; opacity: number }>;
  }, [dims, props.glyphs, props.now, props.layoutById]);

  if (active.length === 0) return null;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${dims.width} ${dims.height}`} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {active.map((g) => {
        const c = g.color || stepColor(g.step);
        return (
          <g key={g.id} transform={`translate(${g.x} ${g.y}) scale(${g.scale})`} opacity={g.opacity}>
            <g transform="translate(-14 -14)">
              <rect
                x={0}
                y={0}
                width={28}
                height={28}
                rx={10}
                fill="rgba(0,0,0,0.35)"
                stroke="rgba(255,255,255,0.10)"
              />
              <foreignObject x={2} y={2} width={24} height={24}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    color: c,
                    filter: `drop-shadow(0 0 10px ${c}55)`,
                  }}
                  dangerouslySetInnerHTML={{ __html: g.svg }}
                />
              </foreignObject>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
