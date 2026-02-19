// Broadcast Engine - Funnel Engine: Lead Intake Module
// Receives lead score, tier, type, platform, signal source and normalizes into Lead Object

import type { DetectedLead, LeadSignal, Platform } from "../types";
import { LeadClassification } from "../lead-scoring-engine";

export interface LeadObject {
  id: string;
  userId?: string;
  username?: string;
  platform: Platform;
  leadScore: number;
  leadTier: "hot" | "warm" | "interested" | "cold" | "noise";
  leadType: string;
  urgency: "high" | "medium" | "low";
  content: string;
  sentiment?: "positive" | "negative" | "neutral";
  keywords?: string[];
  sourcePostId?: string;
  sourceSignalId?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  metadata: {
    classification?: LeadClassification;
    rawSignal?: any;
    platformData?: any;
  };
}

/**
 * Normalize lead signal into Lead Object
 */
export function normalizeLeadIntake(
  leadSignal: LeadSignal,
  classification?: LeadClassification
): LeadObject {
  return {
    id: leadSignal.id,
    userId: leadSignal.userId,
    username: leadSignal.username,
    platform: leadSignal.platform,
    leadScore: leadSignal.score,
    leadTier: classification?.score.tier || "cold",
    leadType: leadSignal.type || "unknown",
    urgency: classification?.score.urgency || "low",
    content: leadSignal.content || "",
    sentiment: leadSignal.sentiment,
    keywords: leadSignal.keywords,
    sourcePostId: leadSignal.postId,
    sourceSignalId: leadSignal.id,
    firstSeenAt: leadSignal.detectedAt,
    lastSeenAt: leadSignal.detectedAt,
    metadata: {
      classification,
      rawSignal: leadSignal,
      platformData: leadSignal.metadata
    }
  };
}

/**
 * Normalize detected lead into Lead Object
 */
export function normalizeDetectedLead(lead: DetectedLead): LeadObject {
  const classification = lead.leadSignal.metadata?.classification;
  
  return {
    id: lead.id,
    userId: lead.leadSignal.userId,
    username: lead.leadSignal.username || lead.name,
    platform: lead.leadSignal.platform,
    leadScore: lead.leadSignal.score,
    leadTier: classification?.score.tier || "cold",
    leadType: lead.leadSignal.type || "unknown",
    urgency: classification?.score.urgency || lead.leadSignal.urgency || "low",
    content: lead.leadSignal.content || "",
    sentiment: lead.leadSignal.sentiment,
    keywords: lead.leadSignal.keywords,
    sourcePostId: lead.leadSignal.postId,
    sourceSignalId: lead.leadSignal.id,
    firstSeenAt: lead.leadSignal.detectedAt,
    lastSeenAt: lead.leadSignal.detectedAt,
    metadata: {
      classification,
      rawSignal: lead.leadSignal,
      platformData: lead.leadSignal.metadata
    }
  };
}

/**
 * Batch normalize leads
 */
export function batchNormalizeLeads(leads: DetectedLead[]): LeadObject[] {
  return leads.map(normalizeDetectedLead);
}
