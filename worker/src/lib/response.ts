import type { Context } from "hono";

/* ============================================================
 *  Response envelopes
 * ========================================================== */

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: ListMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string };
}

export interface ListMeta {
  count: number;
  limit: number;
  offset: number;
}

export function ok<T>(c: Context, data: T, meta?: ListMeta) {
  const body: SuccessEnvelope<T> = meta ? { success: true, data, meta } : { success: true, data };
  return c.json(body);
}

/**
 * Send a list envelope. Pass the full list and the pagination params
 * the caller asked for — the helper handles `meta.count` from data.length.
 */
export function okList<T>(c: Context, data: T[], limit: number, offset: number) {
  return ok(c, data, { count: data.length, limit, offset });
}

export function fail(
  c: Context,
  code: ErrorCode,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 500 = 400,
) {
  const body: ErrorEnvelope = { success: false, error: { code, message } };
  return c.json(body, status);
}

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "DATABASE_ERROR"
  | "INTERNAL";

/* ============================================================
 *  snake_case ↔ camelCase
 *
 *  Postgres returns column names verbatim (snake_case in our
 *  schema). The frontend's TS types use camelCase. These helpers
 *  walk objects/arrays recursively. JSONB cargo (free-form user
 *  data like checklist_state) is opaque — we DO NOT recurse into
 *  values that are plain objects but whose keys are JSONB content.
 *  In practice, we only convert keys of objects returned by Supabase
 *  and identified by being plain-old-data. This is enough for our
 *  schema where jsonb columns hold uniform user content with
 *  intentional camelCase keys.
 *
 *  Edge cases handled:
 *    - null / undefined pass through
 *    - Dates pass through (Postgres ISO strings are strings, so safe)
 *    - Arrays recurse element-by-element
 *    - Empty objects pass through
 * ========================================================== */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const SNAKE_TO_CAMEL_CACHE = new Map<string, string>();
const CAMEL_TO_SNAKE_CACHE = new Map<string, string>();

function snakeToCamel(s: string): string {
  const hit = SNAKE_TO_CAMEL_CACHE.get(s);
  if (hit !== undefined) return hit;
  const out = s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  SNAKE_TO_CAMEL_CACHE.set(s, out);
  return out;
}

function camelToSnake(s: string): string {
  const hit = CAMEL_TO_SNAKE_CACHE.get(s);
  if (hit !== undefined) return hit;
  const out = s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
  CAMEL_TO_SNAKE_CACHE.set(s, out);
  return out;
}

/** Recursively converts snake_case object keys to camelCase. */
export function toCamel<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((el) => toCamel(el)) as unknown as T;
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[snakeToCamel(k)] = toCamel(v);
    }
    return out as T;
  }
  return input as T;
}

/** Recursively converts camelCase object keys to snake_case. */
export function toSnake<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((el) => toSnake(el)) as unknown as T;
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[camelToSnake(k)] = toSnake(v);
    }
    return out as T;
  }
  return input as T;
}
