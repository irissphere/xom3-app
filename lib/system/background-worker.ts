// Background Sync Worker - Task 49
// Move heavy tasks off the main thread

export type TaskPriority = "critical" | "high" | "medium" | "low";

export interface BackgroundTask {
  id: string;
  name: string;
  priority: TaskPriority;
  execute: () => Promise<any>;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
  result?: any;
}

export interface WorkerStats {
  totalTasks: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  averageExecutionTime: number;
}

/**
 * Background Worker
 */
export class BackgroundWorker {
  private tasks: BackgroundTask[] = [];
  private processing: Set<string> = new Set();
  private maxConcurrent: number = 5;
  private isRunning: boolean = false;
  private workerInterval?: NodeJS.Timeout;

  /**
   * Add task to queue
   */
  enqueue(
    name: string,
    execute: () => Promise<any>,
    priority: TaskPriority = "medium",
    maxRetries: number = 3
  ): string {
    const task: BackgroundTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      priority,
      execute,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    this.tasks.push(task);
    this.sortQueue();
    this.startWorker();

    return task.id;
  }

  /**
   * Start worker if not running
   */
  private startWorker(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.processQueue();
  }

  /**
   * Stop worker
   */
  stop(): void {
    this.isRunning = false;
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
    }
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    while (this.isRunning) {
      // Check if we can process more tasks
      if (this.processing.size >= this.maxConcurrent) {
        await this.sleep(100);
        continue;
      }

      // Get next task
      const task = this.getNextTask();
      if (!task) {
        await this.sleep(100);
        continue;
      }

      // Process task
      this.processTask(task);
    }
  }

  /**
   * Get next task to process
   */
  private getNextTask(): BackgroundTask | null {
    const pending = this.tasks.filter(
      t => !this.processing.has(t.id) && !t.completedAt && !t.error
    );

    if (pending.length === 0) {
      return null;
    }

    // Sort by priority, then by creation time
    pending.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.createdAt - b.createdAt;
    });

    return pending[0];
  }

  /**
   * Process a task
   */
  private async processTask(task: BackgroundTask): Promise<void> {
    this.processing.add(task.id);
    task.startedAt = Date.now();

    try {
      // Execute task
      const result = await task.execute();
      task.result = result;
      task.completedAt = Date.now();
      task.retryCount = 0;
    } catch (error: any) {
      task.retryCount++;
      task.error = error.message || String(error);

      if (task.retryCount >= task.maxRetries) {
        // Max retries reached, mark as failed
        task.completedAt = Date.now();
      } else {
        // Retry after delay
        task.startedAt = undefined;
        setTimeout(() => {
          this.processing.delete(task.id);
        }, Math.pow(2, task.retryCount) * 1000);
        return;
      }
    }

    this.processing.delete(task.id);
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    this.tasks.sort((a, b) => {
      if (a.completedAt && !b.completedAt) return 1;
      if (!a.completedAt && b.completedAt) return -1;
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): BackgroundTask | null {
    return this.tasks.find(t => t.id === taskId) || null;
  }

  /**
   * Get worker statistics
   */
  getStats(): WorkerStats {
    const completed = this.tasks.filter(t => t.completedAt && !t.error);
    const failed = this.tasks.filter(t => t.completedAt && t.error);
    const pending = this.tasks.filter(t => !t.completedAt && !t.startedAt);
    const processing = this.tasks.filter(t => t.startedAt && !t.completedAt);

    const executionTimes = completed
      .filter(t => t.startedAt && t.completedAt)
      .map(t => t.completedAt! - t.startedAt!);
    const avgTime = executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0;

    return {
      totalTasks: this.tasks.length,
      completed: completed.length,
      failed: failed.length,
      pending: pending.length,
      processing: processing.length,
      averageExecutionTime: avgTime,
    };
  }

  /**
   * Clean completed tasks older than specified time
   */
  cleanup(olderThanMinutes: number = 60): void {
    const cutoff = Date.now() - olderThanMinutes * 60 * 1000;
    this.tasks = this.tasks.filter(t => {
      if (t.completedAt && t.completedAt < cutoff) {
        return false;
      }
      return true;
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set max concurrent tasks
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
  }
}

// Global worker instance
export const backgroundWorker = new BackgroundWorker();

/**
 * Helper to run task in background
 */
export function runInBackground(
  name: string,
  execute: () => Promise<any>,
  priority: TaskPriority = "medium"
): string {
  return backgroundWorker.enqueue(name, execute, priority);
}
