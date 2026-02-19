// STRIKE 2: Auto-Suggest Mapping Profiles
// Compare incoming columns to known profiles and suggest best match

import { transformProfiles } from "../transform/mappings";
import { SchemaAnalysis, ProfileMatch } from "./types";

/**
 * Score similarity between incoming columns and a profile's expected columns
 */
function scoreProfileMatch(
  incomingColumns: string[],
  profileKey: string,
  profileName: string
): ProfileMatch {
  // Get profile's expected column patterns
  const profilePatterns: Record<string, Record<string, RegExp[]>> = {
    "default-csv": {
      firstName: [/first.?name/i],
      lastName: [/last.?name/i],
      email: [/email/i],
      phone: [/phone/i],
      status: [/status/i],
      createdAt: [/created/i, /date/i]
    },
    "usha-export": {
      firstName: [/clientfirst/i, /first/i],
      lastName: [/clientlast/i, /last/i],
      email: [/clientemail/i, /email/i],
      phone: [/clientphone/i, /phone/i],
      status: [/stage/i, /status/i],
      createdAt: [/createdon/i, /created/i]
    },
    "pulsevera-usha": {
      firstName: [/first.?name/i, /firstname/i],
      lastName: [/last.?name/i, /lastname/i],
      email: [/email/i, /email.?address/i],
      phone: [/phone/i, /phone.?number/i],
      status: [/status/i, /pipeline.?stage/i],
      createdAt: [/created.?at/i, /created/i]
    },
    "generic-crm": {
      firstName: [/first.?name/i, /first_name/i, /fname/i],
      lastName: [/last.?name/i, /last_name/i, /lname/i],
      email: [/email/i, /e.?mail/i],
      phone: [/phone/i, /tel/i, /telephone/i],
      status: [/status/i, /stage/i, /state/i],
      createdAt: [/created.?at/i, /created_at/i, /date/i]
    }
  };

  const patterns = profilePatterns[profileKey] || {};
  const lowerColumns = incomingColumns.map(c => c.toLowerCase());
  
  let matchedFields = 0;
  let totalFields = Object.keys(patterns).length;
  
  // Check each expected field
  for (const [field, fieldPatterns] of Object.entries(patterns)) {
    const matched = lowerColumns.some(col => 
      fieldPatterns.some(pattern => pattern.test(col))
    );
    if (matched) {
      matchedFields++;
    }
  }

  // Calculate score
  const matchRatio = totalFields > 0 ? matchedFields / totalFields : 0;
  const confidence = matchRatio > 0.5 
    ? Math.min(0.95, 0.5 + (matchRatio - 0.5) * 0.9)
    : matchRatio * 0.5;

  return {
    profileKey,
    profileName,
    score: matchRatio,
    matchedColumns: matchedFields,
    totalColumns: totalFields,
    confidence
  };
}

/**
 * Suggest the best matching profile for incoming data
 */
export function suggestProfile(
  schemaAnalysis: SchemaAnalysis,
  threshold: number = 0.6
): ProfileMatch | null {
  const incomingColumns = schemaAnalysis.columns.map(c => c.name);
  
  // Score all available profiles
  const matches: ProfileMatch[] = Object.entries(transformProfiles).map(
    ([key, profile]) => {
      return scoreProfileMatch(incomingColumns, key, profile.name);
    }
  );

  // Sort by confidence (descending)
  matches.sort((a, b) => b.confidence - a.confidence);

  // Return best match if above threshold
  const bestMatch = matches[0];
  if (bestMatch && bestMatch.confidence >= threshold) {
    return bestMatch;
  }

  return null;
}

/**
 * Get top N profile suggestions
 */
export function getProfileSuggestions(
  schemaAnalysis: SchemaAnalysis,
  topN: number = 3
): ProfileMatch[] {
  const incomingColumns = schemaAnalysis.columns.map(c => c.name);
  
  const matches: ProfileMatch[] = Object.entries(transformProfiles).map(
    ([key, profile]) => {
      return scoreProfileMatch(incomingColumns, key, profile.name);
    }
  );

  // Sort by confidence and return top N
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);
}
