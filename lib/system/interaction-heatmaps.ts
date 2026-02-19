// Interaction Heatmaps - Task 32
// Visualize where agents click, hover, hesitate

import { trackEvent, trackHesitation, UsageEvent, getStoredEvents } from "./usage-analytics";

export interface HeatmapPoint {
  x: number; // Percentage from left (0-100)
  y: number; // Percentage from top (0-100)
  intensity: number; // Number of interactions at this point
  type: "click" | "hover" | "hesitation";
  timestamp: string;
  component?: string;
}

export interface HeatmapData {
  page: string;
  points: HeatmapPoint[];
  totalInteractions: number;
  clickCount: number;
  hoverCount: number;
  hesitationCount: number;
  generatedAt: string;
}

export interface ComponentHeatmap {
  componentId: string;
  componentName: string;
  clickPoints: Array<{ x: number; y: number; count: number }>;
  hoverPoints: Array<{ x: number; y: number; count: number }>;
  hesitationPoints: Array<{ x: number; y: number; count: number }>;
  totalClicks: number;
  totalHovers: number;
  totalHesitations: number;
  hesitationRate: number; // hesitations / (clicks + hesitations)
}

/**
 * Track click position for heatmap
 */
export function trackClickPosition(
  page: string,
  component: string,
  x: number, // Pixel position
  y: number, // Pixel position
  elementWidth: number,
  elementHeight: number
): void {
  // Convert to percentage
  const xPercent = elementWidth > 0 ? (x / elementWidth) * 100 : 0;
  const yPercent = elementHeight > 0 ? (y / elementHeight) * 100 : 0;

  trackEvent("click", {
    page,
    component,
    metadata: {
      x: xPercent,
      y: yPercent,
      pixelX: x,
      pixelY: y,
    },
  });
}

/**
 * Track hover position for heatmap
 */
export function trackHoverPosition(
  page: string,
  component: string,
  x: number,
  y: number,
  elementWidth: number,
  elementHeight: number,
  hoverDuration: number
): void {
  const xPercent = elementWidth > 0 ? (x / elementWidth) * 100 : 0;
  const yPercent = elementHeight > 0 ? (y / elementHeight) * 100 : 0;

  // Track as hover or hesitation based on duration
  trackHesitation(page, component, hoverDuration);

  // Store position data
  trackEvent("hover", {
    page,
    component,
    duration: hoverDuration,
    metadata: {
      x: xPercent,
      y: yPercent,
      pixelX: x,
      pixelY: y,
    },
  });
}

/**
 * Generate heatmap data for a page
 */
