// Broadcast Engine - Posting Worker
// Handles all posting tasks

import { BaseWorker } from "./base-worker";
import { QueueTask, WorkerConfig } from "../types";
import { crossPost } from "../../auto-posting-engine";
import { BroadcastPost, Platform } from "../../types";
import { getPost } from "../../store";

export class PostingWorker extends BaseWorker {
  constructor(config?: Partial<WorkerConfig>) {
    super({
      workerType: "posting_worker",
      queue: "posting_queue",
      concurrency: 5, // Max 5 concurrent posts
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 60000, // 60s timeout
      enabled: true,
      ...config
    });
  }
  
  protected async execute(task: QueueTask): Promise<void> {
    const { postId, platforms, credentials, options } = task.payload;
    
    // Get post
    const post = getPost(postId);
    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }
    
    // Post to platforms
    const result = await crossPost(
      post,
      platforms as Platform[],
      credentials || {},
      options
    );
    
    if (result.totalFailed > 0) {
      throw new Error(`Failed to post to ${result.totalFailed} platform(s)`);
    }
  }
}
