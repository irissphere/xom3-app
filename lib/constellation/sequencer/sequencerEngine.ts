import type { PlaybackFrame, TimelineEvent } from "./types";

export function buildPlaybackFrames(events: TimelineEvent[], frameSize = 500): PlaybackFrame[] {
  const frames: PlaybackFrame[] = [];
  let currentFrame: PlaybackFrame | null = null;

  for (const evt of events) {
    if (!currentFrame) {
      currentFrame = { at: evt.at, events: [evt] };
      frames.push(currentFrame);
      continue;
    }

    if (evt.at - currentFrame.at <= frameSize) {
      currentFrame.events.push(evt);
    } else {
      currentFrame = { at: evt.at, events: [evt] };
      frames.push(currentFrame);
    }
  }

  return frames;
}
