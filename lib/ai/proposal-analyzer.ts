/**
 * AI Proposal Analyzer
 * Analyzes enterprise proposal submissions and generates
 * cost estimates, LOE, suggestions, and risk assessments.
 */

export interface ProposalInput {
  contact: {
    name: string;
    email: string;
    phone?: string;
    website?: string;
  };
  company: {
    industry: string;
    teamSize: string;
  };
  businesses: Array<{
    companyName: string;
    industry: string;
    integrations: string;
  }>;
  requirements: {
    timeline: string;
    currentTools?: string;
    painPoints?: string;
    customNeeds?: string;
  };
}

export interface ProposalAnalysis {
  overview: string;
  onboardingCost: {
    low: number;
    high: number;
    currency: string;
  };
  loe: {
    setupHours: { low: number; high: number };
    onboardingWeeks: number;
  };
  recommendedTier: string;
  addOns: string[];
  risks: string[];
  suggestions: string[];
}

// Complexity scoring based on inputs
function calculateComplexity(input: ProposalInput): number {
  let score = 0;

  // Number of businesses
  score += input.businesses.length * 15;

  // Team size
  const teamSize = input.company.teamSize || '';
  if (teamSize.includes('100+')) score += 40;
  else if (teamSize.includes('51-100')) score += 30;
  else if (teamSize.includes('26-50')) score += 20;
  else if (teamSize.includes('11-25')) score += 15;
  else if (teamSize.includes('6-10')) score += 10;
  else score += 5;

  // Industry complexity
  const highComplexityIndustries = ['Healthcare', 'Insurance', 'Finance', 'Legal'];
  const industry = input.company.industry || '';
  if (highComplexityIndustries.some((i) => industry.includes(i))) {
    score += 25;
  }

  // Integrations count
  const allIntegrations = input.businesses
    .map((b) => b.integrations)
    .join(', ')
    .split(/[,;]/)
    .filter((i) => i.trim().length > 0);
  score += allIntegrations.length * 8;

  // Timeline urgency
  if (input.requirements.timeline === 'ASAP') score += 15;
  else if (input.requirements.timeline?.includes('1 month')) score += 10;

  // Custom needs length (more text = more complex)
  const customNeedsLength = (input.requirements.customNeeds || '').length;
  if (customNeedsLength > 500) score += 20;
  else if (customNeedsLength > 200) score += 10;
  else if (customNeedsLength > 50) score += 5;

  return score;
}

// Determine tier based on complexity
function determineTier(complexity: number, input: ProposalInput): string {
  if (complexity >= 80 || input.businesses.length >= 3) {
    return 'Enterprise';
  } else if (complexity >= 50 || input.businesses.length >= 2) {
    return 'Growth';
  } else if (complexity >= 25) {
    return 'Starter';
  }
  return 'Trial';
}

// Calculate onboarding costs
function calculateCosts(complexity: number, input: ProposalInput): { low: number; high: number } {
  const baseCost = 500;
  const perBusinessCost = 750;
  const complexityMultiplier = 1 + complexity / 100;

  const businessCount = input.businesses.length;
  const low = Math.round((baseCost + businessCount * perBusinessCost * 0.8) * complexityMultiplier);
  const high = Math.round((baseCost + businessCount * perBusinessCost * 1.5) * complexityMultiplier);

  return { low, high };
}

// Calculate LOE
function calculateLOE(complexity: number, input: ProposalInput): { setupHours: { low: number; high: number }; onboardingWeeks: number } {
  const baseHours = 8;
  const perBusinessHours = 6;
  const complexityHours = complexity / 5;

  const businessCount = input.businesses.length;
  const low = Math.round(baseHours + businessCount * perBusinessHours + complexityHours * 0.7);
  const high = Math.round(baseHours + businessCount * perBusinessHours * 1.5 + complexityHours);

  const weeks = complexity >= 60 ? 3 : complexity >= 30 ? 2 : 1;

  return { setupHours: { low, high }, onboardingWeeks: weeks };
}

// Identify risks
function identifyRisks(input: ProposalInput): string[] {
  const risks: string[] = [];

  // Multi-location complexity
  if (input.businesses.length >= 3) {
    risks.push('Multi-location complexity may require phased rollout');
  }

  // Compliance-heavy industries
  const complianceIndustries = ['Healthcare', 'Insurance', 'Finance', 'Legal'];
  if (complianceIndustries.some((i) => input.company.industry?.includes(i))) {
    risks.push('Industry compliance requirements (HIPAA/PCI/etc.) may extend timeline');
  }

  // Urgent timeline
  if (input.requirements.timeline === 'ASAP') {
    risks.push('Aggressive timeline may require dedicated resources');
  }

  // Many integrations
  const integrationCount = input.businesses
    .map((b) => b.integrations)
    .join(', ')
    .split(/[,;]/)
    .filter((i) => i.trim().length > 0).length;
  if (integrationCount >= 5) {
    risks.push('Multiple integrations increase testing and maintenance scope');
  }

  return risks;
}

