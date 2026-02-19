import { NextRequest, NextResponse } from "next/server";
import { tenantNotifications } from "@/lib/notifications/registry";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), ".notification-settings.json");

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load notification settings:", error);
  }
  return {};
}

function saveSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("Failed to save notification settings:", error);
    throw error;
  }
}

export async function GET() {
  // Load saved settings, fallback to registry defaults
  const saved = loadSettings();
  const tenant = "default";
  const registrySettings = tenantNotifications[tenant] || {};
  const settings = { ...registrySettings, ...saved };

  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();

    // Save to file for persistence
    saveSettings(settings);

    // Also update in-memory registry for immediate effect
    const tenant = "default";
    tenantNotifications[tenant] = {
      ...tenantNotifications[tenant],
      ...settings
    };

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
