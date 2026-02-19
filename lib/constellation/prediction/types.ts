export interface PredictiveSignal {
  id: string;
  sovereign: string;
  risk: number; // 0–1
  reasons: string[];
  predictedState: string; // 'healthy' | 'degraded' | 'error'
  at: number;
}

export interface PredictiveReflex {
  id: string;
  source: string;
  condition: (signal: PredictiveSignal) => boolean;
  action: string; // ritual or sovereign directive
  description: string;
}
