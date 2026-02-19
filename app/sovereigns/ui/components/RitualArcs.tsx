"use client";

import { useMemo } from "react";

type NodeLayout = { id: string; x: number; y: number; href: string };
type Arc = { id?: string; from: string; to: string; intensity?: number; color?: string; at: number };

function centerPx(container: { width: number; height: number }, node: NodeLayout) {
  return { x: (node.x / 100) * container.width, y: (node.y / 100) * container.height };
}

export function RitualArcs(props: {
  layoutById: Record<string, NodeLayout>;
  ritualArc?: { at: number; targetId: string | null } | null;
  arcs?: Arc[];
  now: number;
}) {
  const dims = useMemo(() => ({ width: 1000, height: 520 }), []);

  const arcs = useMemo(() => {
    const result: Array<{ a: { x: number; y: number }; b: { x: number; y: number }; color: string; width: number; opacity: number; key: string }> = [];

    // Legacy single-arc (pre RC-1 / CC-1)
    if (props.ritualArc) {
      const age = props.now - props.ritualArc.at;
      if (age <= 1400) {
        const from = props.layoutById["rituals"];
        const toId = props.ritualArc.targetId;
        const to = toId ? props.layoutById[toId] : null;
        if (from && to) {
          const a = centerPx(dims, from);
          const b = centerPx(dims, to);
          result.push({
            a,
            b,
            color: "rgba(236,72,153,0.85)",
            width: 2,
            opacity: 1,
            key: `legacy_${props.ritualArc.at}_${toId}`,
          });
        }
      }
    }

    // RC-1 / CC-1 multi-arcs
    for (const arc of props.arcs || []) {
      const age = props.now - arc.at;
      if (age > 1800) continue;
      const from = props.layoutById[arc.from];
      const to = props.layoutById[arc.to];
      if (!from || !to) continue;
      const a = centerPx(dims, from);
      const b = centerPx(dims, to);
      const t = Math.max(0, Math.min(1, age / 1800));
      const opacity = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      const width = Math.max(1.5, 1.5 + (arc.intensity ?? 0.6) * 1.5);
      result.push({
        a,
        b,
        color: arc.color || "rgba(236,72,153,0.85)",
        width,
        opacity,
        key: arc.id || `${arc.from}_${arc.to}_${arc.at}`,
      });
    }

    return result;
  }, [dims, props.ritualArc, props.arcs, props.now, props.layoutById]);

  if (arcs.length === 0) return null;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {arcs.map((arc) => (
        <path
          key={arc.key}
          d={`M ${arc.a.x} ${arc.a.y} Q ${(arc.a.x + arc.b.x) / 2} ${(arc.a.y + arc.b.y) / 2 - 60} ${arc.b.x} ${arc.b.y}`}
          stroke={arc.color}
          strokeWidth={arc.width}
          opacity={arc.opacity}
          fill="none"
        />
      ))}
    </svg>
  );
}
