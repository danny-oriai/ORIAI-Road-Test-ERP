import { createClient } from "@supabase/supabase-js";
import type { Env } from "../types/env";

/**
 * Returns a Supabase client bound to the rtm schema using the
 * service-role key. This client BYPASSES Row Level Security, so the
 * application code (routes + auth middleware) is responsible for
 * filtering rows the caller is allowed to see.
 *
 * RLS still acts as defense-in-depth — see docs/rls-policy-notes.md.
 *
 * Workers' fetch API is on the global `fetch`, so we don't need to
 * inject anything extra; supabase-js will use it automatically.
 */
export function getServiceClient(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase env missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY via wrangler secret put",
    );
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: env.SUPABASE_SCHEMA || "rtm" },
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { "x-application": "road-test-erp-api" },
    },
  });
}

/**
 * Helper: map a Supabase error to a safe public message.
 * We deliberately strip internal details — no PG error codes, no
 * column hints, no row dumps — to avoid leaking schema details.
 */
export function publicDbError(err: { code?: string; message?: string } | null): string {
  if (!err) return "Database error";
  switch (err.code) {
    case "23505": return "Duplicate value";
    case "23503": return "Referenced record not found";
    case "23502": return "Required field missing";
    case "22P02": return "Invalid value format";
    case "PGRST116": return "Record not found";
    default:      return "Database error";
  }
}
