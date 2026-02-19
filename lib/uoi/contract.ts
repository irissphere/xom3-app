// UOI Contract - Every subsystem must implement this

export interface UOISubsystem {
  emitSignal(signal: UOISignal): void;
  receiveDirective(directive: UOIDirective): Promise<void>;
  reportState(): UOIState;
  requestDecision(context: any): Promise<UOIDecision>;
}

export interface UOISignal {
  id: string;
  source: string;
  type: string;
  payload: any;
  timestamp: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface UOIDirective {
  id: string;
  type: "PAUSE_PIPELINE" | "RESUME_PIPELINE" | "REWRITE_MAPPING" | "REBALANCE_WORKFLOW" | "TRIGGER_ALERT" | "OPTIMIZE_ORDER" | "REQUEST_HUMAN_REVIEW";
  target: string;
  payload: any;
  reason: string;
  timestamp: string;
}

export interface UOIState {
  subsystem: string;
  status: "active" | "paused" | "error";
  metrics: Record<string, number>;
  lastUpdated: string;
}

export interface UOIDecision {
  decision: string;
  reasoning: string;
  confidence: number;
}
