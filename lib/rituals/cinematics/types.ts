export interface RitualCinematicStep {
  ritualId: string;
  step: string;
  sovereign?: string;
  at: number;
}

export interface RitualArc {
  from: string;
  to: string;
  intensity: number; // 0–1
  color: string;
}

export interface RitualGlyph {
  id: string;
  ritualId: string;
  step: string;
  svg: string;
}
