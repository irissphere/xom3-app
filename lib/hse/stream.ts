// HSE Event Stream - Unified event broadcaster for real-time updates
// Zero drift, zero bloat, one unified streaming channel

type Listener = (event: any) => void;

const listeners = new Set<Listener>();

/**
 * Subscribe to HSE events
 */
export function subscribeToHseEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Broadcast HSE event to all subscribers
 */
export function broadcastHseEvent(event: any): void {
  for (const listener of Array.from(listeners)) {
    try {
      listener(event);
    } catch (error) {
      console.error("[HSE Stream] Error in listener:", error);
    }
  }
}

/**
 * Get current listener count (for debugging)
 */
export function getListenerCount(): number {
  return listeners.size;
}
