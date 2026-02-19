import { tenants, TENANT_REGISTRY, getDomainRoute, isDomainRegistered } from "./registry";

/**
 * Resolve tenant configuration from hostname
 * Falls back to default tenant if hostname not in registry
 */
export function resolveTenant(hostname: string) {
  // Clean hostname (remove port if present)
  const cleanHost = hostname.split(':')[0];
  
  // First try to find by domain in tenants
  const match = Object.values(tenants).find(t => t.domain === cleanHost);
  if (match) {
    return match;
  }
  
  // Fallback to default
  return tenants["default"];
}

/**
 * Check if hostname is registered and get its route
 * Returns route string or undefined if not registered
 */
export function resolveDomainRoute(hostname: string): string | undefined {
  const cleanHost = hostname.split(':')[0];
  return getDomainRoute(cleanHost);
}

/**
 * Assert that a hostname is registered, throw if not
 * Used for route assertion logic
 */
export function assertDomainRegistered(hostname: string): void {
  const cleanHost = hostname.split(':')[0];
  if (!isDomainRegistered(cleanHost)) {
    throw new Error(`Domain ${cleanHost} is not registered in tenant registry`);
  }
}
