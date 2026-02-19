// Benefits Intake Agent
// Accepts new benefits leads/intakes, normalizes data, deduplicates, classifies, and routes

import { getBase } from "@/lib/airtable/client";
import {
  BenefitsLeadIntake,
  NormalizedBenefitsLead,
  DeduplicationResult,
  ClassificationResult,
  AgentExecutionResult,
} from "./types";
import { containsPrivatePlanName, getPrivatePlanName } from "./private-plan-names";
import { templateLoader } from "../messaging/template-loader";
import { triggerAgentSignal } from "@/lib/cockpit/agent-trigger";

/**
 * Benefits Intake Agent
 * Processes new benefits leads through: normalize → dedupe → classify → route
 */
export class BenefitsIntakeAgent {
  private readonly agentId = "benefits-intake";
  private readonly laneId = "benefitscrm-intake-triage";

  /**
   * Execute intake processing
   */
  async execute(payload: BenefitsLeadIntake): Promise<AgentExecutionResult> {
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

      // Step 5: Handle SMS opt-in and send intake confirmation
      let smsOptInConfirmed = false;
      let smsSent = false;
      if (normalized.smsOptIn && normalized.phone) {
        smsOptInConfirmed = await this.handleSMSOptIn(clientId, normalized);
        
      // Send intake confirmation SMS using template
      if (smsOptInConfirmed) {
        smsSent = await this.sendIntakeConfirmationSMS(clientId, normalized, classification);
      }
    }

    // Step 6: Log interaction
    await this.logInteraction(clientId, normalized, classification);

      const duration = Date.now() - startTime;

      // Step 7: Trigger closed-loop automation circuit (Lane 3)
      // Agent → n8n → Airtable → Cockpit → Supervisor
      await triggerAgentSignal({
        agentId: this.agentId,
        agentName: "Benefits Intake Agent",
        laneId: this.laneId,
        signalType: "agent_execution",
        payload: {
          clientId,
          isNewClient: !dedupeResult.isDuplicate,
          leadType: classification.leadType,
          classification: classification.leadType,
          smsOptInConfirmed,
          smsSent
        },
        metadata: {
          processedCount: 1,
          createdCount: dedupeResult.isDuplicate ? 0 : 1,
          updatedCount: dedupeResult.isDuplicate ? 1 : 0,
        },
        success: true,
        duration,
        executionId
      });

      return {
        success: true,
        data: {
          clientId,
          normalized,
          deduplication: dedupeResult,
          classification,
          isNewClient: !dedupeResult.isDuplicate,
          leadType: classification.leadType,
          smsOptInConfirmed,
          smsSent,
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
      
      // Trigger signal for failed execution
      await triggerAgentSignal({
        agentId: this.agentId,
        agentName: "Benefits Intake Agent",
        laneId: this.laneId,
        signalType: "agent_execution",
        payload: {
          error: error.message || "Unknown error"
        },
        metadata: {},
        success: false,
        duration,
        executionId
      });
      
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
  private normalizeLead(payload: BenefitsLeadIntake): NormalizedBenefitsLead {
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
    if (!email && !payload.phone) {
      throw new Error("Email or phone is required for benefits lead intake");
    }

    // Normalize phone (remove formatting)
    const phone = payload.phone
      ? payload.phone.replace(/\D/g, "").replace(/^1/, "")
      : undefined;

    // Normalize source
    const source = payload.source || "unknown";
    const normalizedSource = this.normalizeSource(source);

    // Determine lead type (use provided or will be classified later)
    let leadType: "ACA" | "Medicare" | "Employer" | "Individual/Family" = payload.leadType || "Individual/Family";

    return {
      email: email || `no-email-${Date.now()}@placeholder.com`,
      phone,
      firstName,
      lastName,
      dateOfBirth: payload.dateOfBirth,
      zipCode: payload.zipCode,
      state: payload.state,
      leadType,
      employerName: payload.employerName,
      currentCoverage: payload.currentCoverage,
      interestedIn: payload.interestedIn,
      householdSize: payload.householdSize,
      income: payload.income,
      preferredContactMethod: payload.preferredContactMethod,
      smsOptIn: payload.smsOptIn || false,
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
    if (lower.includes("vanillasoft") || lower.includes("vanilla")) {
      return "vanillasoft";
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
    normalized: NormalizedBenefitsLead
  ): Promise<DeduplicationResult> {
    try {
      const base = await getBase();

      // Try to find by email (primary key)
      if (normalized.email && !normalized.email.includes("@placeholder.com")) {
        const emailMatches = await base("Benefits CRM Clients")
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
        const phoneMatches = await base("Benefits CRM Clients")
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
        const namePhoneMatches = await base("Benefits CRM Clients")
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
   * Classify lead (lead type: ACA, Medicare, Employer, Individual/Family)
   */
  private classifyLead(normalized: NormalizedBenefitsLead): ClassificationResult {
    // Start with provided lead type or default
    let leadType: "ACA" | "Medicare" | "Employer" | "Individual/Family" = normalized.leadType || "Individual/Family";
    let eligibilityCategory: string | undefined;
    let priority: "low" | "medium" | "high" | "urgent" = "medium";
    let routing = "standard_intake";
    let confidence = 0.8;

    // Analyze text fields for classification
    const interestedIn = (normalized.interestedIn || "").toLowerCase();
    const notes = (normalized.notes || "").toLowerCase();
    const currentCoverage = (normalized.currentCoverage || "").toLowerCase();
    const combinedText = `${interestedIn} ${notes} ${currentCoverage}`.toLowerCase();

    // Check for specific private plan names FIRST (highest priority - before Medicare check)
    // This prevents "Premiere Advantage" from being misclassified as Medicare Advantage
    const detectedPlanName = getPrivatePlanName(combinedText);
    const hasPrivatePlanName = containsPrivatePlanName(combinedText);
    
    // If specific private plan name detected, classify immediately (skip other checks)
    if (hasPrivatePlanName && detectedPlanName) {
      return {
        leadType: "Individual/Family",
        eligibilityCategory: "private_plan",
        priority: "medium",
        routing: "individual_specialist",
        confidence: 0.95,
        reasoning: `Classified as Individual/Family (private plan) - detected specific plan name: ${detectedPlanName}`,
      };
    }

    // Medicare classification (check for Medicare-specific context, not just "advantage")
    if (
      combinedText.includes("medicare") ||
      combinedText.includes("part a") ||
      combinedText.includes("part b") ||
      combinedText.includes("part d") ||
      combinedText.includes("supplement") ||
      (combinedText.includes("advantage") && combinedText.includes("medicare")) ||
      (normalized.dateOfBirth && this.calculateAge(normalized.dateOfBirth) >= 65)
    ) {
      leadType = "Medicare";
      eligibilityCategory = "age_based";
      priority = "high";
      routing = "medicare_specialist";
      confidence = 0.9;
    }
    // ACA classification
    else if (
      combinedText.includes("aca") ||
      combinedText.includes("obamacare") ||
      combinedText.includes("marketplace") ||
      combinedText.includes("exchange") ||
      combinedText.includes("subsidy") ||
      combinedText.includes("qualify") ||
      (normalized.income && normalized.householdSize)
    ) {
      leadType = "ACA";
      eligibilityCategory = "income_based";
      priority = "medium";
      routing = "aca_specialist";
      confidence = 0.85;
    }
    // Employer classification
    else if (
      normalized.employerName ||
      combinedText.includes("employer") ||
      combinedText.includes("group") ||
      combinedText.includes("company") ||
      combinedText.includes("business") ||
      combinedText.includes("employee benefits")
    ) {
      leadType = "Employer";
      eligibilityCategory = "employer_based";
      priority = "medium";
      routing = "employer_specialist";
      confidence = 0.85;
    }
    // Individual/Family - PRIVATE PLANS (major focus)
    // Check for specific private plan names FIRST (highest priority)
    // Check for private plan keywords (including specific plan names)
    if (
      hasPrivatePlanName ||
      combinedText.includes("private plan") ||
      combinedText.includes("private insurance") ||
      combinedText.includes("private health") ||
      combinedText.includes("private coverage") ||
      combinedText.includes("private policy") ||
      combinedText.includes("direct pay") ||
      combinedText.includes("self-pay") ||
      combinedText.includes("self pay") ||
      combinedText.includes("private") ||
      combinedText.includes("individual") ||
      combinedText.includes("family") ||
      combinedText.includes("personal")
    ) {
      leadType = "Individual/Family";
      eligibilityCategory = "private_plan"; // Explicitly mark as private plan
      priority = "medium";
      routing = "individual_specialist";
      // Higher confidence if specific plan name detected
      confidence = hasPrivatePlanName ? 0.95 : 0.9;
      
      // If specific plan name detected, include it in reasoning
      if (detectedPlanName) {
        // Store detected plan name for later use
        // This can be added to client record if needed
      }
    }
    // Individual/Family (default - catch-all for non-group, non-ACA, non-Medicare)
    // This includes all private plans that don't match other categories
    else {
      leadType = "Individual/Family";
      eligibilityCategory = "individual"; // Includes private plans
      priority = "medium";
      routing = "individual_specialist";
      confidence = 0.7;
    }

    // Priority adjustments
    if (notes.includes("urgent") || notes.includes("emergency") || notes.includes("asap")) {
      priority = "urgent";
    } else if (notes.includes("important") || notes.includes("soon")) {
      priority = "high";
    }

    // Priority based on source
    if (normalized.source === "referral" && priority === "medium") {
      // Keep medium priority for referrals, don't downgrade
      // (already set to medium or higher above)
    }

    return {
      leadType,
      eligibilityCategory,
      priority,
      routing,
      confidence,
      reasoning: `Classified as ${leadType} with ${priority} priority based on analysis. Eligibility category: ${eligibilityCategory || "not determined"}`,
    };
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: string): number {
    try {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    } catch {
      return 0;
    }
  }

  /**
   * Create new client record
   */
  private async createClient(
    normalized: NormalizedBenefitsLead,
    classification: ClassificationResult
  ): Promise<string> {
    const base = await getBase();

    const fields: any = {
      Name: `${normalized.firstName} ${normalized.lastName}`.trim(),
      Email: normalized.email,
      "Onboarding Status": "New",
      "Subscription Tier": "Enterprise", // Benefits CRM module is Enterprise tier
    };

    if (normalized.phone) {
      fields.Phone = normalized.phone;
    }

    // Add benefits-specific fields
    if (normalized.dateOfBirth) {
      fields["Date of Birth"] = normalized.dateOfBirth;
    }
    if (normalized.zipCode) {
      fields["Zip Code"] = normalized.zipCode;
    }
    if (normalized.state) {
      fields["State"] = normalized.state;
    }
    if (classification.leadType) {
      fields["Lead Type"] = classification.leadType;
    }
    if (normalized.employerName) {
      fields["Employer Name"] = normalized.employerName;
    }
    if (normalized.currentCoverage) {
      fields["Current Coverage"] = normalized.currentCoverage;
    }
    if (normalized.interestedIn) {
      fields["Interested In"] = normalized.interestedIn;
    }
    if (normalized.householdSize) {
      fields["Household Size"] = normalized.householdSize;
    }
    if (normalized.income) {
      fields["Income"] = normalized.income;
    }
    if (classification.eligibilityCategory) {
      fields["Eligibility Category"] = classification.eligibilityCategory;
    }
    if (classification.priority) {
      fields["Priority"] = classification.priority;
    }
    if (normalized.source) {
      fields["Source"] = normalized.source;
    }
    if (normalized.smsOptIn) {
      fields["SMS Opt In"] = normalized.smsOptIn;
    }
    if (normalized.preferredContactMethod) {
      fields["Preferred Contact Method"] = normalized.preferredContactMethod;
    }
    if (normalized.notes) {
      fields["Notes"] = normalized.notes;
    }

    const records = await base("Benefits CRM Clients").create(fields);
    // Airtable create returns Records array, get first record
    const record = Array.isArray(records) ? records[0] : records;
    return record.id;
  }

  /**
   * Update existing client record
   */
  private async updateClient(
    clientId: string,
    normalized: NormalizedBenefitsLead,
    classification: ClassificationResult
  ): Promise<string> {
    const base = await getBase();

    const fields: any = {};

    // Update phone if provided and different
    if (normalized.phone) {
      fields.Phone = normalized.phone;
    }

    // Update benefits-specific fields
    if (normalized.dateOfBirth) {
      fields["Date of Birth"] = normalized.dateOfBirth;
    }
    if (normalized.zipCode) {
      fields["Zip Code"] = normalized.zipCode;
    }
    if (normalized.state) {
      fields["State"] = normalized.state;
    }
    if (classification.leadType) {
      fields["Lead Type"] = classification.leadType;
    }
    if (normalized.employerName) {
      fields["Employer Name"] = normalized.employerName;
    }
    if (normalized.currentCoverage) {
      fields["Current Coverage"] = normalized.currentCoverage;
    }
    if (normalized.interestedIn) {
      fields["Interested In"] = normalized.interestedIn;
    }
    if (normalized.householdSize) {
      fields["Household Size"] = normalized.householdSize;
    }
    if (normalized.income) {
      fields["Income"] = normalized.income;
    }
    if (classification.eligibilityCategory) {
      fields["Eligibility Category"] = classification.eligibilityCategory;
    }
    if (classification.priority) {
      fields["Priority"] = classification.priority;
    }
    if (normalized.smsOptIn !== undefined) {
      fields["SMS Opt In"] = normalized.smsOptIn;
    }
    if (normalized.preferredContactMethod) {
      fields["Preferred Contact Method"] = normalized.preferredContactMethod;
    }

    // Append notes
    if (normalized.notes) {
      try {
        const existing = await base("Benefits CRM Clients").find(clientId);
        const existingNotes = existing.fields["Notes"] || "";
        fields["Notes"] = existingNotes
          ? `${existingNotes}\n\n[${new Date().toISOString()}] ${normalized.notes}`
          : normalized.notes;
      } catch {
        fields["Notes"] = normalized.notes;
      }
    }

    if (Object.keys(fields).length > 0) {
      await base("Benefits CRM Clients").update(clientId, fields);
    }

    return clientId;
  }

  /**
   * Handle SMS opt-in
   */
  private async handleSMSOptIn(
    clientId: string,
    normalized: NormalizedBenefitsLead
  ): Promise<boolean> {
    try {
      // Log SMS opt-in to interactions table
      const base = await getBase();
      await base("Benefits CRM Interactions").create({
        Client: [clientId],
        Date: new Date().toISOString(),
        Channel: "SMS",
        Type: "Opt-in",
        Notes: `SMS opt-in confirmed for ${normalized.phone}`,
        Outcome: "Confirmed",
      });

      return true;
    } catch (error: any) {
      console.warn("Failed to handle SMS opt-in:", error.message);
      return false;
    }
  }

  /**
   * Send intake confirmation SMS using template
   */
  private async sendIntakeConfirmationSMS(
    clientId: string,
    normalized: NormalizedBenefitsLead,
    classification: ClassificationResult
  ): Promise<boolean> {
    try {
      // Get plan name if detected (format properly for messaging)
      const combinedText = `${normalized.interestedIn || ""} ${normalized.notes || ""} ${normalized.currentCoverage || ""}`.toLowerCase();
      const detectedPlanName = getPrivatePlanName(combinedText);
      // Format plan name for display (capitalize words)
      const planName = detectedPlanName 
        ? detectedPlanName.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
        : undefined;

      // Prepare personalization data
      const personalizationData = {
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        leadType: classification.leadType,
        planName: planName || undefined,
        companyName: process.env.COMPANY_NAME || "Benefits Specialist",
      };

      // Get personalized message from template
      const message = templateLoader.getIntakeConfirmationMessage(
        classification.leadType,
        personalizationData
      );

      if (!message) {
        console.warn(`No intake confirmation template found for lead type: ${classification.leadType}`);
        return false;
      }

      // Split message if it exceeds SMS limit
      const messageParts = templateLoader.splitMessage(message, 160);

      // Send SMS via OpenPhone webhook (n8n integration)
      const smsWebhookUrl = process.env.OPENPHONE_SMS_WEBHOOK_URL;
      
      if (smsWebhookUrl) {
        try {
          await fetch(smsWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: normalized.phone,
              message: messageParts[0],
              messageType: "intake_confirmation",
              leadType: classification.leadType,
              clientId,
              metadata: {
                name: `${normalized.firstName} ${normalized.lastName}`.trim(),
                source: "benefits-intake-agent",
                timestamp: new Date().toISOString(),
              },
            }),
          });
          console.log(`[SMS] Sent intake confirmation to ${normalized.phone} via OpenPhone webhook`);
        } catch (webhookError) {
          console.warn(`[SMS] Webhook send failed, logging locally:`, webhookError);
          console.log(`[SMS Intake Confirmation] To: ${normalized.phone}`);
          console.log(`[SMS Message] ${messageParts.join("\n---\n")}`);
        }
      } else {
        // Fallback: log the message that would be sent
        console.log(`[SMS Intake Confirmation] To: ${normalized.phone}`);
        console.log(`[SMS Message] ${messageParts.join("\n---\n")}`);
      }

      // Log SMS send to SMS Log table
      const base = await getBase();
      await base("Benefits CRM SMS Log").create({
        Client: [clientId],
        "Phone Number": normalized.phone,
        Message: messageParts[0],
        "Message Type": "intake_confirmation",
        "Lead Type": classification.leadType,
        Status: "pending",
        "Sent At": new Date().toISOString(),
      });

      return true;
    } catch (error: any) {
      console.warn("Failed to send intake confirmation SMS:", error.message);
      return false;
    }
  }

  /**
   * Log interaction for the client
   */
  private async logInteraction(
    clientId: string,
    normalized: NormalizedBenefitsLead,
    classification: ClassificationResult
  ): Promise<void> {
    try {
      const base = await getBase();

      const fields: any = {
        Client: [clientId],
        Date: new Date().toISOString(),
        Channel: normalized.source === "call" ? "Call" : normalized.source === "email" ? "Email" : "Web",
        Type: "Inquiry",
        Notes: `New benefits intake: ${classification.reasoning}${normalized.interestedIn ? `\nInterested in: ${normalized.interestedIn}` : ""}${normalized.notes ? `\nNotes: ${normalized.notes}` : ""}`,
        Outcome: "Pending",
      };

      await base("Benefits CRM Interactions").create(fields);
    } catch (error: any) {
      // Log interaction failure but don't fail the whole operation
      console.warn("Failed to log interaction:", error.message);
    }
  }
}
