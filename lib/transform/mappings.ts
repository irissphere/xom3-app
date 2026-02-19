// Tenant/Source Mapping Profiles
// Each tenant (and/or source system) gets its own field map + cleaners

import { Xom3Client } from "./schema";
import fs from "fs";
import path from "path";
import { initializePipelineSystem } from "../pipelines/init";

type RawRow = Record<string, string>;

export type TransformProfile = {
  name: string;
  map: (row: RawRow) => Xom3Client;
};

// Load visual profiles dynamically
function loadVisualProfiles(): Record<string, TransformProfile> {
  const visualProfiles: Record<string, TransformProfile> = {};
  
  try {
    // Ensure pipeline system is initialized (creates directories if needed)
    initializePipelineSystem();
    
    const profilesPath = path.join(process.cwd(), "mapping-profiles", "visual-profiles.json");
    
    if (fs.existsSync(profilesPath)) {
      let content: string;
      try {
        content = fs.readFileSync(profilesPath, "utf8");
      } catch (readError: any) {
        if (readError.code === "EACCES") {
          console.warn(`[Mappings] Permission denied reading profiles file: ${profilesPath}`);
        } else {
          console.warn(`[Mappings] Failed to read profiles file: ${profilesPath}`, readError);
        }
        return visualProfiles;
      }

      let profiles: Record<string, Record<string, string>>;
      try {
        profiles = JSON.parse(content) as Record<string, Record<string, string>>;
      } catch (parseError: any) {
        console.warn(`[Mappings] Invalid JSON in profiles file: ${profilesPath}`, parseError);
        return visualProfiles;
      }
      
      // Convert each visual profile into a TransformProfile
      for (const [profileName, mapping] of Object.entries(profiles)) {
        visualProfiles[`visual-${profileName}`] = {
          name: `Visual: ${profileName}`,
          map: (row: RawRow): Xom3Client => {
            const mapped: Partial<Xom3Client> = {};
            
            // Apply the mapping
            for (const [sourceField, targetField] of Object.entries(mapping)) {
              if (targetField === "firstName") {
                mapped.firstName = row[sourceField]?.trim() || "";
              } else if (targetField === "lastName") {
                mapped.lastName = row[sourceField]?.trim() || "";
              } else if (targetField === "email") {
                mapped.email = row[sourceField]?.toLowerCase().trim() || "";
              } else if (targetField === "phone") {
                mapped.phone = row[sourceField]?.trim() || "";
              } else if (targetField === "status") {
                mapped.status = row[sourceField] || "Prospect";
              } else if (targetField === "createdAt") {
                mapped.createdAt = row[sourceField] || new Date().toISOString();
              }
            }
            
            // Return with defaults
            return {
              firstName: mapped.firstName || "",
              lastName: mapped.lastName || "",
              email: mapped.email || "",
              phone: mapped.phone,
              status: mapped.status || "Prospect",
              createdAt: mapped.createdAt || new Date().toISOString()
            };
          }
        };
      }
    }
  } catch (error) {
    // Silently fail if profiles file doesn't exist or is invalid
    console.warn("Could not load visual profiles:", error);
  }
  
  return visualProfiles;
}

