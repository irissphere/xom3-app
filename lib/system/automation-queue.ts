// Automation Load Balancer - Workflow Stability
// Queue manager with throttling, retry logic, and dead-letter queue
// Tasks 41-43: Enhanced Automation Stability

export type AutomationTaskStatus = 
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "retrying"
  | "dead_letter";

export interface AutomationTask {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: string;
  payload: Record<string, any>;
  status: AutomationTaskStatus;
  priority: number; // 1-10, higher = more important
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  error?: string;
  executionTime?: number; // milliseconds
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  averageWaitTime: number; // milliseconds
  averageExecutionTime: number; // milliseconds
  throughput: number; // tasks per minute
}

/**
 * Automation Queue Manager
 */
export class AutomationQueue {
  private tasks: AutomationTask[] = [];
  private processing: Set<string> = new Set();
  private maxConcurrent: number = 10;
  private throttleDelay: number = 100; // milliseconds between tasks
  private deadLetterQueue: AutomationTask[] = []; // Task 42: Dead-Letter Queue
  private workerLoads: Map<string, number> = new Map(); // Task 41: Load distribution

  /**
   * Add task to queue
   * HSE Phase II: Hyperstate-aware throttling
   */
  async enqueue(task: Omit<AutomationTask, "id" | "status" | "createdAt" | "retryCount">): Promise<AutomationTask> {
    // HSE Phase II: Check hyperstate and throttle if needed
    const { getCurrentHyperstateLevel } = await import('@/lib/hse/hyperstate-context');
    const level = await getCurrentHyperstateLevel();

    if (level === 'CRITICAL') {
      // Only allow critical-tagged jobs
      if (!(task as any).isCritical) {
        // Reject non-critical jobs during CRITICAL state
        throw new Error('Non-critical automations paused during CRITICAL hyperstate');
      }
    }

    if (level === 'DEGRADED' || level === 'ELEVATED_LOAD') {
      // Maybe slow down or batch - reduce priority
      if (!task.priority || task.priority < 5) {
        (task as any).priority = Math.max(1, (task.priority || 5) - 2);
      }
    }

    const automationTask: AutomationTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: task.maxRetries || 3,
    };

    this.tasks.push(automationTask);
    this.sortQueue();
    this.saveQueue();

