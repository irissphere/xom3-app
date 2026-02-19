// lib/system/tenant.ts
// Centralized tenant + feature gating helpers.
//
// Goal: never implicitly default the cockpit into "hi5" mode.
// - TENANT_KEY is the primary selector for the cockpit's active tenant.
// - HI5_* env vars are treated as legacy/back-compat and are only used if present.
// - HI5 features are disabled by default unless explicitly enabled.

export function getTenantKey(): string {
  const raw =
    (process.env.TENANT_KEY ||
      // Back-compat: older deployments used HI5_TENANT_KEY for tenant selection
      process.env.HI5_TENANT_KEY ||
      "").trim();

  // Never default to "hi5" implicitly — that causes accidental base/table writes.
  // Xom3 Commander is the primary tenant going forward.
  return raw || "xom3";
}

export function isHi5Enabled(): boolean {
  return String(process.env.ENABLE_HI5 || "")
    .trim()
    .toLowerCase() === "true";
}