// Base profiles
const baseProfiles: Record<string, TransformProfile> = {
  // Default CSV format
  "default-csv": {
    name: "Default CSV",
    map: (row: RawRow): Xom3Client => ({
      firstName: row["First Name"]?.trim() || "",
      lastName: row["Last Name"]?.trim() || "",
      email: row["Email"]?.toLowerCase().trim() || "",
      phone: row["Phone"]?.trim() || "",
      status: row["Status"] || "Prospect",
      createdAt: row["Created At"] || new Date().toISOString()
    })
  },

  // Legacy Usha export
  "usha-export": {
    name: "Usha Export",
    map: (row: RawRow): Xom3Client => ({
      firstName: row["ClientFirst"]?.trim() || "",
      lastName: row["ClientLast"]?.trim() || "",
      email: row["ClientEmail"]?.toLowerCase().trim() || "",
      phone: row["ClientPhone"]?.trim() || "",
      status: row["Stage"] || "Intake",
      createdAt: row["CreatedOn"] || new Date().toISOString()
    })
  },

  // PulseVera Usha format - FINALIZED for production use
  "pulsevera-usha": {
    name: "PulseVera Usha",
    map: (row: RawRow): Xom3Client => {
      // Extract first name - handle multiple field name variations
      const firstName = (
        row["First Name"] ||
        row["FirstName"] ||
        row["First"] ||
        row["FName"] ||
        row["ClientFirst"] ||
        (() => {
          // If only "Name" field exists, split on first space
          const fullName = row["Name"] || row["Client Name"] || "";
          if (fullName && !row["First Name"] && !row["FirstName"]) {
            return fullName.trim().split(/\s+/)[0] || "";
          }
          return "";
        })()
      )?.trim() || "";

      // Extract last name - handle multiple field name variations
      const lastName = (
        row["Last Name"] ||
        row["LastName"] ||
        row["Last"] ||
        row["LName"] ||
        row["ClientLast"] ||
        (() => {
          // If only "Name" field exists, split on first space
          const fullName = row["Name"] || row["Client Name"] || "";
          if (fullName && !row["Last Name"] && !row["LastName"]) {
            const parts = fullName.trim().split(/\s+/);
            return parts.length > 1 ? parts.slice(1).join(" ") : "";
          }
          return "";
        })()
      )?.trim() || "";

      // Extract email - normalize to lowercase, handle variations
      const email = (
        row["Email"] ||
        row["Email Address"] ||
        row["E-Mail"] ||
        row["EmailAddress"] ||
        row["ClientEmail"] ||
        row["Contact Email"] ||
        ""
      )
        .toLowerCase()
        .trim();

      // Extract phone - normalize, handle variations
      const phoneRaw = (
        row["Phone"] ||
        row["Phone Number"] ||
        row["PhoneNumber"] ||
        row["Telephone"] ||
        row["Tel"] ||
        row["ClientPhone"] ||
        row["Contact Phone"] ||
        ""
      ).trim();

      // Basic phone normalization (remove common formatting)
      const phone = phoneRaw
        ? phoneRaw.replace(/[\s\-\(\)\.]/g, "")
        : undefined;

      // Extract status - handle healthcare-specific stages
      const status = (
        row["Status"] ||
        row["Pipeline Stage"] ||
        row["Stage"] ||
        row["Onboarding Status"] ||
        row["Lead Status"] ||
        row["Client Status"] ||
        row["Current Stage"] ||
        "Prospect"
      ).trim();

      // Extract created date - handle multiple date formats
      let createdAt = "";
      const dateFields = [
        "Created At",
        "Created",
        "CreatedOn",
        "Created Date",
        "Date Created",
        "Entry Date",
        "Record Date"
      ];

      for (const field of dateFields) {
        if (row[field]) {
          try {
            const date = new Date(row[field]);
            if (!isNaN(date.getTime())) {
              createdAt = date.toISOString();
              break;
            }
          } catch {
            // Invalid date, continue to next field
          }
        }
      }

      // Fallback to current timestamp if no valid date found
      if (!createdAt) {
        createdAt = new Date().toISOString();
      }

      return {
        firstName,
        lastName,
        email,
        phone,
        status,
        createdAt
      };
    }
  },

  // Generic CRM format
  "generic-crm": {
    name: "Generic CRM",
    map: (row: RawRow): Xom3Client => ({
      firstName: row["First Name"]?.trim() || row["first_name"]?.trim() || "",
      lastName: row["Last Name"]?.trim() || row["last_name"]?.trim() || "",
      email: row["Email"]?.toLowerCase().trim() || row["email"]?.toLowerCase().trim() || "",
      phone: row["Phone"]?.trim() || row["phone"]?.trim() || "",
      status: row["Status"] || row["status"] || "Prospect",
      createdAt: row["Created At"] || row["created_at"] || new Date().toISOString()
    })
  }
};

// Merge base profiles with dynamically loaded visual profiles
export const transformProfiles: Record<string, TransformProfile> = {
  ...baseProfiles,
  ...loadVisualProfiles()
};
