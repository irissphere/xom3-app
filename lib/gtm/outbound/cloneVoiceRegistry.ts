export type CloneVoiceId = "founder_auren" | "mythic_auren" | "operator_plain";

export type CloneVoice = {
  id: CloneVoiceId;
  label: string;
  style: "plain" | "founder" | "mythic";
};

export const cloneVoices: CloneVoice[] = [
  { id: "operator_plain", label: "Operator (plain)", style: "plain" },
  { id: "founder_auren", label: "Founder Auren", style: "founder" },
  { id: "mythic_auren", label: "Mythic Auren", style: "mythic" },
];

export function isCloneVoiceId(v: any): v is CloneVoiceId {
  return cloneVoices.some((c) => c.id === v);
}

export function getCloneVoice(id: string | null | undefined) {
  return cloneVoices.find((c) => c.id === id) || cloneVoices[0];
}
