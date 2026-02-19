export type HyperstateLevel =
  | 'NOMINAL'
  | 'ELEVATED_LOAD'
  | 'DEGRADED'
  | 'CRITICAL'
  | 'RECOVERY_MODE';

export interface HyperstateSignals {
  automationQueueDepth: number;
  deadLetterCount: number;
  slowOperationScore: number;
  consistencyIssueCount: number;
  driftScore: number;
  usagePressureScore: number;
  cacheHitRate: number;
  backgroundWorkerLoad: number;
}

export interface HyperstateSnapshot {
  level: HyperstateLevel;
  signals: HyperstateSignals;
  computedAt: string; // ISO timestamp
  notes?: string[];
}
