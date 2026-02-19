// Posture Oracle - The system posture state machine for EXOM3 launch
// Manages: internal → public-beta → open
// Once set to 'open', the system is publicly launched

export type SystemPosture = "internal" | "public-beta" | "open";

export interface PostureState {
  current: SystemPosture;
  previousPosture: SystemPosture | null;
  updatedAt: string;
  updatedBy: string;
  launchSealed: boolean;
  launchSealedAt: string | null;
  launchSealedBy: string | null;
}

// In-memory state (will be persisted to Supabase)
let postureState: PostureState = {
  current: "internal",
  previousPosture: null,
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
  launchSealed: false,
  launchSealedAt: null,
  launchSealedBy: null,
};

/**
 * Get current posture state
 */
export function getPostureState(): PostureState {
  return { ...postureState };
}

/**
 * Get current posture
 */
export function getCurrentPosture(): SystemPosture {
  return postureState.current;
}

/**
 * Check if posture transition is valid
 */
export function isValidTransition(from: SystemPosture, to: SystemPosture): boolean {
  // Valid transitions: internal → public-beta → open
  // Cannot go backwards once launched
  if (from === "internal") {
    return to === "public-beta" || to === "open";
  }
  if (from === "public-beta") {
    return to === "open" || to === "internal"; // Can retreat from beta
  }
  if (from === "open") {
    return false; // Cannot go backwards from open
  }
  return false;
}

/**
 * Set system posture
 */
export function setPosture(
  newPosture: SystemPosture,
  operator: string
): { success: boolean; error?: string; state?: PostureState } {
  const current = postureState.current;

  // Check if launch is already sealed (cannot change posture)
  if (postureState.launchSealed && newPosture !== "open") {
    return {
      success: false,
      error: "Launch is sealed. Posture cannot be changed.",
    };
  }

  // Validate transition
  if (!isValidTransition(current, newPosture)) {
    return {
      success: false,
      error: `Invalid posture transition: ${current} → ${newPosture}`,
    };
  }

  // Apply transition
  postureState = {
    ...postureState,
    previousPosture: current,
    current: newPosture,
    updatedAt: new Date().toISOString(),
    updatedBy: operator,
  };

  return {
    success: true,
    state: { ...postureState },
  };
}

/**
 * Seal the launch (irreversible)
 */
export function sealLaunch(operator: string): { success: boolean; error?: string; state?: PostureState } {
  // Must be in 'open' posture to seal
  if (postureState.current !== "open") {
    return {
      success: false,
      error: "System must be in 'open' posture to seal launch.",
    };
  }

  // Already sealed
  if (postureState.launchSealed) {
    return {
      success: false,
      error: "Launch is already sealed.",
    };
  }

  // Seal
  postureState = {
    ...postureState,
    launchSealed: true,
    launchSealedAt: new Date().toISOString(),
    launchSealedBy: operator,
  };

  return {
    success: true,
    state: { ...postureState },
  };
}

/**
 * Check if system is publicly accessible
 */
export function isPubliclyAccessible(): boolean {
  return postureState.current === "public-beta" || postureState.current === "open";
}

/**
 * Check if system is fully launched
 */
export function isLaunched(): boolean {
  return postureState.current === "open" && postureState.launchSealed;
}

/**
 * Get posture description
 */
export function getPostureDescription(posture: SystemPosture): string {
  switch (posture) {
    case "internal":
      return "System is in internal/development mode. Not accessible to public.";
    case "public-beta":
      return "System is in public beta. Limited access, controlled state.";
    case "open":
      return "System is fully open. All public surfaces unlocked.";
    default:
      return "Unknown posture";
  }
}
