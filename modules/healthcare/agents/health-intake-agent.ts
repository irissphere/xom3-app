// Health Intake Agent
// Accepts new health leads/intakes, normalizes data, deduplicates, classifies, and routes

import { getBase } from "@/lib/airtable/client";
import {
  HealthLeadIntake,
  NormalizedHealthLead,
  DeduplicationResult,
  ClassificationResult,
  AgentExecutionResult,
} from "./types";

/**
 * Health Intake Agent
 * Processes new health leads through: normalize → dedupe → classify → route
 */
export class HealthIntakeAgent {
  private readonly agentId = "health-intake";
  private readonly laneId = "healthcrm-intake-triage";

  /**
   * Execute intake processing
   */
  async execute(payload: HealthLeadIntake): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Step 1: Normalize data
      const normalized = this.normalizeLead(payload);

      // Step 2: Deduplicate
      const dedupeResult = await this.deduplicateLead(normalized);

      // Step 3: Classify
      const classification = this.classifyLead(normalized);

      // Step 4: Route and create/update client record
      let clientId: string;
      if (dedupeResult.isDuplicate && dedupeResult.existingClientId) {
        // Update existing client
        clientId = await this.updateClient(dedupeResult.existingClientId, normalized, classification);
      } else {
        // Create new client
        clientId = await this.createClient(normalized, classification);
      }

