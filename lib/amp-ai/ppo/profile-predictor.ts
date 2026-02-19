// STRIKE 5: Predict Optimal Mapping Profiles
// Compares profiles and predicts best matches

import { ProfilePrediction } from "./types";
import { transformProfiles } from "../../transform/mappings";
import { loadEvolutionMemory } from "../ape/memory";

/**
 * Predict optimal mapping profile
 */
export async function predictOptimalProfile(
  tenant: string,
  currentProfileKey: string,
  incomingColumns: string[]
): Promise<ProfilePrediction | null> {
  try {
    // Load evolution memory for current profile
    const memory = await loadEvolutionMemory(currentProfileKey, tenant);

    // Score all available profiles
    const profileScores: Array<{
      profileKey: string;
      profileName: string;
      score: number;
      matchedColumns: number;
      confidence: number;
    }> = [];

    for (const [profileKey, profile] of Object.entries(transformProfiles)) {
      // Calculate similarity score
      const lowerColumns = incomingColumns.map(c => c.toLowerCase());
      let matchedColumns = 0;

      // Check for common patterns
      const patterns: Record<string, RegExp[]> = {
        firstName: [/first.?name/i, /fname/i, /given/i, /clientfirst/i],
        lastName: [/last.?name/i, /lname/i, /surname/i, /clientlast/i],
        email: [/email/i, /e.?mail/i, /clientemail/i],
        phone: [/phone/i, /tel/i, /mobile/i, /clientphone/i],
        status: [/status/i, /stage/i, /state/i],
        createdAt: [/created/i, /date/i, /timestamp/i, /createdon/i]
      };

      for (const [field, fieldPatterns] of Object.entries(patterns)) {
        const matched = lowerColumns.some(col => 
          fieldPatterns.some(pattern => pattern.test(col))
        );
        if (matched) {
          matchedColumns++;
        }
      }

      const score = incomingColumns.length > 0 
        ? matchedColumns / Math.max(incomingColumns.length, Object.keys(patterns).length)
        : 0;

      // Boost score based on evolution memory
      let confidence = score;
      if (memory.columnMappings) {
        const memoryMatches = Object.keys(memory.columnMappings).filter(col => 
          incomingColumns.includes(col)
        ).length;
        confidence = Math.min(0.95, score + (memoryMatches / incomingColumns.length) * 0.2);
      }

      profileScores.push({
        profileKey,
        profileName: profile.name,
        score,
        matchedColumns,
        confidence
      });
    }

    // Find best match
    profileScores.sort((a, b) => b.confidence - a.confidence);
    const bestMatch = profileScores[0];
    const currentProfile = profileScores.find(p => p.profileKey === currentProfileKey);

    if (!bestMatch || !currentProfile) {
      return null;
    }

    // Detect drift
    const driftDetected = bestMatch.confidence > currentProfile.confidence * 1.1;

    if (driftDetected || bestMatch.confidence > 0.8) {
      return {
        currentProfile: currentProfileKey,
        suggestedProfile: bestMatch.profileKey,
        confidence: bestMatch.confidence,
        reason: bestMatch.confidence > currentProfile.confidence
          ? `Profile '${bestMatch.profileName}' has ${(bestMatch.confidence * 100).toFixed(0)}% match vs ${(currentProfile.confidence * 100).toFixed(0)}% for current profile`
          : `Profile '${bestMatch.profileName}' matches ${bestMatch.matchedColumns} columns`,
        similarityScore: bestMatch.score,
        driftDetected,
        recommendedAction: driftDetected
          ? `Switch to profile '${bestMatch.profileName}' (${(bestMatch.confidence * 100).toFixed(0)}% confidence)`
          : `Consider using profile '${bestMatch.profileName}' for better accuracy`
      };
    }

    return null;
  } catch (error) {
    console.error("[PPO] Failed to predict optimal profile:", error);
    return null;
  }
}
