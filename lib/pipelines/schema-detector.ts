// Auto-Schema Detection Service
// Detects CSV/API schemas and suggests mapping profiles

import { SchemaDetectionResult } from "./types";
import { transformProfiles } from "../transform/mappings";

export function detectCSVSchema(csvContent: string): SchemaDetectionResult {
  const lines = csvContent.split("\n").filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return { columns: [], confidence: 0 };
  }

  // Parse CSV header (handle quoted values)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const columns = parseCSVLine(lines[0]);
  
  // Analyze columns and suggest mapping
  const suggestedMapping: Record<string, string> = {};
  let suggestedProfile = "default-csv";
  let confidence = 0.5;

  // Common field name patterns
  const fieldPatterns: Record<string, RegExp[]> = {
    firstName: [/first.?name/i, /fname/i, /given.?name/i, /forename/i],
    lastName: [/last.?name/i, /lname/i, /surname/i, /family.?name/i],
    email: [/email/i, /e.?mail/i, /email.?address/i],
    phone: [/phone/i, /tel/i, /telephone/i, /mobile/i, /cell/i],
    status: [/status/i, /stage/i, /state/i, /pipeline/i],
    createdAt: [/created/i, /date/i, /timestamp/i, /added/i]
  };

  // Match columns to fields
  let matches = 0;
  columns.forEach(col => {
    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      if (patterns.some(pattern => pattern.test(col))) {
        suggestedMapping[col] = field;
        matches++;
        break;
      }
    }
  });

  // Calculate confidence
  if (matches > 0) {
    confidence = Math.min(0.9, 0.5 + (matches / columns.length) * 0.4);
  }

  // Suggest profile based on column names
  if (columns.some(c => /client/i.test(c))) {
    suggestedProfile = "usha-export";
    confidence = Math.max(confidence, 0.7);
  } else if (columns.some(c => /pulse/i.test(c) || /vera/i.test(c))) {
    suggestedProfile = "pulsevera-usha";
    confidence = Math.max(confidence, 0.7);
  }

  return {
    columns,
    suggestedMapping,
    suggestedProfile,
    confidence
  };
}

export function detectAPISchema(data: any[]): SchemaDetectionResult {
  if (!Array.isArray(data) || data.length === 0) {
    return { columns: [], confidence: 0 };
  }

  // Get all unique keys from the first few records
  const sampleSize = Math.min(10, data.length);
  const allKeys = new Set<string>();
  
  for (let i = 0; i < sampleSize; i++) {
    Object.keys(data[i] || {}).forEach(key => allKeys.add(key));
  }

  const columns = Array.from(allKeys);
  
  // Suggest mapping (similar to CSV detection)
  const suggestedMapping: Record<string, string> = {};
  const fieldPatterns: Record<string, RegExp[]> = {
    firstName: [/first.?name/i, /fname/i, /given.?name/i],
    lastName: [/last.?name/i, /lname/i, /surname/i],
    email: [/email/i, /e.?mail/i],
    phone: [/phone/i, /tel/i, /mobile/i],
    status: [/status/i, /stage/i, /state/i],
    createdAt: [/created/i, /date/i, /timestamp/i]
  };

  let matches = 0;
  columns.forEach(col => {
    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      if (patterns.some(pattern => pattern.test(col))) {
        suggestedMapping[col] = field;
        matches++;
        break;
      }
    }
  });

  const confidence = matches > 0 
    ? Math.min(0.9, 0.5 + (matches / columns.length) * 0.4)
    : 0.3;

  return {
    columns,
    suggestedMapping,
    suggestedProfile: "default-csv",
    confidence
  };
}
