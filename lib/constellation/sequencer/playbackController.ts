import type { PlaybackFrame, SequencerState } from "./types";

export class PlaybackController {
  state: SequencerState;

  constructor(frames: PlaybackFrame[]) {
    this.state = {
      frames,
      currentIndex: 0,
      playing: false,
    };
  }

  play(callback: (frame: PlaybackFrame) => void, speed = 1) {
    this.state.playing = true;

    const tick = () => {
      if (!this.state.playing) return;

      const frame = this.state.frames[this.state.currentIndex];
      if (frame) callback(frame);

      this.state.currentIndex += 1;
      if (this.state.currentIndex >= this.state.frames.length) {
        this.state.playing = false;
        return;
      }

      setTimeout(tick, Math.max(16, 100 / Math.max(0.1, speed)));
    };

    tick();
  }

  pause() {
    this.state.playing = false;
  }

  seek(index: number) {
    this.state.currentIndex = Math.max(0, Math.min(index, this.state.frames.length - 1));
  }
}
