// Enterprise Data Transformation Engine - Data Cleaning Engine

import { CleaningRule } from "./types";

/**
 * Apply cleaning rules to a record
 */
export function cleanRecord(
  record: Record<string, any>,
  rules: CleaningRule[]
): Record<string, any> {
  const cleaned = { ...record };

  for (const rule of rules) {
    if (cleaned[rule.field] !== undefined && cleaned[rule.field] !== null) {
      cleaned[rule.field] = cleanValue(cleaned[rule.field], rule);
    }
  }

  return cleaned;
}

/**
 * Apply a single cleaning rule to a value
 */
function cleanValue(value: any, rule: CleaningRule): any {
  if (value === null || value === undefined) {
    return value;
  }

  switch (rule.operation) {
    case "trim":
      return typeof value === "string" ? value.trim() : value;

    case "lowercase":
      return typeof value === "string" ? value.toLowerCase() : value;

    case "uppercase":
      return typeof value === "string" ? value.toUpperCase() : value;

    case "removeWhitespace":
      return typeof value === "string" ? value.replace(/\s+/g, " ") : value;

    case "normalizePhone":
      if (typeof value === "string") {
        const cleaned = value.replace(/\D/g, "");
        if (cleaned.length === 10) {
          return `+1${cleaned}`;
        } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
          return `+${cleaned}`;
        } else if (value.startsWith("+")) {
          return value;
        }
      }
      return value;

    case "normalizeEmail":
      return typeof value === "string" ? value.trim().toLowerCase() : value;

    case "normalizeDate":
      if (typeof value === "string") {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split("T")[0]; // YYYY-MM-DD
          }
        } catch {
          // Invalid date, return original
        }
      }
      return value;

    case "removeSpecialChars":
      if (typeof value === "string") {
        const keep = rule.params?.keep || [];
        let pattern = "[^a-zA-Z0-9\\s";
        keep.forEach((char: string) => {
          pattern += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        });
        pattern += "]";
        return value.replace(new RegExp(pattern, "g"), "");
      }
      return value;

    case "custom":
      // Custom cleaning functions would be registered and called here
      if (rule.params?.function) {
        // Execute custom function if provided
        return value;
      }
      return value;

    default:
      return value;
  }
}

/**
 * Clean all string fields in a record (basic cleaning)
 */
export function cleanRecordBasic(record: Record<string, any>): Record<string, any> {
  const cleaned = { ...record };

  for (const key in cleaned) {
    if (typeof cleaned[key] === "string") {
      cleaned[key] = cleaned[key].trim();
    }
  }

  return cleaned;
}
