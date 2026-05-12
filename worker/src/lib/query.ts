import type { Context } from "hono";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Reads `limit` / `offset` from the URL search params with sensible
 * defaults and caps. Negative or non-numeric values fall back to defaults.
 */
export function parsePagination(c: Context): { limit: number; offset: number } {
  const rawLimit = c.req.query("limit");
  const rawOffset = c.req.query("offset");
  let limit = parseInt(rawLimit ?? "", 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  let offset = parseInt(rawOffset ?? "", 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  return { limit, offset };
}

/**
 * Reads a single query param, trimmed, and returns undefined if empty.
 */
export function q(c: Context, name: string): string | undefined {
  const v = c.req.query(name);
  if (v === undefined) return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? undefined : trimmed;
}
