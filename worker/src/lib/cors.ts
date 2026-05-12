import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";
import type { HonoEnv } from "../types/env";

/**
 * Returns a Hono CORS middleware whose allow-list is computed from
 * env. We dynamically build the origin function so a single Worker
 * can be deployed twice (dev / prod) and obey FRONTEND_ORIGIN.
 *
 * Allowed:
 *   - FRONTEND_ORIGIN  (set in wrangler.toml or via secret)
 *   - http://localhost:5173, http://localhost:4173  (only if ALLOW_LOCALHOST=true)
 */
export function buildCors(): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const env = c.env;
    const allow = [env.FRONTEND_ORIGIN];
    if ((env.ALLOW_LOCALHOST ?? "true") === "true") {
      allow.push("http://localhost:5173", "http://localhost:4173");
    }
    const handler = cors({
      origin: (origin) => (allow.includes(origin) ? origin : null),
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-demo-user-id", "x-demo-role"],
      exposeHeaders: ["Content-Type"],
      maxAge: 86_400,
      credentials: true,
    });
    return handler(c, next);
  };
}
