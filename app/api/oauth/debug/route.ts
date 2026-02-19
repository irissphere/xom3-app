// OAuth Debug Route - Check environment variable status
// Temporary debug endpoint to verify OAuth credentials

import { NextResponse } from "next/server";
import { OAuthPlatform, PLATFORM_CONFIGS, isPlatformConfigured } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const platforms = Object.keys(PLATFORM_CONFIGS) as OAuthPlatform[];

  const debug = platforms.map(platform => {
    const config = PLATFORM_CONFIGS[platform];
    const clientId = process.env[config.clientIdEnv];
    const clientSecret = process.env[config.clientSecretEnv];
    const clientIdValue = clientId || "";
    const clientSecretValue = clientSecret || "";

    return {
      platform,
      name: config.name,
      configured: isPlatformConfigured(platform),
      envVarNames: {
        clientId: config.clientIdEnv,
        clientSecret: config.clientSecretEnv,
      },
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      clientIdLength: clientIdValue.length,
      clientSecretLength: clientSecretValue.length,
      clientIdPreview: clientIdValue.length > 0 
        ? `${clientIdValue.substring(0, 10)}...${clientIdValue.substring(clientIdValue.length - 5)}`
        : "NOT SET",
      clientSecretPreview: clientSecretValue.length > 0
        ? `${clientSecretValue.substring(0, 5)}...${clientSecretValue.substring(clientSecretValue.length - 3)}`
        : "NOT SET",
      issues: [
        !clientId && "Missing CLIENT_ID",
        !clientSecret && "Missing CLIENT_SECRET",
        clientId && clientId.trim().length === 0 && "CLIENT_ID is empty string",
        clientSecret && clientSecret.trim().length === 0 && "CLIENT_SECRET is empty string",
      ].filter(Boolean),
    };
  });

  const configuredCount = debug.filter(d => d.configured).length;
  const totalCount = debug.length;

  // Check what env vars are actually loaded
  const envCheck = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...` : "NOT SET",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "SET (hidden)" : "NOT SET",
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID ? `${process.env.TWITTER_CLIENT_ID.substring(0, 10)}...` : "NOT SET",
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET ? "SET (hidden)" : "NOT SET",
    META_APP_ID: process.env.META_APP_ID ? `${process.env.META_APP_ID.substring(0, 10)}...` : "NOT SET",
    META_APP_SECRET: process.env.META_APP_SECRET ? "SET (hidden)" : "NOT SET",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "NOT SET",
  };

  return NextResponse.json({
    ok: true,
    summary: {
      total: totalCount,
      configured: configuredCount,
      notConfigured: totalCount - configuredCount,
    },
    platforms: debug,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || "NOT SET",
      hasEnvFile: true, // Assume .env.local exists if server is running
    },
    runtimeEnvCheck: envCheck,
    note: "If credentials show 'NOT SET' here, they're not being loaded by Next.js. Check .env.local format and restart server.",
    instructions: {
      checkEnvFile: "Verify .env.local has these variables set (no quotes, no spaces around =)",
      restartServer: "After updating .env.local, restart the dev server: npm run dev",
      testPlatform: "Visit /api/oauth/[platform]/authorize to test a configured platform",
    },
  });
}
