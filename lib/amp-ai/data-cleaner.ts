// STRIKE 3: Auto-Clean Dirty Data
// Automatically clean and normalize data during ingestion

import { CleaningResult } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;

/**
 * Clean a single field value
 */
function cleanField(
  fieldName: string,
  value: any,
  fieldType?: string
): { cleaned: any; changed: boolean; reason?: string } {
  if (value === null || value === undefined) {
    return { cleaned: "", changed: false };
  }

  let cleaned = String(value);
  let changed = false;
  let reason: string | undefined;

  // Trim whitespace
  const original = cleaned;
  cleaned = cleaned.trim();
  if (cleaned !== original) {
    changed = true;
    reason = "trimmed whitespace";
  }

  // Type-specific cleaning
  if (fieldType === "email" || EMAIL_PATTERN.test(cleaned) || /@/.test(cleaned)) {
    const originalEmail = cleaned;
    cleaned = cleaned.toLowerCase().trim();
    
    // Fix common email typos
    cleaned = cleaned.replace(/gmal\.com/g, "gmail.com");
    cleaned = cleaned.replace(/gmial\.com/g, "gmail.com");
    cleaned = cleaned.replace(/gmai\.com/g, "gmail.com");
    cleaned = cleaned.replace(/yaho\.com/g, "yahoo.com");
    cleaned = cleaned.replace(/hotmai\.com/g, "hotmail.com");
    
    if (cleaned !== originalEmail) {
      changed = true;
      reason = reason ? `${reason}, normalized email` : "normalized email";
    }
  }

  if (fieldType === "phone" || /phone|tel|mobile/i.test(fieldName)) {
    const originalPhone = cleaned;
    // Remove all non-digits except leading +
    const digits = cleaned.replace(/\D/g, "");
    
    if (digits.length >= 10) {
      // Format as +1XXXXXXXXXX
      if (digits.length === 10) {
        cleaned = `+1${digits}`;
      } else if (digits.length === 11 && digits[0] === "1") {
        cleaned = `+${digits}`;
      } else if (digits.length > 11) {
        cleaned = `+${digits}`;
      } else {
        cleaned = `+1${digits}`;
      }
      
      if (cleaned !== originalPhone) {
        changed = true;
        reason = reason ? `${reason}, normalized phone` : "normalized phone";
      }
    }
  }

  if (fieldType === "name" || /name|first|last/i.test(fieldName)) {
    const originalName = cleaned;
    // Capitalize first letter of each word
    cleaned = cleaned
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
    
    if (cleaned !== originalName && originalName.length > 0) {
      changed = true;
      reason = reason ? `${reason}, normalized capitalization` : "normalized capitalization";
    }
  }

  // Remove invalid characters (keep alphanumeric, spaces, common punctuation)
  const originalAfterNormalization = cleaned;
  cleaned = cleaned.replace(/[^\w\s@.\-+()]/g, "");
  if (cleaned !== originalAfterNormalization) {
    changed = true;
    reason = reason ? `${reason}, removed invalid characters` : "removed invalid characters";
  }

  return { cleaned, changed, reason };
}

/**
 * Clean an entire record
 */
export function cleanRecord(
  record: Record<string, any>,
  schemaAnalysis?: { columns: Array<{ name: string; type: string }> }
): CleaningResult {
  const cleaned: Record<string, any> = {};
  const changes: CleaningResult["changes"] = [];

  // Build type map from schema analysis
  const typeMap: Record<string, string> = {};
  if (schemaAnalysis) {
    schemaAnalysis.columns.forEach(col => {
      typeMap[col.name] = col.type;
    });
  }

  // Clean each field
  for (const [fieldName, value] of Object.entries(record)) {
    const fieldType = typeMap[fieldName];
    const result = cleanField(fieldName, value, fieldType);
    
    cleaned[fieldName] = result.cleaned;
    
    if (result.changed && result.reason) {
      changes.push({
        field: fieldName,
        original: value,
        cleaned: result.cleaned,
        reason: result.reason
      });
    }
  }

  return { cleaned, changes };
}

/**
 * Clean a batch of records
 */
export function cleanBatch(
  records: Record<string, any>[],
  schemaAnalysis?: { columns: Array<{ name: string; type: string }> }
): {
  cleaned: Record<string, any>[];
  totalChanges: number;
  changesByField: Record<string, number>;
} {
  const cleaned: Record<string, any>[] = [];
  let totalChanges = 0;
  const changesByField: Record<string, number> = {};

  records.forEach(record => {
    const result = cleanRecord(record, schemaAnalysis);
    cleaned.push(result.cleaned);
    
    totalChanges += result.changes.length;
    result.changes.forEach(change => {
      changesByField[change.field] = (changesByField[change.field] || 0) + 1;
    });
  });

  return { cleaned, totalChanges, changesByField };
}
