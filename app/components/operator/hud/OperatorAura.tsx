"use client";

export function OperatorAura(props: {
  posture: string;
  color: string;
  visible: boolean;
  pulseAt: number | null;
}) {
  const key = `${props.posture}_${props.pulseAt || 0}`;
  return (
    <div
      key={key}
      style={{
        position: "absolute",
        inset: -14,
        borderRadius: 26,
        pointerEvents: "none",
        opacity: props.visible ? 1 : 0,
        transition: "opacity 250ms ease",
        filter: "blur(0px)",
      }}
      aria-hidden="true"
    >
      <div className="mohAura" style={{ ["--mohAuraColor" as any]: props.color }} />
      <style jsx>{`
        .mohAura {
          width: 100%;
          height: 100%;
          border-radius: 26px;
          background: radial-gradient(
            120px 80px at 30% 20%,
            color-mix(in srgb, var(--mohAuraColor) 20%, transparent),
            transparent 70%
          );
          box-shadow:
            0 0 24px color-mix(in srgb, var(--mohAuraColor) 20%, transparent),
            0 0 60px color-mix(in srgb, var(--mohAuraColor) 10%, transparent);
          animation: breathe 2200ms ease-in-out infinite;
        }
        @keyframes breathe {
          0% {
            transform: scale(0.98);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.02);
            opacity: 1;
          }
          100% {
            transform: scale(0.98);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
