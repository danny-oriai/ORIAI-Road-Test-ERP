import { Hono } from "hono";
import type { HonoEnv } from "../types/env";
import { ok, okList, fail, toCamel, toSnake } from "../lib/response";
import { getServiceClient, publicDbError } from "../lib/supabase";
import { parsePagination, q } from "../lib/query";
import { isAdminOrPmo, hasRole } from "../lib/auth";

const PLATE_SELECT = `
  id, legacy_id, number, type, valid_from, valid_to, status,
  document_ref, notes, created_at, updated_at,
  current_project:projects!plates_current_project_id_fkey(id,legacy_id,code,name),
  current_vehicle:vehicles!plates_current_vehicle_id_fkey(id,legacy_id,plate),
  responsible:users!plates_responsible_user_id_fkey(id,legacy_id,name,role)
`;

const ALLOC_SELECT = `
  id, legacy_id, start_date, end_date, conflict, notes, created_at,
  plate:plates!plate_allocations_plate_id_fkey(id,legacy_id,number,type,valid_from,valid_to),
  project:projects!plate_allocations_project_id_fkey(id,legacy_id,code,name,status),
  vehicle:vehicles!plate_allocations_vehicle_id_fkey(id,legacy_id,plate),
  responsible:users!plate_allocations_responsible_user_id_fkey(id,legacy_id,name)
`;

/* ---------- Plates (separate router) ---------- */
export const platesRouter = new Hono<HonoEnv>();

platesRouter.get("/", async (c) => {
  const { limit, offset } = parsePagination(c);
  const status = q(c, "status");
  const type = q(c, "type");
  const search = q(c, "search");

  const supa = getServiceClient(c.env);
  let query = supa
    .from("plates")
    .select(PLATE_SELECT)
    .order("legacy_id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);
  if (search) query = query.or(`number.ilike.%${search}%,notes.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

platesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const supa = getServiceClient(c.env);
  const column = id.startsWith("TP-") ? "legacy_id" : "id";
  const { data, error } = await supa.from("plates").select(PLATE_SELECT).eq(column, id).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "Plate not found", 404);
  return ok(c, toCamel(data));
});

/* ---------- Plate allocations (separate router) ---------- */
export const allocationsRouter = new Hono<HonoEnv>();

allocationsRouter.get("/", async (c) => {
  const { limit, offset } = parsePagination(c);
  const supa = getServiceClient(c.env);
  const { data, error } = await supa
    .from("plate_allocations")
    .select(ALLOC_SELECT)
    .order("start_date", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

/**
 * POST /api/plate-allocations
 * Body camelCase: { plateId, projectId, vehicleId, responsibleUserId, startDate, endDate, notes }
 * IDs can be legacy or uuid. Conflict trigger will set `conflict` automatically.
 */
allocationsRouter.post("/", async (c) => {
  if (!hasRole(c, "Admin", "PMO", "Project Manager")) {
    return fail(c, "FORBIDDEN", "Only Admin/PMO/PM can create allocations", 403);
  }
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return fail(c, "BAD_REQUEST", "Invalid JSON body"); }
  const required = ["plateId", "projectId", "vehicleId", "responsibleUserId", "startDate", "endDate"];
  for (const f of required) if (!body[f]) return fail(c, "VALIDATION_FAILED", `${f} required`, 422);

  const supa = getServiceClient(c.env);
  const resolved = await Promise.all([
    resolveUuid(supa, "plates", String(body.plateId), "TP-"),
    resolveUuid(supa, "projects", String(body.projectId), "PRJ-"),
    resolveUuid(supa, "vehicles", String(body.vehicleId), "V-"),
    resolveUuid(supa, "users", String(body.responsibleUserId), "U"),
  ]);
  for (const r of resolved) {
    if (!r) return fail(c, "NOT_FOUND", "Referenced record not found", 404);
  }
  const [plateUuid, projectUuid, vehicleUuid, userUuid] = resolved;

  const row = toSnake<Record<string, unknown>>({
    plateId: plateUuid,
    projectId: projectUuid,
    vehicleId: vehicleUuid,
    responsibleUserId: userUuid,
    startDate: body.startDate,
    endDate: body.endDate,
    notes: body.notes ?? null,
  });

  const { data, error } = await supa
    .from("plate_allocations").insert(row as never).select(ALLOC_SELECT).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return ok(c, toCamel(data));
});

/**
 * PATCH /api/plate-allocations/:id
 * Body: any subset of { startDate, endDate, notes }
 * Returns the updated row (conflict will be re-computed by trigger).
 */
allocationsRouter.patch("/:id", async (c) => {
  if (!isAdminOrPmo(c)) return fail(c, "FORBIDDEN", "Only Admin/PMO can edit", 403);

  const id = c.req.param("id");
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return fail(c, "BAD_REQUEST", "Invalid JSON body"); }

  const allowed = ["startDate", "endDate", "notes"];
  const patch: Record<string, unknown> = {};
  for (const f of allowed) if (body[f] !== undefined) patch[f] = body[f];
  if (Object.keys(patch).length === 0) return fail(c, "VALIDATION_FAILED", "No editable fields", 422);

  const supa = getServiceClient(c.env);
  const column = id.startsWith("PA-") ? "legacy_id" : "id";
  const { data, error } = await supa
    .from("plate_allocations")
    .update(toSnake(patch) as never)
    .eq(column, id)
    .select(ALLOC_SELECT)
    .maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "Allocation not found", 404);
  return ok(c, toCamel(data));
});

/* ---------- Plate conflicts (separate router) ---------- */
export const conflictsRouter = new Hono<HonoEnv>();

/**
 * GET /api/plate-conflicts
 * Returns all allocation rows where conflict = true, with enough
 * context for the conflict-resolution drawer in the UI.
 */
conflictsRouter.get("/", async (c) => {
  const { limit, offset } = parsePagination(c);
  const supa = getServiceClient(c.env);
  const { data, error } = await supa
    .from("plate_allocations")
    .select(ALLOC_SELECT)
    .eq("conflict", true)
    .order("start_date", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

/* ---------- helpers ---------- */
async function resolveUuid(
  supa: ReturnType<typeof getServiceClient>,
  table: string,
  id: string,
  legacyPrefix: string,
): Promise<string | null> {
  if (id.startsWith(legacyPrefix)) {
    const { data } = await supa.from(table).select("id").eq("legacy_id", id).maybeSingle();
    return data ? (data as { id: string }).id : null;
  }
  return id; // assume uuid
}
