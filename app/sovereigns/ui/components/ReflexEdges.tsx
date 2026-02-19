"use client";

import { useEffect, useMemo, useState } from "react";

type NodeLayout = { id: string; x: number; y: number; href: string };
type Edge = { type: string; source: string; target: string; label?: string };

function centerPx(container: { width: number; height: number }, node: NodeLayout) {
  return { x: (node.x / 100) * container.width, y: (node.y / 100) * container.height };
}

export function ReflexEdges(props: {
  layoutById: Record<string, NodeLayout>;
  pulseAtByType: Record<string, number>;
  now: number;
}) {
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/sovereigns/reflex-edges", { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error(`reflex_edges_${res.status}`);
        const json = (await res.json()) as { edges?: Edge[] };
        if (!alive) return;
        setEdges(Array.isArray(json?.edges) ? json.edges : []);
      } catch {
        if (!alive) return;
        setEdges([]);
      }
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const dims = useMemo(() => ({ width: 1000, height: 520 }), []);

  const lines = useMemo(() => {
    return edges
      .map((e) => {
        const a = props.layoutById[e.source];
        const b = props.layoutById[e.target];
        if (!a || !b) return null;
        const pa = centerPx(dims, a);
        const pb = centerPx(dims, b);
        const pulseAt = props.pulseAtByType[e.type] || 0;
        const hot = props.now - pulseAt < 1200;
        return { e, pa, pb, hot };
      })
      .filter(Boolean) as Array<{ e: Edge; pa: { x: number; y: number }; pb: { x: number; y: number }; hot: boolean }>;
  }, [dims, edges, props.layoutById, props.pulseAtByType, props.now]);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {lines.map(({ e, pa, pb, hot }) => {
        const stroke = hot ? "rgba(245,158,11,0.85)" : "rgba(148,163,184,0.22)";
        const strokeWidth = hot ? 2.2 : 1.2;
        return (
          <g key={`${e.type}_${e.source}_${e.target}`}>
            <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={stroke} strokeWidth={strokeWidth} />
          </g>
        );
      })}
    </svg>
  );
}
