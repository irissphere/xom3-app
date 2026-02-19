// lib/system/command-center.ts

import { headers } from 'next/headers';
import { getHi5SubscriptionConfig, type Hi5Features, type Hi5Plan } from './hi5-subscription';
import { getHi5TenantSettings } from './hi5-settings-store';
import { isHi5Enabled } from './tenant';
import { HI5_ENABLED } from './hi5-feature';

export type CommandCenterStatus = {
  system: {
    cockpit: 'ok' | 'degraded' | 'down';
    n8n: 'ok' | 'degraded' | 'unknown';
    lastHeartbeatAt?: string | null;
  };
  hi5: {
    plan: Hi5Plan;
    enabled: boolean;
    features: Hi5Features;
    workflows: {
      leadIntake: 'enabled' | 'disabled' | 'blocked';
      vendorRFQ: 'enabled' | 'disabled' | 'blocked';
      responsePositioning: 'enabled' | 'disabled' | 'blocked';
    };
  };
  scrapers: {
    linkedin: 'active' | 'inactive' | 'error';
    twitter: 'active' | 'inactive' | 'error';
    instagram: 'active' | 'inactive' | 'error';
  };
};

type SystemStatusResponse = {
  success?: boolean;
  autoStats?: {
    status?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | string;
  };
};

type HeartbeatResponse = {
  success?: boolean;
  heartbeat?: {
    status?: 'healthy' | 'degraded' | 'critical' | string;
    timestamp?: string;
    subsystems?: Record<string, string>;
  };
};

type InternalHealthResponse = {
  status?: 'ok' | string;
};

function getRequestOrigin(): string | null {
  // Prefer request headers (works in prod + previews)
  try {
    const h = headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';
    if (host) return `${proto}://${host}`;
  } catch {
    // ignore - headers() may throw outside request context
  }

  // Fallback to Vercel env
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  return null;
}

async function fetchJson<T>(url: string, timeoutMs = 1500): Promise<{ ok: boolean; status: number; data: T | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
      },
    });
    const data = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timeout);
  }
}

// v1.1: still returns the same stable shape, but derives system strip from real signals when possible.
export async function getCommandCenterStatus(): Promise<CommandCenterStatus> {
  const origin = getRequestOrigin();

  const [systemStatus, heartbeat, internalHealth] = origin
    ? await Promise.all([
        fetchJson<SystemStatusResponse>(`${origin}/api/system/status`),
        fetchJson<HeartbeatResponse>(`${origin}/api/system/heartbeat`),
        fetchJson<InternalHealthResponse>(`${origin}/api/internal/health`),
      ])
    : [
        { ok: false, status: 0, data: null as SystemStatusResponse | null },
        { ok: false, status: 0, data: null as HeartbeatResponse | null },
        { ok: false, status: 0, data: null as InternalHealthResponse | null },
      ];

  // Compute cockpit health from live signals (degrades gracefully)
  const internalOk = internalHealth.ok && internalHealth.data?.status === 'ok';
  const statusOk = systemStatus.ok && systemStatus.data?.success === true;

  let cockpit: CommandCenterStatus['system']['cockpit'] = 'down';
  if (internalOk) cockpit = 'degraded';
  if (statusOk) cockpit = 'ok';

  // Optional tightening: if heartbeat says degraded/critical, reflect it even if status is OK.
  const heartbeatOk = heartbeat.ok && heartbeat.data?.success === true;
  const hbStatus = heartbeat.data?.heartbeat?.status;
  if (cockpit === 'ok' && heartbeatOk && hbStatus && hbStatus !== 'healthy') cockpit = 'degraded';

  const lastHeartbeatAt: string | null =
    (heartbeatOk ? heartbeat.data?.heartbeat?.timestamp : null) ?? null;

  const hi5Config = getHi5SubscriptionConfig();
  const hi5GloballyEnabled = HI5_ENABLED && isHi5Enabled();
  const persisted = hi5GloballyEnabled
    ? await getHi5TenantSettings()
    : { settings: null, source: "disabled" as const };

  const hi5Plan: Hi5Plan = hi5GloballyEnabled
    ? persisted.settings?.plan ?? hi5Config.plan
    : hi5Config.plan;

  const hi5Features: Hi5Features = hi5GloballyEnabled
    ? persisted.settings?.features ?? hi5Config.features
    : {
        leadIntake: false,
        vendorRFQ: false,
        responsePositioning: false,
        scrapers: { linkedin: false, twitter: false, instagram: false },
      };

  const hi5Enabled =
    hi5GloballyEnabled &&
    (persisted.settings?.automationEnabled ??
      (parseBoolEnv(process.env.AUTOMATION_ENABLED) ??
        parseBoolEnv(process.env.HI5_AUTOMATION_ENABLED) ??
        false));

  const workflowState = (featureEnabled: boolean): CommandCenterStatus['hi5']['workflows'][keyof CommandCenterStatus['hi5']['workflows']] => {
    if (!hi5Enabled) return 'disabled';
    return featureEnabled ? 'enabled' : 'disabled';
  };

  const scraperState = (featureEnabled: boolean): CommandCenterStatus['scrapers'][keyof CommandCenterStatus['scrapers']] => {
    if (!hi5Enabled) return 'inactive';
    return featureEnabled ? 'active' : 'inactive';
  };

  return {
    system: {
      cockpit,
      n8n: 'unknown',
      lastHeartbeatAt,
    },
    hi5: {
      plan: hi5Plan,
      enabled: hi5Enabled,
      features: hi5Features,
      workflows: {
        leadIntake: workflowState(hi5Features.leadIntake),
        vendorRFQ: workflowState(hi5Features.vendorRFQ),
        responsePositioning: workflowState(hi5Features.responsePositioning),
      },
    },
    scrapers: {
      linkedin: scraperState(hi5Features.scrapers.linkedin),
      twitter: scraperState(hi5Features.scrapers.twitter),
      instagram: scraperState(hi5Features.scrapers.instagram),
    },
  };
}

function parseBoolEnv(v: string | undefined): boolean | null {
  if (v == null) return null;
  const s = v.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  return null;
}
