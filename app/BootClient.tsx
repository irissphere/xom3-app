"use client";

import { useEffect } from "react";
import { initOptimizationLayer } from "@/lib/system/system-init";

/**
 * Client-side bootstrapping.
 *
 * Important: we intentionally avoid starting long-running loops during
 * Server Component rendering (e.g., in `app/layout.tsx`), because that can
 * stall request handling in dev and cause tunnel timeouts.
 */
export default function BootClient() {
  useEffect(() => {
    // Client-only optimization init (uses localStorage / window).
    initOptimizationLayer();

    // IMPORTANT:
    // Autostarting server-side loops can starve the Node event loop if they get CPU-heavy,
    // which makes *all* HTTP requests hang (and causes Cloudflare 524 timeouts).
    //
    // Keep this OFF by default. Enable explicitly when you want it:
    //   NEXT_PUBLIC_UOI_AUTOSTART=1
    if (process.env.NEXT_PUBLIC_UOI_AUTOSTART === "1") {
      // Best-effort: ask server to start UOI loop after the UI is up.
      fetch("/api/uoi/start", { method: "POST" }).catch(() => {});
    }

    // Only register SpaceBaddie service worker on SpaceBaddie domain
    // The sw.js is configured with SpaceBaddie-specific assets that don't exist on other domains
    if ("serviceWorker" in navigator) {
      const host = window.location.hostname;
      const isSpaceBaddie = host === "spacebaddie.com" || host.endsWith(".spacebaddie.com");
      
      if (isSpaceBaddie) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      } else {
        // Unregister any existing service workers on non-SpaceBaddie domains
        // to prevent stale SpaceBaddie SW from causing issues
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
    }
  }, []);

  return null;
}
