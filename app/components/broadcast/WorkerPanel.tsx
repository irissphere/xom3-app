"use client";

// Broadcast Engine - Worker Panel
// Shows queue lengths, job throughput, job failures, retry counts

import { useEffect, useState } from "react";

interface QueueStats {
  queue: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
}

interface WorkerStats {
  [key: string]: number;
}

export default function WorkerPanel() {
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [workers, setWorkers] = useState<WorkerStats>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);
  
  async function fetchStats() {
    try {
      const response = await fetch("/api/broadcast/workers/stats");
      const data = await response.json();
      if (data.success) {
        setQueues(Object.values(data.queues));
        setWorkers(data.workers);
      }
    } catch (error) {
      console.error("Failed to fetch worker stats:", error);
    } finally {
      setLoading(false);
    }
  }
  
  const totalPending = queues.reduce((sum, q) => sum + q.pending, 0);
  const totalProcessing = queues.reduce((sum, q) => sum + q.processing, 0);
  const totalFailed = queues.reduce((sum, q) => sum + q.failed, 0);
  const totalWorkers = Object.values(workers).reduce((sum, count) => sum + count, 0);
  
  return (
    <div className="broadcast-panel worker-panel">
      <h3>Workers & Queues</h3>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-value">{totalWorkers}</div>
              <div className="stat-label">Active Workers</div>
            </div>
            <div className="stat">
              <div className="stat-value">{totalPending}</div>
              <div className="stat-label">Pending Jobs</div>
            </div>
            <div className="stat">
              <div className="stat-value">{totalProcessing}</div>
              <div className="stat-label">Processing</div>
            </div>
            <div className="stat error">
              <div className="stat-value">{totalFailed}</div>
              <div className="stat-label">Failed</div>
            </div>
          </div>
          
          <div className="queues-list">
            <h4>Queue Status</h4>
            {queues.map(queue => (
              <div key={queue.queue} className="queue-item">
                <div className="queue-name">{queue.queue}</div>
                <div className="queue-stats">
                  <span className="pending">Pending: {queue.pending}</span>
                  <span className="processing">Processing: {queue.processing}</span>
                  <span className="completed">Completed: {queue.completed}</span>
                  {queue.failed > 0 && (
                    <span className="failed">Failed: {queue.failed}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="workers-list">
            <h4>Workers</h4>
            {Object.entries(workers).map(([type, count]) => (
              <div key={type} className="worker-item">
                <span className="worker-type">{type}</span>
                <span className="worker-count">{count} active</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
