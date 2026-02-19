import { TenantTheme } from "./schema";

/**
 * Tenant Registry - Domain â†’ Route Mapping
 * VERIFIED DOMAIN CONSTELLATION - All domains you actually own
 * Each domain routes to specific section of EXOM3 cockpit
 * 
 * âœ… Core EXOM3 / Cockpit Domains
 * âœ… Kairosphere Domains
 * âœ… Business Domain
 * âŒ Removed: irissphere.com, healthcarepro.com (not owned)
 * 
 * This registry is the source of truth for domain routing.
 * Keep in sync with:
 * - Vercel project domains
 * - Hostinger DNS records
 */
export const TENANT_REGISTRY = {
  "xom3.io": { route: "/xom3", label: "Primary marketing (XOM3)" },
  "start.xom3.org": { route: "/xom3", label: "Start portal (XOM3)" },
  "xom3.org": { route: "/app/healthcare", label: "Secondary cockpit" },
  "xom3.net": { route: "/app/healthcare", label: "Tertiary cockpit" },

  "kairospheredashboard.me": { route: "/app/healthcare", label: "Healthcare UI" },
  "kairosworkflow.site": { route: "/app/healthcare", label: "Automation cockpit" },
  "kairosphere.tech": { route: "/system", label: "System / engineering" },

  "kairosphere.shop": { route: "/app/healthcare", label: "Commerce (placeholder)" },
  "kairosapparel.shop": { route: "/app/healthcare", label: "Apparel lane (placeholder)" },
  "kairoslegacy.xyz": { route: "/app/healthcare", label: "Legacy / estate lane (placeholder)" },

  "pulseverabenefits.com": { route: "/app/healthcare", label: "Business / PulseVera front-end" },

  // SpaceBaddie Studio - Video & Avatar Creation Platform
  "spacebaddie.com": { route: "/spacebaddie", label: "SpaceBaddie Studio" },
  "shop.spacebaddie.com": { route: "/shop", label: "SpaceBaddie Shop" },
} as const;

/**
 * Legacy tenants object (kept for backward compatibility with TenantTheme)
 * Maps tenant keys to full theme configuration
 */
export const tenants: Record<string, TenantTheme> = {
  // Default XOM3 (Primary Cockpit)
  "default": {
    name: "XOM3",
    primaryColor: "#0A84FF",
    secondaryColor: "#111",
    logoUrl: "/logo.png",
    domain: "xom3.io",
    route: "/xom3"
  },
  
  // Start Portal (XOM3)
  "start-xom3": {
    name: "XOM3",
    primaryColor: "#0A84FF",
    secondaryColor: "#111",
    logoUrl: "/logo.png",
    domain: "start.xom3.org",
    route: "/xom3"
  },
  
  // Core EXOM3 Backup Domains
  "xom3-org": {
    name: "XOM3",
    primaryColor: "#0A84FF",
    secondaryColor: "#111",
    logoUrl: "/logo.png",
    domain: "xom3.org",
    route: "/app/healthcare"
  },
  "xom3-net": {
    name: "XOM3",
    primaryColor: "#0A84FF",
    secondaryColor: "#111",
    logoUrl: "/logo.png",
    domain: "xom3.net",
    route: "/app/healthcare"
  },
  
  // Kairosphere Healthcare Dashboard
  "kairosdashboard": {
    name: "Kairos Dashboard",
    primaryColor: "#0A84FF",
    secondaryColor: "#111",
    logoUrl: "/logo.png",
    domain: "kairospheredashboard.me",
    route: "/app/healthcare"
  },
  
  // Kairosphere Automation Cockpit
  "kairosworkflow": {
    name: "Kairos Workflows",
    primaryColor: "#1E8F6F",
    secondaryColor: "#0A3D2E",
    logoUrl: "/workflow-logo.png",
    domain: "kairosworkflow.site",
    route: "/app/healthcare"
  },
  
  // Kairosphere System/Engineering Cockpit
  "kairosphere-tech": {
    name: "Kairos Tech",
    primaryColor: "#10B981",
    secondaryColor: "#064E3B",
    logoUrl: "/tech-logo.png",
    domain: "kairosphere.tech",
    route: "/system"
  },
  
  // Commerce Domains (placeholder routes until commerce pages built)
  "kairosphere-shop": {
    name: "Kairos Shop",
    primaryColor: "#8B5CF6",
    secondaryColor: "#4C1D95",
    logoUrl: "/shop-logo.png",
    domain: "kairosphere.shop",
    route: "/app/healthcare"
  },
  "kairosapparel": {
    name: "Kairos Apparel",
    primaryColor: "#EC4899",
    secondaryColor: "#831843",
    logoUrl: "/apparel-logo.png",
    domain: "kairosapparel.shop",
    route: "/app/healthcare"
  },
  
  // Legacy & Philosophy (placeholder route until legacy pages built)
  "kairoslegacy": {
    name: "Kairos Legacy",
    primaryColor: "#F59E0B",
    secondaryColor: "#78350F",
    logoUrl: "/legacy-logo.png",
    domain: "kairoslegacy.xyz",
    route: "/app/healthcare"
  },
  
  // Business Domain
  "pulseverabenefits": {
    name: "PulseVera Benefits",
    primaryColor: "#1E8F6F",
    secondaryColor: "#0A3D2E",
    logoUrl: "/pulsevera-logo.png",
    domain: "pulseverabenefits.com",
    route: "/app/healthcare"
  },

  // SpaceBaddie Studio - Video & Avatar Creation
  "spacebaddie": {
    name: "SpaceBaddie Studio",
    primaryColor: "#FF006E",
    secondaryColor: "#1A1A2E",
    logoUrl: "/spacebaddie-logo.png",
    domain: "spacebaddie.com",
    route: "/spacebaddie"
  }
};

/**
 * Check if a domain is in the registry
 */
export function isDomainRegistered(domain: string): boolean {
  return domain in TENANT_REGISTRY;
}

/**
 * Get route for a domain (returns undefined if not registered)
 */
export function getDomainRoute(domain: string): string | undefined {
  return TENANT_REGISTRY[domain as keyof typeof TENANT_REGISTRY]?.route;
}
