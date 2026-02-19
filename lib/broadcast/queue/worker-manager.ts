// Broadcast Engine - Worker Manager
// Manages all workers and scaling

import { BaseWorker } from "./workers/base-worker";
import { PostingWorker } from "./workers/posting-worker";
import { ScrapingWorker } from "./workers/scraping-worker";
import { TrendWorker } from "./workers/trend-worker";
import { LeadWorker } from "./workers/lead-worker";
import { FunnelWorker } from "./workers/funnel-worker";
import { CleanupWorker } from "./workers/cleanup-worker";
import { getAllQueueStats } from "./queue-store";
import { WorkerType } from "./types";

export class WorkerManager {
  private workers: Map<WorkerType, BaseWorker[]> = new Map();
  private scalingInterval?: NodeJS.Timeout;
  
  constructor() {
    // Initialize workers
    this.initializeWorkers();
  }
  
  /**
   * Initialize workers
   */
  private initializeWorkers(): void {
    // Start with 1 worker of each type
    this.addWorker("posting_worker", new PostingWorker());
    this.addWorker("scraping_worker", new ScrapingWorker());
    this.addWorker("trend_worker", new TrendWorker());
    this.addWorker("lead_worker", new LeadWorker());
    this.addWorker("funnel_worker", new FunnelWorker());
    this.addWorker("cleanup_worker", new CleanupWorker());
  }
  
  /**
   * Add worker
   */
  private addWorker(type: WorkerType, worker: BaseWorker): void {
    if (!this.workers.has(type)) {
      this.workers.set(type, []);
    }
    this.workers.get(type)!.push(worker);
    worker.start();
  }
  
  /**
   * Start all workers
   */
  async startAll(): Promise<void> {
    for (const workerList of Array.from(this.workers.values())) {
      for (const worker of workerList) {
        await worker.start();
      }
    }
    
    // Start auto-scaling
    this.startAutoScaling();
    
    console.log("[Worker Manager] All workers started");
  }
  
  /**
   * Stop all workers
   */
  async stopAll(): Promise<void> {
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
    }
    
    for (const workerList of Array.from(this.workers.values())) {
      for (const worker of workerList) {
        await worker.stop();
      }
    }
    
    console.log("[Worker Manager] All workers stopped");
  }
  
  /**
   * Start auto-scaling
   */
  private startAutoScaling(): void {
    this.scalingInterval = setInterval(() => {
      this.scaleWorkers();
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Scale workers based on queue length
   */
  private scaleWorkers(): void {
    const stats = getAllQueueStats();
    
    // Scale each worker type based on queue length
    for (const [queue, queueStats] of Object.entries(stats)) {
      const workerType = this.getWorkerTypeForQueue(queue as any);
      if (!workerType) continue;
      
      const currentWorkers = this.workers.get(workerType) || [];
      const pending = queueStats.pending;
      const processing = queueStats.processing;
      
      // Scale up if queue is backing up
      if (pending > 50 && currentWorkers.length < 10) {
        const newWorker = this.createWorker(workerType);
        this.addWorker(workerType, newWorker);
        console.log(`[Worker Manager] Scaled up ${workerType} (${currentWorkers.length + 1} workers)`);
      }
      
      // Scale down if queue is empty
      if (pending === 0 && processing === 0 && currentWorkers.length > 1) {
        const worker = currentWorkers.pop();
        if (worker) {
          worker.stop();
          console.log(`[Worker Manager] Scaled down ${workerType} (${currentWorkers.length} workers)`);
        }
      }
    }
  }
  
  /**
   * Get worker type for queue
   */
  private getWorkerTypeForQueue(queue: string): WorkerType | null {
    const mapping: Record<string, WorkerType> = {
      posting_queue: "posting_worker",
      scraping_queue: "scraping_worker",
      trend_queue: "trend_worker",
      lead_queue: "lead_worker",
      funnel_queue: "funnel_worker",
      cleanup_queue: "cleanup_worker"
    };
    
    return mapping[queue] || null;
  }
  
  /**
   * Create worker by type
   */
  private createWorker(type: WorkerType): BaseWorker {
    switch (type) {
      case "posting_worker":
        return new PostingWorker();
      case "scraping_worker":
        return new ScrapingWorker();
      case "trend_worker":
        return new TrendWorker();
      case "lead_worker":
        return new LeadWorker();
      case "funnel_worker":
        return new FunnelWorker();
      case "cleanup_worker":
        return new CleanupWorker();
      default:
        throw new Error(`Unknown worker type: ${type}`);
    }
  }
  
  /**
   * Get worker stats
   */
  getStats(): Record<WorkerType, number> {
    const stats: Record<string, number> = {};
    
    for (const [type, workers] of Array.from(this.workers.entries())) {
      stats[type] = workers.length;
    }
    
    return stats as Record<WorkerType, number>;
  }
}

// Singleton instance
let workerManager: WorkerManager | null = null;

/**
 * Get worker manager instance
 */
export function getWorkerManager(): WorkerManager {
  if (!workerManager) {
    workerManager = new WorkerManager();
  }
  return workerManager;
}
