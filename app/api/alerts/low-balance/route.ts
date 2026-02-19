import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// n8n webhook URL for low balance alerts
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE_URL || "https://n8n.srv1058373.hstgr.cloud";
const N8N_LOW_BALANCE_WEBHOOK = `${N8N_WEBHOOK_BASE}/webhook/xom3/alerts/low-balance`;

// Rate limiting: track recent alerts per user
const recentAlerts = new Map<string, number>();
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown per user

/**
 * POST /api/alerts/low-balance
 * 
 * Handles low balance alerts via n8n workflow.
 * Triggers email notifications when balance drops below thresholds.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, balance, level, timestamp } = body;

    if (!userId || typeof balance !== 'number' || !level) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Rate limit: don't spam alerts
    const lastAlert = recentAlerts.get(userId);
    const now = Date.now();
    if (lastAlert && now - lastAlert < ALERT_COOLDOWN_MS) {
      console.log(`[Low Balance Alert] Skipping alert for ${userId} - cooldown active`);
      return NextResponse.json({ ok: true, skipped: true, reason: "cooldown" });
    }

    // Log the alert
    console.log(`[Low Balance Alert] Processing ${level} alert for user ${userId}: $${(balance / 100).toFixed(2)}`);

    // Get user email from Supabase
    let userEmail: string | null = null;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: user } = await supabase.auth.admin.getUserById(userId);
        userEmail = user?.user?.email || null;
      }
    } catch (err) {
      console.warn("[Low Balance Alert] Could not fetch user email:", err);
    }

    // Trigger n8n workflow for email alert
    let n8nSuccess = false;
    if (userEmail) {
      try {
        const n8nResponse = await fetch(N8N_LOW_BALANCE_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            email: userEmail,
            balance,
            level,
            timestamp: timestamp || new Date().toISOString(),
          }),
        });

        if (n8nResponse.ok) {
          console.log(`[Low Balance Alert] n8n workflow triggered for ${userEmail}`);
          n8nSuccess = true;
        } else {
          console.warn(`[Low Balance Alert] n8n webhook failed:`, n8nResponse.status);
        }
      } catch (n8nErr) {
        console.warn("[Low Balance Alert] n8n webhook error:", n8nErr);
      }
    }

    // Update rate limit tracker
    recentAlerts.set(userId, now);

    // Clean up old entries (older than 2 hours)
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    recentAlerts.forEach((time, key) => {
      if (time < twoHoursAgo) {
        recentAlerts.delete(key);
      }
    });

    return NextResponse.json({
      ok: true,
      alertLevel: level,
      emailTriggered: n8nSuccess,
      timestamp,
    });
  } catch (error: any) {
    console.error("[Low Balance Alert] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Alert processing failed" },
      { status: 500 }
    );
  }
}
