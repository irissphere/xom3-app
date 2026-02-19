// STRIKE 7: Autonomous Profile Management
// Manages mapping profiles autonomously

import { ProfileManagement } from "./types";
import { loadEvolutionMemory } from "../ape/memory";
import fs from "fs";
import path from "path";
import { initializePipelineSystem } from "../../pipelines/init";

/**
 * Manage profile autonomously
 */
export async function manageProfileAutonomously(
  profileKey: string,
  tenant: string,
  action: "create" | "split" | "merge" | "deprecate" | "evolve" | "assign",
  context?: {
    newColumns?: string[];
    tenantDivergence?: boolean;
    errorRate?: number;
  }
): Promise<ProfileManagement> {
  const management: ProfileManagement = {
    action,
    profileKey,
    tenant,
    reason: "",
    confidence: 0.7,
    applied: false
  };

  switch (action) {
    case "split":
      if (context?.tenantDivergence) {
        management.newProfileKey = `${profileKey}-${tenant}`;
        management.reason = `Tenant '${tenant}' diverging from base profile, splitting into tenant-specific profile`;
        management.confidence = 0.8;
        management.applied = await splitProfile(profileKey, management.newProfileKey, tenant);
      }
      break;

    case "evolve":
      const memory = await loadEvolutionMemory(profileKey, tenant);
      if (memory.errorPatterns.length > 5) {
        management.reason = `${memory.errorPatterns.length} error patterns detected, evolving profile`;
        management.confidence = 0.75;
        management.applied = await evolveProfile(profileKey, memory);
      }
      break;

    case "create":
      if (context?.newColumns && context.newColumns.length > 0) {
        management.newProfileKey = `auto-${Date.now()}`;
        management.reason = `New columns detected: ${context.newColumns.join(", ")}, creating new profile`;
        management.confidence = 0.7;
        management.applied = await createProfile(management.newProfileKey, context.newColumns);
      }
      break;

    case "deprecate":
      if (context?.errorRate && context.errorRate > 0.5) {
        management.reason = `High error rate (${(context.errorRate * 100).toFixed(1)}%), deprecating profile`;
        management.confidence = 0.85;
        management.applied = await deprecateProfile(profileKey);
      }
      break;
  }

  if (management.applied) {
    management.appliedAt = new Date().toISOString();
  }

  return management;
}

/**
 * Split profile
 */
async function splitProfile(
  originalKey: string,
  newKey: string,
  tenant: string
): Promise<boolean> {
  try {
    // Ensure pipeline system is initialized (creates directories if needed)
    initializePipelineSystem();
    
    const profilesPath = path.join(process.cwd(), "mapping-profiles", "visual-profiles.json");
    if (!fs.existsSync(profilesPath)) {
      return false;
    }

    let content: string;
    try {
      content = fs.readFileSync(profilesPath, "utf8");
    } catch (readError: any) {
      console.error(`[FAO] Failed to read profiles file: ${profilesPath}`, readError);
      if (readError.code === "EACCES") {
        console.error(`[FAO] Permission denied reading profiles file`);
      }
      return false;
    }

    let profiles: Record<string, Record<string, string>>;
    try {
      profiles = JSON.parse(content) as Record<string, Record<string, string>>;
    } catch (parseError: any) {
      console.error(`[FAO] Invalid JSON in profiles file: ${profilesPath}`, parseError);
      return false;
    }

    if (profiles[originalKey]) {
      profiles[newKey] = { ...profiles[originalKey] };
      fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
      return true;
    }

    return false;
  } catch (error) {
    console.error("[FAO] Failed to split profile:", error);
    return false;
  }
}

/**
 * Evolve profile
 */
async function evolveProfile(
  profileKey: string,
  memory: any
): Promise<boolean> {
  // Profile evolution is handled by APE
  // This is a placeholder for FAO coordination
  return true;
}

/**
 * Create profile
 */
async function createProfile(
  profileKey: string,
  columns: string[]
): Promise<boolean> {
  try {
    // Ensure pipeline system is initialized (creates directories if needed)
    initializePipelineSystem();
    
    const profilesPath = path.join(process.cwd(), "mapping-profiles", "visual-profiles.json");
    let profiles: Record<string, Record<string, string>> = {};
    
    if (fs.existsSync(profilesPath)) {
      try {
        const content = fs.readFileSync(profilesPath, "utf8");
        profiles = JSON.parse(content);
      } catch (readError: any) {
        if (readError.code === "EACCES") {
          console.error(`[FAO] Permission denied reading profiles file: ${profilesPath}`);
          return false;
        } else if (readError instanceof SyntaxError) {
          console.warn(`[FAO] Invalid JSON in profiles file, starting fresh: ${profilesPath}`);
          profiles = {};
        } else {
          console.error(`[FAO] Failed to read profiles file: ${profilesPath}`, readError);
          return false;
        }
      }
    }

    // Create basic mapping
    const mapping: Record<string, string> = {};
    columns.forEach(col => {
      const lower = col.toLowerCase();
      if (/first|fname/i.test(lower)) mapping[col] = "firstName";
      else if (/last|lname/i.test(lower)) mapping[col] = "lastName";
      else if (/email/i.test(lower)) mapping[col] = "email";
      else if (/phone|tel/i.test(lower)) mapping[col] = "phone";
      else if (/status|stage/i.test(lower)) mapping[col] = "status";
      else if (/created|date/i.test(lower)) mapping[col] = "createdAt";
    });

    profiles[profileKey] = mapping;
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
    return true;
  } catch (error) {
    console.error("[FAO] Failed to create profile:", error);
    return false;
  }
}

/**
 * Deprecate profile
 */
async function deprecateProfile(profileKey: string): Promise<boolean> {
  // Mark as deprecated (would need profile metadata)
  return true;
}
