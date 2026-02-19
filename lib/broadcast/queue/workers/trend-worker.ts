// Broadcast Engine - Trend Worker
// Handles all trend detection tasks

import { BaseWorker } from "./base-worker";
import { QueueTask, WorkerConfig } from "../types";
import { processTrends } from "../../trend-engine";
import { executeTrendAction } from "../../trend-action-executor";
import { enqueue } from "../queue-store";

export class TrendWorker extends BaseWorker {
  constructor(config?: Partial<WorkerConfig>) {
    super({
      workerType: "trend_worker",
      queue: "trend_queue",
      concurrency: 3, // Max 3 concurrent trend analyses
      retryAttempts: 2,
      retryDelay: 5000,
      timeout: 180000, // 180s timeout
      enabled: true,
      ...config
    });
  }
  
  protected async execute(task: QueueTask): Promise<void> {
    const { action } = task.payload;
    
    if (action === "detect_trends") {
      // Process trends
      const { trends, actions: trendActions, hseState } = await processTrends();
      
      // Execute high-priority actions
      const highPriorityActions = trendActions
        .filter(a => a.priority === "high")
        .slice(0, 3); // Limit to 3 campaigns
      
      for (const trendAction of highPriorityActions) {
        try {
          const campaign = await executeTrendAction(trendAction);
          
          // If campaign generates content, enqueue posting
          if (campaign.contentIds.length > 0) {
            for (const contentId of campaign.contentIds) {
              enqueue("posting_queue", "post_content", {
                postId: contentId,
                platforms: trendAction.platforms
              }, {
                priority: "high"
              });
            }
          }
        } catch (error: any) {
          console.error(`[Trend Worker] Failed to execute action:`, error);
        }
      }
    } else if (action === "execute_action") {
      // Execute specific trend action
      const trendAction = task.payload.trendAction;
      await executeTrendAction(trendAction);
    }
  }
}
