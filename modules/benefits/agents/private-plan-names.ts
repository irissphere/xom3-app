// Known Private Plan Names/Products
// This list is used for classification to identify private plan leads
// Source: PulseVera Knowledge Base (pulsevera-knowledge-base)

/**
 * PLAN TYPES
 * ==========
 * 
 * PRIMARY PLANS:
 * - Premier Advantage (PA) - Main private health plan
 * - Secure Advantage (SA) - Secondary health option
 * - Premiere Choice - Alternative plan option
 * - PremierMed - Short-term medical-surgical expense plan
 * 
 * ADD-ONS:
 * - Dental - Dental coverage add-on
 * - Vision - Vision coverage add-on
 * - Secure Dental Plus - Enhanced dental coverage
 * - MedGuard III - Additional medical protection
 * 
 * PLAN TIERS (benefit levels):
 * - Executive Diamond (highest)
 * - Diamond
 * - Sapphire
 * - Ruby (entry level)
 * 
 * FEATURES:
 * - Well-GIST Rider - Upgrade path from PremierAdvantage to PremierMed without underwriting
 */

// ============================================================
// PRIVATE PLAN NAMES (case-insensitive matching)
// ============================================================

export const PRIVATE_PLAN_NAMES = [
  // === PRIMARY HEALTH PLANS ===
  // Premier Advantage variants
  "premier advantage",
  "premiere advantage",
  "united premier advantage",
  "united premiere advantage",
  "pa plan",
  
  // Secure Advantage variants
  "secure advantage",
  "sa plan",
  
  // Premiere Choice variants
  "premiere choice",
  "premier choice",
  
  // PremierMed (short-term coverage)
  "premiermed",
  "premier med",
  "premiere med",
  
  // === PLAN TIERS ===
  "executive diamond",
  "diamond",
  "sapphire",
  "ruby",
  "executive diamond tier",
  "diamond tier",
  "sapphire tier",
  "ruby tier",
  
  // === ADD-ONS ===
  // Dental
  "dental add-on",
  "dental addon",
  "dental plan",
  "secure dental",
  "secure dental plus",
  "secdenplus",
  
  // Vision
  "vision add-on",
  "vision addon",
  "vision plan",
  "vision coverage",
  
  // MedGuard
  "medguard",
  "medguard iii",
  "medguard 3",
  "med guard",
  
  // === RIDERS & FEATURES ===
  "well-gist",
  "wellgist",
  "well gist rider",
  
  // === GENERIC COMPONENTS (partial matching) ===
  // Keep these last as they're more general
  "premiere",
  "premier",
  "advantage",
  "secure",
] as const;

// ============================================================
// PLAN TIER DEFINITIONS
// ============================================================

export const PLAN_TIERS = {
  EXECUTIVE_DIAMOND: {
    id: "executive-diamond",
    name: "Executive Diamond",
    level: 4,
    color: "#a78bfa", // Purple
    description: "Premium tier with maximum benefits",
  },
  DIAMOND: {
    id: "diamond",
    name: "Diamond",
    level: 3,
    color: "#5ac8fa", // Blue
    description: "High-tier coverage with excellent benefits",
  },
  SAPPHIRE: {
    id: "sapphire",
    name: "Sapphire",
    level: 2,
    color: "#0ea5e9", // Deep blue
    description: "Mid-tier coverage with solid benefits",
  },
  RUBY: {
    id: "ruby",
    name: "Ruby",
    level: 1,
    color: "#ef4444", // Red
    description: "Entry-level coverage with essential benefits",
  },
} as const;

export type PlanTier = keyof typeof PLAN_TIERS;

// ============================================================
// ADD-ON DEFINITIONS
// ============================================================

export const PLAN_ADDONS = {
  DENTAL: {
    id: "dental",
    name: "Dental",
    icon: "🦷",
    description: "Dental coverage add-on",
    variants: ["secure dental", "secure dental plus"],
  },
  VISION: {
    id: "vision",
    name: "Vision",
    icon: "👁️",
    description: "Vision coverage add-on",
    variants: ["vision plan"],
  },
  MEDGUARD: {
    id: "medguard",
    name: "MedGuard III",
    icon: "🛡️",
    description: "Additional medical protection coverage",
    variants: ["medguard iii", "medguard 3"],
  },
} as const;

export type PlanAddon = keyof typeof PLAN_ADDONS;

// ============================================================
// PRIMARY PLAN DEFINITIONS
// ============================================================

