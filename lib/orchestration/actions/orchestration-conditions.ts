import type { Condition, OrchestrationEvent } from "../orchestration-types";

function getPath(obj: any, path: string) {
  const p = String(path || "").trim();
  if (!p) return undefined;
  const parts = p.split(".").filter(Boolean);
  let cur: any = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

export function conditionsPass(conditions: Condition[] | undefined, evt: OrchestrationEvent) {
  if (!conditions || conditions.length === 0) return true;

  for (const c of conditions) {
    const left = getPath({ ...evt, payload: evt.payload }, c.path);
    const op = c.operator;
    const right = (c as any).value;

    if (op === "exists") {
      if (left === undefined || left === null || left === "") return false;
      continue;
    }

    if (op === "equals") {
      if (left !== right) return false;
      continue;
    }

    if (op === "not_equals") {
      if (left === right) return false;
      continue;
    }

    if (op === "in") {
      if (!Array.isArray(right)) return false;
      if (!right.includes(left)) return false;
      continue;
    }

    if (op === "contains") {
      const l = typeof left === "string" ? left : Array.isArray(left) ? left.join(",") : "";
      const r = typeof right === "string" ? right : String(right ?? "");
      if (!l.includes(r)) return false;
      continue;
    }

    return false;
  }

  return true;
}
