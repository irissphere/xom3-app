import { getTenantKey } from "@/lib/system/tenant";
import type { IntakeCrmRole } from "./types";

export type IntakeCrmActor = {
  role: IntakeCrmRole;
  id: string | null;
  label: string | null;
};

export type IntakeCrmRequestContext = {
  tenant: string;
  actor: IntakeCrmActor;
};

function normalizeHeader(v: string | null): string | null {
  const s = (v || "").trim();
  return s.length ? s : null;
}

function parseRole(raw: string | null): IntakeCrmRole {
  const v = (raw || "").trim().toLowerCase();
  if (v === "operator" || v === "agent" || v === "viewer") return v;
  return "operator";
}

export function resolveIntakecrmContext(req: Request): IntakeCrmRequestContext {
  const h = req.headers;

  const tenant =
    normalizeHeader(h.get("x-xom3-tenant")) ||
    normalizeHeader(h.get("x-tenant-key")) ||
    getTenantKey();

  const actor: IntakeCrmActor = {
    role: parseRole(h.get("x-xom3-role")),
    id: normalizeHeader(h.get("x-xom3-actor-id")),
    label: normalizeHeader(h.get("x-xom3-actor-label")),
  };

  return { tenant, actor };
}

export function requireIntakecrmWriteAccess(actor: IntakeCrmActor): { ok: true } | { ok: false; error: string } {
  if (actor.role === "viewer") return { ok: false, error: "role_forbidden" };
  return { ok: true };
}
