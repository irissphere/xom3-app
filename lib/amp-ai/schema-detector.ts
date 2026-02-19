// STRIKE 1: Auto-Detect Source Schema
// Enhanced schema detection with pattern inference

import { ColumnAnalysis, SchemaAnalysis } from "./types";

// Email regex patterns
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_LIKE = /@/;

// Phone regex patterns
const PHONE_PATTERNS = [
  /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
  /^\+?[0-9]{10,15}$/,
  /^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/
];

// Date patterns
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
  /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
  /^\d{2}\/\d{2}\/\d{2}$/, // MM/DD/YY
  /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  /^[A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4}$/i, // Jan 1, 2024
  /^\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}$/i // 1 Jan 2024
];

// Name patterns
const NAME_PATTERNS = {
  firstName: [/first.?name/i, /fname/i, /given.?name/i, /forename/i, /clientfirst/i],
  lastName: [/last.?name/i, /lname/i, /surname/i, /family.?name/i, /clientlast/i]
};

// Status patterns
const STATUS_PATTERNS = [/status/i, /stage/i, /state/i, /pipeline/i, /phase/i];

/**
 * Analyze a single column to infer its type and patterns
 */
export function analyzeColumn(
  columnName: string,
  sampleValues: string[]
): ColumnAnalysis {
  const analysis: ColumnAnalysis = {
    name: columnName,
    type: "unknown",
    confidence: 0,
    patterns: []
  };

  const lowerName = columnName.toLowerCase();
  const nonEmptyValues = sampleValues.filter(v => v && v.trim().length > 0);
  
  if (nonEmptyValues.length === 0) {
    return analysis;
  }

  // Check for email
  if (EMAIL_LIKE.test(columnName) || EMAIL_PATTERN.test(nonEmptyValues[0])) {
    const emailCount = nonEmptyValues.filter(v => EMAIL_PATTERN.test(v)).length;
    const emailRatio = emailCount / nonEmptyValues.length;
    
    if (emailRatio > 0.7) {
      analysis.type = "email";
      analysis.confidence = emailRatio;
      analysis.patterns.push("email");
      analysis.suggestedMapping = "email";
      return analysis;
    }
  }

  // Check for phone
  const phonePatterns = PHONE_PATTERNS.map(p => new RegExp(p.source));
  const phoneCount = nonEmptyValues.filter(v => 
    phonePatterns.some(pattern => pattern.test(v.replace(/\D/g, "")))
  ).length;
  const phoneRatio = phoneCount / nonEmptyValues.length;
  
  if (phoneRatio > 0.6 || /phone|tel|mobile|cell/i.test(columnName)) {
    analysis.type = "phone";
    analysis.confidence = phoneRatio;
    analysis.patterns.push("phone");
    analysis.suggestedMapping = "phone";
    return analysis;
  }

  // Check for date
  const dateCount = nonEmptyValues.filter(v => 
    DATE_PATTERNS.some(pattern => pattern.test(v))
  ).length;
  const dateRatio = dateCount / nonEmptyValues.length;
  
  if (dateRatio > 0.5 || /date|created|updated|timestamp|time/i.test(columnName)) {
    analysis.type = "date";
    analysis.confidence = dateRatio;
    analysis.patterns.push("date");
    if (/created|added/i.test(columnName)) {
      analysis.suggestedMapping = "createdAt";
    }
    return analysis;
  }

  // Check for name patterns
  for (const [field, patterns] of Object.entries(NAME_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(columnName))) {
      analysis.type = "name";
      analysis.confidence = 0.8;
      analysis.patterns.push(field);
      analysis.suggestedMapping = field === "firstName" ? "firstName" : "lastName";
      return analysis;
    }
  }

  // Check for status
  if (STATUS_PATTERNS.some(pattern => pattern.test(columnName))) {
    analysis.type = "status";
    analysis.confidence = 0.7;
    analysis.patterns.push("status");
    analysis.suggestedMapping = "status";
    return analysis;
  }

  // Check if it's numeric
  const numericCount = nonEmptyValues.filter(v => /^\d+(\.\d+)?$/.test(v)).length;
  if (numericCount / nonEmptyValues.length > 0.8) {
    analysis.type = "number";
    analysis.confidence = numericCount / nonEmptyValues.length;
    analysis.patterns.push("numeric");
    return analysis;
  }

  // Default to text
  analysis.type = "text";
  analysis.confidence = 0.5;
  analysis.patterns.push("text");

  return analysis;
}

/**
 * Detect schema from CSV content with enhanced pattern detection
 */
export function detectSchemaFromCSV(
  csvContent: string,
  sampleSize: number = 10
): SchemaAnalysis {
  const lines = csvContent.split("\n").filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return { columns: [], confidence: 0, autoMappings: {} };
  }

  // Parse CSV header
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

  const headers = parseCSVLine(lines[0]);
  const dataRows = lines.slice(1, Math.min(sampleSize + 1, lines.length));

  // Analyze each column
  const columnAnalyses: ColumnAnalysis[] = headers.map(header => {
    const sampleValues = dataRows
      .map(row => {
        const values = parseCSVLine(row);
        const index = headers.indexOf(header);
        return values[index] || "";
      })
      .filter(v => v.trim().length > 0);
    
    return analyzeColumn(header, sampleValues);
  });

  // Build auto-mappings
  const autoMappings: Record<string, string> = {};
  columnAnalyses.forEach(analysis => {
    if (analysis.suggestedMapping) {
      autoMappings[analysis.name] = analysis.suggestedMapping;
    }
  });

  // Calculate overall confidence
  const avgConfidence = columnAnalyses.length > 0
    ? columnAnalyses.reduce((sum, a) => sum + a.confidence, 0) / columnAnalyses.length
    : 0;

  return {
    columns: columnAnalyses,
    confidence: avgConfidence,
    autoMappings
  };
}

/**
 * Detect schema from API payload
 */
export function detectSchemaFromAPI(
  data: any[],
  sampleSize: number = 10
): SchemaAnalysis {
  if (!Array.isArray(data) || data.length === 0) {
    return { columns: [], confidence: 0, autoMappings: {} };
  }

  const sample = data.slice(0, Math.min(sampleSize, data.length));
  const allKeys = new Set<string>();
  
  sample.forEach(record => {
    Object.keys(record || {}).forEach(key => allKeys.add(key));
  });

  const columns = Array.from(allKeys);
  const columnAnalyses: ColumnAnalysis[] = columns.map(columnName => {
    const sampleValues = sample
      .map(record => {
        const value = record[columnName];
        return value ? String(value) : "";
      })
      .filter(v => v.trim().length > 0);
    
    return analyzeColumn(columnName, sampleValues);
  });

  // Build auto-mappings
  const autoMappings: Record<string, string> = {};
  columnAnalyses.forEach(analysis => {
    if (analysis.suggestedMapping) {
      autoMappings[analysis.name] = analysis.suggestedMapping;
    }
  });

  const avgConfidence = columnAnalyses.length > 0
    ? columnAnalyses.reduce((sum, a) => sum + a.confidence, 0) / columnAnalyses.length
    : 0;

  return {
    columns: columnAnalyses,
    confidence: avgConfidence,
    autoMappings
  };
}
