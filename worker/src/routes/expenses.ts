import { Hono } from "hono";
import type { HonoEnv } from "../types/env";
import { ok, okList, fail, toCamel, toSnake } from "../lib/response";
import { getServiceClient, publicDbError } from "../lib/supabase";
import { parsePagination, q } from "../lib/query";
import { hasRole } from "../lib/auth";

const app = new Hono<HonoEnv>();

const VALID_STATUSES = ["Draft", "Submitted", "Approved", "Rejected", "Paid"] as const;
type ExpenseStatus = (typeof VALID_STATUSES)[number];

const EXP_SELECT = `
  id, legacy_id, category, amount, currency, expense_date,
  description, receipt_ref, status, approved_at, paid_at,
  created_at, updated_at,
  applicant:users!expenses_applicant_id_fkey(id,legacy_id,name,role),
  approver:users!expenses_approver_id_fkey(id,legacy_id,name,role),
  project:projects!expenses_project_id_fkey(id,legacy_id,code,name),
  vehicle:vehicles!expenses_vehicle_id_fkey(id,legacy_id,plate)
`;

/** GET /api/expenses?status=&category=&project_id=&user_id= */
app.get("/", async (c) => {
  const { limit, offset } = parsePagination(c);
  const status = q(c, "status");
  const category = q(c, "category");
  const projectId = q(c, "project_id");
  const userId = q(c, "user_id");

  const supa = getServiceClient(c.env);
  let query = supa
    .from("expenses")
    .select(EXP_SELECT)
    .order("expense_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);
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
      query = query.eq("applicant_id", (u as { id: string }).id);
    } else query = query.eq("applicant_id", userId);
  }

  const { data, error } = await query;
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const supa = getServiceClient(c.env);
  const column = id.startsWith("EXP-") ? "legacy_id" : "id";
  const { data, error } = await supa.from("expenses").select(EXP_SELECT).eq(column, id).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "Expense not found", 404);
  return ok(c, toCamel(data));
});

/** POST /api/expenses — applicant always = current actor */
app.post("/", async (c) => {
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return fail(c, "BAD_REQUEST", "Invalid JSON body"); }
  for (const f of ["category", "amount", "expenseDate"]) {
    if (body[f] === undefined) return fail(c, "VALIDATION_FAILED", `${f} required`, 422);
  }
  if (typeof body.amount !== "number" || body.amount < 0) {
    return fail(c, "VALIDATION_FAILED", "amount must be a non-negative number", 422);
  }

  const supa = getServiceClient(c.env);
  const { data: u } = await supa.from("users").select("id").eq("legacy_id", c.get("userLegacyId")).maybeSingle();
  if (!u) return fail(c, "NOT_FOUND", "Authenticated user not found", 404);

  const row = toSnake<Record<string, unknown>>({
    applicantId: (u as { id: string }).id,
    projectId: body.projectId ? await resolve(supa, "projects", String(body.projectId), "PRJ-") : null,
    vehicleId: body.vehicleId ? await resolve(supa, "vehicles", String(body.vehicleId), "V-") : null,
    category: body.category,
    amount: body.amount,
    currency: body.currency ?? "GBP",
    expenseDate: body.expenseDate,
    description: body.description ?? null,
    receiptRef: body.receiptRef ?? null,
    status: body.status ?? "Submitted",
  });

  const { data, error } = await supa.from("expenses").insert(row as never).select(EXP_SELECT).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return ok(c, toCamel(data));
});

/**
 * PATCH /api/expenses/:id/status
 * Body: { status: "Approved" | "Rejected" | "Paid" }
 * Permission rules:
 *   - Approve/Reject: PM, PMO, Admin
 *   - Mark Paid:      Finance, PMO, Admin
 */
app.patch("/:id/status", async (c) => {
  const id = c.req.param("id");
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return fail(c, "BAD_REQUEST", "Invalid JSON body"); }
  const status = body.status as ExpenseStatus | undefined;
  if (!status || !VALID_STATUSES.includes(status)) {
    return fail(c, "VALIDATION_FAILED", `status must be one of: ${VALID_STATUSES.join(", ")}`, 422);
  }
  if ((status === "Approved" || status === "Rejected") && !hasRole(c, "Admin", "PMO", "Project Manager")) {
    return fail(c, "FORBIDDEN", "Only PM/PMO/Admin can approve or reject", 403);
  }
  if (status === "Paid" && !hasRole(c, "Admin", "PMO", "Finance")) {
    return fail(c, "FORBIDDEN", "Only Finance/PMO/Admin can mark paid", 403);
  }

  const supa = getServiceClient(c.env);
  const { data: actor } = await supa.from("users").select("id").eq("legacy_id", c.get("userLegacyId")).maybeSingle();
  const patch: Record<string, unknown> = { status };
  if (status === "Approved" || status === "Rejected") {
    patch.approver_id = actor ? (actor as { id: string }).id : null;
    patch.approved_at = new Date().toISOString();
  }
  if (status === "Paid") {
    patch.paid_at = new Date().toISOString();
  }

  const column = id.startsWith("EXP-") ? "legacy_id" : "id";
  const { data, error } = await supa.from("expenses")
    .update(patch as never).eq(column, id).select(EXP_SELECT).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "Expense not found", 404);
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
