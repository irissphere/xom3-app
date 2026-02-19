"use client";

// Broadcast Engine - Lead Flow Panel
// Shows new leads, lead score, lead tier, lead urgency, platform origin

import { useEffect, useState } from "react";

interface Lead {
  id: string;
  user_id?: string;
  username?: string;
  platform: string;
  lead_score: number;
  lead_tier: string;
  urgency: string;
  content: string;
  source_post_id?: string;
  pipeline_entry_point: string;
  detected_at: string;
}

export default function LeadFlowPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);
  
  async function fetchLeads() {
    try {
      const response = await fetch("/api/broadcast/dashboard/leads?limit=50");
      const data = await response.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  }
  
  const hotLeads = leads.filter(l => l.lead_tier === "hot");
  const warmLeads = leads.filter(l => l.lead_tier === "warm");
  const avgScore = leads.length > 0 
    ? Math.round(leads.reduce((sum, l) => sum + l.lead_score, 0) / leads.length)
    : 0;
  
  return (
    <div className="broadcast-panel lead-flow">
      <h3>Lead Flow</h3>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-value">{leads.length}</div>
              <div className="stat-label">Total Leads</div>
            </div>
            <div className="stat hot">
              <div className="stat-value">{hotLeads.length}</div>
              <div className="stat-label">Hot Leads</div>
            </div>
            <div className="stat warm">
              <div className="stat-value">{warmLeads.length}</div>
              <div className="stat-label">Warm Leads</div>
            </div>
            <div className="stat">
              <div className="stat-value">{avgScore}</div>
              <div className="stat-label">Avg Score</div>
            </div>
          </div>
          
          <div className="leads-list">
            <h4>Recent Leads</h4>
            {leads.slice(0, 10).map(lead => (
              <div key={lead.id} className={`lead-item ${lead.lead_tier}`}>
                <div className="lead-header">
                  <span className="lead-platform">{lead.platform}</span>
                  <span className={`lead-tier ${lead.lead_tier}`}>{lead.lead_tier}</span>
                  <span className={`lead-urgency ${lead.urgency}`}>{lead.urgency}</span>
                </div>
                <div className="lead-score">Score: {lead.lead_score}/100</div>
                <div className="lead-content">{lead.content?.substring(0, 150)}</div>
                <div className="lead-username">@{lead.username || lead.user_id}</div>
                <div className="lead-pipeline">{lead.pipeline_entry_point}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
