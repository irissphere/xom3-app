"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Lead = {
  id: string;
  mapping: any;
  createdAt?: string;
};

type CampaignInstance = {
  instanceId: string;
  campaignId: string;
  status: string;
  startedAt: number;
  completedAt?: number;
  steps: Array<{ stepId: string; status: string; scheduledAt?: number; outboundItemIds?: string[] }>;
};

type FunnelState = {
  funnelId: string;
  stageId: string;
  enteredAt: number;
  history: Array<{ stageId: string; enteredAt: number; eventType: string }>;
};

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const [lead, setLead] = useState<Lead | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignInstance[]>([]);
  const [funnel, setFunnel] = useState<FunnelState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        if (!id) return;
        const leadsRes = await fetch("/api/console/leads", { cache: "no-store" });
        const leads = await leadsRes.json();
        const found = Array.isArray(leads) ? leads.find((l: any) => String(l.id) === String(id)) : null;
        if (!found) throw new Error("lead_not_found");
        if (stopped) return;
        setLead(found);

        const [cmpRes, funnelRes] = await Promise.all([
          fetch(`/api/gtm/campaigns/subject/${encodeURIComponent(String(id))}`, { cache: "no-store" }),
          fetch(`/api/gtm/funnels/entity/${encodeURIComponent(String(id))}`, { cache: "no-store" }),
        ]);

        const cmpJson = await cmpRes.json();
        const funnelJson = await funnelRes.json();
        if (stopped) return;

        setCampaigns(Array.isArray(cmpJson?.instances) ? cmpJson.instances : []);
        setFunnel(funnelJson?.ok ? funnelJson.state : null);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "load_failed");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 3500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [id]);

  const title = useMemo(() => {
    const name = lead?.mapping?.businessName || lead?.mapping?.name || "Lead";
    return `${name} · ${id}`;
  }, [lead, id]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="text-slate-400 text-xs font-mono">CONTACT DETAIL (GTM‑3)</div>
            <h1 className="text-2xl font-bold text-white mt-2">{title}</h1>
          </div>
          <Link className="text-cyan-400 hover:text-cyan-300 text-sm" href="/console">
            ← back to console
          </Link>
        </div>

        {error ? (
          <div className="mt-8 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 font-mono text-sm">{error}</div>
        ) : !lead ? (
          <div className="mt-8 text-slate-400 font-mono text-sm">loading…</div>
        ) : (
          <div className="mt-8 grid gap-8">
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-white font-semibold mb-3">Contact</div>
              <div className="text-slate-300 text-sm grid gap-2">
                <div>
                  <span className="text-slate-500 font-mono text-xs">business</span> {String(lead.mapping?.businessName || "—")}
                </div>
                <div>
                  <span className="text-slate-500 font-mono text-xs">email</span> {String(lead.mapping?.email || "—")}
                </div>
                <div>
                  <span className="text-slate-500 font-mono text-xs">phone</span> {String(lead.mapping?.phone || "—")}
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-white font-semibold">Funnel</div>
                <a className="text-cyan-400 hover:text-cyan-300 text-sm" href={`/api/gtm/funnels/entity/${encodeURIComponent(String(id))}`}>
                  view (api)
                </a>
              </div>
              {!funnel ? (
                <div className="mt-3 text-slate-400 text-sm">No funnel posture recorded.</div>
              ) : (
                <div className="mt-4">
                  <div className="text-slate-300 text-sm">
                    current stage: <span className="font-mono text-white">{funnel.stageId}</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {funnel.history.slice(-6).reverse().map((h, idx) => (
                      <div key={idx} className="text-slate-400 font-mono text-xs">
                        {new Date(h.enteredAt).toLocaleString()} → {h.stageId} ({h.eventType})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-white font-semibold">Active campaigns</div>
                <a className="text-cyan-400 hover:text-cyan-300 text-sm" href={`/api/gtm/campaigns/subject/${encodeURIComponent(String(id))}`}>
                  view (api)
                </a>
              </div>

              {campaigns.length === 0 ? (
                <div className="mt-3 text-slate-400 text-sm">No campaigns on this contact.</div>
              ) : (
                <div className="mt-4 grid gap-4">
                  {campaigns.map((c) => (
                    <div key={c.instanceId} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                      <div className="flex justify-between gap-4 flex-wrap">
                        <div>
                          <div className="text-slate-200 font-semibold">{c.campaignId}</div>
                          <div className="text-slate-500 font-mono text-xs">instance: {c.instanceId}</div>
                        </div>
                        <div className="text-slate-300 font-mono text-xs">status: {c.status}</div>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {c.steps.map((s) => (
                          <div key={s.stepId} className="flex justify-between gap-4 text-xs font-mono">
                            <div className="text-slate-400">{s.stepId}</div>
                            <div className="text-slate-300">{s.status}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
