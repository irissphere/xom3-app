// Broadcast Engine - Lead Worker
// Handles all lead processing tasks

import { BaseWorker } from "./base-worker";
import { QueueTask, WorkerConfig } from "../types";
import { getNormalizedSignals } from "../../signal-store";
import { scoreAndClassifyLead } from "../../lead-scoring-engine";
import { normalizedToEngagement } from "../../signal-store";
import { enqueue } from "../queue-store";

export class LeadWorker extends BaseWorker {
  constructor(config?: Partial<WorkerConfig>) {
    super({
      workerType: "lead_worker",
      queue: "lead_queue",
      concurrency: 20, // Max 20 concurrent lead scores
      retryAttempts: 2,
      retryDelay: 1000,
      timeout: 30000, // 30s timeout
      enabled: true,
      ...config
    });
  }
  
  protected async execute(task: QueueTask): Promise<void> {
    const { type, payload } = task;
    
    if (type === "process_leads") {
      // Process leads from scraping
      const { platform, postId, signalsIngested, leadsDetected } = payload;
      
      // Get recent normalized signals
      const signals = getNormalizedSignals({
        platform: platform as any,
        since: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Last hour
        limit: 100
      });
      
      // Score and classify each signal
      for (const signal of signals) {
        try {
          const engagement = normalizedToEngagement(signal);
          const classification = scoreAndClassifyLead(engagement, {
            content: signal.content,
            sentiment: signal.sentiment,
            keywords: signal.keywords
          });
          
          // If not noise, enqueue funnel processing
          if (classification.score.tier !== "noise") {
            enqueue("funnel_queue", "inject_lead", {
              leadClassification: classification,
              engagement,
              signal
            }, {
              priority: classification.score.tier === "hot" ? "high" : "medium"
            });
          }
        } catch (error: any) {
          console.error(`[Lead Worker] Failed to score signal:`, error);
        }
      }
    } else if (type === "score_lead") {
      // Score a specific lead
      const { engagement, context } = payload;
      await scoreAndClassifyLead(engagement, context);
    }
  }
}
