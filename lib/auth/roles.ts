export type Role = "admin" | "manager" | "agent" | "viewer";

export const roleHierarchy: Record<Role, number> = {
  admin: 4,
  manager: 3,
  agent: 2,
  viewer: 1
};
