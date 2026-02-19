// Broadcast Engine - Queue System Types
// The infrastructure layer that makes the Broadcast Engine unstoppable

export type QueueName = 
  | "posting_queue"
  | "scraping_queue"
  | "trend_queue"
  | "lead_queue"
  | "funnel_queue"
  | "cleanup_queue";

export type WorkerType = 
  | "posting_worker"
  | "scraping_worker"
  | "trend_worker"
  | "lead_worker"
  | "funnel_worker"
  | "cleanup_worker";

export interface QueueTask {
  id: string;
  queue: QueueName;
  type: string;
  payload: any;
  priority: "high" | "medium" | "low";
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface QueueStats {
  queue: QueueName;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  lastProcessed?: string;
}

export interface WorkerConfig {
  workerType: WorkerType;
  queue: QueueName;
  concurrency: number; // Max concurrent tasks
  retryAttempts: number;
  retryDelay: number; // Base delay in ms
  timeout: number; // Task timeout in ms
  enabled: boolean;
}
