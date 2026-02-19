"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type GeometryFieldProps = {
  intensity?: "soft" | "medium" | "strong";
  className?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Golden ratio and Fibonacci constants
const GOLDEN_ANGLE = 137.508; // degrees

// Generate Fibonacci spiral node positions
function generateFibonacciNodes(count: number, viewWidth: number, viewHeight: number) {
  const nodes: Array<[number, number]> = [];
  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;
  const maxRadius = Math.min(viewWidth, viewHeight) * 0.4;

  for (let i = 0; i < count; i++) {
    const angle = (i * GOLDEN_ANGLE * Math.PI) / 180;
    const radius = maxRadius * Math.sqrt(i + 1) * 0.3;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    nodes.push([x, y]);
  }

  return nodes;
}

export default function GeometryField({ intensity = "medium", className }: GeometryFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const strength = useMemo(() => {
    if (intensity === "soft") return 10;
    if (intensity === "strong") return 22;
    return 16;
  }, [intensity]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const nx = clamp(px * 2 - 1, -1, 1);
      const ny = clamp(py * 2 - 1, -1, 1);

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setOffset({ x: nx, y: ny }));
    };

    el.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Ambient gradients */}
      <div
        style={{
          position: "absolute",
          inset: -80,
          background:
            "radial-gradient(1000px 700px at 15% 15%, rgba(90, 200, 250, 0.16), transparent 60%)," +
            "radial-gradient(900px 600px at 85% 35%, rgba(10, 132, 255, 0.18), transparent 60%)," +
            "radial-gradient(700px 500px at 55% 85%, rgba(129, 140, 248, 0.10), transparent 60%)",
          filter: "blur(2px)",
          transform: `translate3d(${offset.x * -6}px, ${offset.y * -6}px, 0)`,
          transition: "transform 180ms var(--ease-out)",
        }}
      />

      {/* Geometry mesh (SVG) */}
      <div
        style={{
          position: "absolute",
          inset: -120,
          opacity: 0.95,
          transform: `perspective(900px) rotateX(${offset.y * 2.2}deg) rotateY(${offset.x * -2.2}deg) translate3d(${offset.x * 10}px, ${offset.y * 10}px, 0)`,
          transition: "transform 220ms var(--ease-out)",
          filter: "drop-shadow(0 0 22px rgba(10,132,255,0.14))",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          style={{ display: "block" }}
        >
          <defs>
            <linearGradient id="xom3Line" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(255,255,255,0.10)" />
              <stop offset="0.45" stopColor="rgba(90,200,250,0.22)" />
              <stop offset="1" stopColor="rgba(10,132,255,0.26)" />
            </linearGradient>
            <radialGradient id="xom3Node" cx="50%" cy="50%" r="60%">
              <stop offset="0" stopColor="rgba(247,248,255,0.45)" />
              <stop offset="0.5" stopColor="rgba(90,200,250,0.18)" />
              <stop offset="1" stopColor="rgba(10,132,255,0.00)" />
            </radialGradient>
          </defs>

          {/* Lines - Connect Fibonacci nodes in spiral pattern */}
          <g stroke="url(#xom3Line)" strokeWidth="1.2" fill="none" opacity={0.85}>
            {(() => {
              const nodes = generateFibonacciNodes(17, 1200, 800);
              const paths: React.ReactElement[] = [];
              
              // Create connections following golden spiral
              for (let i = 0; i < nodes.length - 1; i++) {
                const [x1, y1] = nodes[i];
                const [x2, y2] = nodes[i + 1];
                paths.push(<line key={`line-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} />);
              }
              
              // Add some geometric shapes connecting key nodes
              if (nodes.length >= 4) {
                paths.push(
                  <path key="shape-1" d={`M ${nodes[0][0]} ${nodes[0][1]} L ${nodes[2][0]} ${nodes[2][1]} L ${nodes[3][0]} ${nodes[3][1]} Z`} />
                );
              }
              if (nodes.length >= 7) {
                paths.push(
                  <path key="shape-2" d={`M ${nodes[3][0]} ${nodes[3][1]} L ${nodes[5][0]} ${nodes[5][1]} L ${nodes[6][0]} ${nodes[6][1]} Z`} />
                );
              }
              
              return paths;
            })()}
          </g>

          {/* Nodes - Fibonacci spiral positioning */}
          <g opacity={0.9}>
            {generateFibonacciNodes(17, 1200, 800).map(([cx, cy], idx) => (
              <circle key={idx} cx={cx} cy={cy} r={strength / 2.2} fill="url(#xom3Node)" />
            ))}
          </g>
        </svg>
      </div>

      {/* Subtle noise overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.06,
          backgroundImage:
            "linear-gradient(transparent 0, rgba(255,255,255,0.03) 1px, transparent 2px)," +
            "linear-gradient(90deg, transparent 0, rgba(255,255,255,0.025) 1px, transparent 2px)",
          backgroundSize: "46px 46px",
          transform: `translate3d(${offset.x * 3}px, ${offset.y * 3}px, 0)`,
          transition: "transform 200ms var(--ease-out)",
        }}
      />
    </div>
  );
}
