-- Broadcast Engine Database Schema
-- The memory core of the Broadcast Engine

-- ============================================
-- 1. POSTS TABLE
-- Stores every piece of content ever generated or posted
-- ============================================

CREATE TABLE IF NOT EXISTS broadcast_posts (
  id VARCHAR(255) PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  content_id VARCHAR(255), -- Platform-specific post ID
  title TEXT,
  caption TEXT,
  description TEXT,
  hashtags JSONB, -- Array of hashtags
  thumbnail_url TEXT,
  video_url TEXT,
  media_url TEXT,
  scheduled_at TIMESTAMP,
  posted_at TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, scheduled, posted, failed
  trend_id VARCHAR(255), -- Optional FK to trends
  funnel_tag VARCHAR(255), -- Optional funnel identifier
  campaign_id VARCHAR(255), -- Optional campaign identifier
  metadata JSONB, -- Additional metadata (UTM params, tracking links, etc.)
  engagement_metrics JSONB, -- Likes, comments, shares, views, etc.
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcast_posts_platform ON broadcast_posts(platform);
CREATE INDEX idx_broadcast_posts_status ON broadcast_posts(status);
CREATE INDEX idx_broadcast_posts_posted_at ON broadcast_posts(posted_at);
CREATE INDEX idx_broadcast_posts_trend_id ON broadcast_posts(trend_id);
CREATE INDEX idx_broadcast_posts_campaign_id ON broadcast_posts(campaign_id);

-- ============================================
-- 2. SIGNALS_RAW TABLE
-- Stores raw scraped data from platforms (audit log)
-- ============================================

CREATE TABLE IF NOT EXISTS broadcast_signals_raw (
  id VARCHAR(255) PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  signal_type VARCHAR(50) NOT NULL, -- comment, like, dm, mention, share, save, follow, etc.
  raw_payload JSONB NOT NULL, -- Original platform data
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcast_signals_raw_platform ON broadcast_signals_raw(platform);
CREATE INDEX idx_broadcast_signals_raw_type ON broadcast_signals_raw(signal_type);
CREATE INDEX idx_broadcast_signals_raw_timestamp ON broadcast_signals_raw(timestamp);

-- ============================================
-- 3. SIGNALS_NORMALIZED TABLE
-- Stores normalized, structured signals (clean data for Lead Engine)
-- ============================================

CREATE TABLE IF NOT EXISTS broadcast_signals_normalized (
  id VARCHAR(255) PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  signal_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  username VARCHAR(255),
  content TEXT,
  sentiment VARCHAR(50), -- positive, negative, neutral
  keywords JSONB, -- Array of extracted keywords
  engagement_value INTEGER, -- 0-100 normalized engagement score
  timestamp TIMESTAMP NOT NULL,
  post_id VARCHAR(255), -- FK to broadcast_posts
  raw_signal_id VARCHAR(255), -- FK to broadcast_signals_raw
  metadata JSONB, -- Additional metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcast_signals_normalized_platform ON broadcast_signals_normalized(platform);
CREATE INDEX idx_broadcast_signals_normalized_type ON broadcast_signals_normalized(signal_type);
CREATE INDEX idx_broadcast_signals_normalized_user_id ON broadcast_signals_normalized(user_id);
CREATE INDEX idx_broadcast_signals_normalized_post_id ON broadcast_signals_normalized(post_id);
CREATE INDEX idx_broadcast_signals_normalized_timestamp ON broadcast_signals_normalized(timestamp);
CREATE INDEX idx_broadcast_signals_normalized_sentiment ON broadcast_signals_normalized(sentiment);

-- ============================================
-- 4. LEADS TABLE
-- Stores every detected lead (lead intelligence layer)
-- ============================================

CREATE TABLE IF NOT EXISTS broadcast_leads (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  username VARCHAR(255),
  platform VARCHAR(50) NOT NULL,
  lead_score INTEGER NOT NULL, -- 0-100
  lead_tier VARCHAR(50) NOT NULL, -- hot, warm, interested, cold, noise
  lead_type VARCHAR(50), -- comment, dm, link_click, high_engagement, etc.
  urgency VARCHAR(50), -- high, medium, low
  intent_score INTEGER, -- 0-40
  engagement_score INTEGER, -- 0-20
  behavior_score INTEGER, -- 0-20
  identity_score INTEGER, -- 0-15
  trend_score INTEGER, -- 0-5
  first_seen_at TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP NOT NULL,
  source_post_id VARCHAR(255), -- FK to broadcast_posts
  source_signal_id VARCHAR(255), -- FK to broadcast_signals_normalized
  status VARCHAR(50) NOT NULL DEFAULT 'new', -- new, warm, cold, converted, ignored
  client_id VARCHAR(255), -- FK to HPE clients (if converted)
  agent_id VARCHAR(255), -- FK to HPE agents (if assigned)
  pipeline_stage VARCHAR(255), -- Current HPE pipeline stage
  metadata JSONB, -- Breakdown, signals, etc.
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcast_leads_platform ON broadcast_leads(platform);
CREATE INDEX idx_broadcast_leads_tier ON broadcast_leads(lead_tier);
CREATE INDEX idx_broadcast_leads_score ON broadcast_leads(lead_score);
CREATE INDEX idx_broadcast_leads_status ON broadcast_leads(status);
CREATE INDEX idx_broadcast_leads_user_id ON broadcast_leads(user_id);
CREATE INDEX idx_broadcast_leads_post_id ON broadcast_leads(source_post_id);
CREATE INDEX idx_broadcast_leads_agent_id ON broadcast_leads(agent_id);
CREATE INDEX idx_broadcast_leads_pipeline_stage ON broadcast_leads(pipeline_stage);
CREATE INDEX idx_broadcast_leads_first_seen_at ON broadcast_leads(first_seen_at);

-- ============================================
-- 5. TRENDS TABLE
-- Stores detected trends (trend memory)
-- ============================================

CREATE TABLE IF NOT EXISTS broadcast_trends (
  id VARCHAR(255) PRIMARY KEY,
  trend_type VARCHAR(50) NOT NULL, -- breakout, sustained, seasonal, micro
  platform VARCHAR(50),
  keyword VARCHAR(255),
  audio_id VARCHAR(255),
  hashtag VARCHAR(255),
  topic VARCHAR(255),
  velocity INTEGER NOT NULL, -- 0-100
  momentum INTEGER NOT NULL, -- 0-100
  relevance INTEGER NOT NULL, -- 0-100
  opportunity INTEGER NOT NULL, -- 0-100
  volume INTEGER, -- Current volume
  detected_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  peak_platform VARCHAR(50),
  spreading BOOLEAN DEFAULT FALSE,
  cross_platform BOOLEAN DEFAULT FALSE,
  metadata JSONB, -- Related trends, competitor activity, etc.
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcast_trends_type ON broadcast_trends(trend_type);
CREATE INDEX idx_broadcast_trends_platform ON broadcast_trends(platform);
CREATE INDEX idx_broadcast_trends_keyword ON broadcast_trends(keyword);
CREATE INDEX idx_broadcast_trends_velocity ON broadcast_trends(velocity);
CREATE INDEX idx_broadcast_trends_opportunity ON broadcast_trends(opportunity);
CREATE INDEX idx_broadcast_trends_detected_at ON broadcast_trends(detected_at);

-- ============================================
-- 6. FUNNEL_EVENTS TABLE
-- Stores every pipeline injection event (bridge to HPE)
-- ============================================

CREATE TABLE IF NOT EXISTS broadcast_funnel_events (
  id VARCHAR(255) PRIMARY KEY,
  lead_id VARCHAR(255) NOT NULL, -- FK to broadcast_leads
  event_type VARCHAR(50) NOT NULL, -- created_client, moved_stage, assigned_agent, created_task, logged_interaction
  pipeline_stage VARCHAR(255),
  old_stage VARCHAR(255),
  new_stage VARCHAR(255),
  agent_id VARCHAR(255), -- FK to HPE agents
  client_id VARCHAR(255), -- FK to HPE clients
  task_id VARCHAR(255), -- FK to HPE tasks
  interaction_id VARCHAR(255), -- FK to HPE interactions
  metadata JSONB, -- Event-specific data
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcast_funnel_events_lead_id ON broadcast_funnel_events(lead_id);
CREATE INDEX idx_broadcast_funnel_events_type ON broadcast_funnel_events(event_type);
CREATE INDEX idx_broadcast_funnel_events_pipeline_stage ON broadcast_funnel_events(pipeline_stage);
CREATE INDEX idx_broadcast_funnel_events_agent_id ON broadcast_funnel_events(agent_id);
CREATE INDEX idx_broadcast_funnel_events_client_id ON broadcast_funnel_events(client_id);
CREATE INDEX idx_broadcast_funnel_events_timestamp ON broadcast_funnel_events(timestamp);

-- ============================================
-- 7. WORKER_JOBS TABLE
-- Stores all queued jobs for the Worker/Queue system (heartbeat of power grid)
-- ============================================

CREATE TABLE IF NOT EXISTS broadcast_worker_jobs (
  id VARCHAR(255) PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL, -- posting, scraping, trend, lead, funnel, cleanup
  queue_name VARCHAR(50) NOT NULL, -- posting_queue, scraping_queue, etc.
  task_type VARCHAR(100) NOT NULL, -- Specific task type
  payload JSONB NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- high, medium, low
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, failed, completed
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcast_worker_jobs_type ON broadcast_worker_jobs(job_type);
CREATE INDEX idx_broadcast_worker_jobs_queue ON broadcast_worker_jobs(queue_name);
CREATE INDEX idx_broadcast_worker_jobs_status ON broadcast_worker_jobs(status);
CREATE INDEX idx_broadcast_worker_jobs_priority ON broadcast_worker_jobs(priority);
CREATE INDEX idx_broadcast_worker_jobs_scheduled_at ON broadcast_worker_jobs(scheduled_at);
CREATE INDEX idx_broadcast_worker_jobs_created_at ON broadcast_worker_jobs(created_at);

-- ============================================
-- ANALYTICS VIEWS
-- Pre-computed views for common queries
-- ============================================

-- View: Post Performance
CREATE OR REPLACE VIEW broadcast_post_performance AS
SELECT 
  p.id,
  p.platform,
  p.status,
  p.posted_at,
  COUNT(DISTINCT s.id) as signal_count,
  COUNT(DISTINCT l.id) as lead_count,
  SUM(CASE WHEN l.lead_tier = 'hot' THEN 1 ELSE 0 END) as hot_leads,
  SUM(CASE WHEN l.lead_tier = 'warm' THEN 1 ELSE 0 END) as warm_leads,
  AVG(l.lead_score) as avg_lead_score,
  MAX(l.lead_score) as max_lead_score
FROM broadcast_posts p
LEFT JOIN broadcast_signals_normalized s ON s.post_id = p.id
LEFT JOIN broadcast_leads l ON l.source_post_id = p.id
GROUP BY p.id, p.platform, p.status, p.posted_at;

-- View: Platform Performance
CREATE OR REPLACE VIEW broadcast_platform_performance AS
SELECT 
  platform,
  COUNT(DISTINCT p.id) as total_posts,
  COUNT(DISTINCT l.id) as total_leads,
  AVG(l.lead_score) as avg_lead_score,
  SUM(CASE WHEN l.lead_tier = 'hot' THEN 1 ELSE 0 END) as hot_leads,
  SUM(CASE WHEN l.status = 'converted' THEN 1 ELSE 0 END) as converted_leads
FROM broadcast_posts p
LEFT JOIN broadcast_leads l ON l.source_post_id = p.id
GROUP BY platform;

-- View: Trend Performance
CREATE OR REPLACE VIEW broadcast_trend_performance AS
SELECT 
  t.id,
  t.trend_type,
  t.keyword,
  t.velocity,
  t.opportunity,
  COUNT(DISTINCT p.id) as posts_generated,
  COUNT(DISTINCT l.id) as leads_generated,
  AVG(l.lead_score) as avg_lead_score
FROM broadcast_trends t
LEFT JOIN broadcast_posts p ON p.trend_id = t.id
LEFT JOIN broadcast_leads l ON l.source_post_id = p.id
GROUP BY t.id, t.trend_type, t.keyword, t.velocity, t.opportunity;

-- View: Agent Performance
CREATE OR REPLACE VIEW broadcast_agent_performance AS
SELECT 
  agent_id,
  COUNT(DISTINCT l.id) as leads_assigned,
  COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END) as leads_converted,
  AVG(l.lead_score) as avg_lead_score,
  AVG(EXTRACT(EPOCH FROM (fe.timestamp - l.first_seen_at))) / 3600 as avg_response_hours
FROM broadcast_leads l
LEFT JOIN broadcast_funnel_events fe ON fe.lead_id = l.id AND fe.event_type = 'assigned_agent'
WHERE l.agent_id IS NOT NULL
GROUP BY agent_id;
