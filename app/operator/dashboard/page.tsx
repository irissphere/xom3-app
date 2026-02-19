"use client";

import { useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";
import { useTenant } from "@/app/providers/TenantProvider";
import LeadsTodayPanel from "./components/LeadsTodayPanel";
import TaskQueuePanel from "./components/TaskQueuePanel";
import SlaBreachPanel from "./components/SlaBreachPanel";
import SocialQueuePanel from "./components/SocialQueuePanel";
import SocialErrorsPanel from "./components/SocialErrorsPanel";
import RevenueLoopPanel from "./components/RevenueLoopPanel";
import SignalsTimelinePanel from "./components/SignalsTimelinePanel";
import TenantConfigPanel from "./components/TenantConfigPanel";
import SystemHealthPanel from "./components/SystemHealthPanel";
import SubscriptionPricingPanel from "./components/SubscriptionPricingPanel";
import ImpactRewardsPanel from "./components/ImpactRewardsPanel";
import AgentMonitoringPanel from "@/app/xom3/ui/panels/AgentMonitoringPanel";

export type OperatorDashboardRole = "operator" | "agent" | "viewer";

export type OperatorDashboardContext = {
  tenant: string;
  role: OperatorDashboardRole;
  actorId: string | null;
  actorLabel: string;
  headers: Record<string, string>;
};

function defaultTenantKeyFromTheme(themeName: string): string {
  const n = (themeName || "").toLowerCase();
  if (n.includes("kairos")) return "xom3";
  return "xom3";
}

export default function OperatorDashboardPage() {
  const tenantTheme = useTenant();
  const [tenant, setTenant] = useState<string>(() => defaultTenantKeyFromTheme(tenantTheme.name));
  const [role, setRole] = useState<OperatorDashboardRole>("operator");
  const [actorId, setActorId] = useState<string>("");

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-xom3-tenant": tenant,
      "x-xom3-role": role,
      "x-xom3-actor-id": actorId.trim() ? actorId.trim() : "",
      "x-xom3-actor-label": "operator_one_screen_dashboard",
    }),
    [tenant, role, actorId]
  );

  const ctx: OperatorDashboardContext = useMemo(
    () => ({
      tenant,
      role,
      actorId: actorId.trim() ? actorId.trim() : null,
      actorLabel: "operator_one_screen_dashboard",
      headers,
    }),
    [tenant, role, actorId, headers]
  );

  useEffect(() => {
    setTenant((t) => t || defaultTenantKeyFromTheme(tenantTheme.name));
  }, [tenantTheme.name]);

  useEffect(() => {
    // Add-only: operator.dashboard.viewed
    fetch("/api/operator/dashboard/signal", {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "operator.dashboard.viewed", payload: { surface: "operator_one_screen" } }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activation = role === "viewer" ? "dormant" : "active";

  return (
    <SurfaceFrame
      title="Operator Cockpit"
      description="Mission Control • Live Intelligence • Sovereign Automation"
      activation={activation}
      links={[
        { href: "/dashboard", label: "Home" },
        { href: "/intakecrm", label: "IntakeCRM" },
        { href: "/social", label: "Broadcast" },
        { href: "/timeline", label: "Timeline" },
      ]}
      footerNote="XOM3 Sovereign Architecture • Vieron Dynasty • Protected Surface"
    >
      {/* HUD Banner */}
      <div className="xom3-glass xom3-glassEdge" style={{ padding: "20px 24px", marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-0)' }}>
            <span style={{ color: 'var(--xom3-primary)', marginRight: 8 }}>●</span>
            Command Center
          </h2>
          <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
            System operational • {tenantTheme.name}
          </div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, textTransform: 'uppercase' }}>
            Tenant
          </div>
          <input
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            style={{ ...inputStyle(), width: 140, height: 36, fontSize: 13 }}
            placeholder="xom3"
          />

          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, textTransform: 'uppercase', marginLeft: 8 }}>
            Role
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value as OperatorDashboardRole)} style={{ ...inputStyle(), width: 120, height: 36, fontSize: 13 }}>
            <option value="operator">Operator</option>
            <option value="agent">Agent</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>

      <div className="xom3-grid xom3-grid2" style={{ marginTop: 14 }}>
        <LeadsTodayPanel ctx={ctx} />
        <TaskQueuePanel ctx={ctx} />
        <SlaBreachPanel ctx={ctx} />
        <SocialQueuePanel ctx={ctx} />
        <SocialErrorsPanel ctx={ctx} />
        <RevenueLoopPanel ctx={ctx} />
        <div style={{ gridColumn: "1 / -1" }}>
          <SignalsTimelinePanel ctx={ctx} />
        </div>
        <TenantConfigPanel ctx={ctx} />
        <SystemHealthPanel ctx={ctx} />
        <div style={{ gridColumn: "1 / -1" }}>
          <AgentMonitoringPanel data={{
            health: { cockpit: "ok", uoi: "ok", hse: "ok", updatedAt: new Date().toISOString() },
            tenants: [],
            sovereigns: [],
            agents: [],
            hi5: { pipelineRecent: [] },
            sovereignIntel: {},
            autonomy: { enabled: false, log: [], executions: [], agents: {} },
            controls: { autonomousMode: false, killSwitchArmed: false },
            billing: { obols: null },
            meta: { loading: false, errors: {}, sources: {} },
            actions: { refreshAll: async () => {}, runAction: async () => ({}), runTenantAction: async () => ({}), toggleAutonomous: async () => ({}), reportAgentAction: async () => ({}) }
          }} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <SubscriptionPricingPanel ctx={ctx} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <ImpactRewardsPanel ctx={ctx} />
        </div>
      </div>
    </SurfaceFrame>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    height: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--text-0)",
    outline: "none",
  };
}
