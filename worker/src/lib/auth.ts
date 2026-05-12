import type { Context, MiddlewareHandler } from "hono";
import type { HonoEnv, Role } from "../types/env";

const VALID_ROLES: Role[] = [
  "Admin", "PMO", "Project Manager", "Test Engineer", "Driver", "Finance",
];

/**
 * Demo auth middleware.
 *
 * Reads the current user identity from request headers:
 *   x-demo-user-id   (legacy_id, e.g. "U001")
 *   x-demo-role      (one of role_enum values)
 *
 * Defaults to "U001" / "PMO" if missing.
 *
 * When Step 4 (Lark OAuth) lands this middleware is replaced by:
 *   - reading the session cookie / Authorization header
 *   - verifying the JWT
 *   - resolving rtm.users by lark_open_id
 *   - setting the same `userLegacyId` and `userRole` context vars
 *
 * Routes are unaware of which auth mode is active — they always read
 * via c.get('userLegacyId') / c.get('userRole').
 */
export const demoAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const headerUser = c.req.header("x-demo-user-id");
  const headerRole = c.req.header("x-demo-role") as Role | undefined;

  const userLegacyId = headerUser?.trim() || "U001";
  const userRole = headerRole && VALID_ROLES.includes(headerRole) ? headerRole : "PMO";

  c.set("userLegacyId", userLegacyId);
  c.set("userRole", userRole);

  await next();
};

/* ============================================================
 *  Permission helpers
 *
 *  These mirror the SQL helper functions in 001_initial_schema.sql
 *  (rtm.has_role, rtm.is_project_member). Since the Worker uses
 *  service_role (which bypasses RLS), we re-implement the same
 *  checks here in TypeScript. RLS remains as defense-in-depth.
 * ========================================================== */

export function hasRole(c: Context<HonoEnv>, ...allowed: Role[]): boolean {
  const role = c.get("userRole");
  return allowed.includes(role);
}

export function isAdminOrPmo(c: Context<HonoEnv>): boolean {
  return hasRole(c, "Admin", "PMO");
}

/**
 * Throw-style helper for routes that should 403 if the user isn't
 * Admin/PMO. Usage:
 *   if (!isAdminOrPmo(c)) return forbid(c);
 */
export function requireAnyOf(c: Context<HonoEnv>, ...allowed: Role[]): boolean {
  return hasRole(c, ...allowed);
}
