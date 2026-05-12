/**
 * Cloudflare Workers environment bindings, as configured in
 * wrangler.toml ([vars]) and `wrangler secret put` commands.
 */
export interface Env {
  /** Supabase project URL, e.g. https://xxxx.supabase.co — set via `wrangler secret put SUPABASE_URL` */
  SUPABASE_URL: string;
  /** Service-role JWT (secret) — bypasses RLS; never expose to the browser. */
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Anon key (public) — kept here in case we ever want PostgREST direct mode. */
  SUPABASE_ANON_KEY: string;
  /** Postgres schema where all RTM tables live — see Step 2 migration. */
  SUPABASE_SCHEMA: string;
  /** Allowed origin for production CORS. */
  FRONTEND_ORIGIN: string;
  /** "true" to also allow http://localhost:5173 (dev only). */
  ALLOW_LOCALHOST: string;
}

/**
 * Request-scoped context written by middleware. Routes read these
 * via c.get(...) — never trust client-supplied headers directly.
 */
export interface RequestVariables {
  /** rtm.users.legacy_id for the current actor (e.g. "U001"). Resolved by auth middleware. */
  userLegacyId: string;
  /** Role from rtm.role_enum. */
  userRole: Role;
}

export type Role =
  | "Admin"
  | "PMO"
  | "Project Manager"
  | "Test Engineer"
  | "Driver"
  | "Finance";

export type HonoEnv = { Bindings: Env; Variables: RequestVariables };
