// Broadcast Engine - Scraping Worker
// Handles all scraping tasks

import { BaseWorker } from "./base-worker";
import { QueueTask, WorkerConfig } from "../types";
import { ingestPlatformSignals } from "../../ingestion-orchestrator";
import { Platform } from "../../types";
import { enqueue } from "../queue-store";

export class ScrapingWorker extends BaseWorker {
  constructor(config?: Partial<WorkerConfig>) {
    super({
      workerType: "scraping_worker",
      queue: "scraping_queue",
      concurrency: 10, // Max 10 concurrent scrapes
      retryAttempts: 3,
      retryDelay: 2000,
      timeout: 120000, // 120s timeout
      enabled: true,
      ...config
    });
  }
  
  protected async execute(task: QueueTask): Promise<void> {
    const { platform, postId, since } = task.payload;
    
    // Ingest signals
    const result = await ingestPlatformSignals(platform as Platform, {
      postId,
      since
    });
    
    if (result.errors.length > 0) {
      console.warn(`[Scraping Worker] Errors: ${result.errors.join(", ")}`);
    }
    
    // If leads detected, enqueue lead processing
    if (result.leadsDetected > 0) {
      enqueue("lead_queue", "process_leads", {
        platform,
        postId,
        signalsIngested: result.signalsIngested,
        leadsDetected: result.leadsDetected
      }, {
        priority: "high"
      });
    }
  }
}
