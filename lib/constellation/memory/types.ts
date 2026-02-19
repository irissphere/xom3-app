export interface MemoryEpoch<T> {
  at: number;
  data: T;
}

export interface SovereignPostureMemory {
  id: string;
  posture: string;
}

export interface SovereignHealthMemory {
  id: string;
  state: string;
  score: number;
  tickJitter?: number;
  errorStreak?: number;
}

export interface EventMemory {
  id: string;
  type: string;
  sovereign: string;
  tags?: string[];
  payload?: any;
}

export interface ReflexMemory {
  source: string;
  target: string;
  type: string;
}

export interface RitualMemory {
  ritualId: string;
  step: string;
  sovereign?: string;
}
