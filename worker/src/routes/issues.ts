import { Hono } from "hono";
import type { HonoEnv } from "../types/env";
import { ok, okList, fail, toCamel, toSnake } from "../lib/response";
import { getServiceClient, publicDbError } from "../lib/supabase";
import { parsePagination, q } from "../lib/query";

const app = new Hono<HonoEnv>();

const ISSUE_SELECT = `
  id, legacy_id, title, description, type, severity, status,
  reported_at, resolved_at, attachments, resolution,
  created_at, updated_at,
  project:projects!issues_project_id_fkey(id,legacy_id,code,name,status),
  vehicle:vehicles!issues_vehicle_id_fkey(id,legacy_id,plate),
  task:daily_tasks!issues_task_id_fkey(id,legacy_id,task_date),
  reporter:users!issues_reported_by_fkey(id,legacy_id,name,role),
  owner:users!issues_owner_id_fkey(id,legacy_id,name,role)
`;

/** GET /api/issues?status=&severity=&type=&project_id=&search= */
app.get("/", async (c) => {
  const { limit, offset } = parsePagination(c);
  const status = q(c, "status");
  const severity = q(c, "severity");
  const type = q(c, "type");
  const projectId = q(c, "project_id");
  const search = q(c, "search");

  const supa = getServiceClient(c.env);
  let query = supa
    .from("issues")
    .select(ISSUE_SELECT)
    .order("reported_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (severity) query = query.eq("severity", severity);
  if (type) query = query.eq("type", type);
  if (projectId) {
    if (projectId.startsWith("PRJ-")) {
      const { data: p } = await supa.from("projects").select("id").eq("legacy_id", projectId).maybeSingle();
      if (!p) return okList(c, [], limit, offset);
      query = query.eq("project_id", (p as { id: string }).id);
    } else query = query.eq("project_id", projectId);
  }
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

/** GET /api/issues/:id */
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const supa = getServiceClient(c.env);
  const column = id.startsWith("ISS-") ? "legacy_id" : "id";
  const { data, error } = await supa.from("issues").select(ISSUE_SELECT).eq(column, id).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "Issue not found", 404);
  return ok(c, toCamel(data));
});

/** POST /api/issues — report new issue. reported_by always = current actor. */
app.post("/", async (c) => {
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return fail(c, "BAD_REQUEST", "Invalid JSON body"); }
  for (const f of ["title", "type", "severity"]) {
    if (!body[f]) return fail(c, "VALIDATION_FAILED", `${f} required`, 422);
  }

  const supa = getServiceClient(c.env);
  const { data: u } = await supa.from("users").select("id").eq("legacy_id", c.get("userLegacyId")).maybeSingle();
  if (!u) return fail(c, "NOT_FOUND", "Authenticated user not found", 404);

  const row = toSnake<Record<string, unknown>>({
    title: body.title,
    description: body.description ?? null,
    type: body.type,
    severity: body.severity,
    status: body.status ?? "Open",
    reportedBy: (u as { id: string }).id,
    reportedAt: new Date().toISOString(),
    ownerId: body.ownerId
      ? await resolve(supa, "users", String(body.ownerId), "U")
      : (u as { id: string }).id,
    projectId: body.projectId ? await resolve(supa, "projects", String(body.projectId), "PRJ-") : null,
    vehicleId: body.vehicleId ? await resolve(supa, "vehicles", String(body.vehicleId), "V-") : null,
    taskId: body.taskId ? await resolve(supa, "daily_tasks", String(body.taskId), "DT-") : null,
    attachments: body.attachments ?? [],
  });

  const { data, error } = await supa.from("issues").insert(row as never).select(ISSUE_SELECT).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return ok(c, toCamel(data));
});

/** PATCH /api/issues/:id — assign owner, change severity/status, etc. */
app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return fail(c, "BAD_REQUEST", "Invalid JSON body"); }

  const supa = getServiceClient(c.env);
  const patch: Record<string, unknown> = {};
  if (body.severity)    patch.severity = body.severity;
  if (body.status)      patch.status = body.status;
  if (body.description) patch.description = body.description;
  if (body.resolution)  patch.resolution = body.resolution;
  if (body.ownerId) {
    const ownerUuid = await resolve(supa, "users", String(body.ownerId), "U");
    if (!ownerUuid) return fail(c, "NOT_FOUND", "Owner not found", 404);
    patch.owner_id = ownerUuid;
  }
  if (Object.keys(patch).length === 0) return fail(c, "VALIDATION_FAILED", "No fields to update", 422);

  const column = id.startsWith("ISS-") ? "legacy_id" : "id";
  const { data, error } = await supa.from("issues")
    .update(patch as never).eq(column, id).select(ISSUE_SELECT).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "Issue not found", 404);
  return ok(c, toCamel(data));
});

/** PATCH /api/issues/:id/close — convenience for the "Close" button */
app.patch("/:id/close", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const supa = getServiceClient(c.env);
  const column = id.startsWith("ISS-") ? "legacy_id" : "id";
  const { data, error } = await supa.from("issues")
    .update({
      status: "Closed",
      resolution: body.resolution ?? "Closed via API",
      resolved_at: new Date().toISOString(),
    } as never)
    .eq(column, id).select(ISSUE_SELECT).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "Issue not found", 404);
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
