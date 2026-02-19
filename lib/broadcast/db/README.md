# Broadcast Engine Database Schema

The **memory core** of the Broadcast Engine. This schema provides structure, permanence, analytics, and intelligence.

## Overview

The Broadcast Engine DB consists of **7 primary tables** that store all signals, posts, trends, leads, and actions.

## Tables

### 1. `broadcast_posts`
Stores every piece of content ever generated or posted.

**Key Fields:**
- `id` - Primary key
- `platform` - Platform (youtube, tiktok, instagram, etc.)
- `content_id` - Platform-specific post ID
- `status` - draft, scheduled, posted, failed
- `trend_id` - Optional FK to trends
- `campaign_id` - Optional campaign identifier

**Indexes:**
- `platform`, `status`, `posted_at`, `trend_id`, `campaign_id`

---

### 2. `broadcast_signals_raw`
Stores raw scraped data from platforms (audit log).

**Key Fields:**
- `id` - Primary key
- `platform` - Platform
- `signal_type` - comment, like, dm, mention, etc.
- `raw_payload` - Original platform data (JSONB)

**Indexes:**
- `platform`, `signal_type`, `timestamp`

---

### 3. `broadcast_signals_normalized`
Stores normalized, structured signals (clean data for Lead Engine).

**Key Fields:**
- `id` - Primary key
- `platform` - Platform
- `signal_type` - comment, like, dm, mention, etc.
- `user_id` - Platform user ID
- `content` - Signal content
- `sentiment` - positive, negative, neutral
- `keywords` - Extracted keywords (JSONB)
- `engagement_value` - 0-100 normalized score
- `post_id` - FK to broadcast_posts

**Indexes:**
- `platform`, `signal_type`, `user_id`, `post_id`, `timestamp`, `sentiment`

---

### 4. `broadcast_leads`
Stores every detected lead (lead intelligence layer).

**Key Fields:**
- `id` - Primary key
- `user_id` - Platform user ID
- `platform` - Platform
- `lead_score` - 0-100 composite score
- `lead_tier` - hot, warm, interested, cold, noise
- `urgency` - high, medium, low
- `intent_score` - 0-40
- `engagement_score` - 0-20
- `behavior_score` - 0-20
- `identity_score` - 0-15
- `trend_score` - 0-5
- `source_post_id` - FK to broadcast_posts
- `client_id` - FK to HPE clients (if converted)
- `agent_id` - FK to HPE agents (if assigned)
- `pipeline_stage` - Current HPE pipeline stage

**Indexes:**
- `platform`, `lead_tier`, `lead_score`, `status`, `user_id`, `post_id`, `agent_id`, `pipeline_stage`

---

### 5. `broadcast_trends`
Stores detected trends (trend memory).

**Key Fields:**
- `id` - Primary key
- `trend_type` - breakout, sustained, seasonal, micro
- `platform` - Platform (optional, can be cross-platform)
- `keyword` - Trending keyword
- `velocity` - 0-100 growth rate
- `momentum` - 0-100 how long it will last
- `relevance` - 0-100 relevance to business
- `opportunity` - 0-100 opportunity score
- `detected_at` - When trend was detected
- `expires_at` - When trend expires

**Indexes:**
- `trend_type`, `platform`, `keyword`, `velocity`, `opportunity`, `detected_at`

---

### 6. `broadcast_funnel_events`
Stores every pipeline injection event (bridge to HPE).

**Key Fields:**
- `id` - Primary key
- `lead_id` - FK to broadcast_leads
- `event_type` - created_client, moved_stage, assigned_agent, created_task, logged_interaction
- `pipeline_stage` - Current pipeline stage
- `old_stage` - Previous stage (for moves)
- `new_stage` - New stage (for moves)
- `agent_id` - FK to HPE agents
- `client_id` - FK to HPE clients
- `task_id` - FK to HPE tasks
- `interaction_id` - FK to HPE interactions

**Indexes:**
- `lead_id`, `event_type`, `pipeline_stage`, `agent_id`, `client_id`, `timestamp`

---

### 7. `broadcast_worker_jobs`
Stores all queued jobs for the Worker/Queue system (heartbeat of power grid).

**Key Fields:**
- `id` - Primary key
- `job_type` - posting, scraping, trend, lead, funnel, cleanup
- `queue_name` - posting_queue, scraping_queue, etc.
- `task_type` - Specific task type
- `payload` - Task payload (JSONB)
- `priority` - high, medium, low
- `status` - pending, running, failed, completed
- `attempts` - Number of retry attempts
- `max_attempts` - Maximum retry attempts
- `scheduled_at` - When to execute (for scheduled tasks)

**Indexes:**
- `job_type`, `queue_name`, `status`, `priority`, `scheduled_at`, `created_at`

---

## Relationships

```
broadcast_posts
  ↓ (1:N)
broadcast_signals_normalized
  ↓ (1:N)
broadcast_leads
  ↓ (1:N)
broadcast_funnel_events

broadcast_trends
  ↓ (1:N, optional)
broadcast_posts

broadcast_signals_raw
  ↓ (1:1)
broadcast_signals_normalized
```

---

## Analytics Views

### `broadcast_post_performance`
Pre-computed view showing post performance metrics:
- Signal count
- Lead count
- Hot/warm leads
- Average/max lead scores

### `broadcast_platform_performance`
Pre-computed view showing platform performance:
- Total posts
- Total leads
- Average lead score
- Hot leads
- Converted leads

### `broadcast_trend_performance`
Pre-computed view showing trend performance:
- Posts generated
- Leads generated
- Average lead score

### `broadcast_agent_performance`
Pre-computed view showing agent performance:
- Leads assigned
- Leads converted
- Average lead score
- Average response time

---

## Analytics Queries

The schema enables answering these key questions:

1. **Which posts generate the most leads?**
   - Query: `broadcast_post_performance` ordered by `lead_count`

2. **Which platforms produce the highest-value leads?**
   - Query: `broadcast_platform_performance` ordered by `avg_lead_score`

3. **Which trends convert best?**
   - Query: `broadcast_trend_performance` ordered by `leads_generated`

4. **Which agents close the most broadcast leads?**
   - Query: `broadcast_agent_performance` ordered by `leads_converted`

5. **Which content formats perform best?**
   - Query: Group posts by format, calculate lead conversion

6. **Which CTAs drive the most action?**
   - Query: Group posts by CTA, calculate lead conversion

7. **Which topics produce the highest revenue?**
   - Query: Group posts by topic, calculate revenue attribution

---

## Usage

### In Production

1. **Choose Database System:**
   - PostgreSQL (recommended for JSONB support)
   - MySQL/MariaDB
   - SQLite (for development)

2. **Run Migration:**
   ```sql
   -- Execute schema.sql
   psql -d exom3 -f lib/broadcast/db/schema.sql
   ```

3. **Use Database Client:**
   - Prisma
   - Drizzle ORM
   - Kysely
   - Raw SQL with pg, mysql2, etc.

4. **Implement Queries:**
   - Use `lib/broadcast/db/queries.ts` as reference
   - Implement actual database queries based on your client

---

## Notes

- **JSONB Fields:** Used for flexible metadata storage (PostgreSQL recommended)
- **Indexes:** Optimized for common query patterns
- **Timestamps:** All tables include `created_at` and `updated_at`
- **Foreign Keys:** Relationships are logical (FKs can be added if needed)
- **Scalability:** Schema designed for high-volume ingestion

---

**This is the memory core of the Broadcast Engine.**
