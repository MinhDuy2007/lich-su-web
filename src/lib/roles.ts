export const APP_ROLES = ["user", "moderator", "admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isElevatedRole(role: AppRole | null | undefined) {
  return role === "moderator" || role === "admin";
}