      // Step 5: Log interaction
      await this.logInteraction(clientId, normalized, classification);

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: {
          clientId,
          normalized,
          deduplication: dedupeResult,
          classification,
          isNewClient: !dedupeResult.isDuplicate,
        },
        metadata: {
          executionId,
          duration,
          processedCount: 1,
          createdCount: dedupeResult.isDuplicate ? 0 : 1,
          updatedCount: dedupeResult.isDuplicate ? 1 : 0,
        },
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        errors: [{ field: "execution", message: error.message || "Unknown error" }],
        metadata: {
          executionId,
          duration,
        },
      };
    }
  }

  /**
   * Normalize lead data from various sources
   */
  private normalizeLead(payload: HealthLeadIntake): NormalizedHealthLead {
    // Extract name
    let firstName = payload.firstName || "";
    let lastName = payload.lastName || "";

    if (payload.name && !firstName && !lastName) {
      const nameParts = payload.name.trim().split(/\s+/);
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";
    }

    // Normalize email
    const email = (payload.email || "").toLowerCase().trim();
    if (!email) {
      throw new Error("Email is required for health lead intake");
    }

    // Normalize phone (remove formatting)
    const phone = payload.phone
      ? payload.phone.replace(/\D/g, "").replace(/^1/, "")
      : undefined;

    // Normalize source
    const source = payload.source || "unknown";
    const normalizedSource = this.normalizeSource(source);

    return {
      email,
      phone,
      firstName,
      lastName,
      dateOfBirth: payload.dateOfBirth,
      insurance: payload.insurance,
      primaryCareProvider: payload.primaryCareProvider,
      reasonForContact: payload.reasonForContact,
      source: normalizedSource,
      referralSource: payload.referralSource,
      notes: payload.notes,
      submittedAt: payload.submittedAt || new Date().toISOString(),
    };
  }

  /**
   * Normalize source identifier
   */
  private normalizeSource(source: string): string {
    const lower = source.toLowerCase();
    if (lower.includes("web") || lower.includes("form") || lower.includes("website")) {
      return "web_form";
    }
    if (lower.includes("referral") || lower.includes("refer")) {
      return "referral";
    }
    if (lower.includes("call") || lower.includes("phone")) {
      return "call";
    }
    if (lower.includes("email")) {
      return "email";
    }
    return "other";
  }

  /**
   * Deduplicate lead against existing clients
   */
  private async deduplicateLead(
    normalized: NormalizedHealthLead
  ): Promise<DeduplicationResult> {
    try {
      const base = await getBase();

      // Try to find by email (primary key)
      if (normalized.email) {
        const emailMatches = await base("Clients")
          .select({
            filterByFormula: `{Email} = "${normalized.email}"`,
            maxRecords: 1,
          })
          .all();

        if (emailMatches.length > 0) {
          return {
            isDuplicate: true,
            existingClientId: emailMatches[0].id,
            confidence: 0.95,
            matchFields: ["email"],
          };
        }
      }

      // Try to find by phone if email didn't match
      if (normalized.phone && normalized.phone.length >= 10) {
        const phoneMatches = await base("Clients")
          .select({
            filterByFormula: `FIND("${normalized.phone}", {Phone}) > 0`,
            maxRecords: 1,
          })
          .all();

        if (phoneMatches.length > 0) {
          return {
            isDuplicate: true,
            existingClientId: phoneMatches[0].id,
            confidence: 0.8,
            matchFields: ["phone"],
          };
        }
      }

      // Try fuzzy match by name + phone if both exist
      if (normalized.firstName && normalized.lastName && normalized.phone) {
        const namePhoneMatches = await base("Clients")
          .select({
            filterByFormula: `AND(
              FIND("${normalized.firstName}", {Name}) > 0,
              FIND("${normalized.lastName}", {Name}) > 0,
              FIND("${normalized.phone}", {Phone}) > 0
            )`,
            maxRecords: 1,
          })
          .all();

        if (namePhoneMatches.length > 0) {
          return {
            isDuplicate: true,
            existingClientId: namePhoneMatches[0].id,
            confidence: 0.7,
            matchFields: ["name", "phone"],
          };
        }
      }

      return {
        isDuplicate: false,
        confidence: 1.0,
        matchFields: [],
      };
    } catch (error: any) {
      // If deduplication fails, log but continue (assume new client)
      console.warn("Deduplication check failed:", error.message);
      return {
        isDuplicate: false,
        confidence: 0.5,
        matchFields: [],
      };
    }
  }

  /**
   * Classify lead (category, priority, routing)
   */
  private classifyLead(normalized: NormalizedHealthLead): ClassificationResult {
    // Analyze reason for contact to determine category
    let category = "general_inquiry";
    let priority: "low" | "medium" | "high" | "urgent" = "medium";
    let routing = "standard_intake";

    const reason = (normalized.reasonForContact || "").toLowerCase();
    const notes = (normalized.notes || "").toLowerCase();

    // Category detection
    if (reason.includes("urgent") || reason.includes("emergency") || reason.includes("asap")) {
      category = "urgent_care";
      priority = "urgent";
      routing = "urgent_triage";
    } else if (reason.includes("appointment") || reason.includes("schedule")) {
      category = "appointment_request";
      priority = "high";
      routing = "scheduling";
    } else if (reason.includes("insurance") || reason.includes("coverage") || reason.includes("benefits")) {
      category = "insurance_inquiry";
      priority = "medium";
      routing = "insurance_team";
    } else if (reason.includes("referral") || normalized.referralSource) {
      category = "referral";
      priority = "high";
      routing = "referral_coordinator";
    } else if (reason.includes("follow") || reason.includes("check")) {
      category = "follow_up";
      priority = "medium";
      routing = "care_coordinator";
    }

    // Priority adjustments based on keywords
    if (notes.includes("urgent") || notes.includes("emergency")) {
      priority = "urgent";
    } else if (notes.includes("important") || notes.includes("asap")) {
      priority = "high";
    }

    // Priority based on source
    if (normalized.source === "referral") {
      if (priority === "medium") priority = "high";
    }

    return {
      category,
      priority,
      routing,
      confidence: 0.8,
      reasoning: `Classified as ${category} with ${priority} priority based on reason: ${normalized.reasonForContact || "not specified"}`,
    };
  }

  /**
   * Create new client record
   */
  private async createClient(
    normalized: NormalizedHealthLead,
    classification: ClassificationResult
  ): Promise<string> {
    const base = await getBase();

    const fields: any = {
      Name: `${normalized.firstName} ${normalized.lastName}`.trim(),
      Email: normalized.email,
      "Onboarding Status": "New",
      "Subscription Tier": "Enterprise", // Healthcare module is Enterprise tier
    };

    if (normalized.phone) {
      fields.Phone = normalized.phone;
    }

    // Add healthcare-specific fields if they exist in schema
    if (normalized.dateOfBirth) {
      fields["Date of Birth"] = normalized.dateOfBirth;
    }
    if (normalized.insurance) {
      fields["Insurance"] = normalized.insurance;
    }
    if (normalized.primaryCareProvider) {
      fields["Primary Care Provider"] = normalized.primaryCareProvider;
    }
    if (classification.category) {
      fields["Category"] = classification.category;
    }
    if (classification.priority) {
      fields["Priority"] = classification.priority;
    }
    if (normalized.source) {
      fields["Source"] = normalized.source;
    }
    if (normalized.notes) {
      fields["Notes"] = normalized.notes;
    }

    const created = await base("Clients").create([{ fields }]);
    return created[0]?.id || "";
  }

  /**
   * Update existing client record
   */
  private async updateClient(
    clientId: string,
    normalized: NormalizedHealthLead,
    classification: ClassificationResult
  ): Promise<string> {
    const base = await getBase();

    const fields: any = {};

    // Update phone if provided and different
    if (normalized.phone) {
      fields.Phone = normalized.phone;
    }

    // Update healthcare-specific fields
    if (normalized.dateOfBirth) {
      fields["Date of Birth"] = normalized.dateOfBirth;
    }
    if (normalized.insurance) {
      fields["Insurance"] = normalized.insurance;
    }
    if (normalized.primaryCareProvider) {
      fields["Primary Care Provider"] = normalized.primaryCareProvider;
    }

    // Update classification if different
    if (classification.category) {
      fields["Category"] = classification.category;
    }
    if (classification.priority) {
      fields["Priority"] = classification.priority;
    }

    // Append notes
    if (normalized.notes) {
      // Try to append to existing notes
      try {
        const existing = await base("Clients").find(clientId);
        const existingNotes = existing.fields["Notes"] || "";
        fields["Notes"] = existingNotes
          ? `${existingNotes}\n\n[${new Date().toISOString()}] ${normalized.notes}`
          : normalized.notes;
      } catch {
        fields["Notes"] = normalized.notes;
      }
    }

    if (Object.keys(fields).length > 0) {
      await base("Clients").update(clientId, fields);
    }

    return clientId;
  }

  /**
   * Log interaction for the client
   */
  private async logInteraction(
    clientId: string,
    normalized: NormalizedHealthLead,
    classification: ClassificationResult
  ): Promise<void> {
    try {
      const base = await getBase();

      const fields: any = {
        Client: [clientId],
        Date: new Date().toISOString(),
        Channel: normalized.source === "call" ? "Call" : normalized.source === "email" ? "Email" : "Web",
        Type: "Inquiry",
        Notes: `New intake: ${classification.reasoning}${normalized.reasonForContact ? `\nReason: ${normalized.reasonForContact}` : ""}${normalized.notes ? `\nNotes: ${normalized.notes}` : ""}`,
        Outcome: "Pending",
      };

      await base("Interactions").create(fields);
    } catch (error: any) {
      // Log interaction failure but don't fail the whole operation
      console.warn("Failed to log interaction:", error.message);
    }
  }
}
