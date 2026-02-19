// Simple in-memory store for v1 prototype
// In production, this would be a database (Postgres/Supabase)

import { UnifiedDataModel, PipelineRecord, OperatorTimelineEvent } from './types';

type GlobalUoiStore = {
  __xom3_uoi_mock_db__?: UnifiedDataModel;
  __xom3_uoi_timeline__?: OperatorTimelineEvent[];
};

function g(): GlobalUoiStore {
  return globalThis as any;
}

export const mockDb: UnifiedDataModel =
  (g().__xom3_uoi_mock_db__ =
    g().__xom3_uoi_mock_db__ || {
      pipelines: [],
      workflows: [],
      tenants: [],
      executions: [],
      errors: [],
      patterns: [],
      optimizations: [],
      lastUpdated: new Date().toISOString(),
    });

export const timelineStore: OperatorTimelineEvent[] = (g().__xom3_uoi_timeline__ = g().__xom3_uoi_timeline__ || []);

export function addLead(lead: any) {
  const newLead: PipelineRecord = {
    id: `lead_${Date.now()}`,
    tenant: 'default',
    domain: 'intake',
    source: 'homepage',
    target: 'crm',
    mapping: lead,
    status: 'active',
    metrics: {
      throughput: 0,
      accuracy: 1,
      errorRate: 0,
      lastExecution: new Date().toISOString()
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockDb.pipelines.unshift(newLead);
  return newLead;
}

export function logEvent(event: Partial<OperatorTimelineEvent>) {
  const newEvent: OperatorTimelineEvent = {
    id: `evt_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: event.type || 'insight',
    source: event.source || 'system',
    description: event.description || '',
    ...event
  };
  timelineStore.unshift(newEvent);
  return newEvent;
}

export function getLeads() {
  return mockDb.pipelines;
}

export function getTimeline() {
  return timelineStore;
}
