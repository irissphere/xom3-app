/**
 * Avatar Job Store
 * 
 * Manages avatar generation job state.
 * In production, replace with database.
 */

import { GenerateAvatarRequest, AvatarStatus } from './types';

export interface AvatarJobRecord {
  id: string;
  tenantId: string;
  status: AvatarStatus | string;
  progress: number;
  createdAt: string;
  updatedAt?: string;
  config: GenerateAvatarRequest;
  workerJobId?: string;  // RunPod job ID for status polling
  resultUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

// In-memory store (use database in production)
const jobStore = new Map<string, AvatarJobRecord>();

/**
 * Set/update an avatar job
 */
export function setAvatarJob(jobId: string, job: Partial<AvatarJobRecord> & { id: string; tenantId: string; createdAt: string }): void {
  const existing = jobStore.get(jobId);
  const updated: AvatarJobRecord = {
    ...existing,
    ...job,
    updatedAt: new Date().toISOString(),
  } as AvatarJobRecord;
  
  jobStore.set(jobId, updated);
}

/**
 * Get an avatar job by ID
 */
export function getAvatarJob(jobId: string): AvatarJobRecord | undefined {
  return jobStore.get(jobId);
}

/**
 * Update an avatar job
 */
export function updateAvatarJob(jobId: string, updates: Partial<AvatarJobRecord>): void {
  const existing = jobStore.get(jobId);
  if (!existing) {
    return;
  }
  
  const updated: AvatarJobRecord = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  jobStore.set(jobId, updated);
}

/**
 * Delete an avatar job
 */
export function deleteAvatarJob(jobId: string): boolean {
  return jobStore.delete(jobId);
}

/**
 * Get all jobs for a tenant
 */
export function getJobsByTenant(tenantId: string): AvatarJobRecord[] {
  const jobs: AvatarJobRecord[] = [];
  
  for (const job of Array.from(jobStore.values())) {
    if (job.tenantId === tenantId) {
      jobs.push(job);
    }
  }
  
  return jobs.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get all avatar jobs (admin only)
 */
export function getAllAvatarJobs(): AvatarJobRecord[] {
  return Array.from(jobStore.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get jobs by status
 */
export function getJobsByStatus(status: AvatarStatus): AvatarJobRecord[] {
  const jobs: AvatarJobRecord[] = [];
  
  for (const job of Array.from(jobStore.values())) {
    if (job.status === status) {
      jobs.push(job);
    }
  }
  
  return jobs;
}

/**
 * Clear all jobs (for testing/cleanup)
 */
export function clearAllJobs(): void {
  jobStore.clear();
}
