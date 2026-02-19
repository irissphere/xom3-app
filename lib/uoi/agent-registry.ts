import { AgentRegistry, AgentCrew, AgentRole } from './types';

// ✅ AUTOMATED TEAM 1 — The Watchtower Crew (Gemini 3 Pro Domain)
const watchtowerRoles: AgentRole[] = [
  {
    id: 'signal_sentinel',
    name: 'Signal Sentinel',
    domain: 'Gemini 3 Pro',
    description: 'Monitors external signals, trends, and anomalies',
    capabilities: ['signal-monitoring', 'anomaly-detection', 'trend-analysis'],
    status: 'active'
  },
  {
    id: 'lead_qualifier',
    name: 'Lead Qualifier',
    domain: 'Gemini 3 Pro',
    description: 'Enriches and scores incoming leads',
    capabilities: ['lead-scoring', 'enrichment', 'classification'],
    status: 'active'
  },
  {
    id: 'market_watcher',
    name: 'Market Watcher',
    domain: 'Gemini 3 Pro',
    description: 'Tracks shifts in niche markets',
    capabilities: ['market-analysis', 'competitor-tracking'],
    status: 'active'
  },
  {
    id: 'social_listener',
    name: 'Social Listener',
    domain: 'Gemini 3 Pro',
    description: 'Monitors mentions and sentiment',
    capabilities: ['sentiment-analysis', 'mention-tracking'],
    status: 'active'
  },
  {
    id: 'inbound_synthesizer',
    name: 'Inbound Synthesizer',
    domain: 'Gemini 3 Pro',
    description: 'Turns raw data into cockpit-ready summaries',
    capabilities: ['data-synthesis', 'summary-generation'],
    status: 'active'
  }
];

// ✅ AUTOMATED TEAM 2 — The Axis Crew (GPT-5.2 Domain)
const axisRoles: AgentRole[] = [
  {
    id: 'operator_timeline_logger',
    name: 'Operator Timeline Logger',
    domain: 'GPT-5.2',
    description: 'Organizes today’s events',
    capabilities: ['timeline-logging', 'event-organization'],
    status: 'active'
  },
  {
    id: 'directive_router',
    name: 'Directive Router',
    domain: 'GPT-5.2',
    description: 'Prepares UOI commands',
    capabilities: ['command-routing', 'directive-generation'],
    status: 'active'
  },
  {
    id: 'followup_composer',
    name: 'Follow-Up Composer',
    domain: 'GPT-5.2',
    description: 'Drafts SMS/email sequences',
    capabilities: ['content-generation', 'sequence-drafting'],
    status: 'active'
  },
  {
    id: 'surface_curator',
    name: 'Surface Curator',
    domain: 'GPT-5.2',
    description: 'Updates homepage + cockpit copy blocks',
    capabilities: ['content-curation', 'copy-updating'],
    status: 'active'
  },
  {
    id: 'ritual_engine',
    name: 'Ritual Engine',
    domain: 'GPT-5.2',
    description: 'Maps actions to lineage events',
    capabilities: ['ritual-mapping', 'action-planning'],
    status: 'active'
  }
];

// ✅ AUTOMATED TEAM 3 — The Mirror Crew (Opus 4.5 Domain)
const mirrorRoles: AgentRole[] = [
  {
    id: 'brand_voice_generator',
    name: 'Brand Voice Generator',
    domain: 'Opus 4.5',
    description: 'Polishes homepage language',
    capabilities: ['voice-tuning', 'copy-polishing'],
    status: 'active'
  },
  {
    id: 'visual_identity_shaper',
    name: 'Visual Identity Shaper',
    domain: 'Opus 4.5',
    description: 'Refines geometry + beam aesthetic',
    capabilities: ['visual-design', 'aesthetic-refinement'],
    status: 'active'
  },
  {
    id: 'social_post_composer',
    name: 'Social Post Composer',
    domain: 'Opus 4.5',
    description: 'Drafts auto-socials',
    capabilities: ['social-drafting', 'post-generation'],
    status: 'active'
  },
  {
    id: 'landing_page_builder',
    name: 'Landing Page Builder',
    domain: 'Opus 4.5',
    description: 'Preps new sections',
    capabilities: ['page-structure', 'component-assembly'],
    status: 'active'
  },
  {
    id: 'offer_architect',
    name: 'Offer Architect',
    domain: 'Opus 4.5',
    description: 'Refines pricing + custom build messaging',
    capabilities: ['offer-design', 'pricing-strategy'],
    status: 'active'
  }
];

const watchtowerCrew: AgentCrew = {
  id: 'watchtower_crew',
  name: 'The Watchtower Crew',
  domain: 'Gemini 3 Pro',
  purpose: 'Keep eyes on the world while you’re gone.',
  roles: watchtowerRoles,
  status: 'active',
  leadAgentId: 'signal_sentinel'
};

const axisCrew: AgentCrew = {
  id: 'axis_crew',
  name: 'The Axis Crew',
  domain: 'GPT-5.2',
  purpose: 'Keep the internal system thinking, organizing, and preparing actions.',
  roles: axisRoles,
  status: 'active',
  leadAgentId: 'directive_router'
};

const mirrorCrew: AgentCrew = {
  id: 'mirror_crew',
  name: 'The Mirror Crew',
  domain: 'Opus 4.5',
  purpose: 'Keep the brand, visuals, and customer-facing assets evolving.',
  roles: mirrorRoles,
  status: 'active',
  leadAgentId: 'brand_voice_generator'
};

export const masterAgentRegistry: AgentRegistry = {
  crews: [watchtowerCrew, axisCrew, mirrorCrew],
  lastUpdated: new Date().toISOString()
};
