// Centralized kill-switch for HI5 features.
// Default: disabled to avoid any accidental calls or client touches.
export const HI5_ENABLED = true;

// Helper to gate any HI5-specific behavior.
export function assertHi5Enabled() {
  if (!HI5_ENABLED) {
    return {
      ok: false,
      reason: "hi5_disabled",
    } as const;
  }
  return { ok: true as const };
}
