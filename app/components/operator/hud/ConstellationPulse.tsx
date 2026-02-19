"use client";

export function ConstellationPulse(props: { color: string; pulseAt: number | null; visible: boolean }) {
  const key = props.pulseAt ? String(props.pulseAt) : "idle";
  return (
    <div
      key={key}
      style={{
        position: "absolute",
        inset: -10,
        borderRadius: 22,
        pointerEvents: "none",
        opacity: props.visible ? 1 : 0,
        transition: "opacity 250ms ease",
      }}
      aria-hidden="true"
    >
      <div className="pulse" style={{ ["--pulseColor" as any]: props.color }} />
      <style jsx>{`
        .pulse {
          width: 100%;
          height: 100%;
          border-radius: 22px;
          border: 1px solid color-mix(in srgb, var(--pulseColor) 35%, transparent);
          box-shadow: 0 0 0 0 color-mix(in srgb, var(--pulseColor) 25%, transparent);
          animation: ping 900ms ease-out forwards;
        }
        @keyframes ping {
          0% {
            transform: scale(0.98);
            opacity: 0.9;
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--pulseColor) 30%, transparent);
          }
          100% {
            transform: scale(1.07);
            opacity: 0;
            box-shadow: 0 0 0 18px transparent;
          }
        }
      `}</style>
    </div>
  );
}
