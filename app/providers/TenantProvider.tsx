"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { resolveTenant } from "@/lib/tenant/resolve";
import { TenantTheme } from "@/lib/tenant/schema";
import { tenants } from "@/lib/tenant/registry";

const TenantContext = createContext<TenantTheme | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  // Initialize with default tenant immediately to avoid blocking render
  const [tenant, setTenant] = useState<TenantTheme>(tenants["default"]);

  useEffect(() => {
    const hostname = window.location.hostname;
    setTenant(resolveTenant(hostname));
  }, []);

  return (
    <TenantContext.Provider value={tenant}>
      <div style={{ "--primary": tenant.primaryColor, "--secondary": tenant.secondaryColor } as React.CSSProperties}>
        {children}
      </div>
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
}
