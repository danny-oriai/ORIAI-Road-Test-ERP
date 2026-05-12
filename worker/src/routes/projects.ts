import { Hono } from "hono";
import type { HonoEnv } from "../types/env";
import { ok, okList, fail, toCamel } from "../lib/response";
import { getServiceClient, publicDbError } from "../lib/supabase";
import { parsePagination, q } from "../lib/query";

const app = new Hono<HonoEnv>();

/* Embedded shape for FK joins via PostgREST.
 * We expose minimal user info; full user record is not embedded
 * (avoid leaking email if not needed). */
const USER_EMBED = "id,legacy_id,name,role,city";
const PROJECT_SELECT = `
  id, legacy_id, code, name, client, type, region,
  start_date, end_date, status, priority,
  vehicles_needed, staff_needed, plate_needed,
  data_req, progress, notes, created_at, updated_at,
  manager:users!projects_manager_id_fkey(${USER_EMBED}),
  pmo_owner:users!projects_pmo_owner_id_fkey(${USER_EMBED})
`;

/**
 * GET /api/projects?status=&priority=&region=&search=&limit=&offset=
 */
app.get("/", async (c) => {
  const { limit, offset } = parsePagination(c);
  const status = q(c, "status");
  const priority = q(c, "priority");
  const region = q(c, "region");
  const search = q(c, "search");

  const supa = getServiceClient(c.env);
  let query = supa
    .from("projects")
    .select(PROJECT_SELECT)
    .order("start_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (region) query = query.ilike("region", `%${region}%`);
  if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,client.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

/**
 * GET /api/projects/:id  (id can be uuid or legacy_id)
 */
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const supa = getServiceClient(c.env);
  const column = id.startsWith("PRJ-") ? "legacy_id" : "id";

  const { data, error } = await supa
    .from("projects")
    .select(PROJECT_SELECT)
    .eq(column, id)
    .maybeSingle();

  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "Project not found", 404);
  return ok(c, toCamel(data));
});

/**
 * GET /api/projects/:id/overview
 *
 * Returns the project plus aggregates the dashboard cards need:
 *   - vehicleCount        (vehicles where current_project_id = this)
 *   - memberCount         (project_members rows, end_date null or future)
 *   - openIssueCount      (issues with status Open / In Progress)
 *   - expenseTotal        (sum of approved + paid amounts, GBP only)
 */
app.get("/:id/overview", async (c) => {
  const id = c.req.param("id");
  const supa = getServiceClient(c.env);
  const column = id.startsWith("PRJ-") ? "legacy_id" : "id";

  const { data: project, error: projectErr } = await supa
    .from("projects")
    .select(PROJECT_SELECT)
    .eq(column, id)
    .maybeSingle();

  if (projectErr) return fail(c, "DATABASE_ERROR", publicDbError(projectErr), 500);
  if (!project) return fail(c, "NOT_FOUND", "Project not found", 404);

  // project.id is the uuid — use it for the aggregate queries
  const projectId = (project as { id: string }).id;

  // Run aggregates in parallel; Workers' fetch can do that natively.
  const [
    { count: vehicleCount },
    { count: memberCount },
    { count: openIssueCount },
    { data: expenses },
  ] = await Promise.all([
    supa.from("vehicles").select("id", { count: "exact", head: true }).eq("current_project_id", projectId),
    supa.from("project_members").select("id", { count: "exact", head: true })
      .eq("project_id", projectId).or("end_date.is.null,end_date.gte." + new Date().toISOString().slice(0, 10)),
    supa.from("issues").select("id", { count: "exact", head: true })
      .eq("project_id", projectId).in("status", ["Open", "In Progress"]),
    supa.from("expenses").select("amount,currency,status").eq("project_id", projectId),
  ]);

  // Compute expense total locally — PostgREST doesn't do SUM directly without RPC.
  // We only count GBP for the headline figure; multi-currency stays as totals.
  let expenseTotalGbp = 0;
  for (const r of (expenses ?? []) as { amount: number; currency: string; status: string }[]) {
    if (r.currency !== "GBP") continue;
    if (r.status === "Approved" || r.status === "Paid") expenseTotalGbp += Number(r.amount) || 0;
  }

  return ok(c, {
    project: toCamel(project),
    aggregates: {
      vehicleCount: vehicleCount ?? 0,
      memberCount: memberCount ?? 0,
      openIssueCount: openIssueCount ?? 0,
      expenseTotalGbp,
    },
  });
});

export default app;
