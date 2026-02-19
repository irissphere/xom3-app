// Broadcast Engine - Queue Store
// In-memory queue store (replace with Redis/database in production)

import { QueueTask, QueueName, QueueStats } from "./types";

// In-memory queues
const queues: Record<QueueName, QueueTask[]> = {
  posting_queue: [],
  scraping_queue: [],
  trend_queue: [],
  lead_queue: [],
  funnel_queue: [],
  cleanup_queue: []
};

// Processing tasks (tasks currently being processed)
const processing: Map<string, QueueTask> = new Map();

// Completed tasks (for history)
const completed: QueueTask[] = [];

// Failed tasks (dead letter queue)
const failed: QueueTask[] = [];

/**
 * Enqueue task
 */
export function enqueue(
  queue: QueueName,
  type: string,
  payload: any,
  options?: {
    priority?: "high" | "medium" | "low";
    scheduledAt?: string;
    maxAttempts?: number;
    metadata?: Record<string, any>;
  }
): string {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const task: QueueTask = {
    id: taskId,
    queue,
    type,
    payload,
    priority: options?.priority || "medium",
    attempts: 0,
    maxAttempts: options?.maxAttempts || 3,
    createdAt: new Date().toISOString(),
    scheduledAt: options?.scheduledAt,
    metadata: options?.metadata
  };
  
  queues[queue].push(task);
  
  // Sort by priority and scheduled time
  queues[queue].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
    return aTime - bTime;
  });
  
  return taskId;
}

/**
 * Dequeue task (get next task to process)
 */
export function dequeue(queue: QueueName): QueueTask | null {
  const queueTasks = queues[queue];
  
  // Find next available task (not scheduled for future, not already processing)
  const now = new Date();
  const task = queueTasks.find(t => {
    if (t.scheduledAt && new Date(t.scheduledAt) > now) {
      return false; // Not ready yet
    }
    if (processing.has(t.id)) {
      return false; // Already processing
    }
    return true;
  });
  
  if (!task) {
    return null;
  }
  
  // Remove from queue and add to processing
  const index = queueTasks.indexOf(task);
  queueTasks.splice(index, 1);
  processing.set(task.id, task);
  task.startedAt = new Date().toISOString();
  task.attempts++;
  
  return task;
}

/**
 * Complete task
 */
export function completeTask(taskId: string): void {
  const task = processing.get(taskId);
  if (!task) return;
  
  processing.delete(taskId);
  task.completedAt = new Date().toISOString();
  completed.push(task);
  
  // Keep last 10000 completed tasks
  if (completed.length > 10000) {
    completed.shift();
  }
}

/**
 * Fail task
 */
export function failTask(taskId: string, error: string): void {
  const task = processing.get(taskId);
  if (!task) return;
  
  processing.delete(taskId);
  task.failedAt = new Date().toISOString();
  task.error = error;
  
  // Retry if attempts < maxAttempts
  if (task.attempts < task.maxAttempts) {
    // Re-enqueue with exponential backoff
    const delay = Math.pow(2, task.attempts) * 1000; // 1s, 2s, 4s, 8s...
    const retryAt = new Date(Date.now() + delay).toISOString();
    task.scheduledAt = retryAt;
    task.error = undefined;
    queues[task.queue].push(task);
  } else {
    // Move to dead letter queue
    failed.push(task);
    
    // Keep last 5000 failed tasks
    if (failed.length > 5000) {
      failed.shift();
    }
  }
}

/**
 * Get queue stats
 */
export function getQueueStats(queue: QueueName): QueueStats {
  const queueTasks = queues[queue];
  const processingCount = Array.from(processing.values())
    .filter(t => t.queue === queue).length;
  
  const completedCount = completed.filter(t => t.queue === queue).length;
  const failedCount = failed.filter(t => t.queue === queue).length;
  
  const lastProcessed = completed
    .filter(t => t.queue === queue)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0]
    ?.completedAt;
  
  return {
    queue,
    pending: queueTasks.length,
    processing: processingCount,
    completed: completedCount,
    failed: failedCount,
    deadLetter: failedCount,
    lastProcessed
  };
}

/**
 * Get all queue stats
 */
export function getAllQueueStats(): Record<QueueName, QueueStats> {
  return {
    posting_queue: getQueueStats("posting_queue"),
    scraping_queue: getQueueStats("scraping_queue"),
    trend_queue: getQueueStats("trend_queue"),
    lead_queue: getQueueStats("lead_queue"),
    funnel_queue: getQueueStats("funnel_queue"),
    cleanup_queue: getQueueStats("cleanup_queue")
  };
}

/**
 * Get task by ID
 */
export function getTask(taskId: string): QueueTask | null {
  // Check processing
  if (processing.has(taskId)) {
    return processing.get(taskId)!;
  }
  
  // Check queues
  for (const queue of Object.values(queues)) {
    const task = queue.find(t => t.id === taskId);
    if (task) return task;
  }
  
  // Check completed
  const completedTask = completed.find(t => t.id === taskId);
  if (completedTask) return completedTask;
  
  // Check failed
  const failedTask = failed.find(t => t.id === taskId);
  if (failedTask) return failedTask;
  
  return null;
}
