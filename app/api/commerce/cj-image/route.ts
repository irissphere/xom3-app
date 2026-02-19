/**
 * GET /api/commerce/cj-image?url=...
 * Proxies CJ Dropshipping product images to avoid CDN referrer/CORS blocking.
 * Only allows URLs from known CJ/Aliyun CDN hostnames (SSRF protection).
 */

import { NextRequest, NextResponse } from "next/server";

// Allow any subdomain of these; CJ/Aliyun CDN + Supabase Storage (shop images)
const ALLOWED_HOST_PATTERNS = [
  "aliyuncs.com",
  "alicdn.com",
  "cjdropshipping.com",
  "cjdropship.com",
  "aliyun.com",
  "alibaba.com",
  "mmcdn.com",
  "supabase.co",
];

function isAllowedImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOST_PATTERNS.some(
      (pattern) => host === pattern || host.endsWith("." + pattern)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  let url = request.nextUrl.searchParams.get("url");
  if (!url || !url.trim()) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }
  url = url.trim();
  if (url.startsWith("//")) {
    url = "https:" + url;
  }
  if (!isAllowedImageUrl(url)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "image/*",
        "User-Agent": "Mozilla/5.0 (compatible; XOM3-Commerce/1.0)",
        Referer: "https://cjdropshipping.com/",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream image failed" }, { status: 502 });
    }
    const contentType = res.headers.get("Content-Type") || "image/jpeg";
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("[cj-image] Proxy error:", err);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}
