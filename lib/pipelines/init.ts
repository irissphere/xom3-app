// Pipeline System Initialization
// Ensures required directories and files exist

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

const MAPPING_PROFILES_DIR = path.join(process.cwd(), "mapping-profiles");
const MAPPING_PROFILES_FILE = path.join(MAPPING_PROFILES_DIR, "visual-profiles.json");
const PIPELINES_DIR = path.join(process.cwd(), "pipelines");
const PIPELINES_FILE = path.join(PIPELINES_DIR, "active-pipelines.json");
const EXECUTIONS_FILE = path.join(PIPELINES_DIR, "executions.json");

/**
 * Initialize pipeline system directories and files
 * Call this at application startup or before first use
 */
export function initializePipelineSystem(): void {
  try {
    // Create mapping-profiles directory if it doesn't exist
    if (!existsSync(MAPPING_PROFILES_DIR)) {
      mkdirSync(MAPPING_PROFILES_DIR, { recursive: true });
      console.log(`[Init] Created mapping-profiles directory: ${MAPPING_PROFILES_DIR}`);
    }

    // Create visual-profiles.json if it doesn't exist
    if (!existsSync(MAPPING_PROFILES_FILE)) {
      writeFileSync(MAPPING_PROFILES_FILE, JSON.stringify({}, null, 2), "utf8");
      console.log(`[Init] Created visual-profiles.json: ${MAPPING_PROFILES_FILE}`);
    }

    // Create pipelines directory if it doesn't exist
    if (!existsSync(PIPELINES_DIR)) {
      mkdirSync(PIPELINES_DIR, { recursive: true });
      console.log(`[Init] Created pipelines directory: ${PIPELINES_DIR}`);
    }

    // Create active-pipelines.json if it doesn't exist
    if (!existsSync(PIPELINES_FILE)) {
      writeFileSync(PIPELINES_FILE, JSON.stringify([], null, 2), "utf8");
      console.log(`[Init] Created active-pipelines.json: ${PIPELINES_FILE}`);
    }

    // Create executions.json if it doesn't exist
    if (!existsSync(EXECUTIONS_FILE)) {
      writeFileSync(EXECUTIONS_FILE, JSON.stringify([], null, 2), "utf8");
      console.log(`[Init] Created executions.json: ${EXECUTIONS_FILE}`);
    }
  } catch (error: any) {
    console.error("[Init] Failed to initialize pipeline system:", error);
    if (error.code === "EACCES") {
      console.error(`[Init] Permission denied creating directories/files`);
    } else {
      console.error(`[Init] Error: ${error.message || String(error)}`);
    }
    // Don't throw - allow application to continue even if init fails
  }
}

/**
 * Check if pipeline system is initialized
 */
export function isPipelineSystemInitialized(): boolean {
  return (
    existsSync(MAPPING_PROFILES_DIR) &&
    existsSync(MAPPING_PROFILES_FILE) &&
    existsSync(PIPELINES_DIR) &&
    existsSync(PIPELINES_FILE) &&
    existsSync(EXECUTIONS_FILE)
  );
}
