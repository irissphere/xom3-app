import { Role } from "./roles";

export function resolveRole(headers: Headers): Role {
  const role = headers.get("x-user-role") as Role;
  // Validate role is one of the allowed roles
  const validRoles: Role[] = ["admin", "manager", "agent", "viewer"];
  if (role && validRoles.includes(role)) {
    return role;
  }
  return "viewer";
}
