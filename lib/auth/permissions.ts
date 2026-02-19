import { Role, roleHierarchy } from "./roles";

export function canAccess(role: Role, required: Role) {
  return roleHierarchy[role] >= roleHierarchy[required];
}
