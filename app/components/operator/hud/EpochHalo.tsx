"use client";

export type EpochView = {
  id: string;
  name: string;
  description?: string;
  color: string;
  glyph: string;
};

export function EpochHalo(props: { epoch: EpochView | null; intent?: string }) {
  if (!props.epoch) return null;
  const c = props.epoch.color;
  const glyph = props.epoch.glyph;

  return (
    <div
      style={{
        position: "relative",
        width: 42,
        height: 42,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        color: c,
        border: `1px solid ${c}66`,
        background: "rgba(0,0,0,0.25)",
        boxShadow: `0 0 18px ${c}22`,
      }}
      aria-label="Epoch halo"
      title={`${props.epoch.name}${props.epoch.description ? ` — ${props.epoch.description}` : ""}`}
    >
      <div className="halo" style={{ ["--haloColor" as any]: c }} />
      <div style={{ fontWeight: 900, position: "relative", zIndex: 2 }}>{glyph}</div>
      <style jsx>{`
        .halo {
          position: absolute;
          inset: -6px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--haloColor) 50%, transparent);
          opacity: 0.85;
          animation: haloPulse 1600ms ease-in-out infinite;
        }
        @keyframes haloPulse {
          0% {
            transform: scale(0.98);
            opacity: 0.65;
          }
          50% {
            transform: scale(1.03);
            opacity: 1;
          }
          100% {
            transform: scale(0.98);
            opacity: 0.65;
          }
        }
      `}</style>
    </div>
  );
}