    return automationTask;
  }

  /**
   * Task 41: Get next task to process with load balancing
   */
  dequeue(workerId?: string): AutomationTask | null {
    // Check if we're at max concurrent
    if (this.processing.size >= this.maxConcurrent) {
      return null;
    }

    // Task 41: Load balancing - distribute tasks across workers
    if (workerId) {
      const currentLoad = this.workerLoads.get(workerId) || 0;
      if (currentLoad >= this.maxConcurrent) {
        return null; // Worker at capacity
      }
    }

    // Find highest priority pending task
    const task = this.tasks.find(t => t.status === "pending");
    if (!task) {
      return null;
    }

    task.status = "processing";
    task.startedAt = new Date().toISOString();
    this.processing.add(task.id);
    
    // Task 41: Track worker load
    if (workerId) {
      this.workerLoads.set(workerId, (this.workerLoads.get(workerId) || 0) + 1);
    }
    
    this.saveQueue();

    return task;
  }

  /**
   * Mark task as completed
   */
  complete(taskId: string, executionTime?: number, workerId?: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = "completed";
      task.completedAt = new Date().toISOString();
      task.executionTime = executionTime;
      this.processing.delete(taskId);
      
      // Task 41: Update worker load
      if (workerId) {
        const currentLoad = this.workerLoads.get(workerId) || 0;
        this.workerLoads.set(workerId, Math.max(0, currentLoad - 1));
      }
      
      this.saveQueue();
    }
  }

  /**
   * Mark task as failed and retry if possible
   */
  fail(taskId: string, error: string, workerId?: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.retryCount++;
    task.error = error;
    this.processing.delete(taskId);
    
    // Task 41: Update worker load
    if (workerId) {
      const currentLoad = this.workerLoads.get(workerId) || 0;
      this.workerLoads.set(workerId, Math.max(0, currentLoad - 1));
    }

    if (task.retryCount >= task.maxRetries) {
      // Task 42: Move to dead letter queue
      task.status = "dead_letter";
      this.deadLetterQueue.push(task);
      this.saveDeadLetterQueue();
    } else {
      // Task 43: Retry with exponential backoff
      task.status = "retrying";
      const backoffDelay = this.calculateBackoff(task.retryCount);
      // Reset for retry after delay
      setTimeout(() => {
        task.status = "pending";
        task.startedAt = undefined;
        task.error = undefined;
        this.sortQueue();
        this.saveQueue();
      }, backoffDelay);
    }

    this.saveQueue();
  }

  /**
   * Sort queue by priority (higher first), then by creation time
   */
  private sortQueue(): void {
    this.tasks.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    const completed = this.tasks.filter(t => t.status === "completed");
    const recentCompleted = completed.filter(t => {
      if (!t.completedAt) return false;
      return new Date(t.completedAt).getTime() > oneMinuteAgo;
    });

    const pending = this.tasks.filter(t => t.status === "pending");
    const averageWaitTime = pending.length > 0
      ? pending.reduce((sum, t) => {
          const wait = now - new Date(t.createdAt).getTime();
          return sum + wait;
        }, 0) / pending.length
      : 0;

    const averageExecutionTime = completed.length > 0 && completed.some(t => t.executionTime)
      ? completed
          .filter(t => t.executionTime)
          .reduce((sum, t) => sum + (t.executionTime || 0), 0) /
        completed.filter(t => t.executionTime).length
      : 0;

    return {
      total: this.tasks.length,
      pending: this.tasks.filter(t => t.status === "pending").length,
      processing: this.tasks.filter(t => t.status === "processing").length,
      completed: completed.length,
      failed: this.tasks.filter(t => t.status === "failed").length,
      deadLetter: this.deadLetterQueue.length,
      averageWaitTime,
      averageExecutionTime,
      throughput: recentCompleted.length,
    };
  }

  /**
   * Get tasks with filters
   */
  getTasks(filters?: {
    status?: AutomationTaskStatus;
    ruleId?: string;
    limit?: number;
  }): AutomationTask[] {
    let tasks = [...this.tasks];

    if (filters?.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    if (filters?.ruleId) {
      tasks = tasks.filter(t => t.ruleId === filters.ruleId);
    }

    if (filters?.limit) {
      tasks = tasks.slice(0, filters.limit);
    }

    return tasks;
  }

  /**
   * Clear completed tasks older than specified days
   */
  cleanup(daysOld: number = 7): void {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    this.tasks = this.tasks.filter(t => {
      if (t.status === "completed" && t.completedAt) {
        return new Date(t.completedAt) > cutoff;
      }
      return true;
    });
    this.saveQueue();
  }

  /**
   * Throttle: Process tasks with delay
   */
  async processWithThrottle(processor: (task: AutomationTask) => Promise<void>): Promise<void> {
    while (true) {
      const task = this.dequeue();
      if (!task) {
        await new Promise(resolve => setTimeout(resolve, this.throttleDelay));
        continue;
      }

      const startTime = Date.now();
      try {
        await processor(task);
        const executionTime = Date.now() - startTime;
        this.complete(task.id, executionTime);
      } catch (error: any) {
        this.fail(task.id, error.message || String(error));
      }

      // Throttle delay between tasks
      await new Promise(resolve => setTimeout(resolve, this.throttleDelay));
    }
  }

  /**
   * Save queue to storage
   */
  private saveQueue(): void {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("automation_queue", JSON.stringify(this.tasks));
      }
    } catch (err) {
      console.error("[Automation Queue] Failed to save queue:", err);
    }
  }

  /**
   * Load queue from storage
   */
  loadQueue(): void {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("automation_queue");
        if (stored) {
          this.tasks = JSON.parse(stored);
          // Reset processing tasks to pending
          this.tasks.forEach(t => {
            if (t.status === "processing") {
              t.status = "pending";
              t.startedAt = undefined;
            }
          });
          this.processing.clear();
        }
        
        // Load dead-letter queue
        const dlqStored = localStorage.getItem("automation_dead_letter_queue");
        if (dlqStored) {
          this.deadLetterQueue = JSON.parse(dlqStored);
        }
      }
    } catch (err) {
      console.error("[Automation Queue] Failed to load queue:", err);
    }
  }

  /**
   * Task 43: Calculate exponential backoff delay
   */
  private calculateBackoff(retryCount: number): number {
    // Exponential backoff: 2^retryCount seconds, with jitter
    const baseDelay = Math.pow(2, retryCount) * 1000; // Convert to milliseconds
    const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
    const maxDelay = 300000; // Cap at 5 minutes
    return Math.min(baseDelay + jitter, maxDelay);
  }

  /**
   * Task 42: Get dead-letter queue tasks
   */
  getDeadLetterTasks(limit?: number): AutomationTask[] {
    if (limit) {
      return this.deadLetterQueue.slice(0, limit);
    }
    return [...this.deadLetterQueue];
  }

  /**
   * Task 42: Retry task from dead-letter queue
   */
  retryFromDeadLetter(taskId: string, newMaxRetries?: number): boolean {
    const taskIndex = this.deadLetterQueue.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;

    const task = this.deadLetterQueue[taskIndex];
    this.deadLetterQueue.splice(taskIndex, 1);
    this.saveDeadLetterQueue();

    // Reset task for retry
    task.status = "pending";
    task.retryCount = 0;
    task.error = undefined;
    task.startedAt = undefined;
    task.completedAt = undefined;
    if (newMaxRetries) {
      task.maxRetries = newMaxRetries;
    }

    this.tasks.push(task);
    this.sortQueue();
    this.saveQueue();

    return true;
  }

  /**
   * Task 42: Remove task from dead-letter queue (permanently delete)
   */
  removeFromDeadLetter(taskId: string): boolean {
    const taskIndex = this.deadLetterQueue.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;

    this.deadLetterQueue.splice(taskIndex, 1);
    this.saveDeadLetterQueue();
    return true;
  }

  /**
   * Task 42: Save dead-letter queue to storage
   */
  private saveDeadLetterQueue(): void {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("automation_dead_letter_queue", JSON.stringify(this.deadLetterQueue));
      }
    } catch (err) {
      console.error("[Automation Queue] Failed to save dead-letter queue:", err);
    }
  }

  /**
   * Task 41: Get worker load distribution
   */
  getWorkerLoads(): Record<string, number> {
    const loads: Record<string, number> = {};
    for (const [workerId, load] of Array.from(this.workerLoads.entries())) {
      loads[workerId] = load;
    }
    return loads;
  }

  /**
   * Task 41: Get least loaded worker
   */
  getLeastLoadedWorker(): string | null {
    if (this.workerLoads.size === 0) return null;
    
    let minLoad = Infinity;
    let leastLoadedWorker: string | null = null;
    
    for (const [workerId, load] of Array.from(this.workerLoads.entries())) {
      if (load < minLoad) {
        minLoad = load;
        leastLoadedWorker = workerId;
      }
    }
    
    return leastLoadedWorker;
  }

  /**
   * Task 41: Set max concurrent tasks
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
  }

  /**
   * Task 41: Set throttle delay
   */
  setThrottleDelay(delay: number): void {
    this.throttleDelay = delay;
  }
}

// Global queue instance
export const automationQueue = new AutomationQueue();