export const PRIMARY_PLANS = {
  PREMIER_ADVANTAGE: {
    id: "premier-advantage",
    name: "Premier Advantage",
    shortCode: "PA",
    color: "#f59e0b",
    description: "Primary private health plan with comprehensive coverage",
    features: [
      "Comprehensive medical coverage",
      "Well-GIST Rider eligible",
      "Multiple tier options",
    ],
    availableTiers: ["EXECUTIVE_DIAMOND", "DIAMOND", "SAPPHIRE", "RUBY"] as PlanTier[],
    availableAddons: ["DENTAL", "VISION", "MEDGUARD"] as PlanAddon[],
  },
  SECURE_ADVANTAGE: {
    id: "secure-advantage",
    name: "Secure Advantage",
    shortCode: "SA",
    color: "#10b981",
    description: "Secondary health option with flexible coverage",
    features: [
      "Flexible coverage options",
      "Competitive pricing",
      "Multiple tier options",
    ],
    availableTiers: ["DIAMOND", "SAPPHIRE", "RUBY"] as PlanTier[],
    availableAddons: ["DENTAL", "VISION"] as PlanAddon[],
  },
  PREMIERE_CHOICE: {
    id: "premiere-choice",
    name: "Premiere Choice",
    shortCode: "PC",
    color: "#c792ea",
    description: "Alternative plan with customizable options",
    features: [
      "Customizable coverage",
      "Budget-friendly options",
    ],
    availableTiers: ["SAPPHIRE", "RUBY"] as PlanTier[],
    availableAddons: ["DENTAL", "VISION"] as PlanAddon[],
  },
  PREMIERMED: {
    id: "premiermed",
    name: "PremierMed",
    shortCode: "PM",
    color: "#5ac8fa",
    description: "Short-term medical-surgical expense plan (1-3 months)",
    features: [
      "$3,000 deductible (in-network)",
      "0% coinsurance after deductible",
      "$3,000 out-of-pocket maximum",
      "Fast approval - no enrollment period wait",
      "NOT ACA-compliant (short-term coverage)",
    ],
    availableTiers: [] as PlanTier[], // No tiers for short-term
    availableAddons: ["DENTAL", "VISION"] as PlanAddon[],
    isShortTerm: true,
    maxDuration: "3 months",
  },
} as const;

export type PrimaryPlan = keyof typeof PRIMARY_PLANS;

// ============================================================
// CLASSIFICATION FUNCTIONS
// ============================================================

/**
 * Check if text contains any known private plan names
 */
export function containsPrivatePlanName(text: string): boolean {
  const lowerText = text.toLowerCase();
  return PRIVATE_PLAN_NAMES.some(planName => 
    lowerText.includes(planName.toLowerCase())
  );
}

/**
 * Get the specific private plan name found in text (if any)
 */
export function getPrivatePlanName(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const planName of PRIVATE_PLAN_NAMES) {
    if (lowerText.includes(planName.toLowerCase())) {
      return planName;
    }
  }
  return null;
}

/**
 * Detect the primary plan type from text
 */
export function detectPrimaryPlan(text: string): PrimaryPlan | null {
  const lowerText = text.toLowerCase();
  
  // Check specific plans first (order matters - most specific first)
  if (lowerText.includes("premiermed") || lowerText.includes("premier med")) {
    return "PREMIERMED";
  }
  if (lowerText.includes("premiere choice") || lowerText.includes("premier choice")) {
    return "PREMIERE_CHOICE";
  }
  if (lowerText.includes("secure advantage") || lowerText.includes("sa plan")) {
    return "SECURE_ADVANTAGE";
  }
  if (lowerText.includes("premier advantage") || lowerText.includes("premiere advantage") || lowerText.includes("pa plan")) {
    return "PREMIER_ADVANTAGE";
  }
  
  return null;
}

/**
 * Detect plan tier from text
 */
export function detectPlanTier(text: string): PlanTier | null {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("executive diamond")) return "EXECUTIVE_DIAMOND";
  if (lowerText.includes("diamond")) return "DIAMOND";
  if (lowerText.includes("sapphire")) return "SAPPHIRE";
  if (lowerText.includes("ruby")) return "RUBY";
  
  return null;
}

/**
 * Detect add-ons from text
 */
export function detectAddons(text: string): PlanAddon[] {
  const lowerText = text.toLowerCase();
  const addons: PlanAddon[] = [];
  
  if (lowerText.includes("dental") || lowerText.includes("secden")) {
    addons.push("DENTAL");
  }
  if (lowerText.includes("vision")) {
    addons.push("VISION");
  }
  if (lowerText.includes("medguard") || lowerText.includes("med guard")) {
    addons.push("MEDGUARD");
  }
  
  return addons;
}

/**
 * Full plan classification from text
 */
export interface PlanClassification {
  isPrivatePlan: boolean;
  primaryPlan: PrimaryPlan | null;
  tier: PlanTier | null;
  addons: PlanAddon[];
  detectedPlanName: string | null;
  confidence: number;
}

export function classifyPlan(text: string): PlanClassification {
  const isPrivatePlan = containsPrivatePlanName(text);
  const primaryPlan = detectPrimaryPlan(text);
  const tier = detectPlanTier(text);
  const addons = detectAddons(text);
  const detectedPlanName = getPrivatePlanName(text);
  
  // Calculate confidence based on specificity
  let confidence = 0;
  if (primaryPlan) confidence += 0.4;
  if (tier) confidence += 0.3;
  if (addons.length > 0) confidence += 0.2;
  if (detectedPlanName && detectedPlanName.length > 10) confidence += 0.1;
  
  // Cap at 1.0
  confidence = Math.min(confidence, 1.0);
  
  // Default minimum confidence if any plan detected
  if (isPrivatePlan && confidence < 0.5) confidence = 0.5;
  
  return {
    isPrivatePlan,
    primaryPlan,
    tier,
    addons,
    detectedPlanName,
    confidence,
  };
}
