// Crest Ritual Engine
// Listens for operator actions and triggers crest rituals

export type CrestRitualType = "activation" | "closure" | "override" | "genesis";

/**
 * Trigger a crest ritual from anywhere in the system
 */
export function triggerCrestRitual(type: CrestRitualType, mantra?: string) {
  if (typeof window === "undefined") return;

  const event = new CustomEvent("crest-ritual", {
    detail: { type, mantra },
  });
  window.dispatchEvent(event);
}

/**
 * Listen for activation ritual triggers
 * Called when morning activation mantra is spoken
 */
export function triggerActivationRitual() {
  triggerCrestRitual("activation", "Seal opened. Auto‑pilots reignited. Cockpit active for the day.");
}

/**
 * Listen for closure ritual triggers
 * Called when nightly closure mantra is spoken
 */
export function triggerClosureRitual() {
  triggerCrestRitual("closure", "Seal confirmed. Auto‑pilots locked. Cockpit closed until dawn.");
}

/**
 * Listen for override ritual triggers
 * Called when sovereign override is performed
 */
export function triggerOverrideRitual() {
  triggerCrestRitual("override", "This is bound. Ledger updated. The cockpit remembers.");
}

/**
 * Listen for genesis ritual triggers
 * Called when subsystem is approved or genesis cycle completes
 */
export function triggerGenesisRitual() {
  triggerCrestRitual("genesis", "Committed. Sealed. Pushed to Playbook.");
}
