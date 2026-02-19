// Transformation + Validation Engine
// Any raw CSV row can become a **clean XOM3 client object**

import { Xom3Client } from "./schema";
import { transformProfiles } from "./mappings";

export function getProfile(profileKey: string) {
  return transformProfiles[profileKey] || transformProfiles["default-csv"];
}

export function transformRow(row: Record<string, string>, profileKey: string): Xom3Client {
  const profile = getProfile(profileKey);
  const mapped = profile.map(row);

  // Basic validation / cleaning
  if (!mapped.email || !mapped.firstName || !mapped.lastName) {
    throw new Error("Missing required fields");
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(mapped.email)) {
    throw new Error("Invalid email format");
  }

  // Phone normalization (basic)
  if (mapped.phone) {
    const cleaned = mapped.phone.replace(/\D/g, "");
    if (cleaned.length >= 10) {
      mapped.phone = cleaned.length === 10 ? `+1${cleaned}` : `+${cleaned}`;
    }
  }

  // Status default
  mapped.status = mapped.status || "Prospect";

  // CreatedAt default
  if (!mapped.createdAt) {
    mapped.createdAt = new Date().toISOString();
  }

  return mapped;
}

export function transformBatch(
  rows: Record<string, string>[],
  profileKey: string
): { valid: Xom3Client[]; errors: Array<{ row: number; error: string }> } {
  const valid: Xom3Client[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  rows.forEach((row, index) => {
    try {
      const transformed = transformRow(row, profileKey);
      valid.push(transformed);
    } catch (error: any) {
      errors.push({
        row: index + 1,
        error: error.message || "Transformation failed"
      });
    }
  });

  return { valid, errors };
}
