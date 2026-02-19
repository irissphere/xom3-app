// Broadcast Engine - Funnel Worker
// Handles all funnel injection tasks

import { BaseWorker } from "./base-worker";
import { QueueTask, WorkerConfig } from "../types";
import { processLeadForHPE } from "../../hpe-integration";

export class FunnelWorker extends BaseWorker {
  constructor(config?: Partial<WorkerConfig>) {
    super({
      workerType: "funnel_worker",
      queue: "funnel_queue",
      concurrency: 15, // Max 15 concurrent funnel injections
      retryAttempts: 3,
      retryDelay: 2000,
      timeout: 60000, // 60s timeout
      enabled: true,
      ...config
    });
  }
  
  protected async execute(task: QueueTask): Promise<void> {
    const { leadClassification, engagement, signal } = task.payload;
    
    // Process lead for HPE
    const result = await processLeadForHPE(
      {
        id: signal.id,
        source: engagement.type === "comment" ? "comment" :
                engagement.type === "dm" ? "dm" :
                "keyword",
        platform: signal.platform,
        postId: signal.postId,
        userId: signal.userId,
        username: signal.username,
        content: signal.content,
        intent: leadClassification.score.intent > 30 ? "high_intent" : "medium_intent",
        score: leadClassification.score.total,
        type: leadClassification.score.tier === "hot" ? "hot" :
              leadClassification.score.tier === "warm" ? "warm" : "cold",
        urgency: leadClassification.score.urgency,
        detectedAt: signal.timestamp,
        metadata: {
          breakdown: leadClassification.score.breakdown,
          ...signal.metadata
        }
      },
      {
        name: signal.username,
        email: signal.metadata?.email,
        phone: signal.metadata?.phone,
        source: `social_${signal.platform}`,
        initialStage: leadClassification.pipelineEntryPoint as any
      }
    );
    
    if (!result.success) {
      throw new Error(`Failed to inject lead into HPE: ${result.error}`);
    }
  }
}
