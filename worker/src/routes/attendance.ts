import { Hono } from "hono";
import type { HonoEnv } from "../types/env";
import { ok, okList, fail, toCamel, toSnake } from "../lib/response";
import { getServiceClient, publicDbError } from "../lib/supabase";
import { parsePagination, q } from "../lib/query";
import { isAdminOrPmo } from "../lib/auth";

const app = new Hono<HonoEnv>();

const VALID_EVENT_TYPES = ["Clock In", "Clock Out", "Arrived Test Area", "Break Start", "Break End"];

const ATT_SELECT = `
  id, legacy_id, event_type, status, event_at, location, lat, lng,
  has_photo, photo_ref, manual_correction, correction_reason,
  corrected_at, notes, created_at,
  user:users!attendance_records_user_id_fkey(id,legacy_id,name,role),
  project:projects!attendance_records_project_id_fkey(id,legacy_id,code,name),
  task:daily_tasks!attendance_records_task_id_fkey(id,legacy_id,task_date,status),
  vehicle:vehicles!attendance_records_vehicle_id_fkey(id,legacy_id,plate),
  corrector:users!attendance_records_corrected_by_fkey(id,legacy_id,name)
`;

/** GET /api/attendance?date=&project_id=&user_id= */
app.get("/", async (c) => {
  const { limit, offset } = parsePagination(c);
  const date = q(c, "date");
  const projectId = q(c, "project_id");
  const userId = q(c, "user_id");
  const status = q(c, "status");

  const supa = getServiceClient(c.env);
  let query = supa
    .from("attendance_records")
    .select(ATT_SELECT)
    .order("event_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (date) {
    // event_at is timestamptz; bracket the whole day
    query = query
      .gte("event_at", `${date}T00:00:00Z`)
      .lt("event_at", `${date}T23:59:59Z`);
  }
  if (status) query = query.eq("status", status);
  if (projectId) {
    if (projectId.startsWith("PRJ-")) {
      const { data: p } = await supa.from("projects").select("id").eq("legacy_id", projectId).maybeSingle();
      if (!p) return okList(c, [], limit, offset);
      query = query.eq("project_id", (p as { id: string }).id);
    } else query = query.eq("project_id", projectId);
  }
  if (userId) {
    if (userId.startsWith("U")) {
      const { data: u } = await supa.from("users").select("id").eq("legacy_id", userId).maybeSingle();
      if (!u) return okList(c, [], limit, offset);
      query = query.eq("user_id", (u as { id: string }).id);
    } else query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

/**
 * POST /api/attendance
 * Body: { eventType, location?, lat?, lng?, projectId?, taskId?, vehicleId?, hasPhoto?, photoRef? }
 * user_id always = current actor; cannot impersonate.
 */
app.post("/", async (c) => {
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return fail(c, "BAD_REQUEST", "Invalid JSON body"); }
  const eventType = body.eventType as string | undefined;
  if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
    return fail(c, "VALIDATION_FAILED", `eventType must be one of: ${VALID_EVENT_TYPES.join(", ")}`, 422);
  }

  const supa = getServiceClient(c.env);
  const userLegacy = c.get("userLegacyId");
  const { data: u } = await supa.from("users").select("id").eq("legacy_id", userLegacy).maybeSingle();
  if (!u) return fail(c, "NOT_FOUND", "Authenticated user not found in DB", 404);
  const userUuid = (u as { id: string }).id;

  // Resolve optional FKs
  let projectUuid: string | null = null;
  if (body.projectId) projectUuid = await resolve(supa, "projects", String(body.projectId), "PRJ-");
  let taskUuid: string | null = null;
  if (body.taskId) taskUuid = await resolve(supa, "daily_tasks", String(body.taskId), "DT-");
  let vehicleUuid: string | null = null;
  if (body.vehicleId) vehicleUuid = await resolve(supa, "vehicles", String(body.vehicleId), "V-");

  const row = toSnake<Record<string, unknown>>({
    userId: userUuid,
    projectId: projectUuid,
    taskId: taskUuid,
    vehicleId: vehicleUuid,
    eventType,
    status: body.status ?? "Normal",
    eventAt: body.eventAt ?? new Date().toISOString(),
    location: body.location ?? null,
    lat: body.lat ?? null,
    lng: body.lng ?? null,
    hasPhoto: body.hasPhoto ?? false,
    photoRef: body.photoRef ?? null,
  });

  const { data, error } = await supa.from("attendance_records")
    .insert(row as never).select(ATT_SELECT).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return ok(c, toCamel(data));
});

/**
 * PATCH /api/attendance/:id/correction
 * Admin/PMO only. Body: { eventAt?, location?, correctionReason, notes? }
 */
app.patch("/:id/correction", async (c) => {
  if (!isAdminOrPmo(c)) return fail(c, "FORBIDDEN", "Only Admin/PMO can correct attendance", 403);

  const id = c.req.param("id");
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return fail(c, "BAD_REQUEST", "Invalid JSON body"); }
  if (!body.correctionReason) return fail(c, "VALIDATION_FAILED", "correctionReason required", 422);

  const supa = getServiceClient(c.env);
  const { data: corrector } = await supa.from("users")
    .select("id").eq("legacy_id", c.get("userLegacyId")).maybeSingle();

  const patch = toSnake<Record<string, unknown>>({
    eventAt: body.eventAt,
    location: body.location,
    notes: body.notes,
    status: "Manual Correction",
    manualCorrection: true,
    correctionReason: body.correctionReason,
    correctedAt: new Date().toISOString(),
    correctedBy: corrector ? (corrector as { id: string }).id : null,
  });
  // strip undefined
  for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k];

  const column = id.startsWith("AT-") ? "legacy_id" : "id";
  const { data, error } = await supa.from("attendance_records")
    .update(patch as never).eq(column, id).select(ATT_SELECT).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "Attendance record not found", 404);
  return ok(c, toCamel(data));
});

async function resolve(
  supa: ReturnType<typeof getServiceClient>, table: string, id: string, prefix: string,
): Promise<string | null> {
  if (id.startsWith(prefix)) {
    const { data } = await supa.from(table).select("id").eq("legacy_id", id).maybeSingle();
    return data ? (data as { id: string }).id : null;
  }
  return id;
}

export default app;
