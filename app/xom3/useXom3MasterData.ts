"use client";

import { useCallback, useMemo, useState } from "react";

export type CockpitHealthPosture = "ok" | "degraded" | "down";

export interface Xom3Tenant {
  id: string;
  name: string;
  domain?: string;
  status: "active" | "inactive" | string;
  posture: "nominal" | "degraded" | "critical" | string;
  health: { workflows: number; scrapers: number; errors: number };
  pipelines: { recent: number; errors: number };
}

export interface Xom3SovereignUnit {
  id: string;
  name: string;
  status: "online" | "degraded" | "offline" | string;
  errors: number;
  workload: number;
  lastRunAt?: string;
  pipelines: string[];
}

export interface Xom3AgentSummary {
  id: string;
  name: string;
  state: "idle" | "working" | "error" | string;
}

export interface Xom3Hi5PipelineRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  name?: string;
  email?: string;
  company?: string;
  step?: string;
  leadStatus?: string;
  [key: string]: any;
}

export interface Xom3MasterData {
  health: {
    cockpit: CockpitHealthPosture;
    uoi: CockpitHealthPosture;
    hse: CockpitHealthPosture;
    updatedAt: string;
  };
  tenants: Xom3Tenant[];
  sovereigns: Xom3SovereignUnit[];
  agents: Xom3AgentSummary[];
  hi5?: { pipelineRecent: Xom3Hi5PipelineRecord[] };
  sovereignIntel?: Record<string, Omit<Xom3SovereignUnit, "id" | "name">>;
  autonomy: { enabled: boolean; log: any[]; executions: any[]; agents: Record<string, any> };
  controls: { autonomousMode: boolean; killSwitchArmed: boolean };
  billing: { obols: any };
  meta: {
    loading: boolean;
    errors: Record<string, string>;
    sources: Record<string, { ok: boolean; status: number; updatedAt: string }>;
  };
  actions: {
    refreshAll: () => Promise<void>;
    runAction: (...args: any[]) => Promise<any>;
    runTenantAction: (...args: any[]) => Promise<any>;
    toggleAutonomous: (...args: any[]) => Promise<any>;
    reportAgentAction: (...args: any[]) => Promise<any>;
  };
}

export function useXom3MasterData(): Xom3MasterData {
  const [loading] = useState(false);

  const refreshAll = useCallback(async () => {}, []);
  const runAction = useCallback(async () => ({}), []);
  const runTenantAction = useCallback(async () => ({}), []);
  const toggleAutonomous = useCallback(async () => ({}), []);
  const reportAgentAction = useCallback(async () => ({}), []);

  return useMemo(
    () => ({
      health: { cockpit: "ok", uoi: "ok", hse: "ok", updatedAt: new Date().toISOString() },
      tenants: [],
      sovereigns: [],
      agents: [],
      hi5: { pipelineRecent: [] },
      sovereignIntel: {},
      autonomy: { enabled: false, log: [], executions: [], agents: {} },
      controls: { autonomousMode: false, killSwitchArmed: false },
      billing: { obols: null },
      meta: { loading, errors: {}, sources: {} },
      actions: { refreshAll, runAction, runTenantAction, toggleAutonomous, reportAgentAction },
    }),
    [loading, refreshAll, runAction, runTenantAction, toggleAutonomous, reportAgentAction]
  );
}





























