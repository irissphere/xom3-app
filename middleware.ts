import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isDomainRegistered } from "./lib/tenant/registry";
import { cleanHostname, stripWww } from "./lib/tenant/hostname";
import { hasValidSession, requireAuth } from "./lib/auth/supabase-middleware";

/**
 * Route Assertion Middleware
 * Safety net to prevent routing bugs from unknown domains pointing to Vercel
 *
 * If host not in TENANT_REGISTRY:
 * - Redirect to safe default: xom3.io/healthcare
 * - Or return 404 with "Unknown tenant" message
 */
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const cleanHost = cleanHostname(hostname);
  const canonicalHost = stripWww(cleanHost);
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes (they handle tenant resolution internally)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // CRITICAL: SpaceBaddie domain routing - MUST happen FIRST, before any other checks
  // This ensures spacebaddie.com always serves SpaceBaddie content, not XOM3
  if (canonicalHost === "spacebaddie.com") {
    // If accessing root, redirect to /spacebaddie (more reliable than rewrite for root)
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/spacebaddie";
      // Use redirect instead of rewrite for root path to ensure it works
      return NextResponse.redirect(url, 308);
    }
    
    // If accessing XOM3-specific routes, rewrite to SpaceBaddie equivalents
    if (pathname === "/login" || pathname.startsWith("/login/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace("/login", "/spacebaddie/login");
      return NextResponse.rewrite(url);
    }
    
    // If accessing /studio, rewrite to /spacebaddie/studio
    if (pathname === "/studio" || pathname.startsWith("/studio/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace("/studio", "/spacebaddie/studio");
      return NextResponse.rewrite(url);
    }
    
    // If accessing /dashboard, rewrite to /spacebaddie/dashboard
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace("/dashboard", "/spacebaddie/dashboard");
      return NextResponse.rewrite(url);
    }
    
    // If accessing /automation, rewrite to /spacebaddie/automation
    if (pathname === "/automation" || pathname.startsWith("/automation/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace("/automation", "/spacebaddie/automation");
      return NextResponse.rewrite(url);
    }
    
    // If accessing /pricing, rewrite to /spacebaddie/pricing
    if (pathname === "/pricing" || pathname.startsWith("/pricing/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/spacebaddie/pricing";
      return NextResponse.rewrite(url);
    }
    
    // If accessing /projects, rewrite to /spacebaddie/projects
    if (pathname === "/projects" || pathname.startsWith("/projects/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace("/projects", "/spacebaddie/projects");
      return NextResponse.rewrite(url);
    }
    
    // If accessing /trading, rewrite to /spacebaddie/trading
    if (pathname === "/trading" || pathname.startsWith("/trading/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace("/trading", "/spacebaddie/trading");
      return NextResponse.rewrite(url);
    }
    
    // If already on a /spacebaddie path, allow it through
    if (pathname.startsWith("/spacebaddie")) {
      return NextResponse.next();
    }
    
    // For any other path on spacebaddie.com that doesn't start with /spacebaddie, redirect to /spacebaddie
    // This ensures ALL traffic on spacebaddie.com goes to SpaceBaddie content
    if (!pathname.startsWith("/spacebaddie") && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
      const url = request.nextUrl.clone();
      url.pathname = "/spacebaddie";
      return NextResponse.redirect(url, 308);
    }
    
    // If we're still here on spacebaddie.com, proceed normally
    return NextResponse.next();
  }

  // Public routes - no authentication required (customer-facing + auth)
  const publicRoutes = [
    "/",
    "/xom3",
    "/xom3/demo",
    "/login",
    "/signup",
    "/auth",
    "/auth/callback",
    "/auth/reset-password",
    "/status",
    "/status/",
    "/intake",
    "/intakecrm",
    "/spacebaddie",
    "/studio",              // SpaceBaddie Studio
    "/pricing",
    "/how-it-works",
    "/custom-build",
    "/checkout",
    "/subscription/success",
    "/subscription/cancel",
  ];

  // Shop subdomain: serve public shop storefront
  if (canonicalHost === "shop.spacebaddie.com") {
    // Root goes to shop page
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/shop";
      return NextResponse.rewrite(url);
    }
    // Known app routes that should redirect to main domain (not treated as product IDs)
    const shopExcludedPaths = ["/login", "/signup", "/cart", "/track", "/returns", "/refund", "/shipping", "/privacy", "/terms", "/commerce", "/checkout", "/intake", "/spacebaddie", "/auth"];
    if (shopExcludedPaths.some(p => pathname === p || pathname.startsWith(p + "/"))) {
      const mainUrl = new URL(pathname, "https://xom3.io");
      mainUrl.search = request.nextUrl.search;
      return NextResponse.redirect(mainUrl.toString());
    }
    // Product detail pages: /abc123 -> /shop/abc123
    if (pathname.match(/^\/[a-zA-Z0-9-]+$/) && !pathname.startsWith("/shop") && !pathname.startsWith("/api")) {
      const url = request.nextUrl.clone();
      url.pathname = `/shop${pathname}`;
      return NextResponse.rewrite(url);
    }
    // Allow /shop paths directly
    if (pathname.startsWith("/shop")) {
      return NextResponse.next();
    }
    // Allow API routes
    if (pathname.startsWith("/api/shop")) {
      return NextResponse.next();
    }
    // Default: redirect to shop root
    const url = request.nextUrl.clone();
    url.pathname = "/shop";
    return NextResponse.rewrite(url);
  }

  // NOTE: SpaceBaddie domain routing is handled above (lines 26-101). No duplicate needed.

  // Back-compat: older auth URLs
  if (pathname === "/client/login" || pathname.startsWith("/client/login/")) {
    return NextResponse.redirect(new URL("/login", request.url), 308);
  }
  if (pathname === "/client/signup" || pathname.startsWith("/client/signup/")) {
    return NextResponse.redirect(new URL("/intake", request.url), 308);
  }

  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  // Protected routes - require Supabase authentication
  const protectedRoutes = [
    "/app/",
    "/dashboard",
    "/xom3/master",
    "/benefits",
    "/command",
    "/broadcast",
    "/broadcast/operations",
    "/broadcast/executive",
    "/broadcast/system",
    "/social",
    "/social-connect",
    "/system/",
    "/hse",
    "/uoi",
    "/settings",
    "/leads",
    "/automation",
    "/intakecrm/tasks",
    "/intakecrm/leads",
    "/checkout", // Require auth for checkout (payment)
  ];

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    // Check for valid Supabase session
    const hasSession = await hasValidSession(request);

    // Allow operator bypass in development only (via env var)
    const operatorKey = request.headers.get("x-operator-key");
    const isOperatorAccess = 
      process.env.NODE_ENV !== "production" && 
      operatorKey === process.env.OPERATOR_KEY;

    // In development (localhost), allow access with warning but still check auth
    const isLocalDev = cleanHost === "localhost" || cleanHost === "127.0.0.1";
    
    if (!hasSession && !isOperatorAccess) {
      if (isLocalDev) {
        // Local dev: Log warning but allow (for development convenience)
        console.warn(`[AUTH] Unauthenticated access to ${pathname} (dev mode - should be protected)`);
        // Still redirect in dev to encourage proper auth flow
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl, 302);
      } else {
        // Production: Require authentication
        const redirectResponse = await requireAuth(request, pathname);
        if (redirectResponse) {
          return redirectResponse;
        }
      }
    }
    
    // Valid session - add auth info to headers for downstream use
    const response = NextResponse.next();
    response.headers.set("x-authenticated", "true");
    if (hasSession) {
      response.headers.set("x-auth-valid", "true");
    }
    return response;
  }

  // Allow localhost for development
  if (
    canonicalHost === "localhost" ||
    canonicalHost === "127.0.0.1" ||
    canonicalHost.startsWith("192.168.") ||
    canonicalHost.startsWith("10.")
  ) {
    return NextResponse.next();
  }
  // Allow Vercel deployment domains (preview/prod). Tenant resolution will fall back to default.
  if (canonicalHost.endsWith(".vercel.app")) {
    return NextResponse.next();
  }
  // Allow Cloudflare Tunnel ephemeral hostnames (useful for dev via trycloudflare.com).
  if (canonicalHost.endsWith(".trycloudflare.com")) {
    return NextResponse.next();
  }

  // Canonicalize www.* to apex when apex is registered (prevents registry drift).
  if (cleanHost !== canonicalHost && isDomainRegistered(canonicalHost)) {
    const url = request.nextUrl.clone();
    url.hostname = canonicalHost;
    return NextResponse.redirect(url, 308);
  }

  // Check if domain is registered
  if (!isDomainRegistered(canonicalHost)) {
    // Redirect unknown domains to safe default
    const defaultUrl = new URL("/app/healthcare", `https://xom3.io`);
    defaultUrl.searchParams.set("unknown_tenant", canonicalHost);

    return NextResponse.redirect(defaultUrl, 302);

    // Alternative: Return 404 page
    // return new NextResponse("Unknown tenant", { status: 404 });
  }

  // Domain is registered, proceed normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json).*)",
  ],
};
