"use client";

import { OperatorPanelFrame, PostureChip, PanelError, PanelEmpty, useOperatorPanel } from "@/app/operator/dashboard/components/OperatorDashboardPanelKit";
import { SocialPost } from "@/lib/social/types";
import type { OperatorDashboardContext } from "@/app/operator/dashboard/page";

async function loadQueue(ctx: OperatorDashboardContext): Promise<{ items: SocialPost[] }> {
  const res = await fetch("/api/social/posts", { 
    cache: "no-store",
    headers: ctx.headers
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "failed_to_load_queue");
  return { items: json.data.items };
}

export default function QueuePanel(props: { ctx?: OperatorDashboardContext }) {
  const defaultCtx: OperatorDashboardContext = {
    tenant: "default",
    role: "operator",
    actorId: null,
    actorLabel: "queue_panel",
    headers: { "x-xom3-tenant": "default" }
  };

  const ctx = props.ctx || defaultCtx;

  const { state } = useOperatorPanel({
    panel: "social_queue",
    ctx,
    load: loadQueue,
    refreshMs: 5000,
  });

  const posts = state.data?.items || [];

  return (
    <OperatorPanelFrame
      title="Broadcast Queue"
      hint={state.loading ? "Refreshing signals…" : `Active queue: ${posts.length} items`}
    >
      {state.error ? <PanelError error={state.error} /> : null}

      {!state.loading && posts.length === 0 ? (
        <PanelEmpty label="No posts in queue" />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                padding: 12,
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <PostureChip label={post.platform} tone="neutral" />
                  <span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
                    {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : "Unscheduled"}
                  </span>
                </div>
                <PostureChip
                  label={post.status}
                  tone={
                    post.status === "published" ? "ok" :
                    post.status === "failed" ? "error" :
                    post.status === "scheduled" ? "neutral" : "missing"
                  }
                />
              </div>
              <div style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {post.content}
              </div>
              {post.errorMessage && (
                <div style={{ fontSize: 10, color: "rgb(248,113,113)", fontFamily: "var(--font-mono)" }}>
                  Error: {post.errorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </OperatorPanelFrame>
  );
}
