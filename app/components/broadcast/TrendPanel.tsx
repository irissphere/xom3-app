"use client";

// Broadcast Engine - Trend Panel
// Shows breakout trends, sustained trends, seasonal trends, micro-trends, recommended content

import { useEffect, useState } from "react";

interface Trend {
  id: string;
  category: string;
  value: string;
  velocity: number;
  momentum: number;
  relevance: number;
  opportunity: number;
  platforms: string[];
}

export default function TrendPanel() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchTrends();
    const interval = setInterval(fetchTrends, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);
  
  async function fetchTrends() {
    try {
      const response = await fetch("/api/broadcast/trends?processed=true");
      const data = await response.json();
      if (data.success && data.trends) {
        setTrends(data.trends.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    } finally {
      setLoading(false);
    }
  }
  
  const breakout = trends.filter(t => t.category === "breakout");
  const sustained = trends.filter(t => t.category === "sustained");
  const seasonal = trends.filter(t => t.category === "seasonal");
  const micro = trends.filter(t => t.category === "micro");
  
  return (
    <div className="broadcast-panel trend-panel">
      <h3>Trends</h3>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="trend-categories">
            <div className="trend-category breakout">
              <div className="category-count">{breakout.length}</div>
              <div className="category-label">Breakout</div>
            </div>
            <div className="trend-category sustained">
              <div className="category-count">{sustained.length}</div>
              <div className="category-label">Sustained</div>
            </div>
            <div className="trend-category seasonal">
              <div className="category-count">{seasonal.length}</div>
              <div className="category-label">Seasonal</div>
            </div>
            <div className="trend-category micro">
              <div className="category-count">{micro.length}</div>
              <div className="category-label">Micro</div>
            </div>
          </div>
          
          <div className="trends-list">
            <h4>Top Trends</h4>
            {trends.slice(0, 10).map(trend => (
              <div key={trend.id} className={`trend-item ${trend.category}`}>
                <div className="trend-value">{trend.value}</div>
                <div className="trend-platforms">
                  {trend.platforms.map(p => (
                    <span key={p} className="platform-badge">{p}</span>
                  ))}
                </div>
                <div className="trend-scores">
                  <span>Velocity: {trend.velocity}</span>
                  <span>Opportunity: {trend.opportunity}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
