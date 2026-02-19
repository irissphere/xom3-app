"use client";

import React, { useState, useEffect } from 'react';

interface Workflow {
  key: string;
  name: string;
  status: 'success' | 'running' | 'error' | 'unknown';
  dealValue: string;
}

interface RFQ {
  id: string;
  rfqNumber: string;
  company: string;
  contact: string;
  vendor: string;
  services: string[];
  status: string;
  submittedDate: string;
  dealValue: string;
  rfqDetails?: string;
  requiresApproval?: boolean;
}

export default function Hi5MonitorPanel() {
  const [workflows, setWorkflows] = useState<Workflow[]>([
    { key: 'lead-intake', name: 'Lead Intake', status: 'success', dealValue: '$50K' },
    { key: 'vendor-rfq', name: 'Vendor RFQ', status: 'success', dealValue: '$120K' },
    { key: 'response-engine', name: 'Response Engine', status: 'running', dealValue: '$500K' },
    { key: 'linkedin-scraper', name: 'LinkedIn Scraper', status: 'success', dealValue: '$30K' },
    { key: 'twitter-scraper', name: 'Twitter Scraper', status: 'success', dealValue: '$20K' },
    { key: 'instagram-scraper', name: 'Instagram Scraper', status: 'success', dealValue: '$15K' }
  ]);

  const [rfqs, setRfqs] = useState<RFQ[]>([
    { id: '1', rfqNumber: 'RFQ-2025-001', company: 'TechCorp Solutions', contact: 'John Smith', vendor: 'Vendor A', services: ['Internet', 'Voice'], status: 'Draft', submittedDate: '2025-01-02', dealValue: '$50K', rfqDetails: 'SD-WAN Implementation for 5 locations', requiresApproval: true },
    { id: '2', rfqNumber: 'RFQ-2025-002', company: 'EduDistrict Unified', contact: 'Jane Doe', vendor: 'Vendor B', services: ['Security'], status: 'Sent', submittedDate: '2025-01-01', dealValue: '$120K', rfqDetails: 'Network security upgrade for 12 schools', requiresApproval: false },
    { id: '3', rfqNumber: 'RFQ-2025-003', company: 'Metro Healthcare', contact: 'Bob Johnson', vendor: 'Vendor C', services: ['Networking', 'Voice'], status: 'Quote Received', submittedDate: '2024-12-30', dealValue: '$75K', rfqDetails: 'VoIP system replacement', requiresApproval: false },
  ]);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'workflows' | 'rfqs' | 'leads'>('workflows');
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [editingRFQ, setEditingRFQ] = useState<RFQ | null>(null);
  const [viewingLead, setViewingLead] = useState<any | null>(null);
  const [showDealValueHelp, setShowDealValueHelp] = useState(false);
  const [scrapingInProgress, setScrapingInProgress] = useState(false);
  const [lastDiscoveryResults, setLastDiscoveryResults] = useState<any>(null);
  const [showDiscoveryResults, setShowDiscoveryResults] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    const fetchLeads = async () => {
      if (activeTab === 'leads') {
        setLeadsLoading(true);
        try {
          const res = await fetch('/api/hi5/pipeline/recent?limit=20');
          const json = await res.json();
          if (json.ok && json.records) {
            setLeads(json.records);
          }
        } catch (err) {
          console.error('Failed to fetch leads:', err);
        } finally {
          setLeadsLoading(false);
        }
      }
    };
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const getWorkflowStatus = (workflow: Workflow) => {
    return workflow.status;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return { icon: '✅', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'SUCCESS' };
      case 'running':
        return { icon: '🔄', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'RUNNING' };
      case 'error':
        return { icon: '❌', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'ERROR' };
      default:
        return { icon: '⏸️', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'PAUSED' };
    }
  };

  const getRFQStatusConfig = (status: string) => {
    switch (status) {
      case 'Sent':
        return { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' };
      case 'Acknowledged':
        return { color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' };
      case 'Quote Received':
        return { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' };
      case 'Draft':
        return { color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30' };
      default:
        return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
    }
  };

  const approveRFQ = (rfqId: string) => {
    setRfqs(prev => prev.map(rfq => 
      rfq.id === rfqId 
        ? { ...rfq, status: 'Sent', requiresApproval: false }
        : rfq
    ));
  };

  const saveRFQEdit = (updatedRFQ: RFQ) => {
    setRfqs(prev => prev.map(rfq => 
      rfq.id === updatedRFQ.id 
        ? updatedRFQ
        : rfq
    ));
    setEditingRFQ(null);
  };

  const healthyWorkflows = workflows.filter(w => getWorkflowStatus(w) !== 'unknown').length;

  const handleRealTimeDiscovery = async () => {
    setScrapingInProgress(true);
    try {
      const response = await fetch('/api/hi5/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: ['VoIP', 'Internet', 'Fiber', 'Network', 'Cyber Security', 'WiFi'],
          location: 'Texas',
          maxResults: 5
        })
      });

      const data = await response.json();

      if (data.ok) {
        setLastDiscoveryResults(data);
        setShowDiscoveryResults(true);
        // Refresh leads data
        if (activeTab === 'leads') {
          const res = await fetch('/api/hi5/pipeline/recent?limit=20');
          const json = await res.json();
          if (json.ok && json.records) {
            setLeads(json.records);
          }
        }
      } else {
        alert(`Discovery failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Discovery error:', error);
      alert('Failed to run lead discovery');
    } finally {
      setScrapingInProgress(false);
    }
  };

  return (
    <div className="xom3-panel h-full flex flex-col relative overflow-hidden">
      {/* Background Ambient Effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />

      {/* Header */}
      <div className="xom3-panel-header relative z-10 pb-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="xom3-panel-title flex items-center gap-3 mb-2">
              <span>HI5 Workflow Monitor</span>
              <span className="xom3-badge xom3-badge-success">
                ACTIVE
              </span>
            </div>
            <div className="xom3-panel-subtitle">
              Real-time monitoring and control of telecom/IT procurement automation
            </div>
          </div>

          {/* Global Controls */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 relative z-10 overflow-y-auto pr-1">
        {/* System Health Overview */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold mb-1">System Health</div>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                {healthyWorkflows}
                <span className="text-sm font-normal text-[var(--text-2)]">/ {workflows.length} workflows</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[var(--text-1)] text-sm font-medium">
                Operational
              </div>
              <div className="text-xs text-[var(--text-2)]">42 leads processed today</div>
            </div>
          </div>

          {/* Real-time Discovery Controls */}
          <div className="flex gap-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
            <button
              onClick={handleRealTimeDiscovery}
              disabled={scrapingInProgress}
              className="xom3-btn xom3-btnPrimary flex-1"
            >
              {scrapingInProgress ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Discovering...
                </>
              ) : (
                <>
                  🔍 Run Lead Discovery
                </>
              )}
            </button>
            <button
              onClick={() => setShowDiscoveryResults(!showDiscoveryResults)}
              className="xom3-btn xom3-btnSecondary"
              disabled={!lastDiscoveryResults}
            >
              📊 Results
            </button>
          </div>

          {/* Discovery Results */}
          {showDiscoveryResults && lastDiscoveryResults && (
            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
              <div className="text-xs text-[var(--text-2)] uppercase tracking-wider font-semibold mb-3">
                Last Discovery: {new Date(lastDiscoveryResults.scrapedAt).toLocaleString()}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <div className="text-[var(--text-1)] font-medium">{lastDiscoveryResults.summary.totalLeads}</div>
                  <div className="text-xs text-[var(--text-2)]">Total Leads Found</div>
                </div>
                <div>
                  <div className="text-[var(--text-1)] font-medium">{lastDiscoveryResults.summary.totalRFPs}</div>
                  <div className="text-xs text-[var(--text-2)]">Active RFPs</div>
                </div>
              </div>
              <div className="text-xs text-[var(--text-2)] space-y-1">
                <div className="flex justify-between">
                  <span>RFP Boards:</span>
                  <span className="text-[var(--text-1)]">{lastDiscoveryResults.summary.leadsBySource['rfp-boards'] || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Job Boards:</span>
                  <span className="text-[var(--text-1)]">{lastDiscoveryResults.summary.leadsBySource['job-boards'] || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>News Sources:</span>
                  <span className="text-[var(--text-1)]">{lastDiscoveryResults.summary.leadsBySource['news-sources'] || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-[rgba(255,255,255,0.08)]">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'workflows'
                ? 'border-[var(--xom3-primary)] text-white'
                : 'border-transparent text-[var(--text-2)] hover:text-[var(--text-1)]'
            }`}
          >
            Workflows ({workflows.length})
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'leads'
                ? 'border-[var(--xom3-primary)] text-white'
                : 'border-transparent text-[var(--text-2)] hover:text-[var(--text-1)]'
            }`}
          >
            Discovered Leads ({leads.length || '...'})
          </button>
          <button
            onClick={() => setActiveTab('rfqs')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'rfqs'
                ? 'border-[var(--xom3-primary)] text-white'
                : 'border-transparent text-[var(--text-2)] hover:text-[var(--text-1)]'
            }`}
          >
            RFQs ({rfqs.length})
          </button>
        </div>

        {/* Workflows Tab */}
        {activeTab === 'workflows' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((workflow) => {
              const status = getWorkflowStatus(workflow);
              const config = getStatusConfig(status);
              
              return (
                <div
                  key={workflow.key}
                  className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 transition-all duration-200 hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.12)]"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl ${config.color}`}>{config.icon}</div>
                      <div>
                        <div className={`text-sm font-bold ${config.color} mb-0.5`}>
                          {config.label}
                        </div>
                        <div className="text-xs text-[var(--text-2)]">
                          5m ago
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div 
                        className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2 py-1 rounded cursor-help relative group"
                        onMouseEnter={() => setShowDealValueHelp(true)}
                        onMouseLeave={() => setShowDealValueHelp(false)}
                      >
                        {workflow.dealValue}
                        {showDealValueHelp && (
                          <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-[rgba(0,0,0,0.95)] border border-[rgba(255,255,255,0.2)] rounded-lg text-xs text-white z-50 shadow-xl">
                            <div className="font-semibold mb-1">Deal Value</div>
                            <div className="text-[var(--text-2)]">
                              Estimated potential revenue from this workflow. Based on average deal size and conversion rates.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Workflow Name & Description */}
                  <div className="mb-4">
                    <div className="text-base font-bold text-white mb-1 leading-tight">
                      {workflow.name}
                    </div>
                    <div className="text-xs text-[var(--text-2)] leading-relaxed">
                      {workflow.key === 'lead-intake' && 'Processes incoming leads from all sources'}
                      {workflow.key === 'vendor-rfq' && 'Submits RFQs to vendor network'}
                      {workflow.key === 'response-engine' && 'Positions and tracks vendor responses'}
                      {workflow.key === 'linkedin-scraper' && 'Discovers leads on LinkedIn'}
                      {workflow.key === 'twitter-scraper' && 'Monitors Twitter for opportunities'}
                      {workflow.key === 'instagram-scraper' && 'Scans Instagram for prospects'}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[var(--text-2)]">
                      Agents handle continuous optimization
                    </div>
                    <div className={`text-xs font-medium px-2 py-1 rounded ${
                      workflow.status === 'success' ? 'text-green-400 bg-green-500/20' :
                      workflow.status === 'running' ? 'text-blue-400 bg-blue-500/20' :
                      'text-gray-400 bg-gray-500/20'
                    }`}>
                      {workflow.status === 'success' ? 'OPTIMIZED' :
                       workflow.status === 'running' ? 'ACTIVE' : 'MONITORING'}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">
                Discovered Leads
              </div>
              <div className="text-xs text-[var(--text-2)]">
                Leads discovered by LinkedIn, Twitter, and Instagram scrapers
              </div>
            </div>

            {leadsLoading ? (
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
                <div className="text-[var(--text-2)] animate-pulse">Loading leads...</div>
              </div>
            ) : leads.length === 0 ? (
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
                <div className="text-[var(--text-2)] text-sm">No leads discovered yet</div>
                <div className="text-xs text-[var(--text-2)] mt-2">Leads will appear here once scrapers discover them</div>
              </div>
            ) : (
              leads.map((lead, idx) => {
                const leadData = lead.data || {};
                const company = leadData.company || leadData.businessName || lead.company || 'Unknown Company';
                const contact = leadData.contact || leadData.name || lead.name || 'Unknown Contact';
                const email = leadData.email || lead.email || null;
                const phone = leadData.phone || lead.phone || null;
                const source = leadData.source || lead.source || 'Unknown Source';
                const dealValue = leadData.dealValue || leadData.estimatedValue || '$0';
                const status = lead.step || 'new';
                const qualificationScore = leadData.qualificationScore || leadData.score || null;
                const qualified = leadData.qualified !== undefined ? leadData.qualified : (qualificationScore !== null && qualificationScore >= 50);
                const services = leadData.services || leadData.servicesInterested || [];
                const message = leadData.message || lead.message || null;
                
                return (
                  <div
                    key={lead.id || idx}
                    className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-200 cursor-pointer"
                    onClick={() => setViewingLead(lead)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <div className="text-base font-bold text-white">
                            {company}
                          </div>
                          <div className="text-xs font-medium text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">
                            {source}
                          </div>
                          {qualified && (
                            <div className="text-xs font-medium text-green-400 bg-green-500/20 px-2 py-0.5 rounded">
                              ✅ Qualified
                            </div>
                          )}
                          {qualificationScore !== null && (
                            <div className="text-xs font-medium text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">
                              Score: {qualificationScore}/100
                            </div>
                          )}
                          <div className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                            {dealValue}
                          </div>
                        </div>
                        <div className="text-sm text-white font-medium mb-2">
                          {contact}
                        </div>
                        <div className="text-xs text-[var(--text-2)] space-y-1 mb-3">
                          {email && <div>📧 {email}</div>}
                          {phone && <div>📞 {phone}</div>}
                        </div>
                        {services.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            {Array.isArray(services) ? services.map((service: string, sidx: number) => (
                              <span
                                key={sidx}
                                className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded"
                              >
                                {service}
                              </span>
                            )) : (
                              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                {services}
                              </span>
                            )}
                          </div>
                        )}
                        {message && (
                          <div className="text-xs text-[var(--text-2)] italic line-clamp-2 mt-2">
                            {message.length > 150 ? message.substring(0, 150) + '...' : message}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col gap-2">
                        <div className="text-xs text-[var(--text-2)]">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'Recent'}
                        </div>
                        <div className={`text-xs font-medium px-2 py-0.5 rounded ${
                          status === 'qualified' || status === 'lead_enriched' ? 'text-green-400 bg-green-500/20' :
                          status === 'rfq_generated' ? 'text-blue-400 bg-blue-500/20' :
                          'text-yellow-400 bg-yellow-500/20'
                        }`}>
                          {status.replace('_', ' ').toUpperCase()}
                        </div>
                        <button 
                          className="xom3-btn xom3-btnSmall xom3-btnPrimary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingLead(lead);
                          }}
                        >
                          👁️ View Full Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* RFQs Tab */}
        {activeTab === 'rfqs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">
                Active RFQs
              </div>
              <div className="text-xs text-[var(--text-2)]">
                RFQs stored in Airtable. Zoho sync available in settings.
              </div>
            </div>

            {rfqs.length === 0 ? (
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
                <div className="text-[var(--text-2)] text-sm">No RFQs found</div>
                <div className="text-xs text-[var(--text-2)] mt-2">RFQs will appear here once generated</div>
              </div>
            ) : (
              rfqs.map((rfq) => {
                const statusConfig = getRFQStatusConfig(rfq.status);
                return (
                  <div
                    key={rfq.id}
                    className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-sm font-bold text-white font-mono">
                            {rfq.rfqNumber}
                          </div>
                          <div className={`text-xs font-medium ${statusConfig.color} ${statusConfig.bg} px-2 py-0.5 rounded`}>
                            {rfq.status}
                          </div>
                          {rfq.requiresApproval && (
                            <div className="text-xs font-medium text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded">
                              ⚠️ Needs Approval
                            </div>
                          )}
                          <div 
                            className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded cursor-help relative group"
                            title="Estimated potential revenue from this RFQ"
                          >
                            {rfq.dealValue}
                          </div>
                        </div>
                        <div className="text-sm text-white font-medium mb-1">
                          {rfq.company}
                        </div>
                        <div className="text-xs text-[var(--text-2)] mb-2">
                          Contact: {rfq.contact} · Vendor: {rfq.vendor}
                        </div>
                        {rfq.rfqDetails && (
                          <div className="text-xs text-[var(--text-1)] mb-2 italic">
                            {rfq.rfqDetails}
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          {rfq.services.map((service, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-white/5 text-[var(--text-2)] px-2 py-0.5 rounded"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col gap-2">
                        <div className="text-xs text-[var(--text-2)]">
                          {new Date(rfq.submittedDate).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2 flex-col">
                          {rfq.requiresApproval && rfq.status === 'Draft' && (
                            <button 
                              className="xom3-btn xom3-btnSmall xom3-btnPrimary"
                              onClick={() => approveRFQ(rfq.id)}
                            >
                              ✓ Approve
                            </button>
                          )}
                          <button 
                            className="xom3-btn xom3-btnSmall xom3-btnSecondary"
                            onClick={() => setEditingRFQ(rfq)}
                          >
                            ✏️ Edit
                          </button>
                          <button className="xom3-btn xom3-btnSmall xom3-btnSecondary">
                            👁️ View
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Pipeline Activity */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">
              Recent Pipeline Activity
            </div>
            <button className="xom3-btn xom3-btnSmall xom3-btnSecondary">
              📊 View All
            </button>
          </div>

          <div className="space-y-3">
            {[
              { company: 'TechCorp Solutions', service: 'SD-WAN Implementation', time: '2m ago', status: 'qualified', value: '$50K' },
              { company: 'EduDistrict Unified', service: 'Internet Upgrade RFP', time: '15m ago', status: 'rfq_sent', value: '$120K' },
              { company: 'Metro Healthcare', service: 'VoIP System', time: '32m ago', status: 'responding', value: '$75K' },
            ].map((item, index) => {
              const statusConfig = {
                qualified: { color: 'text-green-400', bg: 'bg-green-500/20', dot: 'bg-green-400' },
                rfq_sent: { color: 'text-blue-400', bg: 'bg-blue-500/20', dot: 'bg-blue-400' },
                responding: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', dot: 'bg-yellow-400' }
              };
              const config = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.qualified;
              
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${config.dot} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-semibold text-white truncate">
                          {item.company}
                        </div>
                        <div className={`text-xs font-medium ${config.color} ${config.bg} px-2 py-0.5 rounded flex-shrink-0`}>
                          {item.value}
                        </div>
                      </div>
                      <div className="text-xs text-[var(--text-2)] truncate">
                        {item.service}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-2)] ml-4 flex-shrink-0">
                    {item.time}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* View Lead Details Modal */}
      {viewingLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[rgba(5,8,16,0.98)] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Lead Details</h3>
              <button
                onClick={() => setViewingLead(null)}
                className="text-[var(--text-2)] hover:text-white text-2xl leading-none"
              >
                ✕
              </button>
            </div>
            
            {(() => {
              const leadData = viewingLead.data || {};
              const company = leadData.company || leadData.businessName || viewingLead.company || 'Unknown Company';
              const contact = leadData.contact || leadData.name || viewingLead.name || 'Unknown Contact';
              const email = leadData.email || viewingLead.email || 'Not provided';
              const phone = leadData.phone || viewingLead.phone || 'Not provided';
              const source = leadData.source || viewingLead.source || 'Unknown Source';
              const message = leadData.message || leadData.serviceDetails || viewingLead.message || 'No details';
              const services = leadData.services || leadData.servicesInterested || [];
              const dealValue = leadData.dealValue || leadData.estimatedValue || '$0';
              const status = viewingLead.step || 'new';
              const qualificationScore = leadData.qualificationScore || leadData.score || null;
              const qualified = leadData.qualified || qualificationScore >= 50;
              const timeline = leadData.timeline || 'Not specified';
              const budget = leadData.budgetRange || leadData.budget || 'Not specified';
              const title = leadData.title || leadData.jobTitle || 'Not provided';
              const industry = leadData.industry || 'Not provided';
              const companySize = leadData.companySize || 'Not provided';
              const location = leadData.location || leadData.address || 'Not provided';
              const website = leadData.website || 'Not provided';
              
              return (
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-white mb-1">{company}</div>
                        <div className="text-lg text-[var(--text-1)] mb-2">{contact}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={`text-xs font-medium px-2 py-1 rounded ${
                            qualified ? 'text-green-400 bg-green-500/20' : 'text-yellow-400 bg-yellow-500/20'
                          }`}>
                            {qualified ? '✅ Qualified' : '⚠️ Needs Qualification'}
                          </div>
                          <div className="text-xs font-medium text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded">
                            {source}
                          </div>
                          <div className="text-xs font-medium text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                            {dealValue}
                          </div>
                          {qualificationScore !== null && (
                            <div className="text-xs font-medium text-purple-400 bg-purple-500/20 px-2 py-1 rounded">
                              Score: {qualificationScore}/100
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-[var(--text-2)] mb-1">
                          {viewingLead.createdAt ? new Date(viewingLead.createdAt).toLocaleString() : 'Recent'}
                        </div>
                        <div className={`text-xs font-medium px-2 py-1 rounded ${
                          status === 'qualified' ? 'text-green-400 bg-green-500/20' :
                          status === 'rfq_generated' ? 'text-blue-400 bg-blue-500/20' :
                          'text-yellow-400 bg-yellow-500/20'
                        }`}>
                          {status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                      <div className="text-xs uppercase tracking-wider text-[var(--text-2)] font-semibold mb-3">Contact Information</div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <div className="text-[var(--text-2)] text-xs mb-0.5">Email</div>
                          <div className="text-white">{email}</div>
                        </div>
                        <div>
                          <div className="text-[var(--text-2)] text-xs mb-0.5">Phone</div>
                          <div className="text-white">{phone}</div>
                        </div>
                        <div>
                          <div className="text-[var(--text-2)] text-xs mb-0.5">Title</div>
                          <div className="text-white">{title}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                      <div className="text-xs uppercase tracking-wider text-[var(--text-2)] font-semibold mb-3">Company Information</div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <div className="text-[var(--text-2)] text-xs mb-0.5">Industry</div>
                          <div className="text-white">{industry}</div>
                        </div>
                        <div>
                          <div className="text-[var(--text-2)] text-xs mb-0.5">Company Size</div>
                          <div className="text-white">{companySize}</div>
                        </div>
                        <div>
                          <div className="text-[var(--text-2)] text-xs mb-0.5">Location</div>
                          <div className="text-white">{location}</div>
                        </div>
                        {website !== 'Not provided' && (
                          <div>
                            <div className="text-[var(--text-2)] text-xs mb-0.5">Website</div>
                            <div className="text-white break-all">{website}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Services & Requirements */}
                  {services.length > 0 && (
                    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                      <div className="text-xs uppercase tracking-wider text-[var(--text-2)] font-semibold mb-3">Services Interested</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {Array.isArray(services) ? services.map((service: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded"
                          >
                            {service}
                          </span>
                        )) : (
                          <span className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded">
                            {services}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Project Details */}
                  <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-2)] font-semibold mb-3">Project Details</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-[var(--text-2)] text-xs mb-1">Timeline</div>
                        <div className="text-white">{timeline}</div>
                      </div>
                      <div>
                        <div className="text-[var(--text-2)] text-xs mb-1">Budget Range</div>
                        <div className="text-white">{budget}</div>
                      </div>
                    </div>
                  </div>

                  {/* Message/Notes */}
                  {message !== 'No details' && (
                    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                      <div className="text-xs uppercase tracking-wider text-[var(--text-2)] font-semibold mb-3">Lead Message / Notes</div>
                      <div className="text-sm text-[var(--text-1)] whitespace-pre-wrap">{message}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                    <button className="xom3-btn xom3-btnPrimary flex-1">
                      Generate RFQ
                    </button>
                    <button className="xom3-btn xom3-btnSecondary">
                      Open in Airtable
                    </button>
                    <button 
                      className="xom3-btn xom3-btnSecondary"
                      onClick={() => setViewingLead(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Edit RFQ Modal */}
      {editingRFQ && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[rgba(5,8,16,0.98)] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Edit RFQ: {editingRFQ.rfqNumber}</h3>
              <button
                onClick={() => setEditingRFQ(null)}
                className="text-[var(--text-2)] hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-company" className="text-xs uppercase tracking-wider text-[var(--text-2)] mb-1 block">Company</label>
                <input
                  id="edit-company"
                  type="text"
                  value={editingRFQ.company}
                  onChange={(e) => setEditingRFQ({ ...editingRFQ, company: e.target.value })}
                  className="xom3-input"
                  aria-label="Company name"
                />
              </div>
              <div>
                <label htmlFor="edit-contact" className="text-xs uppercase tracking-wider text-[var(--text-2)] mb-1 block">Contact</label>
                <input
                  id="edit-contact"
                  type="text"
                  value={editingRFQ.contact}
                  onChange={(e) => setEditingRFQ({ ...editingRFQ, contact: e.target.value })}
                  className="xom3-input"
                  aria-label="Contact name"
                />
              </div>
              <div>
                <label htmlFor="edit-vendor" className="text-xs uppercase tracking-wider text-[var(--text-2)] mb-1 block">Vendor</label>
                <input
                  id="edit-vendor"
                  type="text"
                  value={editingRFQ.vendor}
                  onChange={(e) => setEditingRFQ({ ...editingRFQ, vendor: e.target.value })}
                  className="xom3-input"
                  aria-label="Vendor name"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[var(--text-2)] mb-1 block">Deal Value</label>
                <input
                  type="text"
                  value={editingRFQ.dealValue}
                  onChange={(e) => setEditingRFQ({ ...editingRFQ, dealValue: e.target.value })}
                  className="xom3-input"
                  placeholder="$50K"
                />
                <div className="text-xs text-[var(--text-2)] mt-1">
                  Estimated potential revenue from this RFQ
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[var(--text-2)] mb-1 block">RFQ Details</label>
                <textarea
                  value={editingRFQ.rfqDetails || ''}
                  onChange={(e) => setEditingRFQ({ ...editingRFQ, rfqDetails: e.target.value })}
                  className="xom3-input min-h-[100px]"
                  placeholder="RFQ description and requirements..."
                />
              </div>
              <div>
                <label htmlFor="edit-status" className="text-xs uppercase tracking-wider text-[var(--text-2)] mb-1 block">Status</label>
                <select
                  id="edit-status"
                  value={editingRFQ.status}
                  onChange={(e) => setEditingRFQ({ ...editingRFQ, status: e.target.value })}
                  className="xom3-input"
                  aria-label="RFQ status"
                >
                  <option>Draft</option>
                  <option>Sent</option>
                  <option>Acknowledged</option>
                  <option>Quote Received</option>
                  <option>Expired</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                className="xom3-btn xom3-btnPrimary flex-1"
                onClick={() => saveRFQEdit(editingRFQ)}
              >
                Save Changes
              </button>
              <button
                className="xom3-btn xom3-btnSecondary"
                onClick={() => setEditingRFQ(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




