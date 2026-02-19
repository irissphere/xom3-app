export type OperatorPosture = "build" | "debug" | "demo" | "gtm" | "ritual";

export function inferPosture(context: any): OperatorPosture {
  if (context?.activeRitual) return "ritual";
  if (context?.view === "crm" || context?.view === "broadcast" || context?.view === "leadgen") return "gtm";
  if (context?.debugPanelOpen) return "debug";
  if (context?.demoMode) return "demo";
  return "build";
}
