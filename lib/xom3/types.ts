// XOM3 Cockpit Types
export interface Xom3MasterData {
  // Core system data
  system: {
    status: 'operational' | 'degraded' | 'maintenance';
    uptime: number;
    lastHeartbeat: Date;
  };

  // Domain data
  domains: {
    benefitscrm: DomainData;
    healthcrm: DomainData;
    broadcast: DomainData;
    commerce: DomainData;
  };

  // Sovereign health
  sovereigns: {
    workflow: SovereignHealth;
    crm: SovereignHealth;
    agents: SovereignHealth;
    system: SovereignHealth;
  };
}

export interface DomainData {
  lanes: {
    intake: LaneData;
    followup: LaneData;
    eligibility: LaneData;
    automation: LaneData;
  };
  metrics: DomainMetrics;
}

export interface LaneData {
  status: 'active' | 'idle' | 'error';
  queueLength: number;
  throughput: number;
  lastActivity: Date;
}

export interface DomainMetrics {
  leadsToday: number;
  conversionRate: number;
  avgResponseTime: number;
}

export interface SovereignHealth {
  status: 'healthy' | 'warning' | 'critical';
  lastCheck: Date;
  issues: string[];
}

// Consent Management Types
export interface ConsentProfile {
  id: string;
  domain: 'benefitscrm' | 'healthcrm' | 'broadcast' | 'commerce';
  visitorId: string;
  consentGiven: boolean;
  consentTimestamp?: Date;
  consentCategories: ConsentCategory[];
  dataRetention: DataRetentionPolicy;
  jurisdiction: string;
  lastUpdated: Date;
  expiresAt?: Date;
}

export interface ConsentCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  granted: boolean;
  purpose: string;
}

export interface DataRetentionPolicy {
  duration: number; // days
  categories: string[];
  autoDelete: boolean;
}

export interface ConsentAnalytics {
  totalVisitors: number;
  consentRate: number;
  categoryBreakdown: {
    category: string;
    granted: number;
    denied: number;
  }[];
  jurisdictionStats: {
    jurisdiction: string;
    consentRate: number;
    visitorCount: number;
  }[];
}

// Signal Types for Consent Events
export interface ConsentSignal {
  source: 'consent-manager';
  type: 'consent-granted' | 'consent-revoked' | 'consent-updated';
  severity: 'info' | 'warning' | 'error';
  payload: {
    profileId: string;
    domain: string;
    changes: ConsentCategory[];
    timestamp: Date;
  };
}

// Data Flow Types
export interface DataFlowSignal {
  source: string;
  type: 'data-captured' | 'data-normalized' | 'data-stored' | 'data-analyzed';
  severity: 'info';
  payload: {
    domain: string;
    lane: string;
    dataType: 'intent' | 'behavior' | 'conversion' | 'enrichment' | 'anonymous';
    consentValidated: boolean;
    anonymized: boolean;
    size: number;
  };
}
