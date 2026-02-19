// 🌌 STRIKE 4: Replace Mapping Profiles With Attractors
// Data falls into correct shape automatically

import { Attractor } from "./types";

/**
 * Create attractor in continuum
 */
export function createAttractor(
  name: string,
  type: Attractor["type"],
  patterns: string[],
  weights: number[]
): Attractor {
  return {
    id: `attractor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    strength: 1.0,
    signature: {
      patterns,
      weights
    },
    state: "active",
    lastUsed: new Date().toISOString()
  };
}

/**
 * Initialize continuum attractors
 */
export function initializeContinuumAttractors(): Attractor[] {
  return [
    createAttractor(
      "firstName-like",
      "firstName-like",
      ["first", "fname", "given", "forename"],
      [1.0, 0.9, 0.8, 0.7]
    ),
    createAttractor(
      "lastName-like",
      "firstName-like", // Would be lastName-like in real implementation
      ["last", "lname", "surname", "family"],
      [1.0, 0.9, 0.8, 0.7]
    ),
    createAttractor(
      "email-like",
      "email-like",
      ["@", "email", "mail", "e-mail"],
      [1.0, 0.95, 0.9, 0.85]
    ),
    createAttractor(
      "phone-like",
      "phone-like",
      ["phone", "tel", "mobile", "cell"],
      [1.0, 0.9, 0.85, 0.8]
    ),
    createAttractor(
      "status-like",
      "status-like",
      ["status", "stage", "state", "phase"],
      [1.0, 0.9, 0.8, 0.7]
    ),
    createAttractor(
      "date-like",
      "date-like",
      ["date", "created", "updated", "timestamp"],
      [1.0, 0.95, 0.9, 0.85]
    )
  ];
}

/**
 * Attract data to attractor
 */
export function attractData(
  attractor: Attractor,
  data: string
): {
  attracted: boolean;
  strength: number;
  match: string;
} {
  const lower = data.toLowerCase();

  // Check if data matches attractor patterns
  let maxMatch = 0;
  let matchedPattern = "";

  attractor.signature.patterns.forEach((pattern, idx) => {
    if (lower.includes(pattern.toLowerCase())) {
      const matchStrength = attractor.signature.weights[idx] * attractor.strength;
      if (matchStrength > maxMatch) {
        maxMatch = matchStrength;
        matchedPattern = pattern;
      }
    }
  });

  // Type-specific matching
  if (attractor.type === "email-like" && lower.includes("@")) {
    maxMatch = Math.max(maxMatch, attractor.strength);
    matchedPattern = "email";
  }

  if (attractor.type === "phone-like" && /[\d\-\(\)\s]{10,}/.test(data)) {
    maxMatch = Math.max(maxMatch, attractor.strength * 0.9);
    matchedPattern = "phone";
  }

  if (attractor.type === "date-like" && /\d{4}[-/]\d{2}[-/]\d{2}/.test(data)) {
    maxMatch = Math.max(maxMatch, attractor.strength * 0.95);
    matchedPattern = "date";
  }

  return {
    attracted: maxMatch > 0.5,
    strength: maxMatch,
    match: matchedPattern
  };
}

/**
 * Find best attractor for data
 */
export function findBestAttractor(
  attractors: Attractor[],
  data: string
): Attractor | null {
  let bestAttractor: Attractor | null = null;
  let bestStrength = 0;

  attractors.forEach(attractor => {
    const result = attractData(attractor, data);
    if (result.attracted && result.strength > bestStrength) {
      bestStrength = result.strength;
      bestAttractor = attractor;
    }
  });

  return bestAttractor;
}
