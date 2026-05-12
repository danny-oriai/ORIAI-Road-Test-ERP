import { Hono } from "hono";
import type { HonoEnv } from "../types/env";
import { ok, okList, fail, toCamel, toSnake } from "../lib/response";
import { getServiceClient, publicDbError } from "../lib/supabase";
import { parsePagination, q } from "../lib/query";

const app = new Hono<HonoEnv>();

const FILE_SELECT = `
  id, legacy_id, category, name, size_bytes, mime_type,
  storage_provider, lark_drive_ref, storage_path, external_url,
  version, permission, related_id, uploaded_at, created_at,
  project:projects!files_project_id_fkey(id,legacy_id,code,name),
  uploader:users!files_uploaded_by_fkey(id,legacy_id,name,role)
`;

/** GET /api/files?project_id=&category=&search= */
app.get("/", async (c) => {
  const { limit, offset } = parsePagination(c);
  const projectId = q(c, "project_id");
  const category = q(c, "category");
  const search = q(c, "search");

  const supa = getServiceClient(c.env);
  let query = supa
    .from("files")
    .select(FILE_SELECT)
    .order("uploaded_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);
  if (projectId) {
    if (projectId.startsWith("PRJ-")) {
      const { data: p } = await supa.from("projects").select("id").eq("legacy_id", projectId).maybeSingle();
      if (!p) return okList(c, [], limit, offset);
      query = query.eq("project_id", (p as { id: string }).id);
    } else query = query.eq("project_id", projectId);
  }
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

/**
 * POST /api/files — index a file already in Lark Drive (or wherever).
 * We do not accept the binary itself in this step; the caller passes
 * a reference (`larkDriveRef` / `storagePath` / `externalUrl`).
 */
app.post("/", async (c) => {
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return fail(c, "BAD_REQUEST", "Invalid JSON body"); }
  for (const f of ["name", "category"]) {
    if (!body[f]) return fail(c, "VALIDATION_FAILED", `${f} required`, 422);
  }
  if (!body.larkDriveRef && !body.storagePath && !body.externalUrl) {
    return fail(c, "VALIDATION_FAILED",
      "One of larkDriveRef / storagePath / externalUrl required", 422);
  }

  const supa = getServiceClient(c.env);
  const { data: u } = await supa.from("users").select("id").eq("legacy_id", c.get("userLegacyId")).maybeSingle();
  if (!u) return fail(c, "NOT_FOUND", "Authenticated user not found", 404);

  const row = toSnake<Record<string, unknown>>({
    name: body.name,
    category: body.category,
    sizeBytes: body.sizeBytes ?? null,
    mimeType: body.mimeType ?? null,
    storageProvider: body.storageProvider ?? "lark_drive",
    larkDriveRef: body.larkDriveRef ?? null,
    storagePath: body.storagePath ?? null,
    externalUrl: body.externalUrl ?? null,
    version: body.version ?? "v1.0",
    permission: body.permission ?? "Project",
    relatedId: body.relatedId ?? null,
    projectId: body.projectId ? await resolveProject(supa, String(body.projectId)) : null,
    uploadedBy: (u as { id: string }).id,
    uploadedAt: new Date().toISOString(),
  });

  const { data, error } = await supa.from("files").insert(row as never).select(FILE_SELECT).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return ok(c, toCamel(data));
});

async function resolveProject(
  supa: ReturnType<typeof getServiceClient>, id: string,
): Promise<string | null> {
  if (id.startsWith("PRJ-")) {
    const { data } = await supa.from("projects").select("id").eq("legacy_id", id).maybeSingle();
    return data ? (data as { id: string }).id : null;
  }
  return id;
}

export default app;
