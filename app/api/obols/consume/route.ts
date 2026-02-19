import { NextRequest, NextResponse } from "next/server";
import { loadSubscriptionRecord } from "@/lib/subscription/subscription-store";
import { consumeObols } from "@/lib/obols/obols-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeUserId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128);
}

export async function POST(req: NextRequest) {
  try {
    const userIdRaw = req.headers.get("x-user-id") || "";
    const userId = sanitizeUserId(userIdRaw);

    if (!userId) {
      return NextResponse.json({ error: "Missing x-user-id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const obols = typeof body.obols === "number" ? body.obols : 0;
    const costCenter = typeof body.costCenter === "string" && 
      (body.costCenter === "ai" || body.costCenter === "scraping" || body.costCenter === "messaging")
      ? body.costCenter as "ai" | "scraping" | "messaging"
      : "ai";
    const moduleKey = typeof body.moduleKey === "string" ? body.moduleKey : undefined;
    const metadata = typeof body.metadata === "object" && body.metadata !== null ? body.metadata : undefined;

    if (obols <= 0) {
      return NextResponse.json({ 
        allowed: true, 
        remainingObols: null, 
        inGrace: false, 
        trialActive: false,
        message: "No credits consumed (invalid or zero amount)"
      });
    }

    // Check if user has paid subscription (paid users don't use trial wallet)
    const subscription = await loadSubscriptionRecord({ userId });
    if (subscription?.subscribed) {
      // Paid subscriber - allow consumption (they're not on trial)
      return NextResponse.json({
        allowed: true,
        remainingObols: null,
        inGrace: false,
        trialActive: false,
        message: "Paid subscriber - consumption allowed",
      });
    }

    // Trial user - check and consume credits
    const result = await consumeObols(userId, obols, costCenter, moduleKey, metadata);

    return NextResponse.json({
      allowed: result.allowed,
      remainingObols: result.remainingObols,
      inGrace: result.inGrace,
      trialActive: result.trialActive,
      consumed: obols,
      costCenter,
      message: result.allowed
        ? result.inGrace
          ? "Consumption allowed (grace period active)"
          : "Consumption allowed"
        : "Consumption blocked - trial budget exhausted and grace period ended",
    });
  } catch (error: any) {
    console.error("Credits consume error:", error);
    return NextResponse.json({ error: error?.message || "consume_failed" }, { status: 500 });
  }
}
