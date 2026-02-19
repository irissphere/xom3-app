"use client";

import { useEffect, useMemo, useState } from "react";

const TENANT_STORAGE_KEY = "xom3:intakecrm:tenant";

function normalizeTenant(v: string): string {
  return (v || "").trim() || "xom3";
}

export function useIntakecrmTenantPreference() {
  const [tenant, setTenant] = useState<string>("xom3");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TENANT_STORAGE_KEY);
      if (stored) setTenant(normalizeTenant(stored));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(TENANT_STORAGE_KEY, normalizeTenant(tenant));
    } catch {
      // ignore
    }
  }, [tenant]);

  return { tenant: normalizeTenant(tenant), setTenant };
}

export function useIntakecrmHeaders(input: { tenant: string; actorLabel: string }) {
  return useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-xom3-tenant": normalizeTenant(input.tenant),
      "x-xom3-role": "operator",
      "x-xom3-actor-label": input.actorLabel,
    }),
    [input.tenant, input.actorLabel],
  );
}
