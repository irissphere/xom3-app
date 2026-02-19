"use client";

import { useEffect, useMemo, useState } from "react";

type Status = {
  totalPosts: number;
  scheduled: number;
  published: number;
  failed: number;
  byPlatform: Record<string, number>;
};

export default function SocialBroadcastPanel() {
  const [stats, setStats] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch("/api/social/status", { cache: "no-store" });
        const json = await res.json();
        if (stopped) return;
        if (json?.success) {
          setStats(json.data);
          setError(null);
        } else {
          setError(String(json?.error || "social_status_failed"));
        }
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "social_status_error");
      } finally {
        if (!stopped) setLoading(false);
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 6000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  const platformRows = useMemo(() => {
    const by = stats?.byPlatform || {};
    return Object.keys(by)
      .sort((a, b) => (by[b] || 0) - (by[a] || 0))
      .map((k) => ({ platform: k, count: by[k] || 0 }));
  }, [stats]);

  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Social Broadcast</div>
          <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>lane: Broadcast · posture: live</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Stat label="total" value={stats?.totalPosts ?? "—"} />
          <Stat label="scheduled" value={stats?.scheduled ?? "—"} accent="rgba(59,130,246,0.22)" />
          <Stat label="published" value={stats?.published ?? "—"} accent="rgba(34,197,94,0.22)" />
          <Stat label="failed" value={stats?.failed ?? "—"} accent="rgba(239,68,68,0.22)" />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>loading…</div>
        ) : error ? (
          <div style={{ color: "rgb(239,68,68)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{error}</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>by platform</div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {platformRows.map((r) => (
                  <div key={r.platform} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ color: "var(--text-1)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.platform}</div>
                    <div style={{ color: "var(--text-0)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.count}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>controls</div>
              <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                <a className="xom3-btn xom3-btnSecondary" href="/api/social/posts">
                  view queue (api)
                </a>
                <a className="xom3-btn xom3-btnSecondary" href="/api/constellation/prediction">
                  predictive signals (api)
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat(props: { label: string; value: string | number; accent?: string }) {
  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${props.accent || "rgba(255,255,255,0.06)"}`,
        minWidth: 86,
        textAlign: "center",
      }}
    >
      <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em" }}>{props.label}</div>
      <div style={{ marginTop: 2, fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-0)", fontWeight: 800 }}>{props.value}</div>
    </div>
  );
}
