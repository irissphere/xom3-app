"use client";

export function SequencerTimeline(props: {
  totalFrames: number;
  currentIndex: number;
  density: number[];
  markers?: { index: number; glyph: string; color: string; title: string }[];
  onSeek: (index: number) => void;
}) {
  const max = Math.max(1, ...props.density);
  const markerByIndex = new Map<number, { glyph: string; color: string; title: string }>();
  for (const m of props.markers || []) {
    if (!markerByIndex.has(m.index)) markerByIndex.set(m.index, { glyph: m.glyph, color: m.color, title: m.title });
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ height: 32, display: "flex", alignItems: "flex-end", gap: 1, position: "relative" }}>
        {props.density.map((d, idx) => {
          const h = Math.max(2, Math.round((d / max) * 26));
          const active = idx === props.currentIndex;
          const marker = markerByIndex.get(idx);
          return (
            <div
              key={idx}
              onClick={() => props.onSeek(idx)}
              title={marker ? `${marker.title} · frame ${idx + 1}/${props.totalFrames} · events ${d}` : `frame ${idx + 1}/${props.totalFrames} · events ${d}`}
              style={{
                width: 3,
                height: h,
                borderRadius: 2,
                background: active ? "rgba(245,158,11,0.85)" : "rgba(148,163,184,0.25)",
                cursor: "pointer",
                boxShadow: active ? "0 0 14px rgba(245,158,11,0.25)" : "none",
                position: "relative",
              }}
            >
              {marker ? (
                <div
                  style={{
                    position: "absolute",
                    top: -14,
                    left: -6,
                    width: 15,
                    height: 15,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 10,
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.55)",
                    border: `1px solid ${marker.color}55`,
                    color: marker.color,
                    pointerEvents: "none",
                  }}
                >
                  {marker.glyph}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(0, props.totalFrames - 1)}
        value={Math.min(Math.max(0, props.currentIndex), Math.max(0, props.totalFrames - 1))}
        onChange={(e) => props.onSeek(Number(e.target.value))}
        style={{ width: "100%" }}
      />
    </div>
  );
}
