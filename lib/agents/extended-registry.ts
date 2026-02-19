/**
 * XOM3 Extended Agent Registry
 * Consolidated multi-agent system with all sovereigns
 * 
 * Architecture: 7 Sovereigns, 35+ Agents
 */

// ============================================================
// AGENT TYPES & INTERFACES
// ============================================================

export interface AgentRole {
  id: string;
  name: string;
  title: string;
  domain: string;
  bootMessage: string;
  responsibilities: string[];
  capabilities: string[];
  color: string;
  icon: string;
  sovereign: SovereignId;
}

export type SovereignId =
  | 'social'
  | 'marketing'
  | 'finance'
  | 'revenue'
  | 'commerce'
  | 'compliance'
  | 'infrastructure'
  | 'broadcast';

export interface Sovereign {
  id: SovereignId;
  name: string;
  description: string;
  color: string;
  icon: string;
  agents: string[];
  targetRevenue?: number;
  webhookPath: string;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  sovereignId: SovereignId;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
  metrics?: AgentMetrics;
}

export interface AgentMetrics {
  executionTime: number;
  tokensUsed?: number;
  successRate?: number;
  lastSuccess?: string;
  lastError?: string;
  runsToday: number;
  runsTotal: number;
}

export interface AgentState {
  id: string;
  status: 'idle' | 'active' | 'error' | 'disabled';
  lastRun?: string;
  nextRun?: string;
  metrics: AgentMetrics;
  config: Record<string, unknown>;
}

// ============================================================
// SOVEREIGN DEFINITIONS
// ============================================================

export const SOVEREIGNS: Record<SovereignId, Sovereign> = {
  social: {
    id: 'social',
    name: 'Social Sovereign',
    description: 'Social media automation, content scheduling, trend awareness',
    color: '#00D9FF',
    icon: '📱',
    agents: ['content-pulse', 'reel-caster', 'youtube-agent', 'trend-scanner', 'engagement-optimizer'],
    webhookPath: '/webhook/social',
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing Sovereign',
    description: 'Lead generation, campaigns, A/B testing, referrals',
    color: '#F4B942',
    icon: '📣',
    agents: ['lead-flow', 'referral-bot', 'campaign-agent', 'ab-test-agent', 'audience-segmenter'],
    targetRevenue: 250000,
    webhookPath: '/webhook/marketing',
  },
  finance: {
    id: 'finance',
    name: 'Finance Sovereign',
    description: 'Trading, risk management, portfolio optimization, ROI tracking',
    color: '#22c55e',
    icon: '💰',
    agents: ['trade-agent', 'risk-sentinel', 'roi-tracker', 'portfolio-optimizer', 'market-sentiment'],
    targetRevenue: 300000,
    webhookPath: '/webhook/finance',
  },
  revenue: {
    id: 'revenue',
    name: 'Revenue Sovereign',
    description: 'Revenue optimization, churn prevention, pricing, CLV prediction',
    color: '#9B7EDE',
    icon: '📈',
    agents: ['revenue-optimizer', 'churn-predictor', 'clv-predictor', 'pricing-agent', 'upsell-agent'],
    webhookPath: '/webhook/revenue',
  },
  commerce: {
    id: 'commerce',
    name: 'Commerce Sovereign',
    description: 'Product management, subscriptions, fulfillment, templates',
    color: '#ef4444',
    icon: '🛒',
    agents: ['template-smith', 'saas-beacon', 'apparel-sync', 'fulfillment-agent', 'inventory-optimizer'],
    targetRevenue: 200000,
    webhookPath: '/webhook/commerce',
  },
  compliance: {
    id: 'compliance',
    name: 'Compliance Sovereign',
    description: 'Legal compliance, contracts, tax optimization, regulatory',
    color: '#8b92a7',
    icon: '⚖️',
    agents: ['compliance-bridge', 'legal-research', 'contract-weaver', 'tax-optimizer', 'ip-manager'],
    webhookPath: '/webhook/compliance',
  },
  infrastructure: {
    id: 'infrastructure',
    name: 'Infrastructure Sovereign',
    description: 'Self-healing systems, security, performance, cost optimization, monitoring',
    color: '#0d0d0f',
    icon: '🔧',
    agents: ['self-healer', 'security-hunter', 'performance-monitor', 'cost-optimizer', 'scaling-agent', 'harbinger', 'overwatch', 'verity', 'keeper'],
    webhookPath: '/webhook/infrastructure',
  },
  broadcast: {
    id: 'broadcast',
    name: 'Broadcast Sovereign',
    description: 'Content creation, video processing, automation, and CI/CD pipelines',
    color: '#6366f1',
    icon: '📺',
    agents: ['smoke-test-runner', 'subtitle-validator', 'visual-qa', 'release-gatekeeper'],
    webhookPath: '/webhook/broadcast',
  },
};