// Generate suggestions
function generateSuggestions(input: ProposalInput, tier: string): string[] {
  const suggestions: string[] = [];

  // Tier-based suggestions
  if (tier === 'Enterprise') {
    suggestions.push('Dedicated onboarding specialist recommended');
    suggestions.push('Custom SLA and support agreement available');
  }

  // Multi-business
  if (input.businesses.length >= 2) {
    suggestions.push('Unified dashboard for cross-business visibility');
    suggestions.push('Shared automation templates across businesses');
  }

  // Industry-specific
  if (input.company.industry?.includes('Healthcare')) {
    suggestions.push('HIPAA-compliant data handling add-on');
  } else if (input.company.industry?.includes('Insurance')) {
    suggestions.push('Benefits CRM module for lead management');
  } else if (input.company.industry?.includes('E-commerce')) {
    suggestions.push('Commerce integration for inventory sync');
  }

  // Timeline
  if (input.requirements.timeline === 'ASAP') {
    suggestions.push('Priority onboarding queue available');
  }

  return suggestions;
}

// Determine add-ons
function determineAddOns(input: ProposalInput): string[] {
  const addOns: string[] = [];

  // Compliance
  const complianceIndustries = ['Healthcare', 'Insurance', 'Finance', 'Legal'];
  if (complianceIndustries.some((i) => input.company.industry?.includes(i))) {
    addOns.push('Compliance Module');
  }

  // SMS
  const needsSMS = (input.requirements.customNeeds || '').toLowerCase().includes('sms') ||
    (input.requirements.customNeeds || '').toLowerCase().includes('text');
  if (needsSMS) {
    addOns.push('SMS Automation Pack');
  }

  // Social
  const needsSocial = (input.requirements.customNeeds || '').toLowerCase().includes('social') ||
    (input.requirements.customNeeds || '').toLowerCase().includes('posting');
  if (needsSocial) {
    addOns.push('Social Broadcast Module');
  }

  // Multi-business
  if (input.businesses.length >= 2) {
    addOns.push('Multi-Tenant Management');
  }

  return addOns;
}

// Generate overview summary
function generateOverview(input: ProposalInput): string {
  const businessCount = input.businesses.length;
  const primaryIndustry = input.company.industry || 'General';
  const businessNames = input.businesses.map((b) => b.companyName).filter(Boolean).join(', ');

  let overview = `${primaryIndustry} organization`;
  
  if (businessCount > 1) {
    overview += ` managing ${businessCount} businesses`;
    if (businessNames) {
      overview += ` (${businessNames})`;
    }
  } else if (businessNames) {
    overview = `${businessNames} - ${primaryIndustry}`;
  }

  // Add context from requirements
  if (input.requirements.painPoints) {
    const painSummary = input.requirements.painPoints.slice(0, 100);
    overview += `. Key challenge: ${painSummary}${input.requirements.painPoints.length > 100 ? '...' : ''}`;
  }

  return overview;
}

/**
 * Analyze a proposal submission and return recommendations
 */
export function analyzeProposal(input: ProposalInput): ProposalAnalysis {
  const complexity = calculateComplexity(input);
  const tier = determineTier(complexity, input);
  const costs = calculateCosts(complexity, input);
  const loe = calculateLOE(complexity, input);
  const risks = identifyRisks(input);
  const suggestions = generateSuggestions(input, tier);
  const addOns = determineAddOns(input);
  const overview = generateOverview(input);

  return {
    overview,
    onboardingCost: {
      low: costs.low,
      high: costs.high,
      currency: 'USD',
    },
    loe: loe,
    recommendedTier: tier,
    addOns,
    risks,
    suggestions,
  };
}

/**
 * Format analysis for Slack display
 */
export function formatAnalysisForSlack(analysis: ProposalAnalysis): string {
  const costRange = `$${analysis.onboardingCost.low.toLocaleString()} - $${analysis.onboardingCost.high.toLocaleString()}`;
  const hoursRange = `${analysis.loe.setupHours.low}-${analysis.loe.setupHours.high} hrs`;
  
  let text = `*AI ANALYSIS*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*Overview:* ${analysis.overview}\n\n`;
  text += `💰 *Est. Onboarding:* ${costRange} (one-time)\n`;
  text += `📅 *LOE:* ${hoursRange} setup + ${analysis.loe.onboardingWeeks} week${analysis.loe.onboardingWeeks > 1 ? 's' : ''} onboarding\n`;
  text += `🎯 *Recommended:* ${analysis.recommendedTier}`;
  
  if (analysis.addOns.length > 0) {
    text += ` + ${analysis.addOns.join(', ')}`;
  }
  
  if (analysis.risks.length > 0) {
    text += `\n\n⚠️ *Risks:* ${analysis.risks[0]}`;
    if (analysis.risks.length > 1) {
      text += ` (+${analysis.risks.length - 1} more)`;
    }
  }

  return text;
}

