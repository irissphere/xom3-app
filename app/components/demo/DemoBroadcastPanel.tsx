"use client";

import Link from "next/link";
import Button from "../ui/Button";

export default function DemoBroadcastPanel() {
  const samplePosts = [
    { platform: "Twitter/X", content: "Just launched our new automation suite...", engagement: "1.2K", time: "2h ago" },
    { platform: "LinkedIn", content: "Excited to share our latest workflow...", engagement: "450", time: "5h ago" },
    { platform: "Instagram", content: "Behind the scenes of our tech stack...", engagement: "890", time: "1d ago" },
  ];

  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Broadcast Automation Preview</h3>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--text-1)" }}>
            Sample social posts — automation preview
          </p>
        </div>
        <Link href="/client/login" style={{ textDecoration: "none" }}>
          <Button variant="ghost" style={{ fontSize: 12, padding: "8px 12px" }}>
            Full Access →
          </Button>
        </Link>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {samplePosts.map((post, idx) => (
          <div
            key={idx}
            style={{
              padding: 14,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(90,200,250,0.95)" }}>{post.platform}</div>
              <div style={{ fontSize: 11, color: "var(--text-2)" }}>{post.time}</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-1)", marginBottom: 8 }}>{post.content}</div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>Engagement: {post.engagement}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
