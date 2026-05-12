import { Hono } from "hono";
import type { HonoEnv } from "../types/env";
import { ok, okList, fail, toCamel, toSnake } from "../lib/response";
import { getServiceClient, publicDbError } from "../lib/supabase";
import { parsePagination, q } from "../lib/query";

const app = new Hono<HonoEnv>();

const VEHICLE_SELECT = `
  id, legacy_id, plate, vin, brand, model, year, power, ownership,
  city, status, insurance, insurance_expiry, mot_expiry, road_tax_expiry,
  mileage, equipment, notes, created_at, updated_at,
  current_project:projects!vehicles_current_project_id_fkey(id,legacy_id,code,name,status),
  current_driver:users!vehicles_current_driver_id_fkey(id,legacy_id,name,role)
`;

/** GET /api/vehicles?status=&city=&project_id=&search= */
app.get("/", async (c) => {
  const { limit, offset } = parsePagination(c);
  const status = q(c, "status");
  const city = q(c, "city");
  const projectId = q(c, "project_id");
  const search = q(c, "search");

  const supa = getServiceClient(c.env);
  let query = supa
    .from("vehicles")
    .select(VEHICLE_SELECT)
    .order("legacy_id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (city) query = query.ilike("city", `%${city}%`);
  if (projectId) {
    const col = projectId.startsWith("PRJ-") ? "legacy_id" : "id";
    // Two-step lookup: convert legacy_id → uuid first to keep the
    // foreign-key join simple. Cheap because projects is small.
    if (col === "legacy_id") {
      const { data: p } = await supa.from("projects").select("id").eq("legacy_id", projectId).maybeSingle();
      if (!p) return okList(c, [], limit, offset);
      query = query.eq("current_project_id", (p as { id: string }).id);
    } else {
      query = query.eq("current_project_id", projectId);
    }
  }
  if (search) query = query.or(`plate.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%,vin.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

/** GET /api/vehicles/:id  (uuid or legacy_id like "V-001") */
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const supa = getServiceClient(c.env);
  const column = id.startsWith("V-") ? "legacy_id" : "id";

  const { data, error } = await supa.from("vehicles").select(VEHICLE_SELECT).eq(column, id).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "Vehicle not found", 404);
  return ok(c, toCamel(data));
});

/** GET /api/vehicles/:id/checks — recent vehicle checks for this vehicle */
app.get("/:id/checks", async (c) => {
  const id = c.req.param("id");
  const supa = getServiceClient(c.env);
  const column = id.startsWith("V-") ? "legacy_id" : "id";

  // Resolve to uuid first
  const { data: v } = await supa.from("vehicles").select("id").eq(column, id).maybeSingle();
  if (!v) return fail(c, "NOT_FOUND", "Vehicle not found", 404);
  const vehicleUuid = (v as { id: string }).id;

  const { limit, offset } = parsePagination(c);
  const { data, error } = await supa
    .from("vehicle_checks")
    .select(`
      id, legacy_id, check_type, status, performed_at,
      mileage, fuel_pct, hdd_free_gb, issue_found,
      checklist_state, photos, notes, created_at,
      submitter:users!vehicle_checks_submitted_by_fkey(id,legacy_id,name,role)
    `)
    .eq("vehicle_id", vehicleUuid)
    .order("performed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

export default app;

/* ============================================================
 *  Separate router mounted at /api/vehicle-checks (top-level POST
 *  for the driver mobile check form)
 * ========================================================== */

export const vehicleChecksRouter = new Hono<HonoEnv>();

/**
 * POST /api/vehicle-checks
 * Body (camelCase, partial example):
 *   {
 *     "vehicleId": "V-001" | uuid,
 *     "checkType": "Pre-Drive",
 *     "status": "OK",
 *     "performedAt": "2026-05-07T07:30:00Z",
 *     "mileage": 38421,
 *     "fuelPct": 78,
 *     "hddFreeGb": 412,
 *     "issueFound": false,
 *     "checklistState": { "tyres": "ok", ... },
 *     "notes": "..."
 *   }
 */
vehicleChecksRouter.post("/", async (c) => {
  let body: Record<string, unknown>;
  try { body = await c.req.json(); }
  catch { return fail(c, "BAD_REQUEST", "Invalid JSON body"); }

  if (!body.vehicleId || !body.checkType || !body.status) {
    return fail(c, "VALIDATION_FAILED", "vehicleId, checkType, status are required", 422);
  }
  const supa = getServiceClient(c.env);

  // Resolve vehicle uuid if a legacy_id was passed
  const vehicleId = String(body.vehicleId);
  const vCol = vehicleId.startsWith("V-") ? "legacy_id" : "id";
  const { data: v } = await supa.from("vehicles").select("id").eq(vCol, vehicleId).maybeSingle();
  if (!v) return fail(c, "NOT_FOUND", "Vehicle not found", 404);

  // Resolve current submitter from auth context (legacy_id → uuid)
  const submitterLegacy = c.get("userLegacyId");
  const { data: u } = await supa.from("users").select("id").eq("legacy_id", submitterLegacy).maybeSingle();

  const row = toSnake<Record<string, unknown>>({
    ...body,
    vehicleId: (v as { id: string }).id,
    submittedBy: u ? (u as { id: string }).id : null,
    performedAt: body.performedAt ?? new Date().toISOString(),
  });

  const { data, error } = await supa
    .from("vehicle_checks")
    .insert(row as never)   // PostgREST validates against the table schema
    .select(`
      id, legacy_id, check_type, status, performed_at,
      mileage, fuel_pct, hdd_free_gb, issue_found,
      checklist_state, photos, notes
    `)
    .maybeSingle();

  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return ok(c, toCamel(data));
});
