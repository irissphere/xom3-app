import type {
  OperatorRevenueLoopState,
  OperatorRevenueLoopTrigger,
  OperatorSignalsItem,
  OperatorSocialErrorItem,
  OperatorSocialQueuePosture,
  OperatorTenantConfigPosture,
} from "./operator-dashboard-types";

type FetchResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function errFromJson(json: any, fallback: string) {
  return String(json?.error || json?.message || json?.detail || fallback);
}

export async function fetchOperatorSocialQueuePosture(headers: HeadersInit): Promise<FetchResult<OperatorSocialQueuePosture>> {
  const res = await fetch("/api/social/queue", { headers, cache: "no-store" });
  const json = await readJson(res);
  if (!res.ok || !json?.ok) return { ok: false, error: errFromJson(json, "social_queue_load_failed") };
  return { ok: true, data: json as OperatorSocialQueuePosture };
}

export async function fetchOperatorSocialErrors(headers: HeadersInit): Promise<FetchResult<{ ok: boolean; items: OperatorSocialErrorItem[]; total: number }>> {
  const res = await fetch("/api/social/errors", { headers, cache: "no-store" });
  const json = await readJson(res);
  if (!res.ok || !json?.ok) return { ok: false, error: errFromJson(json, "social_errors_load_failed") };
  return { ok: true, data: json as any };
}

export async function fetchOperatorRevenueLoopState(headers: HeadersInit): Promise<FetchResult<OperatorRevenueLoopState>> {
  const res = await fetch("/api/revenue-loop/state", { headers, cache: "no-store" });
  const json = await readJson(res);
  if (!res.ok || !json?.ok) return { ok: false, error: errFromJson(json, "revenue_loop_state_load_failed") };
  return { ok: true, data: json as OperatorRevenueLoopState };
}

export async function fetchOperatorRevenueLoopTriggers(headers: HeadersInit): Promise<FetchResult<{ ok: boolean; items: OperatorRevenueLoopTrigger[] }>> {
  const res = await fetch("/api/revenue-loop/triggers", { headers, cache: "no-store" });
  const json = await readJson(res);
  if (!res.ok || !json?.ok) return { ok: false, error: errFromJson(json, "revenue_loop_triggers_load_failed") };
  return { ok: true, data: json as any };
}

export async function fetchOperatorSignals(headers: HeadersInit, params: { scope: string; limit: number }): Promise<FetchResult<{ ok: boolean; items: OperatorSignalsItem[]; total: number }>> {
  const qs = new URLSearchParams();
  if (params.scope) qs.set("scope", params.scope);
  qs.set("limit", String(params.limit || 50));
  const res = await fetch(`/api/signals?${qs.toString()}`, { headers, cache: "no-store" });
  const json = await readJson(res);
  if (!res.ok || !json?.ok) return { ok: false, error: errFromJson(json, "signals_load_failed") };
  return { ok: true, data: json as any };
}

export async function fetchOperatorTenantConfigPosture(headers: HeadersInit): Promise<FetchResult<OperatorTenantConfigPosture>> {
  const res = await fetch("/api/tenant/config/posture", { headers, cache: "no-store" });
  const json = await readJson(res);
  if (!res.ok || !json?.ok) return { ok: false, error: errFromJson(json, "tenant_config_load_failed") };
  return { ok: true, data: json as OperatorTenantConfigPosture };
}
