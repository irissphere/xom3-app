// Benefits CRM Messaging Template Loader
// Loads and personalizes SMS templates from the messaging library

export interface Template {
  id: string;
  category: string;
  leadType?: string;
  sequence?: number;
  content: string;
  variables: string[];
}

export interface PersonalizationData {
  firstName?: string;
  lastName?: string;
  leadType?: string;
  planName?: string;
  agentName?: string;
  companyName?: string;
  phoneNumber?: string;
  enrollmentDeadline?: string;
  daysSinceIntake?: number;
  nextStep?: string;
  employerName?: string;
  [key: string]: any;
}

// Inline template storage (templates embedded for Next.js compatibility)
// These will be loaded from the template files at build time or runtime
// For production, consider loading these from a database or API

const TEMPLATE_STORAGE: Record<string, string> = {
  // Intake confirmation templates
  "intake-confirmation-aca": `Hi {{firstName}}, thanks for your ACA inquiry! We received your information and will help you explore marketplace options and subsidy eligibility. One of our specialists will reach out within 2 hours. Reply STOP to opt out.`,
  "intake-confirmation-medicare": `Hi {{firstName}}, thanks for your Medicare inquiry! We received your information and will help you explore Medicare options including Advantage, Supplement, and Part D plans. A specialist will reach out within 1 hour. Reply STOP to opt out.`,
  "intake-confirmation-employer": `Hi {{firstName}}, thanks for your employer benefits inquiry! We received your information{{#if employerName}} for {{employerName}}{{/if}} and will help you explore group benefit options. A specialist will reach out within 4 hours. Reply STOP to opt out.`,
  "intake-confirmation-individual": `Hi {{firstName}}, thanks for your private plan inquiry{{#if planName}} about {{planName}}{{/if}}! We received your information and will help you explore private health insurance options. A specialist will reach out within 2 hours. Reply STOP to opt out.`,
  
  // Follow-up templates - ACA
  "followup-1-aca": `Hi {{firstName}}, this is {{agentName}} following up on your ACA inquiry. Would you like to schedule a call to discuss marketplace options and see if you qualify for subsidies? Reply YES or call {{phoneNumber}}. Reply STOP to opt out.`,
  
  // Follow-up templates - Individual/Family
  "followup-1-individual": `Hi {{firstName}}, this is {{agentName}} following up on your private plan inquiry{{#if planName}} about {{planName}}{{/if}}. Ready to explore your options? Reply YES or call {{phoneNumber}}. Reply STOP to opt out.`,
};

/**
 * Template loader class for Benefits CRM messaging
 */
export class MessageTemplateLoader {
  /**
   * Get template content by key
   */
  private getTemplateContent(templateKey: string): string | null {
    return TEMPLATE_STORAGE[templateKey] || null;
  }

  /**
   * Get intake confirmation template for lead type
   */
  getIntakeConfirmationTemplate(leadType: "ACA" | "Medicare" | "Employer" | "Individual/Family"): string | null {
    const templateMap: Record<string, string> = {
      ACA: "intake-confirmation-aca",
      Medicare: "intake-confirmation-medicare",
      Employer: "intake-confirmation-employer",
      "Individual/Family": "intake-confirmation-individual",
    };

    const templateKey = templateMap[leadType];
    if (!templateKey) return null;

    return this.getTemplateContent(templateKey);
  }

  /**
   * Get follow-up template for lead type and sequence
   */
  getFollowUpTemplate(
    leadType: "ACA" | "Medicare" | "Employer" | "Individual/Family",
    sequence: number
  ): string | null {
    const templateMap: Record<string, Record<number, string>> = {
      ACA: {
        1: "followup-1-aca",
        2: "followup-2-aca",
        3: "followup-3-aca",
      },
      Medicare: {
        1: "followup-1-medicare",
        2: "followup-2-medicare",
        3: "followup-3-medicare",
      },
      Employer: {
        1: "followup-1-employer",
        2: "followup-2-employer",
        3: "followup-3-employer",
      },
      "Individual/Family": {
        1: "followup-1-individual",
        2: "followup-2-individual",
        3: "followup-3-individual",
      },
    };

    const templateKey = templateMap[leadType]?.[sequence];
    if (!templateKey) return null;

    return this.getTemplateContent(templateKey);
  }

  /**
   * Personalize template with data
   */
  personalizeTemplate(template: string, data: PersonalizationData): string {
    let personalized = template;

    // Replace all {{variable}} patterns
    const variablePattern = /\{\{(\w+)\}\}/g;
    personalized = personalized.replace(variablePattern, (match, varName) => {
      const value = data[varName];
      if (value !== undefined && value !== null) {
        return String(value);
      }
      // If variable not found, return empty string or original if it's optional
      // For optional variables with conditional logic, we'll handle those separately
      return "";
    });

    // Handle conditional blocks (simple {{#if variable}}...{{/if}})
    const conditionalPattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    personalized = personalized.replace(conditionalPattern, (match, varName, content) => {
      const value = data[varName];
      if (value !== undefined && value !== null && value !== "") {
        // Personalize the content inside the conditional
        return this.personalizeTemplate(content, data);
      }
      return "";
    });

    // Clean up any double spaces or extra whitespace
    personalized = personalized.replace(/\s+/g, " ").trim();

    return personalized;
  }

  /**
   * Get and personalize intake confirmation message
   */
  getIntakeConfirmationMessage(
    leadType: "ACA" | "Medicare" | "Employer" | "Individual/Family",
    data: PersonalizationData
  ): string | null {
    const template = this.getIntakeConfirmationTemplate(leadType);
    if (!template) return null;

    return this.personalizeTemplate(template, data);
  }

  /**
   * Get and personalize follow-up message
   */
  getFollowUpMessage(
    leadType: "ACA" | "Medicare" | "Employer" | "Individual/Family",
    sequence: number,
    data: PersonalizationData
  ): string | null {
    const template = this.getFollowUpTemplate(leadType, sequence);
    if (!template) return null;

    return this.personalizeTemplate(template, data);
  }

  /**
   * Split message if it exceeds SMS character limit
   */
  splitMessage(message: string, maxLength: number = 160): string[] {
    if (message.length <= maxLength) {
      return [message];
    }

    // Try to split on sentence boundaries
    const sentences = message.match(/[^.!?]+[.!?]+/g) || [message];
    const parts: string[] = [];
    let currentPart = "";

    for (const sentence of sentences) {
      if ((currentPart + sentence).length <= maxLength) {
        currentPart += sentence;
      } else {
        if (currentPart) {
          parts.push(currentPart.trim());
        }
        // If single sentence is too long, split by words
        if (sentence.length > maxLength) {
          const words = sentence.split(" ");
          let wordPart = "";
          for (const word of words) {
            if ((wordPart + word).length <= maxLength) {
              wordPart += word + " ";
            } else {
              if (wordPart) {
                parts.push(wordPart.trim());
              }
              wordPart = word + " ";
            }
          }
          if (wordPart) {
            currentPart = wordPart;
          } else {
            currentPart = sentence;
          }
        } else {
          currentPart = sentence;
        }
      }
    }

    if (currentPart) {
      parts.push(currentPart.trim());
    }

    return parts.length > 0 ? parts : [message];
  }
}

// Export singleton instance
export const templateLoader = new MessageTemplateLoader();
