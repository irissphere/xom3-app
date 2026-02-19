/**
 * Credit Pricing Calculator
 * 
 * Converts provider costs to credits (1 credit = $0.01 USD)
 * Use these functions at the call site before consuming credits.
 * 
 * Margin targets: 60-90% on all operations
 */

// =============================================================================
// AI TIERS - User-friendly model selection with transparent pricing
// =============================================================================

export type AITier = 'fast' | 'balanced' | 'premium';

export interface AITierConfig {
  id: AITier;
  name: string;
  description: string;
  pricePerGeneration: number; // credits (cents)
  priceLabel: string;
  models: string[];
  defaultModel: string;
  avgTokens: number; // Expected avg tokens per generation
  ourCost: number; // Our actual cost in cents (for margin calc)
  margin: string;
}

export const AI_TIERS: Record<AITier, AITierConfig> = {
  fast: {
    id: 'fast',
    name: 'Fast',
    description: 'Quick responses, great for simple tasks',
    pricePerGeneration: 3, // $0.03
    priceLabel: '$0.03',
    models: ['openai:gpt-3.5-turbo', 'anthropic:claude-3-haiku'],
    defaultModel: 'openai:gpt-3.5-turbo',
    avgTokens: 500,
    ourCost: 0.5, // ~$0.005
    margin: '~83%',
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    description: 'Best value - smart and reliable',
    pricePerGeneration: 8, // $0.08
    priceLabel: '$0.08',
    models: ['openai:gpt-4-turbo', 'anthropic:claude-3-sonnet'],
    defaultModel: 'anthropic:claude-3-sonnet',
    avgTokens: 800,
    ourCost: 2, // ~$0.02
    margin: '~75%',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Maximum quality for complex tasks',
    pricePerGeneration: 20, // $0.20
    priceLabel: '$0.20',
    models: ['openai:gpt-4', 'anthropic:claude-3-opus'],
    defaultModel: 'anthropic:claude-3-opus',
    avgTokens: 1200,
    ourCost: 6, // ~$0.06
    margin: '~70%',
  },
};

// Raw model pricing for token-based calculations (per 1K tokens, in credits)
export const AI_MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "openai:gpt-4-turbo": { input: 1.5, output: 4.5 },
  "openai:gpt-4": { input: 4, output: 8 },
  "openai:gpt-3.5-turbo": { input: 0.1, output: 0.3 },
  "anthropic:claude-3-opus": { input: 2, output: 10 },
  "anthropic:claude-3-sonnet": { input: 0.5, output: 2 },
  "anthropic:claude-3-haiku": { input: 0.15, output: 0.4 },
};

// =============================================================================
// MESSAGING PRICING - Healthy margins on all channels
// =============================================================================

export const MESSAGING_PRICING = {
  sms: 3,           // $0.03 per SMS (cost ~$0.008, margin ~73%)
  email: 1,         // $0.01 per email (cost ~$0.001, margin ~90%)
  voice_minute: 10, // $0.10 per minute (cost ~$0.015, margin ~85%)
};

// =============================================================================
// SOCIAL MEDIA PRICING - Almost pure margin
// =============================================================================

export const SOCIAL_PRICING = {
  post_text: 1,     // $0.01 (cost ~$0.001, margin ~90%)
  post_image: 2,    // $0.02 (cost ~$0.002, margin ~90%)
  post_video: 3,    // $0.03 for user's own video (cost ~$0.003, margin ~90%)
  post_ai_video: 25, // $0.25 for AI-generated video (cost ~$0.08, margin ~68%)
};

// =============================================================================
// AUTOMATION PRICING
// =============================================================================

export const AUTOMATION_PRICING = {
  workflow_run: 2,   // $0.02 per workflow execution
  lead_process: 5,   // $0.05 per lead processed
  scrape_request: 2, // $0.02 per scrape (cost ~$0.005)
  scrape_per_gb: 15, // $0.15 per GB transferred
};

// =============================================================================
// LEGACY ALIASES (for backwards compatibility)
// =============================================================================

export const AI_PRICING = AI_MODEL_PRICING;
export const SCRAPING_PRICING = {
  default: AUTOMATION_PRICING.scrape_request,
  bandwidth_per_gb: AUTOMATION_PRICING.scrape_per_gb,
};

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate credits for AI using tier-based pricing (RECOMMENDED)
 * Simpler, more predictable for users
 */
export function calculateAIObolsByTier(tier: AITier): number {
  return AI_TIERS[tier].pricePerGeneration;
}

/**
 * Calculate credits for AI token usage (granular, for advanced use)
 */
export function calculateAIObols(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const key = `${provider}:${model}`;
  const pricing = AI_MODEL_PRICING[key];

  if (!pricing) {
    // Default: balanced tier pricing for unknown models
    console.warn(`Unknown AI model pricing: ${key}, using balanced tier default`);
    return AI_TIERS.balanced.pricePerGeneration;
  }

  const inputCredits = Math.ceil((inputTokens / 1000) * pricing.input);
  const outputCredits = Math.ceil((outputTokens / 1000) * pricing.output);
  const total = inputCredits + outputCredits;

  // Minimum 3 credits per AI call (fast tier minimum)
  return Math.max(3, total);
}

/**
 * Calculate credits for scraping/proxy usage
 */
export function calculateScrapingObols(bytesTransferred?: number): number {
  if (bytesTransferred && bytesTransferred > 0) {
    const gb = bytesTransferred / (1024 * 1024 * 1024);
    const bandwidthCredits = Math.ceil(gb * AUTOMATION_PRICING.scrape_per_gb);
    return Math.max(AUTOMATION_PRICING.scrape_request, bandwidthCredits);
  }
  return AUTOMATION_PRICING.scrape_request;
}

/**
 * Calculate credits for messaging
 */
export function calculateMessagingObols(type: "email" | "sms" | "voice_minute"): number {
  return MESSAGING_PRICING[type];
}

/**
 * Calculate credits for social media posting
 */
export function calculateSocialObols(type: keyof typeof SOCIAL_PRICING): number {
  return SOCIAL_PRICING[type];
}

/**
 * Calculate credits for automation workflows
 */
export function calculateAutomationObols(type: 'workflow_run' | 'lead_process'): number {
  return AUTOMATION_PRICING[type];
}

/**
 * Get all available AI tiers for UI display
 */
export function getAITiersForDisplay(): AITierConfig[] {
  return Object.values(AI_TIERS);
}

/**
 * Get the default AI tier
 */
export function getDefaultAITier(): AITier {
  return 'balanced';
}
