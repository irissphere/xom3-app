"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TechEyeballProps = {
  size?: number;
  intensity?: "soft" | "medium" | "strong";
  className?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Golden ratio constant
const PHI = 1.618033988749895;
const GOLDEN_ANGLE = 137.508; // degrees

// Generate golden spiral points
function generateGoldenSpiralPoints(count: number, maxRadius: number) {
  const points: Array<{ x: number; y: number; r: number }> = [];
  for (let i = 0; i < count; i++) {
    const angle = (i * GOLDEN_ANGLE * Math.PI) / 180;
    const radius = maxRadius * Math.sqrt(i + 1) * 0.15;
    points.push({
      x: 0.5 + (radius * Math.cos(angle)) / maxRadius,
      y: 0.5 + (radius * Math.sin(angle)) / maxRadius,
      r: radius / maxRadius,
    });
  }
  return points;
}

export default function TechEyeball({ size = 400, intensity = "medium", className }: TechEyeballProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pulse, setPulse] = useState(0);

  const strength = useMemo(() => {
    if (intensity === "soft") return 0.6;
    if (intensity === "strong") return 1.2;
    return 0.9;
  }, [intensity]);

  // Mouse tracking for parallax
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const nx = clamp(px * 2 - 1, -1, 1);
      const ny = clamp(py * 2 - 1, -1, 1);

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setOffset({ x: nx * 0.15, y: ny * 0.15 }));
    };

    el.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
    };
  }, []);

  // Pulse animation
  useEffect(() => {
    const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let animationFrame = 0;
    const animate = () => {
      setPulse((prev) => (prev + 0.02) % (Math.PI * 2));
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const spiralPoints = useMemo(() => generateGoldenSpiralPoints(21, size / 2), [size]);
  const pulseScale = 1 + Math.sin(pulse) * 0.03;

  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden="true"
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          {/* Radial gradient for sphere depth */}
          <radialGradient id="eyeballCore" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="rgba(247,248,255,0.95)" />
            <stop offset="30%" stopColor="rgba(90,200,250,0.85)" />
            <stop offset="60%" stopColor="rgba(10,132,255,0.75)" />
            <stop offset="100%" stopColor="rgba(5,8,16,0.9)" />
          </radialGradient>

          {/* Gradient for iris rings */}
          <radialGradient id="irisGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(10,132,255,0.4)" />
            <stop offset="50%" stopColor="rgba(90,200,250,0.25)" />
            <stop offset="100%" stopColor="rgba(247,248,255,0.1)" />
          </radialGradient>

          {/* Golden spiral gradient */}
          <linearGradient id="spiralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(90,200,250,0.6)" />
            <stop offset="50%" stopColor="rgba(10,132,255,0.4)" />
            <stop offset="100%" stopColor="rgba(247,248,255,0.2)" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="eyeballGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Scan line filter */}
          <filter id="scanGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer sensor rings */}
        <g opacity={0.4 * strength}>
          {[1, 1.618, 2.618, 4.236].map((scale, idx) => (
            <circle
              key={`ring-${idx}`}
              cx={size / 2}
              cy={size / 2}
              r={(size / 2) * 0.85 * scale}
              fill="none"
              stroke="url(#spiralGradient)"
              strokeWidth={1.5 / scale}
              opacity={0.3 / scale}
              transform={`translate(${offset.x * 2}, ${offset.y * 2})`}
            />
          ))}
        </g>

        {/* Golden spiral path */}
        <path
          d={spiralPoints
            .map((p, i) => {
              const x = size * p.x;
              const y = size * p.y;
              return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="url(#spiralGradient)"
          strokeWidth={1.5}
          opacity={0.5 * strength}
          filter="url(#scanGlow)"
          transform={`translate(${offset.x * 3}, ${offset.y * 3}) rotate(${pulse * 10})`}
          style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
        />

        {/* Main sphere (eyeball) */}
        <g transform={`translate(${size / 2 + offset.x * 8}, ${size / 2 + offset.y * 8}) scale(${pulseScale})`}>
          {/* Outer sphere */}
          <circle cx={0} cy={0} r={size * 0.4} fill="url(#eyeballCore)" filter="url(#eyeballGlow)" />

          {/* Iris rings (concentric) */}
          {[0.6, 0.75, 0.9].map((scale, idx) => (
            <circle
              key={`iris-${idx}`}
              cx={0}
              cy={0}
              r={size * 0.4 * scale}
              fill="none"
              stroke="url(#irisGradient)"
              strokeWidth={2}
              opacity={0.4 - idx * 0.1}
            />
          ))}

          {/* Pupil (central focus) */}
          <circle cx={0} cy={0} r={size * 0.15} fill="rgba(5,8,16,0.95)" filter="url(#eyeballGlow)" />

          {/* Pupil highlight */}
          <circle cx={-size * 0.05} cy={-size * 0.05} r={size * 0.04} fill="rgba(247,248,255,0.6)" />

          {/* Scan line (rotating) */}
          <line
            x1={0}
            y1={-size * 0.4}
            x2={0}
            y2={size * 0.4}
            stroke="rgba(90,200,250,0.6)"
            strokeWidth={1}
            opacity={0.5}
            transform={`rotate(${(pulse * 180) / Math.PI})`}
            filter="url(#scanGlow)"
          />
        </g>

        {/* Spiral nodes (Fibonacci points) */}
        <g opacity={0.7 * strength}>
          {spiralPoints.slice(0, 13).map((p, idx) => {
            const nodeSize = (idx < 3 ? 3 : idx < 8 ? 2 : 1.5) * strength;
            return (
              <circle
                key={`node-${idx}`}
                cx={size * p.x}
                cy={size * p.y}
                r={nodeSize}
                fill="rgba(90,200,250,0.8)"
                transform={`translate(${offset.x * 5}, ${offset.y * 5})`}
              >
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur={`${2 + idx * 0.3}s`} repeatCount="indefinite" />
              </circle>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
