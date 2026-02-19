"use client";

import Link from "next/link";
import type { OperatorDashboardContext } from "../page";
import { fetchOperatorSocialQueuePosture } from "@/lib/operator/operator-dashboard-fetch";
import { OperatorPanelFrame, PanelError, PostureChip, useOperatorPanel } from "./OperatorDashboardPanelKit";

type SocialQueueOk = Extract<Awaited<ReturnType<typeof fetchOperatorSocialQueuePosture>>, { ok: true }>;
type SocialQueueData = SocialQueueOk["data"];

async function load(ctx: OperatorDashboardContext): Promise<SocialQueueData> {
  const res = await fetchOperatorSocialQueuePosture(ctx.headers);
  if (!res.ok) throw new Error("error" in res ? res.error : "social_queue_load_failed");
  return res.data;
}

export default function SocialQueuePanel(props: { ctx: OperatorDashboardContext }) {
  const { state } = useOperatorPanel({
    ctx: props.ctx,
    panel: "social_queue",
    refreshMs: 4000,
    load,
  });

  const d = state.data;
  const next = d?.nextPublishAt ? new Date(d.nextPublishAt).toLocaleString() : "—";
  const counts = d?.counts || { scheduled: 0, publishing: 0, failed: 0 };

  return (
    <OperatorPanelFrame
      title="Social Queue"
      hint={d ? `scheduled=${counts.scheduled} • publishing=${counts.publishing} • failed=${counts.failed} • next=${next}` : "loading…"}
      right={
        <Link className="xom3-btn xom3-btnSecondary" href="/social">
          Social Queue
        </Link>
      }
    >
      {state.error ? <PanelError label="Social queue degraded" error={state.error} /> : null}
      {d ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PostureChip label={`scheduled ${counts.scheduled}`} tone={counts.scheduled > 0 ? "neutral" : "missing"} />
          <PostureChip label={`publishing ${counts.publishing}`} tone={counts.publishing > 0 ? "neutral" : "missing"} />
          <PostureChip label={`failed ${counts.failed}`} tone={counts.failed > 0 ? "degraded" : "ok"} />
          <PostureChip label={`next ${next}`} tone={d.nextPublishAt ? "neutral" : "missing"} />
        </div>
      ) : null}
    </OperatorPanelFrame>
  );
}
