import { NextResponse } from "next/server";
import { 
  loadSubscriptionRecord, 
  startTrial,
  getTrialStatus 
} from "@/lib/subscription/subscription-store";
import { triggerTrialSignup } from "@/lib/n8n/trigger";

function getUserId(request: Request): string {
  const headers = new Headers(request.headers);
  return headers.get("x-user-id") || headers.get("x-xom3-actor-id") || "demo-user";
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request);
    
    // Check if user already has a subscription
    const existing = await loadSubscriptionRecord({ userId });
    
    if (existing) {
      const trial = getTrialStatus(existing);
      
      // If user already has an active trial or paid subscription
      if (existing.tier !== "free" && !trial.expired) {
        return NextResponse.json({
          ok: false,
          error: "You already have an active subscription or trial",
          subscription: existing,
        }, { status: 400 });
      }
      
      // If trial already expired, don't allow restart
      if (trial.expired) {
        return NextResponse.json({
          ok: false,
          error: "Your trial has already ended. Please choose a plan to continue.",
          subscription: existing,
        }, { status: 400 });
      }
    }
    
    // Start the trial
    const record = await startTrial(userId);
    const trial = getTrialStatus(record);

    // n8n workflow trigger (email notification + Airtable)
    try {
      triggerTrialSignup({
        email: userId,
        tier: record.tier || "xom3",
        trialStartedAt: record.trialStartedAt || new Date().toISOString(),
        trialEndsAt: record.trialEndsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).catch(err => console.warn("[TRIAL] n8n trigger failed:", err));
    } catch {
      // passive lane; ignore
    }

    return NextResponse.json({
      ok: true,
      message: "Trial started successfully! You have 30 days of full access.",
      subscription: record,
      trial,
    });
  } catch (error) {
    console.error("Error starting trial:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to start trial" },
      { status: 500 }
    );
  }
}