export function generatePageHeatmap(
  page: string,
  events?: UsageEvent[]
): HeatmapData {
  const allEvents = events || getStoredEvents();
  const pageEvents = allEvents.filter(
    (e) => e.page === page && (e.type === "click" || e.type === "hover" || e.type === "hesitation")
  );

  const points: HeatmapPoint[] = [];
  let clickCount = 0;
  let hoverCount = 0;
  let hesitationCount = 0;

  // Group points by position (round to nearest 5% to reduce noise)
  const pointMap: Record<string, { x: number; y: number; clicks: number; hovers: number; hesitations: number }> = {};

  for (const event of pageEvents) {
    const x = event.metadata?.x as number;
    const y = event.metadata?.y as number;

    if (x !== undefined && y !== undefined) {
      // Round to nearest 5%
      const roundedX = Math.round(x / 5) * 5;
      const roundedY = Math.round(y / 5) * 5;
      const key = `${roundedX},${roundedY}`;

      if (!pointMap[key]) {
        pointMap[key] = { x: roundedX, y: roundedY, clicks: 0, hovers: 0, hesitations: 0 };
      }

      if (event.type === "click") {
        pointMap[key].clicks++;
        clickCount++;
      } else if (event.type === "hover") {
        pointMap[key].hovers++;
        hoverCount++;
      } else if (event.type === "hesitation") {
        pointMap[key].hesitations++;
        hesitationCount++;
      }
    }
  }

  // Convert to heatmap points
  for (const [key, data] of Object.entries(pointMap)) {
    const totalIntensity = data.clicks + data.hovers + data.hesitations;
    if (totalIntensity > 0) {
      // Determine primary type
      let primaryType: "click" | "hover" | "hesitation" = "click";
      if (data.hesitations > data.clicks && data.hesitations > data.hovers) {
        primaryType = "hesitation";
      } else if (data.hovers > data.clicks) {
        primaryType = "hover";
      }

      points.push({
        x: data.x,
        y: data.y,
        intensity: totalIntensity,
        type: primaryType,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return {
    page,
    points,
    totalInteractions: clickCount + hoverCount + hesitationCount,
    clickCount,
    hoverCount,
    hesitationCount,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate component-level heatmap
 */
export function generateComponentHeatmap(
  page: string,
  componentId: string,
  events?: UsageEvent[]
): ComponentHeatmap {
  const allEvents = events || getStoredEvents();
  const componentEvents = allEvents.filter(
    (e) => e.page === page && e.component === componentId && (e.type === "click" || e.type === "hover" || e.type === "hesitation")
  );

  const clickPoints: Array<{ x: number; y: number; count: number }> = [];
  const hoverPoints: Array<{ x: number; y: number; count: number }> = [];
  const hesitationPoints: Array<{ x: number; y: number; count: number }> = [];

  let totalClicks = 0;
  let totalHovers = 0;
  let totalHesitations = 0;

  // Group by position
  const clickMap: Record<string, number> = {};
  const hoverMap: Record<string, number> = {};
  const hesitationMap: Record<string, number> = {};

  for (const event of componentEvents) {
    const x = event.metadata?.x as number;
    const y = event.metadata?.y as number;

    if (x !== undefined && y !== undefined) {
      const roundedX = Math.round(x / 5) * 5;
      const roundedY = Math.round(y / 5) * 5;
      const key = `${roundedX},${roundedY}`;

      if (event.type === "click") {
        clickMap[key] = (clickMap[key] || 0) + 1;
        totalClicks++;
      } else if (event.type === "hover") {
        hoverMap[key] = (hoverMap[key] || 0) + 1;
        totalHovers++;
      } else if (event.type === "hesitation") {
        hesitationMap[key] = (hesitationMap[key] || 0) + 1;
        totalHesitations++;
      }
    }
  }

  // Convert maps to point arrays
  for (const [key, count] of Object.entries(clickMap)) {
    const [x, y] = key.split(",").map(Number);
    clickPoints.push({ x, y, count });
  }

  for (const [key, count] of Object.entries(hoverMap)) {
    const [x, y] = key.split(",").map(Number);
    hoverPoints.push({ x, y, count });
  }

  for (const [key, count] of Object.entries(hesitationMap)) {
    const [x, y] = key.split(",").map(Number);
    hesitationPoints.push({ x, y, count });
  }

  const totalInteractions = totalClicks + totalHesitations;
  const hesitationRate = totalInteractions > 0 ? totalHesitations / totalInteractions : 0;

  return {
    componentId,
    componentName: componentId, // Could be enhanced to get actual name
    clickPoints,
    hoverPoints,
    hesitationPoints,
    totalClicks,
    totalHovers,
    totalHesitations,
    hesitationRate,
  };
}

/**
 * Get heatmap summary for all pages
 */
export function getAllPageHeatmaps(events?: UsageEvent[]): Record<string, HeatmapData> {
  const allEvents = events || getStoredEvents();
  const pages = new Set<string>();

  for (const event of allEvents) {
    if (event.page) {
      pages.add(event.page);
    }
  }

  const heatmaps: Record<string, HeatmapData> = {};
  for (const page of Array.from(pages)) {
    heatmaps[page] = generatePageHeatmap(page, allEvents);
  }

  return heatmaps;
}
