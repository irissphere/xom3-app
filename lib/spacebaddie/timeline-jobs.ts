export type TimelineJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface TimelineClip {
  url: string;
  label?: string;
}

export interface TimelineJob {
  jobId: string;
  status: TimelineJobStatus;
  clips: TimelineClip[];
  audioUrl?: string;
  outputUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const timelineJobs = new Map<string, TimelineJob>();

export function createTimelineJob(job: TimelineJob): TimelineJob {
  timelineJobs.set(job.jobId, job);
  return job;
}

export function getTimelineJob(jobId: string): TimelineJob | undefined {
  return timelineJobs.get(jobId);
}

export function updateTimelineJob(jobId: string, updates: Partial<TimelineJob>): TimelineJob | undefined {
  const existing = timelineJobs.get(jobId);
  if (!existing) return undefined;

  const updated: TimelineJob = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  timelineJobs.set(jobId, updated);
  return updated;
}
