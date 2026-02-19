import React from "react";

type Xom3MarkProps = {
  size?: number;
  label?: string;
};

export default function Xom3Mark({ size = 28, label = "XOM3" }: Xom3MarkProps) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        role="img"
        aria-label={label}
        style={{
          display: "block",
          filter: "drop-shadow(0 0 14px rgba(10,132,255,0.18))",
        }}
      >
        <defs>
          <linearGradient id="xom3g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(247,248,255,0.95)" />
            <stop offset="0.45" stopColor="rgba(90,200,250,0.85)" />
            <stop offset="1" stopColor="rgba(10,132,255,0.95)" />
          </linearGradient>
        </defs>

        {/* Outer ring */}
        <circle cx="16" cy="16" r="13" fill="none" stroke="url(#xom3g)" strokeWidth="1.4" opacity="0.9" />

        {/* Triangulated core */}
        <path
          d="M16 7 L24 13 L20 25 L12 25 L8 13 Z"
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1"
        />

        {/* X-axis lines */}
        <path d="M9 16 H23" stroke="url(#xom3g)" strokeWidth="1.2" opacity="0.9" />
        <path d="M16 9 V23" stroke="url(#xom3g)" strokeWidth="1.2" opacity="0.85" />

        {/* Node points */}
        <circle cx="16" cy="7" r="1.2" fill="rgba(247,248,255,0.9)" />
        <circle cx="24" cy="13" r="1.2" fill="rgba(90,200,250,0.9)" />
        <circle cx="20" cy="25" r="1.2" fill="rgba(10,132,255,0.9)" />
        <circle cx="12" cy="25" r="1.2" fill="rgba(90,200,250,0.9)" />
        <circle cx="8" cy="13" r="1.2" fill="rgba(247,248,255,0.9)" />
      </svg>

      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.08, color: "var(--text-0)" }}>
          XOM3
        </div>
        <div style={{ fontSize: 11, letterSpacing: 0.08, color: "var(--text-2)" }} className="xom3-mono">
          Xtension Of Me
        </div>
      </div>
    </div>
  );
}
