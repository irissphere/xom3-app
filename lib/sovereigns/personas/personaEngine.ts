import { sovereignPersonas } from "./personaRegistry";

const ALIASES: Record<string, string> = {
  ritual: "rituals",
};

export function getPersona(sovereignId: string) {
  const key = ALIASES[sovereignId] || sovereignId;
  return sovereignPersonas[key] ?? null;
}
