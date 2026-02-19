"use client";

import { useState, useEffect } from "react";
import { Xom3MasterData } from "../../useXom3MasterData";

interface AgentMonitoringPanelProps {
  data: Xom3MasterData;
}

interface AgentMetrics {
  id: string;
  name: string;
  status: "online" | "working" | "idle" | "error" | "offline";
  sovereign: string;
  lastExecution?: string;
  successRate: number;
  executionsToday: number;
  avgResponseTime: number;
  costSavings?: number;
  alerts: number;
  customer?: string;
}

interface CustomerAgentSummary {
  customerId: string;
  customerName: string;
  agents: AgentMetrics[];
  totalAgents: number;
  activeAgents: number;
  totalSavings: number;
  alertsCount: number;
}

export default function AgentMonitoringPanel({ data }: AgentMonitoringPanelProps) {
  const [selectedView, setSelectedView] = useState<"all" | "hi5" | "customers">("all");
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics[]>([]);
  const [customerAgents, setCustomerAgents] = useState<CustomerAgentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [summaryStats, setSummaryStats] = useState({
    totalAgents: 0,
    activeAgents: 0,
    totalExecutionsToday: 0,
    totalCostSavings: 0
  });

  const fetchAgentData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/xom3/agents/monitoring');
      const result = await response.json();

      if (result.success) {
        const { hi5Agents, customerAgents: customerData, allAgents, summary } = result.data;

        if (selectedView === "all") {
          setAgentMetrics(allAgents || []);
        } else if (selectedView === "hi5") {
          setAgentMetrics(hi5Agents || []);
        } else if (selectedView === "customers") {
          setCustomerAgents(customerData || []);
        }

        setSummaryStats(summary || {
          totalAgents: 0,
          activeAgents: 0,
          totalExecutionsToday: 0,
          totalCostSavings: 0
        });

        setLastUpdated(result.timestamp);
      }
    } catch (error) {
      console.error('Failed to fetch agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAgentData, 30000);
    return () => clearInterval(interval);
  }, [selectedView]);

  const handleRefresh = () => {
    fetchAgentData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "text-green-400";
      case "working": return "text-blue-400";
      case "idle": return "text-yellow-400";
      case "error": return "text-red-400";
      case "offline": return "text-gray-400";
      default: return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online": return "🟢";
      case "working": return "🔄";
      case "idle": return "⏸️";
      case "error": return "❌";
      case "offline": return "⚫";
      default: return "⚫";
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  return (
    <div className="xom3-panel">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400">🤖</span>
            Agent Monitoring Center
          </h3>
          {loading && <span className="text-yellow-400 text-sm">Refreshing...</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Updated: {new Date(lastUpdated).toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh agent data"
          >
            🔄
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedView("all")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                selectedView === "all"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                  : "bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50"
              }`}
            >
              All Agents
            </button>
            <button
              onClick={() => setSelectedView("hi5")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                selectedView === "hi5"
                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                  : "bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50"
              }`}
            >
              HI5 Agents
            </button>
            <button
              onClick={() => setSelectedView("customers")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                selectedView === "customers"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                  : "bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50"
              }`}
            >
              Customer Agents
            </button>
          </div>
        </div>
      </div>

      {selectedView !== "customers" && (
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentMetrics.map((agent) => (
              <div key={agent.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getStatusIcon(agent.status)}</span>
                    <h4 className="text-sm font-semibold text-white truncate">{agent.name}</h4>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(agent.status)} bg-current/10`}>
                    {agent.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Success Rate:</span>
                    <span className="text-green-400 font-mono">{agent.successRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Executions Today:</span>
                    <span className="text-blue-400 font-mono">{agent.executionsToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Response:</span>
                    <span className="text-yellow-400 font-mono">{agent.avgResponseTime}ms</span>
                  </div>
                  {agent.costSavings && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cost Savings:</span>
                      <span className="text-green-400 font-mono">${agent.costSavings}</span>
                    </div>
                  )}
                  {agent.lastExecution && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Execution:</span>
                      <span className="text-gray-300">{formatTime(agent.lastExecution)}</span>
                    </div>
                  )}
                  {agent.alerts > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Alerts:</span>
                      <span className="text-red-400 font-mono">{agent.alerts}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-700">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">{agent.sovereign}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedView === "customers" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {customerAgents.map((customer) => (
              <div key={customer.customerId} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">{customer.customerName}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-sm">
                      {customer.activeAgents}/{customer.totalAgents} Active
                    </span>
                    {customer.alertsCount > 0 && (
                      <span className="text-red-400 text-sm bg-red-500/10 px-2 py-1 rounded">
                        {customer.alertsCount} Alerts
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {customer.agents.map((agent) => (
                    <div key={agent.id} className="bg-gray-900/50 rounded p-3 border border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{agent.name}</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(agent.status)} bg-current/10`}>
                          {agent.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Success:</span>
                          <span className="text-green-400">{agent.successRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Executions:</span>
                          <span className="text-blue-400">{agent.executionsToday}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Cost Savings:</span>
                    <span className="text-green-400 font-semibold">${customer.totalSavings}/month</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {selectedView === "customers" ? customerAgents.reduce((sum, c) => sum + c.totalAgents, 0) : summaryStats.totalAgents}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              {selectedView === "hi5" ? "HI5 Agents" :
               selectedView === "customers" ? "Customer Agents" :
               "Total Agents"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {summaryStats.activeAgents}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {summaryStats.totalExecutionsToday}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Executions Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              ${summaryStats.totalCostSavings}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Cost Savings</div>
          </div>
        </div>
      </div>
    </div>
  );
}
