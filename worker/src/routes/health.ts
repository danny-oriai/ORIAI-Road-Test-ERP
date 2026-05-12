import { Hono } from "hono";
import type { HonoEnv } from "../types/env";
import { ok, fail } from "../lib/response";
import { getServiceClient } from "../lib/supabase";

const app = new Hono<HonoEnv>();

/**
 * GET /api/health
 *
 * Always reports its own liveness. Best-effort pings Supabase too —
 * if Supabase is unreachable the endpoint still returns 200 so platform
 * health checks pass, but reports `supabase: false`.
 */
app.get("/", async (c) => {
  let supabaseReachable = false;
  try {
    const supa = getServiceClient(c.env);
    // settings table always has data after seed; a single-row HEAD-style
    // query is the cheapest probe we can make.
    const { error } = await supa.from("settings").select("id", { head: true, count: "exact" }).limit(1);
    supabaseReachable = !error;
  } catch {
    supabaseReachable = false;
  }

  return ok(c, {
    ok: true,
    service: "road-test-erp-api",
    time: new Date().toISOString(),
    supabase: supabaseReachable,
  });
});

// Unused placeholder so we have at least one non-200 path tested
// in tooling later. Disabled in normal flow.
app.get("/echo", async (c) => {
  const v = c.req.query("v");
  if (!v) return fail(c, "BAD_REQUEST", "missing ?v=");
  return ok(c, { echo: v });
});

export default app;
