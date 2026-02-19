// STRIKE 4: Auto-Repair Failed Rows
// Analyze errors, suggest fixes, apply safely, and retry

import { RepairSuggestion, RepairResult } from "./types";
import { cleanRecord } from "./data-cleaner";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;

/**
 * Analyze an error and suggest repairs
 */
export function analyzeError(
  errorMessage: string,
  rawRow: Record<string, any>,
  expectedFields: string[] = ["firstName", "lastName", "email"]
): RepairSuggestion[] {
  const suggestions: RepairSuggestion[] = [];

  // Parse error message to understand what failed
  const lowerError = errorMessage.toLowerCase();

  // Missing required fields
  if (lowerError.includes("missing") || lowerError.includes("required")) {
    // Check for missing firstName
    if (!rawRow.firstName && !rawRow["First Name"] && !rawRow["first_name"]) {
      // Try to extract from full name
      const fullName = rawRow["Full Name"] || rawRow["full_name"] || rawRow["Name"] || rawRow["name"];
      if (fullName) {
        const parts = String(fullName).trim().split(/\s+/);
        if (parts.length >= 2) {
          suggestions.push({
            field: "firstName",
            originalValue: "",
            suggestedValue: parts[0],
            confidence: 0.8,
            reason: "Extracted from full name",
            safe: true
          });
        }
      }
    }

    // Check for missing lastName
    if (!rawRow.lastName && !rawRow["Last Name"] && !rawRow["last_name"]) {
      const fullName = rawRow["Full Name"] || rawRow["full_name"] || rawRow["Name"] || rawRow["name"];
      if (fullName) {
        const parts = String(fullName).trim().split(/\s+/);
        if (parts.length >= 2) {
          suggestions.push({
            field: "lastName",
            originalValue: "",
            suggestedValue: parts.slice(1).join(" "),
            confidence: 0.8,
            reason: "Extracted from full name",
            safe: true
          });
        }
      }
    }

    // Check for missing status
    if (!rawRow.status && !rawRow["Status"]) {
      suggestions.push({
        field: "status",
        originalValue: "",
        suggestedValue: "Prospect",
        confidence: 0.9,
        reason: "Default value for missing status",
        safe: true
      });
    }
  }

  // Invalid email
  if (lowerError.includes("email") || lowerError.includes("invalid")) {
    const emailField = rawRow.email || rawRow["Email"] || rawRow["email_address"];
    if (emailField && !EMAIL_PATTERN.test(String(emailField))) {
      const email = String(emailField).toLowerCase().trim();
      
      // Try to fix common typos
      let fixed = email;
      fixed = fixed.replace(/gmal\.com/g, "gmail.com");
      fixed = fixed.replace(/gmial\.com/g, "gmail.com");
      fixed = fixed.replace(/gmai\.com/g, "gmail.com");
      fixed = fixed.replace(/yaho\.com/g, "yahoo.com");
      fixed = fixed.replace(/hotmai\.com/g, "hotmail.com");
      
      // Remove spaces
      fixed = fixed.replace(/\s/g, "");
      
      if (EMAIL_PATTERN.test(fixed) && fixed !== email) {
        suggestions.push({
          field: "email",
          originalValue: email,
          suggestedValue: fixed,
          confidence: 0.7,
          reason: "Fixed email domain typo",
          safe: true
        });
      }
    }
  }

  // Invalid date
  if (lowerError.includes("date") || lowerError.includes("created")) {
    const dateField = rawRow.createdAt || rawRow["Created At"] || rawRow["created_at"];
    if (dateField && !/^\d{4}-\d{2}-\d{2}/.test(String(dateField))) {
      // Try to parse common date formats
      const dateStr = String(dateField);
      const parsed = parseDate(dateStr);
      
      if (parsed) {
        suggestions.push({
          field: "createdAt",
          originalValue: dateField,
          suggestedValue: parsed,
          confidence: 0.6,
          reason: "Parsed date with fallback format",
          safe: true
        });
      } else {
        // Default to current date
        suggestions.push({
          field: "createdAt",
          originalValue: dateField,
          suggestedValue: new Date().toISOString(),
          confidence: 0.5,
          reason: "Default to current date",
          safe: true
        });
      }
    }
  }

  return suggestions;
}

/**
 * Parse date with multiple fallback formats
 */
function parseDate(dateStr: string): string | null {
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{4})\/(\d{2})\/(\d{2})$/, // YYYY/MM/DD
    /^(\d{2})\/(\d{2})\/(\d{2})$/, // MM/DD/YY
    /^(\d{4})-(\d{2})-(\d{2})$/ // YYYY-MM-DD
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      try {
        let year, month, day;
        if (format === formats[0]) { // MM/DD/YYYY
          [, month, day, year] = match;
        } else if (format === formats[1]) { // YYYY/MM/DD
          [year, month, day] = match.slice(1);
        } else if (format === formats[2]) { // MM/DD/YY
          [, month, day, year] = match;
          year = "20" + year;
        } else { // YYYY-MM-DD
          [year, month, day] = match.slice(1);
        }
        
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (e) {
        // Continue to next format
      }
    }
  }

  return null;
}

/**
 * Apply repair suggestions to a row
 */
export function repairRow(
  rawRow: Record<string, any>,
  suggestions: RepairSuggestion[],
  autoApply: boolean = false
): RepairResult {
  const repaired = { ...rawRow };
  const applied: RepairSuggestion[] = [];
  const skipped: RepairSuggestion[] = [];

  // Only apply safe suggestions
  const safeSuggestions = suggestions.filter(s => s.safe);

  safeSuggestions.forEach(suggestion => {
    if (autoApply || suggestion.confidence >= 0.8) {
      repaired[suggestion.field] = suggestion.suggestedValue;
      applied.push(suggestion);
    } else {
      skipped.push(suggestion);
    }
  });

  // Also apply general cleaning
  const cleaned = cleanRecord(repaired);
  Object.assign(repaired, cleaned.cleaned);

  return {
    repaired,
    suggestions: applied,
    applied: applied.length > 0,
    retryable: applied.length > 0
  };
}

/**
 * Repair a failed row based on error message
 */
export function repairFailedRow(
  rawRow: Record<string, any>,
  errorMessage: string,
  expectedFields: string[] = ["firstName", "lastName", "email"],
  autoApply: boolean = true
): RepairResult {
  const suggestions = analyzeError(errorMessage, rawRow, expectedFields);
  return repairRow(rawRow, suggestions, autoApply);
}
