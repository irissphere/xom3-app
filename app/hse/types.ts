// HSE Runtime Types (app-facing)
// This is the shared contract consumed by UOI posture/directive logic.

export type SovereignPosture = "normal" | "protective" | "recovery" | "aggressive";

export interface HseSubsystemState {
  health?: number; // 0-1
  load?: number; // 0-1
  errors?: number;
  queue?: number;
  drift?: number; // 0-1
  [key: string]: any;
}

export interface HseVector {
  subsystem: string;
  value: number; // 0-1
  [key: string]: any;
}

export interface HseAnomalyCluster {
  id?: string;
  severity: number; // 1-10
  label?: string;
  subsystems?: string[];
  patterns?: string[];
  [key: string]: any;
}

export interface HseDirective {
  target: string;
  action: string;
  reason: string;
  [key: string]: any;
}

export interface HseState {
  globalState?: string;
  subsystems: Record<string, HseSubsystemState>;
  riskVectors: HseVector[];
  driftVectors: HseVector[];
  queuePressure: HseVector[];
  anomalyClusters: HseAnomalyCluster[];
  sovereignPosture: SovereignPosture;
  currentDirective: HseDirective;
  [key: string]: any;
}





























