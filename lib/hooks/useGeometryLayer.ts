"use client";

import { useEffect, useState } from "react";
import { theme } from "@/lib/design-system";

/**
 * useGeometryLayer Hook
 * 
 * Diagnostic hook for geometry layer token injection and rendering verification.
 * Use this to isolate geometry layer faults and verify token propagation.
 * 
 * @returns Geometry layer diagnostic state
 */
export function useGeometryLayer() {
  const [diagnostics, setDiagnostics] = useState<{
    themeLoaded: boolean;
    geometryTokens: {
      background: Record<string, string>;
      opacity: Record<string, string>;
      blur: Record<string, string>;
      placement: Record<string, string>;
    } | null;
    assetUrls: Record<string, string>;
    assetLoadStatus: Record<string, "loading" | "loaded" | "error">;
    domPresence: boolean;
    zIndex: number | null;
    computedOpacity: string | null;
  }>({
    themeLoaded: false,
    geometryTokens: null,
    assetUrls: {},
    assetLoadStatus: {},
    domPresence: false,
    zIndex: null,
    computedOpacity: null,
  });

  useEffect(() => {
    // Verify theme is loaded
    const themeLoaded = !!theme?.geometry;
    const geometryTokens = themeLoaded
      ? {
          background: theme.geometry.background,
          opacity: theme.geometry.opacity,
          blur: theme.geometry.blur,
          placement: theme.geometry.placement,
        }
      : null;

    // Extract asset URLs from theme
    const assetUrls = geometryTokens
      ? {
          spiral: geometryTokens.background.spiral,
          circles: geometryTokens.background.circles,
          grid: geometryTokens.background.grid,
          rings: geometryTokens.background.rings,
        }
      : {};

    // Check DOM presence
    const geometryElement = document.querySelector('[data-testid="geometry-bg"]');
    const domPresence = !!geometryElement;

    // Get computed styles if element exists
    let zIndex: number | null = null;
    let computedOpacity: string | null = null;
    if (geometryElement) {
      const styles = window.getComputedStyle(geometryElement);
      zIndex = parseInt(styles.zIndex) || 0;
      computedOpacity = styles.opacity;
    }

    // Check asset load status
    const assetLoadStatus: Record<string, "loading" | "loaded" | "error"> = {};
    Object.entries(assetUrls).forEach(([key, url]) => {
      if (typeof url === "string" && url.startsWith("url(")) {
        const cleanUrl = url.replace(/^url\(|\)$/g, "");
        assetLoadStatus[key] = "loading";
        const img = new Image();
        img.onload = () => {
          setDiagnostics((prev) => ({
            ...prev,
            assetLoadStatus: { ...prev.assetLoadStatus, [key]: "loaded" },
          }));
        };
        img.onerror = () => {
          setDiagnostics((prev) => ({
            ...prev,
            assetLoadStatus: { ...prev.assetLoadStatus, [key]: "error" },
          }));
        };
        img.src = cleanUrl;
      }
    });

    setDiagnostics({
      themeLoaded,
      geometryTokens,
      assetUrls,
      assetLoadStatus,
      domPresence,
      zIndex,
      computedOpacity,
    });

    // Log diagnostics to console
    console.group("🔍 Geometry Layer Diagnostics");
    console.log("Theme Loaded:", themeLoaded);
    console.log("Geometry Tokens:", geometryTokens);
    console.log("Asset URLs:", assetUrls);
    console.log("DOM Presence:", domPresence);
    console.log("Z-Index:", zIndex);
    console.log("Computed Opacity:", computedOpacity);
    console.groupEnd();
  }, []);

  return diagnostics;
}
