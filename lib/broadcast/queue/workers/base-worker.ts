// Broadcast Engine - Base Worker
// Base class for all workers

import { QueueTask, QueueName, WorkerType, WorkerConfig } from "../types";
import { dequeue, completeTask, failTask } from "../queue-store";
import { emitSignal } from "@/lib/uoi/signals";

export abstract class BaseWorker {
  protected config: WorkerConfig;
  protected running: boolean = false;
  protected processing: Set<string> = new Set();
  
  constructor(config: WorkerConfig) {
    this.config = config;
  }
  
  /**
   * Start worker
   */
  async start(): Promise<void> {
    if (this.running) {
      console.warn(`[Worker] ${this.config.workerType} already running`);
      return;
    }
    
    this.running = true;
    console.log(`[Worker] ${this.config.workerType} started`);
    
    // Start processing loop
    this.processLoop();
  }
  
  /**
   * Stop worker
   */
  async stop(): Promise<void> {
    this.running = false;
    console.log(`[Worker] ${this.config.workerType} stopped`);
  }
  
  /**
   * Process loop
   */
  private async processLoop(): Promise<void> {
    while (this.running) {
      try {
        // Check if we can process more tasks
        if (this.processing.size >= this.config.concurrency) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        // Dequeue task
        const task = dequeue(this.config.queue);
        if (!task) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s if no tasks
          continue;
        }
        
        // Process task
        this.processTask(task);
      } catch (error: any) {
        console.error(`[Worker] ${this.config.workerType} error:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  /**
   * Process task
   */
  private async processTask(task: QueueTask): Promise<void> {
    this.processing.add(task.id);
    
    try {
      // Set timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Task timeout")), this.config.timeout);
      });
      
      // Process task
      const processPromise = this.execute(task);
      
      // Race between processing and timeout
      await Promise.race([processPromise, timeoutPromise]);
      
      // Complete task
      completeTask(task.id);
      this.processing.delete(task.id);
      
      // Emit signal
      emitSignal({
        source: "broadcast_engine",
        type: "task_completed",
        payload: {
          taskId: task.id,
          queue: task.queue,
          type: task.type,
          worker: this.config.workerType
        },
        priority: "low"
      });
      
    } catch (error: any) {
      this.processing.delete(task.id);
      
      // Fail task
      failTask(task.id, error.message || "Unknown error");
      
      // Emit signal
      emitSignal({
        source: "broadcast_engine",
        type: "task_failed",
        payload: {
          taskId: task.id,
          queue: task.queue,
          type: task.type,
          worker: this.config.workerType,
          error: error.message,
          attempts: task.attempts
        },
        priority: task.attempts >= task.maxAttempts ? "high" : "medium"
      });
    }
  }
  
  /**
   * Execute task (implemented by subclasses)
   */
  protected abstract execute(task: QueueTask): Promise<void>;
}