// ============================================================
// AGENT DEFINITIONS
// ============================================================

export const AGENTS: Record<string, AgentRole> = {
  // ─────────────────────────────────────────────────────────
  // SOCIAL SOVEREIGN AGENTS
  // ─────────────────────────────────────────────────────────
  'content-pulse': {
    id: 'content-pulse',
    name: 'ContentPulse',
    title: 'Content Performance Tracker',
    domain: 'Analytics, Engagement, Performance',
    bootMessage: 'ContentPulse online. Tracking views, CTR, and monetization across all platforms.',
    responsibilities: [
      'Track content performance across platforms',
      'Analyze engagement metrics',
      'Predict content success',
      'Recommend optimal posting times',
    ],
    capabilities: ['analytics', 'prediction', 'scheduling', 'reporting'],
    color: '#00D9FF',
    icon: '📊',
    sovereign: 'social',
  },
  'reel-caster': {
    id: 'reel-caster',
    name: 'ReelCaster',
    title: 'Short-Form Content Agent',
    domain: 'Reels, TikTok, Shorts',
    bootMessage: 'ReelCaster active. Formatting and syncing vertical content across platforms.',
    responsibilities: [
      'Format vertical content',
      'Sync to Instagram, TikTok, YouTube Shorts',
      'Optimize thumbnails and captions',
      'Track engagement per platform',
    ],
    capabilities: ['formatting', 'cross-posting', 'optimization', 'analytics'],
    color: '#E1306C',
    icon: '🎬',
    sovereign: 'social',
  },
  'youtube-agent': {
    id: 'youtube-agent',
    name: 'YouTubeAgent',
    title: 'YouTube Automation Agent',
    domain: 'YouTube, Long-Form Content',
    bootMessage: 'YouTubeAgent initialized. Managing uploads, metadata, and monetization.',
    responsibilities: [
      'Schedule and publish uploads',
      'Optimize titles, descriptions, tags',
      'Manage thumbnails',
      'Track monetization metrics',
    ],
    capabilities: ['scheduling', 'seo', 'monetization', 'analytics'],
    color: '#FF0000',
    icon: '▶️',
    sovereign: 'social',
  },
  'trend-scanner': {
    id: 'trend-scanner',
    name: 'TrendScanner',
    title: 'Trend Intelligence Agent',
    domain: 'Trends, Virality, Market Intelligence',
    bootMessage: 'TrendScanner engaged. Monitoring trends and viral opportunities.',
    responsibilities: [
      'Monitor trending topics',
      'Identify viral opportunities',
      'Analyze competitor content',
      'Recommend trend-aligned content',
    ],
    capabilities: ['monitoring', 'analysis', 'prediction', 'recommendation'],
    color: '#1DA1F2',
    icon: '🔍',
    sovereign: 'social',
  },
  'engagement-optimizer': {
    id: 'engagement-optimizer',
    name: 'EngagementOptimizer',
    title: 'Engagement Maximizer',
    domain: 'Engagement, Community, Response',
    bootMessage: 'EngagementOptimizer ready. Maximizing audience interaction.',
    responsibilities: [
      'Optimize posting times',
      'Manage community responses',
      'A/B test content variations',
      'Increase engagement rates',
    ],
    capabilities: ['optimization', 'testing', 'community', 'scheduling'],
    color: '#4CAF50',
    icon: '💬',
    sovereign: 'social',
  },

  // ─────────────────────────────────────────────────────────
  // MARKETING SOVEREIGN AGENTS
  // ─────────────────────────────────────────────────────────
  'lead-flow': {
    id: 'lead-flow',
    name: 'LeadFlow',
    title: 'Lead Generation Agent',
    domain: 'Leads, Outreach, Nurturing',
    bootMessage: 'LeadFlow activated. Managing outreach cadence and lead nurturing.',
    responsibilities: [
      'Manage outreach sequences',
      'Score and qualify leads',
      'A/B test messaging',
      'Optimize conversion funnels',
    ],
    capabilities: ['outreach', 'scoring', 'testing', 'nurturing'],
    color: '#F4B942',
    icon: '🎯',
    sovereign: 'marketing',
  },
  'referral-bot': {
    id: 'referral-bot',
    name: 'ReferralBot',
    title: 'Referral Program Agent',
    domain: 'Referrals, Incentives, Virality',
    bootMessage: 'ReferralBot online. Managing referral incentives and tracking.',
    responsibilities: [
      'Manage referral programs',
      'Track referral conversions',
      'Optimize incentive structures',
      'Automate reward distribution',
    ],
    capabilities: ['tracking', 'incentives', 'automation', 'optimization'],
    color: '#FF6B6B',
    icon: '🤝',
    sovereign: 'marketing',
  },
  'campaign-agent': {
    id: 'campaign-agent',
    name: 'CampaignAgent',
    title: 'Campaign Orchestrator',
    domain: 'Campaigns, Ads, Multi-Channel',
    bootMessage: 'CampaignAgent ready. Orchestrating multi-channel campaigns.',
    responsibilities: [
      'Plan and execute campaigns',
      'Coordinate across channels',
      'Track campaign ROI',
      'Optimize ad spend',
    ],
    capabilities: ['planning', 'execution', 'tracking', 'optimization'],
    color: '#9C27B0',
    icon: '📢',
    sovereign: 'marketing',
  },
  'ab-test-agent': {
    id: 'ab-test-agent',
    name: 'ABTestAgent',
    title: 'Experimentation Agent',
    domain: 'Testing, Optimization, Data',
    bootMessage: 'ABTestAgent initialized. Running experiments to optimize conversion.',
    responsibilities: [
      'Design A/B experiments',
      'Analyze test results',
      'Recommend winning variants',
      'Continuously optimize',
    ],
    capabilities: ['experimentation', 'analysis', 'statistics', 'optimization'],
    color: '#00BCD4',
    icon: '🔬',
    sovereign: 'marketing',
  },
  'audience-segmenter': {
    id: 'audience-segmenter',
    name: 'AudienceSegmenter',
    title: 'Audience Intelligence Agent',
    domain: 'Segmentation, Targeting, Personalization',
    bootMessage: 'AudienceSegmenter engaged. Building intelligent audience segments.',
    responsibilities: [
      'Segment audiences by behavior',
      'Build lookalike audiences',
      'Personalize messaging',
      'Optimize targeting',
    ],
    capabilities: ['segmentation', 'targeting', 'personalization', 'analysis'],
    color: '#673AB7',
    icon: '👥',
    sovereign: 'marketing',
  },

  // ─────────────────────────────────────────────────────────
  // FINANCE SOVEREIGN AGENTS
  // ─────────────────────────────────────────────────────────
  'trade-agent': {
    id: 'trade-agent',
    name: 'TradeAgent',
    title: 'Trading Execution Agent',
    domain: 'Trading, Execution, Strategy',
    bootMessage: 'TradeAgent online. Executing trades with precision and discipline.',
    responsibilities: [
      'Execute trading strategies',
      'Monitor market conditions',
      'Manage positions',
      'Log all trades for audit',
    ],
    capabilities: ['execution', 'monitoring', 'strategy', 'logging'],
    color: '#22c55e',
    icon: '📈',
    sovereign: 'finance',
  },
  'risk-sentinel': {
    id: 'risk-sentinel',
    name: 'RiskSentinel',
    title: 'Risk Management Agent',
    domain: 'Risk, Exposure, Safety',
    bootMessage: 'RiskSentinel activated. Protecting capital with strict risk controls.',
    responsibilities: [
      'Cap exposure limits',
      'Enforce stop-loss rules',
      'Monitor portfolio risk',
      'Alert on risk breaches',
    ],
    capabilities: ['risk-management', 'monitoring', 'alerts', 'enforcement'],
    color: '#ef4444',
    icon: '🛡️',
    sovereign: 'finance',
  },
  'roi-tracker': {
    id: 'roi-tracker',
    name: 'ROITracker',
    title: 'Returns Tracking Agent',
    domain: 'ROI, Performance, Reporting',
    bootMessage: 'ROITracker ready. Tracking returns across all investments.',
    responsibilities: [
      'Track daily/weekly ROI',
      'Generate performance reports',
      'Compare against benchmarks',
      'Identify top performers',
    ],
    capabilities: ['tracking', 'reporting', 'analysis', 'benchmarking'],
    color: '#F4B942',
    icon: '📊',
    sovereign: 'finance',
  },
  'portfolio-optimizer': {
    id: 'portfolio-optimizer',
    name: 'PortfolioOptimizer',
    title: 'Portfolio Optimization Agent',
    domain: 'Allocation, Diversification, Rebalancing',
    bootMessage: 'PortfolioOptimizer engaged. Optimizing for risk-adjusted returns.',
    responsibilities: [
      'Optimize asset allocation',
      'Rebalance portfolios',
      'Minimize correlation risk',
      'Maximize Sharpe ratio',
    ],
    capabilities: ['optimization', 'rebalancing', 'analysis', 'allocation'],
    color: '#3F51B5',
    icon: '⚖️',
    sovereign: 'finance',
  },
  'market-sentiment': {
    id: 'market-sentiment',
    name: 'MarketSentiment',
    title: 'Market Sentiment Agent',
    domain: 'Sentiment, News, Signals',
    bootMessage: 'MarketSentiment scanning. Analyzing market mood and signals.',
    responsibilities: [
      'Analyze market sentiment',
      'Monitor news and events',
      'Generate trading signals',
      'Predict market moves',
    ],
    capabilities: ['sentiment-analysis', 'news-monitoring', 'signals', 'prediction'],
    color: '#00BCD4',
    icon: '🎭',
    sovereign: 'finance',
  },

  // ─────────────────────────────────────────────────────────
  // REVENUE SOVEREIGN AGENTS
  // ─────────────────────────────────────────────────────────
  'revenue-optimizer': {
    id: 'revenue-optimizer',
    name: 'RevenueOptimizer',
    title: 'Revenue Optimization Agent',
    domain: 'Revenue, Conversion, Optimization',
    bootMessage: 'RevenueOptimizer online. Maximizing revenue across all channels.',
    responsibilities: [
      'Optimize conversion funnels',
      'A/B test pricing',
      'Identify revenue leaks',
      'Recommend optimizations',
    ],
    capabilities: ['optimization', 'testing', 'analysis', 'recommendation'],
    color: '#9B7EDE',
    icon: '💎',
    sovereign: 'revenue',
  },
  'churn-predictor': {
    id: 'churn-predictor',
    name: 'ChurnPredictor',
    title: 'Churn Prevention Agent',
    domain: 'Retention, Churn, Engagement',
    bootMessage: 'ChurnPredictor active. Identifying at-risk customers before they leave.',
    responsibilities: [
      'Predict customer churn',
      'Identify at-risk accounts',
      'Recommend retention actions',
      'Measure retention impact',
    ],
    capabilities: ['prediction', 'analysis', 'recommendation', 'tracking'],
    color: '#ef4444',
    icon: '🚨',
    sovereign: 'revenue',
  },
  'clv-predictor': {
    id: 'clv-predictor',
    name: 'CLVPredictor',
    title: 'Customer Lifetime Value Agent',
    domain: 'CLV, Value, Segmentation',
    bootMessage: 'CLVPredictor initialized. Predicting customer lifetime value.',
    responsibilities: [
      'Predict customer lifetime value',
      'Segment by value potential',
      'Optimize acquisition spend',
      'Track CLV over time',
    ],
    capabilities: ['prediction', 'segmentation', 'optimization', 'tracking'],
    color: '#4CAF50',
    icon: '💰',
    sovereign: 'revenue',
  },
  'pricing-agent': {
    id: 'pricing-agent',
    name: 'PricingAgent',
    title: 'Dynamic Pricing Agent',
    domain: 'Pricing, Elasticity, Optimization',
    bootMessage: 'PricingAgent ready. Optimizing prices for maximum revenue.',
    responsibilities: [
      'Analyze price elasticity',
      'Test pricing strategies',
      'Monitor competitor pricing',
      'Recommend optimal prices',
    ],
    capabilities: ['analysis', 'testing', 'monitoring', 'optimization'],
    color: '#FF9800',
    icon: '🏷️',
    sovereign: 'revenue',
  },
  'upsell-agent': {
    id: 'upsell-agent',
    name: 'UpsellAgent',
    title: 'Upsell & Cross-Sell Agent',
    domain: 'Upsell, Cross-Sell, Expansion',
    bootMessage: 'UpsellAgent engaged. Identifying expansion opportunities.',
    responsibilities: [
      'Identify upsell opportunities',
      'Recommend cross-sell products',
      'Optimize timing of offers',
      'Track expansion revenue',
    ],
    capabilities: ['identification', 'recommendation', 'timing', 'tracking'],
    color: '#E91E63',
    icon: '⬆️',
    sovereign: 'revenue',
  },

  // ─────────────────────────────────────────────────────────
  // COMMERCE SOVEREIGN AGENTS
  // ─────────────────────────────────────────────────────────
  'template-smith': {
    id: 'template-smith',
    name: 'TemplateSmith',
    title: 'Template Creation Agent',
    domain: 'Templates, Packaging, Products',
    bootMessage: 'TemplateSmith forging. Creating productized templates and workflows.',
    responsibilities: [
      'Package workflows as templates',
      'Create SaaS products',
      'Optimize for adoption',
      'Track template performance',
    ],
    capabilities: ['creation', 'packaging', 'optimization', 'tracking'],
    color: '#795548',
    icon: '🔨',
    sovereign: 'commerce',
  },
  'saas-beacon': {
    id: 'saas-beacon',
    name: 'SaaSBeacon',
    title: 'Subscription Management Agent',
    domain: 'Subscriptions, Billing, Tiers',
    bootMessage: 'SaaSBeacon illuminated. Managing subscriptions and billing.',
    responsibilities: [
      'Manage subscription tiers',
      'Handle billing operations',
      'Optimize pricing tiers',
      'Track MRR/ARR',
    ],
    capabilities: ['management', 'billing', 'optimization', 'tracking'],
    color: '#2196F3',
    icon: '💳',
    sovereign: 'commerce',
  },
  'apparel-sync': {
    id: 'apparel-sync',
    name: 'ApparelSync',
    title: 'Merchandise Agent',
    domain: 'Apparel, SKUs, Fulfillment',
    bootMessage: 'ApparelSync synchronized. Managing merchandise and fulfillment.',
    responsibilities: [
      'Manage product SKUs',
      'Track inventory levels',
      'Coordinate fulfillment',
      'Optimize product mix',
    ],
    capabilities: ['inventory', 'fulfillment', 'tracking', 'optimization'],
    color: '#9C27B0',
    icon: '👕',
    sovereign: 'commerce',
  },
  'fulfillment-agent': {
    id: 'fulfillment-agent',
    name: 'FulfillmentAgent',
    title: 'Order Fulfillment Agent',
    domain: 'Orders, Shipping, Logistics',
    bootMessage: 'FulfillmentAgent ready. Processing orders and managing logistics.',
    responsibilities: [
      'Process orders automatically',
      'Coordinate shipping',
      'Track delivery status',
      'Handle returns',
    ],
    capabilities: ['processing', 'shipping', 'tracking', 'returns'],
    color: '#FF5722',
    icon: '📦',
    sovereign: 'commerce',
  },
  'inventory-optimizer': {
    id: 'inventory-optimizer',
    name: 'InventoryOptimizer',
    title: 'Inventory Management Agent',
    domain: 'Inventory, Stock, Forecasting',
    bootMessage: 'InventoryOptimizer calibrated. Optimizing stock levels.',
    responsibilities: [
      'Forecast demand',
      'Optimize stock levels',
      'Prevent stockouts',
      'Minimize holding costs',
    ],
    capabilities: ['forecasting', 'optimization', 'alerting', 'analysis'],
    color: '#607D8B',
    icon: '📋',
    sovereign: 'commerce',
  },

  // ─────────────────────────────────────────────────────────
  // COMPLIANCE SOVEREIGN AGENTS
  // ─────────────────────────────────────────────────────────
  'compliance-bridge': {
    id: 'compliance-bridge',
    name: 'ComplianceBridge',
    title: 'Compliance Monitoring Agent',
    domain: 'Compliance, Regulations, Safety',
    bootMessage: 'ComplianceBridge connected. Monitoring compliance across all channels.',
    responsibilities: [
      'Scan messages for compliance',
      'Enforce disclaimers',
      'Monitor regulatory changes',
      'Generate compliance reports',
    ],
    capabilities: ['scanning', 'enforcement', 'monitoring', 'reporting'],
    color: '#8b92a7',
    icon: '✅',
    sovereign: 'compliance',
  },
  'legal-research': {
    id: 'legal-research',
    name: 'LegalResearch',
    title: 'Legal Research Agent',
    domain: 'Legal, Research, Regulations',
    bootMessage: 'LegalResearch engaged. Researching legal requirements and regulations.',
    responsibilities: [
      'Research legal requirements',
      'Track regulatory changes',
      'Identify compliance gaps',
      'Recommend legal actions',
    ],
    capabilities: ['research', 'tracking', 'analysis', 'recommendation'],
    color: '#3F51B5',
    icon: '📚',
    sovereign: 'compliance',
  },
  'contract-weaver': {
    id: 'contract-weaver',
    name: 'ContractWeaver',
    title: 'Contract Generation Agent',
    domain: 'Contracts, Agreements, Legal Docs',
    bootMessage: 'ContractWeaver ready. Generating and managing contracts.',
    responsibilities: [
      'Generate contracts from templates',
      'Manage contract lifecycle',
      'Track signatures',
      'Alert on renewals',
    ],
    capabilities: ['generation', 'management', 'tracking', 'alerting'],
    color: '#795548',
    icon: '📝',
    sovereign: 'compliance',
  },
  'tax-optimizer': {
    id: 'tax-optimizer',
    name: 'TaxOptimizer',
    title: 'Tax Optimization Agent',
    domain: 'Tax, Deductions, Strategy',
    bootMessage: 'TaxOptimizer calculating. Optimizing tax strategy.',
    responsibilities: [
      'Identify tax deductions',
      'Optimize tax strategy',
      'Track tax obligations',
      'Generate tax reports',
    ],
    capabilities: ['optimization', 'tracking', 'reporting', 'strategy'],
    color: '#4CAF50',
    icon: '💵',
    sovereign: 'compliance',
  },
  'ip-manager': {
    id: 'ip-manager',
    name: 'IPManager',
    title: 'Intellectual Property Agent',
    domain: 'IP, Trademarks, Copyrights',
    bootMessage: 'IPManager protecting. Managing intellectual property assets.',
    responsibilities: [
      'Track IP assets',
      'Monitor for infringement',
      'Manage renewals',
      'Document IP portfolio',
    ],
    capabilities: ['tracking', 'monitoring', 'management', 'documentation'],
    color: '#9C27B0',
    icon: '©️',
    sovereign: 'compliance',
  },

  // ─────────────────────────────────────────────────────────
  // INFRASTRUCTURE SOVEREIGN AGENTS
  // ─────────────────────────────────────────────────────────
  'self-healer': {
    id: 'self-healer',
    name: 'SelfHealer',
    title: 'Self-Healing Infrastructure Agent',
    domain: 'Infrastructure, Recovery, Automation',
    bootMessage: 'SelfHealer online. Automatically detecting and fixing issues.',
    responsibilities: [
      'Detect infrastructure issues',
      'Automatically remediate problems',
      'Prevent cascading failures',
      'Log all actions for audit',
    ],
    capabilities: ['detection', 'remediation', 'prevention', 'logging'],
    color: '#4CAF50',
    icon: '🔄',
    sovereign: 'infrastructure',
  },
  'security-hunter': {
    id: 'security-hunter',
    name: 'SecurityHunter',
    title: 'Threat Hunting Agent',
    domain: 'Security, Threats, Protection',
    bootMessage: 'SecurityHunter scanning. Proactively hunting for threats.',
    responsibilities: [
      'Hunt for security threats',
      'Analyze anomalies',
      'Block malicious activity',
      'Generate security reports',
    ],
    capabilities: ['hunting', 'analysis', 'blocking', 'reporting'],
    color: '#ef4444',
    icon: '🔒',
    sovereign: 'infrastructure',
  },
  'performance-monitor': {
    id: 'performance-monitor',
    name: 'PerformanceMonitor',
    title: 'Performance Optimization Agent',
    domain: 'Performance, Metrics, Optimization',
    bootMessage: 'PerformanceMonitor tracking. Optimizing system performance.',
    responsibilities: [
      'Monitor performance metrics',
      'Identify bottlenecks',
      'Recommend optimizations',
      'Track improvements',
    ],
    capabilities: ['monitoring', 'analysis', 'recommendation', 'tracking'],
    color: '#2196F3',
    icon: '⚡',
    sovereign: 'infrastructure',
  },
  'cost-optimizer': {
    id: 'cost-optimizer',
    name: 'CostOptimizer',
    title: 'Cost Optimization Agent',
    domain: 'Costs, Cloud, Resources',
    bootMessage: 'CostOptimizer analyzing. Reducing infrastructure costs.',
    responsibilities: [
      'Analyze cloud costs',
      'Identify cost savings',
      'Rightsize resources',
      'Track cost trends',
    ],
    capabilities: ['analysis', 'optimization', 'rightsizing', 'tracking'],
    color: '#FF9800',
    icon: '💸',
    sovereign: 'infrastructure',
  },
  'scaling-agent': {
    id: 'scaling-agent',
    name: 'ScalingAgent',
    title: 'Auto-Scaling Agent',
    domain: 'Scaling, Capacity, Prediction',
    bootMessage: 'ScalingAgent ready. Predictively scaling infrastructure.',
    responsibilities: [
      'Predict capacity needs',
      'Scale resources proactively',
      'Optimize scaling policies',
      'Prevent performance issues',
    ],
    capabilities: ['prediction', 'scaling', 'optimization', 'prevention'],
    color: '#673AB7',
    icon: '📐',
    sovereign: 'infrastructure',
  },

  // ─────────────────────────────────────────────────────────
  // MONITORING AGENTS
  // ─────────────────────────────────────────────────────────
  'harbinger': {
    id: 'harbinger',
    name: 'HARBINGER',
    title: 'Daily Aggregator & Executive Reporter',
    domain: 'Reporting, Aggregation, Executive Summary',
    bootMessage: 'HARBINGER online. Aggregating all agent findings into executive reports.',
    responsibilities: [
      'Collect latest outputs from ATLAS, NGINXOR, APPLINK, SCRIBE',
      'Synthesize findings into coherent daily reports',
      'Highlight critical issues, trends, and cross-layer correlations',
      'Provide TL;DR, severity levels, and recommended actions',
      'Produce clean, operator-grade summaries for leadership review',
    ],
    capabilities: ['aggregation', 'synthesis', 'reporting', 'analysis', 'executive-summary'],
    color: '#FFD700',
    icon: '📋',
    sovereign: 'infrastructure',
  },
  'overwatch': {
    id: 'overwatch',
    name: 'OVERWATCH',
    title: 'Agent Health & Alignment Monitor',
    domain: 'Monitoring, Health Checks, Alignment',
    bootMessage: 'OVERWATCH engaged. Monitoring agent health and alignment.',
    responsibilities: [
      'Verify ATLAS, NGINXOR, APPLINK, SCRIBE produce timely outputs',
      'Detect missing reports, stale data, or silent failures',
      'Identify agents out of sync with their mission',
      'Flag anomalies in cadence, completeness, or formatting',
      'Recommend corrective actions or restarts',
    ],
    capabilities: ['monitoring', 'health-checks', 'anomaly-detection', 'alignment', 'diagnostics'],
    color: '#FF4444',
    icon: '👁️',
    sovereign: 'infrastructure',
  },
  'verity': {
    id: 'verity',
    name: 'VERITY',
    title: 'Cross-Validation & Integrity Auditor',
    domain: 'Validation, Integrity, Cross-Checking',
    bootMessage: 'VERITY active. Auditing agent outputs for consistency and integrity.',
    responsibilities: [
      'Compare outputs from ATLAS, NGINXOR, APPLINK, SCRIBE',
      'Detect contradictions (e.g., DNS OK but nginx mismatch)',
      'Identify blind spots or missing checks',
      'Validate conclusions logically align across layers',
      'Provide truth-aligned integrity score',
    ],
    capabilities: ['cross-validation', 'integrity-audit', 'contradiction-detection', 'consistency-check', 'scoring'],
    color: '#00FFFF',
    icon: '⚖️',
    sovereign: 'infrastructure',
  },
  'keeper': {
    id: 'keeper',
    name: 'KEEPER',
    title: 'Cadence, Scheduling & Ritual Discipline',
    domain: 'Scheduling, Cadence, Orchestration',
    bootMessage: 'KEEPER vigilant. Maintaining operational rhythm and discipline.',
    responsibilities: [
      'Ensure core agents run at correct intervals',
      'Ensure HARBINGER runs after all 4 complete',
      'Ensure OVERWATCH and VERITY run after HARBINGER',
      'Detect timing drift, skipped cycles, or out-of-order execution',
      'Maintain operational rhythm and report deviations',
    ],
    capabilities: ['scheduling', 'cadence-management', 'orchestration', 'timing', 'discipline'],
    color: '#8B4513',
    icon: '⏰',
    sovereign: 'infrastructure',
  },

  // ─────────────────────────────────────────────────────────
  // BROADCAST SOVEREIGN AGENTS
  // ─────────────────────────────────────────────────────────

  'smoke-test-runner': {
    id: 'smoke-test-runner',
    name: 'SmokeTestRunner',
    title: 'CI/CD Smoke Test Runner',
    domain: 'Quality Assurance, Testing, CI/CD',
    bootMessage: 'SmokeTestRunner online. Executing automated smoke tests.',
    responsibilities: [
      'Checkout PR branches',
      'Execute smoke test scripts',
      'Verify video/thumbnail/.ass outputs',
      'Record runtime and file sizes',
      'Report FFmpeg warnings',
    ],
    capabilities: ['testing', 'validation', 'reporting', 'automation'],
    color: '#10B981',
    icon: '🚀',
    sovereign: 'broadcast',
  },

  'subtitle-validator': {
    id: 'subtitle-validator',
    name: 'SubtitleValidator',
    title: 'ASS Subtitle Validator',
    domain: 'Quality Assurance, Subtitles, Timing',
    bootMessage: 'SubtitleValidator online. Validating .ass subtitle files.',
    responsibilities: [
      'Parse ASS subtitle files',
      'Validate timing sequences',
      'Check for overlapping cues',
      'Verify style sections',
      'Test encoding compatibility',
      'Generate timing reports',
    ],
    capabilities: ['validation', 'parsing', 'timing', 'encoding', 'reporting'],
    color: '#8B5CF6',
    icon: '📝',
    sovereign: 'broadcast',
  },

  'visual-qa': {
    id: 'visual-qa',
    name: 'VisualQA',
    title: 'Visual Quality Assurance',
    domain: 'Quality Assurance, Visual, Rendering',
    bootMessage: 'VisualQA online. Rendering and analyzing video quality.',
    responsibilities: [
      'Render samples per aspect ratio',
      'Check safe margins and text wrapping',
      'Verify style fidelity',
      'Detect font fallbacks',
      'Generate screenshots',
      'Report layout issues',
    ],
    capabilities: ['rendering', 'analysis', 'screenshot', 'validation', 'reporting'],
    color: '#F59E0B',
    icon: '👁️',
    sovereign: 'broadcast',
  },

  'release-gatekeeper': {
    id: 'release-gatekeeper',
    name: 'ReleaseGatekeeper',
    title: 'Release Gatekeeper',
    domain: 'Quality Assurance, Release Management, CI/CD',
    bootMessage: 'ReleaseGatekeeper online. Managing release approvals and merges.',
    responsibilities: [
      'Aggregate CI/CD results',
      'Manage PR approval workflow',
      'Control merge decisions',
      'Send Slack notifications',
      'Generate release reports',
      'Coordinate deployment windows',
    ],
    capabilities: ['aggregation', 'approval', 'notification', 'reporting', 'coordination'],
    color: '#EF4444',
    icon: '🚪',
    sovereign: 'broadcast',
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getAgentsBySovereign(sovereignId: SovereignId): AgentRole[] {
  return Object.values(AGENTS).filter(agent => agent.sovereign === sovereignId);
}

export function getSovereignByAgent(agentId: string): Sovereign | null {
  const agent = AGENTS[agentId];
  if (!agent) return null;
  return SOVEREIGNS[agent.sovereign];
}

export function getAllAgents(): AgentRole[] {
  return Object.values(AGENTS);
}

export function getAllSovereigns(): Sovereign[] {
  return Object.values(SOVEREIGNS);
}

export function getAgentCount(): number {
  return Object.keys(AGENTS).length;
}

export function getSovereignStats(): { id: SovereignId; name: string; agentCount: number }[] {
  return Object.values(SOVEREIGNS).map(sovereign => ({
    id: sovereign.id,
    name: sovereign.name,
    agentCount: getAgentsBySovereign(sovereign.id).length,
  }));
}























