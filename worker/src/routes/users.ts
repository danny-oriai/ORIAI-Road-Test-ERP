import { Hono } from "hono";
import type { HonoEnv } from "../types/env";
import { ok, okList, fail, toCamel, toSnake } from "../lib/response";
import { getServiceClient, publicDbError } from "../lib/supabase";
import { parsePagination, q } from "../lib/query";
import { isAdminOrPmo } from "../lib/auth";

const app = new Hono<HonoEnv>();

const USER_SELECT = `
  id, legacy_id, name, email, phone, role, city,
  account_status, licence_valid, licence_expiry,
  training_complete, insurance_eligible, last_login_at,
  lark_open_id, created_at, updated_at
`;

/** GET /api/users?role=&status=&search= */
app.get("/", async (c) => {
  const { limit, offset } = parsePagination(c);
  const role = q(c, "role");
  const status = q(c, "status");
  const search = q(c, "search");

  const supa = getServiceClient(c.env);
  let query = supa
    .from("users")
    .select(USER_SELECT)
    .order("legacy_id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (role) query = query.eq("role", role);
  if (status) query = query.eq("account_status", status);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

/** GET /api/users/:id */
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const supa = getServiceClient(c.env);
  const column = id.startsWith("U") ? "legacy_id" : "id";
  const { data, error } = await supa.from("users").select(USER_SELECT).eq(column, id).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "User not found", 404);
  return ok(c, toCamel(data));
});

/**
 * PATCH /api/users/:id
 * Body: { role?, accountStatus?, city?, phone? }
 *   - role / accountStatus changes are Admin/PMO only
 *   - city / phone can be edited by the user themselves OR Admin/PMO
 */
app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return fail(c, "BAD_REQUEST", "Invalid JSON body"); }

  const supa = getServiceClient(c.env);
  const column = id.startsWith("U") ? "legacy_id" : "id";

  // Check if the patch contains "privileged" fields
  const wantsPrivilegedEdit = body.role !== undefined || body.accountStatus !== undefined;
  if (wantsPrivilegedEdit && !isAdminOrPmo(c)) {
    return fail(c, "FORBIDDEN", "Only Admin/PMO can change role or account status", 403);
  }

  // For self-edit of city/phone: ensure the target row is the actor themselves
  if (!isAdminOrPmo(c)) {
    if (c.get("userLegacyId") !== id) {
      return fail(c, "FORBIDDEN", "Cannot edit another user's profile", 403);
    }
  }

  const allowed: Record<string, unknown> = {};
  if (body.role !== undefined) allowed.role = body.role;
  if (body.accountStatus !== undefined) allowed.accountStatus = body.accountStatus;
  if (body.city !== undefined) allowed.city = body.city;
  if (body.phone !== undefined) allowed.phone = body.phone;
  if (body.licenceValid !== undefined && isAdminOrPmo(c)) allowed.licenceValid = body.licenceValid;
  if (body.licenceExpiry !== undefined && isAdminOrPmo(c)) allowed.licenceExpiry = body.licenceExpiry;
  if (body.trainingComplete !== undefined && isAdminOrPmo(c)) allowed.trainingComplete = body.trainingComplete;
  if (body.insuranceEligible !== undefined && isAdminOrPmo(c)) allowed.insuranceEligible = body.insuranceEligible;

  if (Object.keys(allowed).length === 0) return fail(c, "VALIDATION_FAILED", "No editable fields", 422);

  const { data, error } = await supa.from("users")
    .update(toSnake(allowed) as never).eq(column, id).select(USER_SELECT).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "User not found", 404);
  return ok(c, toCamel(data));
});

export default app;
