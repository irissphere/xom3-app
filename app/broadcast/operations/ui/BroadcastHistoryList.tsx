"use client";

import { useEffect, useMemo, useState } from "react";

type OutboundItem = {
  id: string;
  platform: string;
  formattedText: string;
  cloneVoice: string;
  persona: string;
  scheduledAt: string;
  status: "queued" | "sending" | "sent" | "failed";
};

function platformGlyph(platform: string) {
  switch (platform) {
    case "twitter":
      return "𝕏";
    case "linkedin":
      return "in";
    case "instagram":
      return "◎";
    case "tiktok":
      return "♪";
    case "youtube":
      return "▶";
    default:
      return "◻";
  }
}

function statusChip(status: string) {
  if (status === "sent") return { bg: "rgba(34,197,94,0.14)", fg: "rgb(34,197,94)", border: "rgba(34,197,94,0.28)" };
  if (status === "failed") return { bg: "rgba(239,68,68,0.14)", fg: "rgb(239,68,68)", border: "rgba(239,68,68,0.28)" };
  if (status === "sending") return { bg: "rgba(59,130,246,0.14)", fg: "rgb(59,130,246)", border: "rgba(59,130,246,0.28)" };
  return { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)", border: "rgba(245,158,11,0.26)" };
}

export function BroadcastHistoryList(props: { limit?: number }) {
  const [items, setItems] = useState<OutboundItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const limit = props.limit ?? 30;

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/gtm/outbound/recent?limit=${limit}`, { cache: "no-store" });
        const json = await res.json();
        if (stopped) return;
        if (json?.ok) {
          setItems(json.items || []);
          setError(null);
        } else {
          setError(String(json?.error || "outbound_history_failed"));
        }
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "outbound_history_error");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 2500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [limit]);

  const rows = useMemo(() => items.slice(0, limit), [items, limit]);

  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>Outbound history</div>
        <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>recent: {rows.length}</div>
      </div>

      {error ? (
        <div style={{ marginTop: 10, color: "rgb(239,68,68)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{error}</div>
      ) : rows.length === 0 ? (
        <div style={{ marginTop: 10, color: "var(--text-2)" }}>No outbound items yet.</div>
      ) : (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {rows.map((it) => {
            const chip = statusChip(it.status);
            const excerpt = String(it.formattedText || "").slice(0, 140) + (String(it.formattedText || "").length > 140 ? "…" : "");
            return (
              <div
                key={it.id}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.18)",
                  padding: "10px 12px",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--font-mono)" }}>
                      {platformGlyph(it.platform)}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>
                      {it.platform} • {it.cloneVoice} • {it.persona}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>scheduled: {it.scheduledAt}</div>
                    <div style={{ padding: "4px 10px", borderRadius: 999, background: chip.bg, border: `1px solid ${chip.border}`, color: chip.fg, fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {it.status}
                    </div>
                  </div>
                </div>
                <div style={{ color: "var(--text-2)", whiteSpace: "pre-wrap" }}>{excerpt}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
