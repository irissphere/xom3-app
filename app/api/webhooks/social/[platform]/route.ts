// Social Platform Webhooks
// AKV: Real-time engagement updates via webhooks

import { NextRequest, NextResponse } from "next/server";
import { realTimeMonitor } from "@/lib/broadcast/real-time-monitor";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform: platformParam } = await params;
    const platform = platformParam as any; // Platform type

    const body = await request.json();

    console.log(`[Webhook] Received ${platform} webhook:`, JSON.stringify(body, null, 2));

    // Verify webhook authenticity (platform-specific)
    const isValid = await verifyWebhook(platform, request, body);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    // Process webhook data
    await realTimeMonitor.handleWebhook(platform, body);

    // Return appropriate response based on platform
    switch (platform) {
      case "instagram":
        return NextResponse.json({ status: "ok" });
      case "facebook":
        return NextResponse.json({ status: "ok" });
      case "twitter":
        return NextResponse.json({ status: "ok" });
      default:
        return NextResponse.json({ received: true });
    }

  } catch (error: any) {
    console.error("[Webhook] Processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Verify webhook authenticity
 */
async function verifyWebhook(platform: string, request: NextRequest, body: any): Promise<boolean> {
  try {
    switch (platform) {
      case "instagram":
      case "facebook":
        // Meta webhooks use app secret verification
        const signature = request.headers.get("x-hub-signature-256");
        if (!signature) return false;

        const appSecret = process.env.META_APP_SECRET;
        if (!appSecret) return true; // Skip verification if no secret configured

        const crypto = await import("crypto");
        const expectedSignature = crypto
          .createHmac("sha256", appSecret)
          .update(JSON.stringify(body))
          .digest("hex");

        return signature === `sha256=${expectedSignature}`;

      case "twitter":
        // Twitter webhooks use CRC token validation
        const crcToken = request.headers.get("x-twitter-webhooks-signature");
        if (crcToken) {
          // This is a CRC check request
          const consumerSecret = process.env.TWITTER_CLIENT_SECRET;
          if (!consumerSecret) return true;

          const crypto = await import("crypto");
          const hash = crypto
            .createHmac("sha256", consumerSecret)
            .update(crcToken)
            .digest("base64");

          return true; // CRC validation is handled differently
        }
        return true; // Accept for now

      default:
        // For other platforms, accept webhooks (implement verification as needed)
        return true;
    }
  } catch (error) {
    console.error(`[Webhook] Verification error for ${platform}:`, error);
    return false;
  }
}

/**
 * GET handler for webhook verification (required by some platforms)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform: platformParam } = await params;
    const platform = platformParam as string;

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    switch (platform) {
      case "facebook":
      case "instagram":
        // Meta webhook verification
        const mode = queryParams["hub.mode"];
        const token = queryParams["hub.verify_token"];
        const challenge = queryParams["hub.challenge"];

        const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
        if (mode === "subscribe" && token === verifyToken) {
          return new NextResponse(challenge);
        }
        break;

      case "twitter":
        // Twitter webhook verification
        const crcToken = queryParams.crc_token;
        if (crcToken) {
          const consumerSecret = process.env.TWITTER_CLIENT_SECRET;
          if (consumerSecret) {
            const crypto = await import("crypto");
            const hash = crypto
              .createHmac("sha256", consumerSecret)
              .update(crcToken)
              .digest("base64");

            return NextResponse.json({
              response_token: `sha256=${hash}`
            });
          }
        }
        break;
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 403 });

  } catch (error: any) {
    console.error("[Webhook] GET verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}












