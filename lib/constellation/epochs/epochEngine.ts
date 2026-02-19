import { constellationEpochs, type ConstellationEpoch } from "./epochRegistry";

export type EpochContext = {
  bootCompleted?: boolean;
  healthStable?: boolean;
  lanesExpanded?: boolean;
  gtmReady?: boolean;
  ritualsActive?: boolean;
  operatorMode?: boolean;
};

export function determineEpoch(context: EpochContext): ConstellationEpoch {
  const byId = Object.fromEntries(constellationEpochs.map((e) => [e.id, e])) as Record<string, ConstellationEpoch>;

  // Highest-order epochs win.
  if (context.operatorMode) return byId.operator;
  if (context.ritualsActive) return byId.ritual;
  if (context.gtmReady) return byId.gtm;
  if (context.lanesExpanded) return byId.expansion;
  if (context.healthStable) return byId.stabilization;
  if (context.bootCompleted) return byId.activation;
  return byId.activation;
}
