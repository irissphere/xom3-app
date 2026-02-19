import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { 
  loadSubscriptionRecord, 
  getTrialStatus, 
  getEffectiveTier 
} from "@/lib/subscription/subscription-store";
import { getTierConfig } from "@/lib/tiers/features";
import { resolveRole } from "@/lib/auth/resolveRole";
import { Role } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

// Get Supabase admin client for privileged operations
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

// Get authenticated user from Supabase session
async function getUser(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("[Subscription Status] Auth error:", error.message);
      return null;
    }
    
    if (!user) {
      console.log("[Subscription Status] No user in session");
      return null;
    }
    
    console.log("[Subscription Status] User ID:", user.id);
    return user;
  } catch (error) {
    console.error("[Subscription Status] Error getting user from session:", error);
    return null;
  }
}

// Check if user is operator or admin from database
async function isOperatorOrAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role === 'operator' || data?.role === 'admin';
}

// Check if user is admin - check multiple sources
function getRole(request: NextRequest, userId: string | null): Role | null {
  const headers = new Headers(request.headers);
  
  // Check explicit role header
  const explicitRole = resolveRole(headers);
  if (explicitRole === "admin") return "admin";
  
  // Check admin email header (from middleware)
  const adminEmail = headers.get("x-admin-email");
  if (adminEmail === "preston.chenault@xom3.io") return "admin";
  
  // Check operator key (internal bypass)
  const operatorKey = headers.get("x-operator-key");
  if (operatorKey === process.env.OPERATOR_KEY) return "admin";
  
  return explicitRole;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    
    // If no authenticated user, return free tier
    if (!user) {
      console.log("[Subscription Status] No user ID, returning free tier");
      return NextResponse.json({
        ok: true,
        userId: null,
        role: null,
        subscription: null,
        trial: null,
        effectiveTier: "free",
        tierConfig: {
          id: "free",
          name: "Free",
          limits: getTierConfig("free").limits,
        },
        usage: null,
      });
    }

    const userId = user.id;
    const userEmail = user.email;
    
    // Check if user is operator/admin - they get enterprise access
    // We check DB role OR known admin emails
    const isDbAdmin = await isOperatorOrAdmin(userId);
    const isAdminEmail = userEmail && (
      userEmail.endsWith("@xom3.io") || 
      userEmail === "prestonjchenault@outlook.com" ||
      userEmail === "preston.chenault@pulseverabenefits.com"
    );

    const isPrivileged = isDbAdmin || isAdminEmail;
    
    const role = getRole(request, userId);
    const record = await loadSubscriptionRecord({ userId });
    const trial = getTrialStatus(record);
    
    // Operators/admins get enterprise tier regardless of subscription
    const effectiveTier = isPrivileged ? "enterprise" : getEffectiveTier(record);
    const tierConfig = getTierConfig(effectiveTier);

    console.log("[Subscription Status] Response:", {
      userId,
      role,
      isPrivileged,
      effectiveTier,
      hasSubscription: !!record,
      tierLimits: tierConfig.limits,
    });

    return NextResponse.json({
      ok: true,
      userId,
      role: isPrivileged ? "admin" : role,
      isPrivileged,
      subscription: record,
      trial,
      effectiveTier,
      tierConfig: {
        id: tierConfig.id,
        name: tierConfig.name,
        limits: tierConfig.limits,
      },
      usage: null, // TODO: Load from usage tracker
    });
  } catch (error) {
    console.error("[Subscription Status] Error fetching subscription status:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
}
