export interface TimelineEvent {
  at: number;
  type: string;
  payload: any;
}

export interface PlaybackFrame {
  at: number;
  events: TimelineEvent[];
}

export interface SequencerState {
  frames: PlaybackFrame[];
  currentIndex: number;
  playing: boolean;
}
