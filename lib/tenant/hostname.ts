/**
 * Tenant hostname normalization.
 * We keep this logic centralized so middleware + server resolution stay consistent.
 */
export function cleanHostname(rawHostHeader: string): string {
  return (rawHostHeader || "").trim().toLowerCase().split(":")[0];
}

export function stripWww(hostname: string): string {
  const h = (hostname || "").trim().toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}








