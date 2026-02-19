import type { Xom3MasterData } from '@/app/xom3/useXom3MasterData';

export const mockXom3MasterData: Xom3MasterData = {
  health: {
    cockpit: 'ok',
    uoi: 'ok',
    hse: 'ok',
    updatedAt: new Date().toISOString(),
  },
  tenants: [
    {
      id: 'hi5',
      name: 'HI5',
      domain: 'hi5.localhost',
      status: 'active',
      posture: 'nominal',
      health: {
        workflows: 5,
        scrapers: 3,
        errors: 0,
      },
      pipelines: {
        recent: 10,
        errors: 0,
      },
    },
    {
      id: 'test-tenant',
      name: 'Test Tenant',
      domain: 'test.localhost',
      status: 'active',
      posture: 'nominal',
      health: {
        workflows: 2,
        scrapers: 1,
        errors: 0,
      },
      pipelines: {
        recent: 5,
        errors: 0,
      },
    },
  ],
  sovereigns: [
    {
      id: 'sovereign-1',
      name: 'Sovereign Unit 1',
      status: 'online',
      errors: 0,
      workload: 2,
      lastRunAt: new Date().toISOString(),
      pipelines: ['pipeline-1', 'pipeline-2'],
    },
    {
      id: 'sovereign-2',
      name: 'Sovereign Unit 2',
      status: 'degraded',
      errors: 1,
      workload: 5,
      lastRunAt: new Date().toISOString(),
      pipelines: ['pipeline-3'],
    },
  ],
  agents: [
    {
      id: 'agent-1',
      name: 'Agent 1',
      state: 'idle',
    },
    {
      id: 'agent-2',
      name: 'Agent 2',
      state: 'working',
    },
  ],
  hi5: {
    pipelineRecent: [
      {
        id: 'record-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'Test Record',
        email: 'test@example.com',
        company: 'Test Company',
        step: 'contacted',
        leadStatus: 'new',
      },
    ],
  },
  sovereignIntel: {
    'sovereign-1': {
      status: 'online',
      errors: 0,
      workload: 2,
      lastRunAt: new Date().toISOString(),
      pipelines: ['pipeline-1', 'pipeline-2'],
    },
    'sovereign-2': {
      status: 'degraded',
      errors: 1,
      workload: 5,
      lastRunAt: new Date().toISOString(),
      pipelines: ['pipeline-3'],
    },
  },
  autonomy: {
    enabled: false,
    log: [],
    executions: [],
    agents: {},
  },
  controls: {
    autonomousMode: false,
    killSwitchArmed: false,
  },
  billing: {
    obols: null,
  },
  meta: {
    loading: false,
    errors: {},
    sources: {
      diagnostics: { ok: true, status: 200, updatedAt: new Date().toISOString() },
      heartbeat_workflows: { ok: true, status: 200, updatedAt: new Date().toISOString() },
      heartbeat_scrapers: { ok: true, status: 200, updatedAt: new Date().toISOString() },
    },
  },
  actions: {
    refreshAll: async () => {},
    runAction: async () => ({}),
    runTenantAction: async () => ({}),
    toggleAutonomous: async () => ({}),
    reportAgentAction: async () => ({}),
  },
};

export const mockXom3MasterDataLoading: Xom3MasterData = {
  ...mockXom3MasterData,
  meta: {
    ...mockXom3MasterData.meta,
    loading: true,
  },
};

export const mockXom3MasterDataWithErrors: Xom3MasterData = {
  ...mockXom3MasterData,
  health: {
    ...mockXom3MasterData.health,
    cockpit: 'degraded',
  },
  meta: {
    ...mockXom3MasterData.meta,
    errors: {
      diagnostics: 'fetch_failed',
    },
    sources: {
      ...mockXom3MasterData.meta.sources,
      diagnostics: { ok: false, status: 0, updatedAt: new Date().toISOString() },
    },
  },
};
