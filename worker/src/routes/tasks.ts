import { Hono } from "hono";
import type { HonoEnv } from "../types/env";
import { ok, okList, fail, toCamel } from "../lib/response";
import { getServiceClient, publicDbError } from "../lib/supabase";
import { parsePagination, q } from "../lib/query";
import { hasRole } from "../lib/auth";

const app = new Hono<HonoEnv>();

const VALID_STATUSES = ["Planned", "In Progress", "Completed", "Issue", "Cancelled"] as const;
type TaskStatus = (typeof VALID_STATUSES)[number];

const TASK_SELECT = `
  id, legacy_id, task_date, start_point, end_point,
  planned_start_at, planned_end_at, actual_start_at, actual_end_at,
  planned_hours, actual_hours, status, data_req, hdd_state, notes,
  created_at, updated_at,
  project:projects!daily_tasks_project_id_fkey(id,legacy_id,code,name,status,client),
  vehicle:vehicles!daily_tasks_vehicle_id_fkey(id,legacy_id,plate,brand,model),
  driver:users!daily_tasks_driver_id_fkey(id,legacy_id,name,role,city),
  engineer:users!daily_tasks_engineer_id_fkey(id,legacy_id,name,role,city),
  route:routes!daily_tasks_route_id_fkey(id,legacy_id,name,distance_mi,type)
`;

/** GET /api/tasks?date=&project_id=&driver_id=&engineer_id=&status= */
app.get("/", async (c) => {
  const { limit, offset } = parsePagination(c);
  const date = q(c, "date");
  const projectId = q(c, "project_id");
  const driverId = q(c, "driver_id");
  const engineerId = q(c, "engineer_id");
  const status = q(c, "status");

  const supa = getServiceClient(c.env);
  let query = supa
    .from("daily_tasks")
    .select(TASK_SELECT)
    .order("task_date", { ascending: false })
    .order("legacy_id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (date) query = query.eq("task_date", date);
  if (status) query = query.eq("status", status);

  // Resolve legacy_id → uuid for each foreign-key filter
  if (projectId) {
    const uuid = await resolve(supa, "projects", projectId, "PRJ-");
    if (!uuid) return okList(c, [], limit, offset);
    query = query.eq("project_id", uuid);
  }
  if (driverId) {
    const uuid = await resolve(supa, "users", driverId, "U");
    if (!uuid) return okList(c, [], limit, offset);
    query = query.eq("driver_id", uuid);
  }
  if (engineerId) {
    const uuid = await resolve(supa, "users", engineerId, "U");
    if (!uuid) return okList(c, [], limit, offset);
    query = query.eq("engineer_id", uuid);
  }

  const { data, error } = await query;
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

/** GET /api/tasks/:id */
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const supa = getServiceClient(c.env);
  const column = id.startsWith("DT-") ? "legacy_id" : "id";
  const { data, error } = await supa.from("daily_tasks").select(TASK_SELECT).eq(column, id).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "Task not found", 404);
  return ok(c, toCamel(data));
});

/**
 * PATCH /api/tasks/:id/status
 * Body: { "status": "In Progress" }
 *
 * Side-effects:
 *   - "In Progress"  → stamps actual_start_at if null
 *   - "Completed"    → stamps actual_end_at if null + computes actual_hours
 */
app.patch("/:id/status", async (c) => {
  // Driver / Engineer can change their own task's status; PM/PMO/Admin can change any.
  if (!hasRole(c, "Admin", "PMO", "Project Manager", "Test Engineer", "Driver")) {
    return fail(c, "FORBIDDEN", "Not allowed", 403);
  }
  const id = c.req.param("id");
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return fail(c, "BAD_REQUEST", "Invalid JSON body"); }

  const status = body.status as TaskStatus | undefined;
  if (!status || !VALID_STATUSES.includes(status)) {
    return fail(c, "VALIDATION_FAILED", `status must be one of: ${VALID_STATUSES.join(", ")}`, 422);
  }

  const supa = getServiceClient(c.env);
  const column = id.startsWith("DT-") ? "legacy_id" : "id";

  // Read existing to compute side-effects safely
  const { data: existing } = await supa
    .from("daily_tasks").select("id, status, actual_start_at, actual_end_at, planned_hours")
    .eq(column, id).maybeSingle();
  if (!existing) return fail(c, "NOT_FOUND", "Task not found", 404);

  const patch: Record<string, unknown> = { status };
  const now = new Date().toISOString();
  if (status === "In Progress" && !(existing as { actual_start_at: string | null }).actual_start_at) {
    patch.actual_start_at = now;
  }
  if (status === "Completed") {
    if (!(existing as { actual_end_at: string | null }).actual_end_at) {
      patch.actual_end_at = now;
    }
    // crude actual_hours estimate if we have both timestamps now
    const startISO = (existing as { actual_start_at: string | null }).actual_start_at;
    if (startISO) {
      const hours = (Date.parse(now) - Date.parse(startISO)) / 3_600_000;
      if (hours > 0 && hours < 24) patch.actual_hours = Number(hours.toFixed(1));
    }
  }

  const { data, error } = await supa
    .from("daily_tasks")
    .update(patch as never)
    .eq(column, id)
    .select(TASK_SELECT)
    .maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return ok(c, toCamel(data));
});

async function resolve(
  supa: ReturnType<typeof getServiceClient>,
  table: string,
  id: string,
  prefix: string,
): Promise<string | null> {
  if (id.startsWith(prefix)) {
    const { data } = await supa.from(table).select("id").eq("legacy_id", id).maybeSingle();
    return data ? (data as { id: string }).id : null;
  }
  return id;
}

export default app;
