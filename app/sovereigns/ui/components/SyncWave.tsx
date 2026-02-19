"use client";

type NodeLayout = { id: string; x: number; y: number; href: string };

export function SyncWave(props: { triggerAt: number | null; origin: NodeLayout }) {
  if (!props.triggerAt) return null;
  return (
    <div
      key={props.triggerAt}
      style={{
        position: "absolute",
        left: `${props.origin.x}%`,
        top: `${props.origin.y}%`,
        width: 12,
        height: 12,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }}
    >
      <div className="syncWave" />
      <style jsx>{`
        .syncWave {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          border: 2px solid rgba(59, 130, 246, 0.65);
          box-shadow: 0 0 18px rgba(59, 130, 246, 0.25);
          animation: wave 1200ms ease-out forwards;
        }
        @keyframes wave {
          0% {
            transform: scale(1);
            opacity: 0.9;
          }
          100% {
            transform: scale(90);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
