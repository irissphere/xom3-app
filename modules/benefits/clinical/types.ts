/**
 * Clinical Layer Type Definitions
 */

export interface ClinicalData {
  hasClinicalData: boolean;
  clinicalSummary: string;
  linkedProviderId: string;
}

export interface ClinicalProfile {
  profileId: string;
  clientId: string;
  providerName: string;
  providerNPI: string;
  providerSpecialty: string;
  diagnosisCodes: string[];
  clinicalNotes: string;
  lastVisitDate: string | null;
  nextAppointment: string | null;
  medications: string;
  allergies: string;
  flags: ClinicalFlag[];
  planRecommendations: string;
}

export type ClinicalFlag =
  | "High Risk"
  | "Pre-Auth Required"
  | "Special Needs"
  | "Priority"
  | "Chronic Condition"
  | "Recent Hospitalization";

export type ClinicalTab = "notes" | "provider" | "plans" | "flags";

export interface ClinicalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  clinicalData?: ClinicalData;
  clinicalProfile?: ClinicalProfile;
}

export interface ClinicalButtonProps {
  hasClinicalData: boolean;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

export const FLAG_COLORS: Record<ClinicalFlag, string> = {
  "High Risk": "#ef4444",
  "Pre-Auth Required": "#f59e0b",
  "Special Needs": "#a855f7",
  "Priority": "#3b82f6",
  "Chronic Condition": "#eab308",
  "Recent Hospitalization": "#ec4899",
};
