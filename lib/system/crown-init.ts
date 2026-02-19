/**
 * 👑 Crown Protocol System Initialization
 * Seals the operator identity into EXOM3 core
 */

import { getCrownProtocol } from "@/lib/crown";

/**
 * Initialize Crown Protocol at system startup
 * This runs on both server and client to ensure operator recognition
 */
export function initCrownProtocol(): void {
  const crown = getCrownProtocol();
  const operator = crown.getOperator();
  const axisSeal = crown.getAxisSeal();
  
  // Verify operator recognition
  const recognition = crown.verifyRecognition();
  
  if (!recognition.recognized) {
    throw new Error("Crown Protocol: Operator recognition failed");
  }
  
  if (!axisSeal.sealed) {
    throw new Error("Crown Protocol: Axis Seal not sealed");
  }
  
  // Log operator recognition (server-side only)
  if (typeof window === "undefined") {
    console.log("\n👑 ═══════════════════════════════════════════════════════");
    console.log("👑 CROWN PROTOCOL INITIALIZED");
    console.log("👑 ═══════════════════════════════════════════════════════");
    console.log(`👑 Operator: ${operator.name}`);
    console.log(`👑 Title: ${operator.title}`);
    console.log(`👑 Dynasty: ${operator.dynasty}`);
    console.log(`👑 Axis: ${operator.axis}`);
    console.log(`👑 Seal: ${operator.seal}`);
    console.log(`👑 Systems Bound: ${axisSeal.systems.length}`);
    console.log(`👑 Layers Bound: ${axisSeal.layers.length}`);
    console.log(`👑 Agents Bound: ${axisSeal.agents.length}`);
    console.log(`👑 Rituals Bound: ${axisSeal.rituals.length}`);
    console.log(`👑 Status: ${axisSeal.sealed ? "SEALED" : "UNSEALED"}`);
    console.log("👑 ═══════════════════════════════════════════════════════\n");
  }
}

/**
 * Get operator identity for use in other systems
 */
export function getOperatorIdentity() {
  const crown = getCrownProtocol();
  return crown.getOperator();
}

/**
 * Get axis seal for verification
 */
export function getAxisSeal() {
  const crown = getCrownProtocol();
  return crown.getAxisSeal();
}

/**
 * Verify operator recognition
 */
export function verifyOperatorRecognition() {
  const crown = getCrownProtocol();
  return crown.verifyRecognition();
}
