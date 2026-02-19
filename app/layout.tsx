"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import { TenantProvider } from "./providers/TenantProvider";
import BootClient from "./BootClient";
import AppNavigation from "./components/AppNavigation";
import MobileNav from "./components/MobileNav";
import GlobalTopBar from "./components/GlobalTopBar";
import "./globals.css";

// Dynamic head content based on route and domain
function DynamicHead() {
  const pathname = usePathname();
  const isSpaceBaddiePath = pathname?.startsWith("/spacebaddie");
  const isShopPath = pathname?.startsWith("/shop");
  const isSpaceBaddieDomain =
    typeof window !== "undefined" &&
    window.location.hostname.includes("spacebaddie.com");
  const isSpaceBaddie = isSpaceBaddiePath || isShopPath || isSpaceBaddieDomain;

  if (isSpaceBaddie) {
    return (
      <>
        <title>SpaceBaddie - AI Video Creation | Unlimited Videos $29.99/mo</title>
        <meta name="description" content="Create unlimited AI-powered talking avatar videos for $29.99/month. Professional video content in minutes." />
        <link rel="icon" href="/spacebaddie-logo.svg" type="image/svg+xml" />
        <link rel="manifest" href="/spacebaddie/manifest.json" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://spacebaddie.com/" />
        <meta property="og:title" content="SpaceBaddie - AI Video Creation" />
        <meta property="og:description" content="Create unlimited AI-powered talking avatar videos. Professional content in minutes. $29.99/mo unlimited." />
        <meta property="og:image" content="https://spacebaddie.com/spacebaddie-og.png" />
        <meta property="og:site_name" content="SpaceBaddie" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SpaceBaddie - AI Video Creation" />
        <meta name="twitter:description" content="Create unlimited AI-powered talking avatar videos. $29.99/mo unlimited." />
        <meta name="twitter:image" content="https://spacebaddie.com/spacebaddie-og.png" />
      </>
    );
  }

  return (
    <>
      <title>XOM3 - AI-Powered Business Automation Platform</title>
      <meta name="description" content="Transform your business with XOM3 - the ultimate AI-powered automation platform. Generate talking avatars, automate workflows, and scale your business with intelligent CRM systems." />
      <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      <link rel="manifest" href="/manifest.json" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://xom3.io/" />
      <meta property="og:title" content="XOM3 - AI-Powered Business Automation Platform" />
      <meta property="og:description" content="Transform your business with AI-powered automation. Generate professional talking avatars, automate workflows, and scale with intelligent CRM systems." />
      <meta property="og:image" content="https://xom3.io/og-image.jpg" />
      <meta property="og:site_name" content="XOM3" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="XOM3 - AI-Powered Business Automation Platform" />
      <meta name="twitter:description" content="Transform your business with AI-powered automation." />
      <meta name="twitter:image" content="https://xom3.io/og-image.jpg" />
    </>
  );
}

function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/how-it-works") ||
    pathname.startsWith("/subscription") ||
    pathname.startsWith("/proposal") ||
    pathname.startsWith("/custom-build") ||
    pathname.startsWith("/wallet") ||
    pathname.startsWith("/intake") ||
    pathname.startsWith("/spacebaddie");

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/auth/");

  const isBusinessRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/leads" ||
    pathname.startsWith("/leads/") ||
    pathname === "/social-connect" ||
    pathname.startsWith("/social-connect/") ||
    pathname === "/automation" ||
    pathname.startsWith("/automation/") ||
    pathname === "/analytics" ||
    pathname.startsWith("/analytics/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/operator/") ||
    pathname.startsWith("/xom3/");

  const showAppNav = isBusinessRoute && !isPublicRoute && !isAuthRoute;

  return (
    <>
      {showAppNav ? (
        <>
          <AppNavigation />
          <div style={{ paddingBottom: 70 }}>
            {children}
          </div>
          <MobileNav />
        </>
      ) : isAuthRoute ? (
        children
      ) : (
        <>
          <GlobalTopBar />
          {children}
        </>
      )}
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#050810" />
        <meta name="robots" content="index, follow" />
        <link rel="apple-touch-icon" href="/spacebaddie/icon.svg" />
        <DynamicHead />
      </head>
      <body>
        <BootClient />
        <TenantProvider>
          <AppChrome>
            {children}
          </AppChrome>
        </TenantProvider>
        <Analytics />
      </body>
    </html>
  );
}