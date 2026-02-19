"use client";

// Broadcast Engine - Signal Flow Panel
// Shows comments, DMs, mentions, engagement deltas, sentiment

import { useEffect, useState } from "react";

interface Signal {
  id: string;
  platform: string;
  signal_type: string;
  content: string;
  sentiment: string;
  timestamp: string;
}

export default function SignalFlowPanel() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);
  
  async function fetchSignals() {
    try {
      const response = await fetch("/api/broadcast/ingest?platform=all&limit=50");
      const data = await response.json();
      if (data.success && data.signals) {
        setSignals(data.signals);
      }
    } catch (error) {
      console.error("Failed to fetch signals:", error);
    } finally {
      setLoading(false);
    }
  }
  
  const byType = signals.reduce((acc, s) => {
    acc[s.signal_type] = (acc[s.signal_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const bySentiment = signals.reduce((acc, s) => {
    acc[s.sentiment] = (acc[s.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div className="broadcast-panel signal-flow">
      <h3>Signal Flow</h3>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-value">{signals.length}</div>
              <div className="stat-label">Total Signals</div>
            </div>
            <div className="stat">
              <div className="stat-value">{byType.comment || 0}</div>
              <div className="stat-label">Comments</div>
            </div>
            <div className="stat">
              <div className="stat-value">{byType.dm || 0}</div>
              <div className="stat-label">DMs</div>
            </div>
          </div>
          
          <div className="sentiment-breakdown">
            <h4>Sentiment</h4>
            <div className="sentiment-bars">
              <div className="sentiment-bar positive">
                <span>Positive: {bySentiment.positive || 0}</span>
              </div>
              <div className="sentiment-bar neutral">
                <span>Neutral: {bySentiment.neutral || 0}</span>
              </div>
              <div className="sentiment-bar negative">
                <span>Negative: {bySentiment.negative || 0}</span>
              </div>
            </div>
          </div>
          
          <div className="signals-list">
            <h4>Recent Signals</h4>
            {signals.slice(0, 10).map(signal => (
              <div key={signal.id} className="signal-item">
                <div className="signal-type">{signal.signal_type}</div>
                <div className="signal-platform">{signal.platform}</div>
                <div className="signal-content">{signal.content?.substring(0, 100)}</div>
                <div className={`signal-sentiment ${signal.sentiment}`}>
                  {signal.sentiment}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
