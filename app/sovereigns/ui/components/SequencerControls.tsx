"use client";

export function SequencerControls(props: {
  playing: boolean;
  speed: number;
  onPlayPause: () => void;
  onSpeed: (speed: number) => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
}) {
  const speeds = [0.5, 1, 2, 4];
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button className="xom3-btn" onClick={props.onJumpStart}>
        ⟪
      </button>
      <button className="xom3-btn" onClick={props.onPlayPause}>
        {props.playing ? "Pause" : "Play"}
      </button>
      <button className="xom3-btn" onClick={props.onJumpEnd}>
        ⟫
      </button>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>speed</span>
        {speeds.map((s) => (
          <button
            key={s}
            className="xom3-btn"
            onClick={() => props.onSpeed(s)}
            style={{
              background: props.speed === s ? "rgba(59,130,246,0.18)" : undefined,
              borderColor: props.speed === s ? "rgba(59,130,246,0.30)" : undefined,
              color: props.speed === s ? "rgb(147,197,253)" : undefined,
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      <style jsx>{`
        .xom3-btn {
          padding: 6px 10px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-1);
          font-size: 12px;
          cursor: pointer;
          transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
        }
        .xom3-btn:hover {
          background: rgba(255, 255, 255, 0.07);
        }
      `}</style>
    </div>
  );
}
