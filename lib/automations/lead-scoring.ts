export interface LeadData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  business?: string;
  goal?: string;
  revenue?: number;
  employees?: number;
  timeline?: string;
  painPoints?: string[];
  budget?: number;
  jobTitle?: string;
  industry?: string;
  specificGoals?: string[];
  created_at: string;
}

export interface LeadScore {
  total: number;
  breakdown: {
    businessSize: number;
    urgency: number;
    budget: number;
    authority: number;
    need: number;
  };
  category: 'hot' | 'warm' | 'cold' | 'dead';
  recommendedAction: string;
}

export function calculateLeadScore(lead: LeadData): LeadScore {
  let score = 0;
  const breakdown = {
    businessSize: 0,
    urgency: 0,
    budget: 0,
    authority: 0,
    need: 0
  };

  // Business Size Scoring (0-20 points)
  if (lead.revenue && lead.revenue > 1000000) {
    breakdown.businessSize = 20;
  } else if (lead.revenue && lead.revenue > 500000) {
    breakdown.businessSize = 17;
  } else if (lead.revenue && lead.revenue > 100000) {
    breakdown.businessSize = 15;
  } else if (lead.employees && lead.employees > 50) {
    breakdown.businessSize = 18;
  } else if (lead.employees && lead.employees > 10) {
    breakdown.businessSize = 12;
  } else if (lead.business && lead.business.toLowerCase().includes('llc')) {
    breakdown.businessSize = 8;
  } else {
    breakdown.businessSize = 5; // Default for small businesses
  }

  // Urgency Scoring (0-20 points)
  if (lead.timeline === 'immediately' || lead.timeline === 'asap') {
    breakdown.urgency = 20;
  } else if (lead.timeline === 'this_month' || lead.timeline === 'within_30_days') {
    breakdown.urgency = 15;
  } else if (lead.timeline === 'this_quarter' || lead.timeline === 'within_90_days') {
    breakdown.urgency = 12;
  } else if (lead.painPoints && lead.painPoints.length > 3) {
    breakdown.urgency = 18; // High pain = high urgency
  } else if (lead.painPoints && lead.painPoints.length > 1) {
    breakdown.urgency = 10;
  } else {
    breakdown.urgency = 5; // Default urgency
  }

  // Budget Signals (0-20 points)
  if (lead.budget && lead.budget > 10000) {
    breakdown.budget = 20;
  } else if (lead.budget && lead.budget > 5000) {
    breakdown.budget = 17;
  } else if (lead.budget && lead.budget > 1000) {
    breakdown.budget = 15;
  } else if (lead.goal && lead.goal.toLowerCase().includes('enterprise')) {
    breakdown.budget = 12;
  } else if (lead.goal && (lead.goal.toLowerCase().includes('start') || lead.goal.toLowerCase().includes('grow'))) {
    breakdown.budget = 8; // Growth-oriented businesses
  } else {
    breakdown.budget = 5; // Default budget assumption
  }

  // Authority/Decision Making (0-20 points)
  if (lead.jobTitle) {
    const title = lead.jobTitle.toLowerCase();
    if (title.includes('ceo') || title.includes('founder') || title.includes('owner')) {
      breakdown.authority = 20;
    } else if (title.includes('director') || title.includes('vp') || title.includes('head')) {
      breakdown.authority = 17;
    } else if (title.includes('manager') || title.includes('lead')) {
      breakdown.authority = 12;
    } else if (title.includes('specialist') || title.includes('consultant')) {
      breakdown.authority = 8;
    }
  } else {
    breakdown.authority = 5; // Default if no title provided
  }

  // Need Specificity (0-20 points)
  if (lead.specificGoals && lead.specificGoals.length > 2) {
    breakdown.need = 20;
  } else if (lead.specificGoals && lead.specificGoals.length > 0) {
    breakdown.need = 15;
  } else if (lead.goal && lead.goal !== 'general' && lead.goal !== 'automation') {
    breakdown.need = 12; // Specific goal mentioned
  } else if (lead.painPoints && lead.painPoints.length > 0) {
    breakdown.need = 10;
  } else {
    breakdown.need = 3; // Generic interest only
  }

  // Calculate total score
  score = breakdown.businessSize + breakdown.urgency + breakdown.budget +
          breakdown.authority + breakdown.need;

  // Cap at 100
  score = Math.min(score, 100);

  // Determine category and action
  let category: 'hot' | 'warm' | 'cold' | 'dead';
  let recommendedAction: string;

  if (score >= 80) {
    category = 'hot';
    recommendedAction = 'Call within 1 hour - high-value lead';
  } else if (score >= 60) {
    category = 'warm';
    recommendedAction = 'Accelerated email sequence + demo offer';
  } else if (score >= 40) {
    category = 'cold';
    recommendedAction = 'Standard nurture sequence';
  } else {
    category = 'dead';
    recommendedAction = 'Archive after basic sequence';
  }

  return {
    total: score,
    breakdown,
    category,
    recommendedAction
  };
}

export function getNextSequenceStep(currentStep: number, sequenceType: string): {
  nextStep: number | null;
  delay: number;
} {
  const sequences = {
    welcome: { 1: 0, 2: 2 * 60 * 60 * 1000, 3: 4 * 60 * 60 * 1000 }, // 2h, 4h
    nurture: { 4: 24 * 60 * 60 * 1000, 5: 48 * 60 * 60 * 1000, 6: 72 * 60 * 60 * 1000 }, // 24h, 48h, 72h
    reengagement: { 7: 7 * 24 * 60 * 60 * 1000 } // 1 week
  };

  const sequence = sequences[sequenceType as keyof typeof sequences];
  if (!sequence) return { nextStep: null, delay: 0 };

  const nextStep = currentStep + 1;
  const delay = sequence[nextStep as keyof typeof sequence] || 0;

  return {
    nextStep: delay > 0 ? nextStep : null,
    delay: delay as number
  };
}


