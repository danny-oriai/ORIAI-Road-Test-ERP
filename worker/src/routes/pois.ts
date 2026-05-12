import { Hono } from "hono";
import type { HonoEnv } from "../types/env";
import { ok, okList, fail, toCamel } from "../lib/response";
import { getServiceClient, publicDbError } from "../lib/supabase";
import { parsePagination, q } from "../lib/query";

const app = new Hono<HonoEnv>();

const POI_SELECT = `
  id, legacy_id, name, type, address, city, lat, lng, photo_ref, notes, created_at,
  route:routes!pois_route_id_fkey(id,legacy_id,name),
  project:projects!pois_project_id_fkey(id,legacy_id,code,name)
`;

app.get("/", async (c) => {
  const { limit, offset } = parsePagination(c);
  const projectId = q(c, "project_id");
  const city = q(c, "city");
  const type = q(c, "type");
  const search = q(c, "search");

  const supa = getServiceClient(c.env);
  let query = supa
    .from("pois")
    .select(POI_SELECT)
    .order("legacy_id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (projectId) {
    if (projectId.startsWith("PRJ-")) {
      const { data: p } = await supa.from("projects").select("id").eq("legacy_id", projectId).maybeSingle();
      if (!p) return okList(c, [], limit, offset);
      query = query.eq("project_id", (p as { id: string }).id);
    } else {
      query = query.eq("project_id", projectId);
    }
  }
  if (city) query = query.ilike("city", `%${city}%`);
  if (type) query = query.eq("type", type);
  if (search) query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  return okList(c, toCamel<unknown[]>(data ?? []), limit, offset);
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const supa = getServiceClient(c.env);
  const column = id.startsWith("POI-") ? "legacy_id" : "id";
  const { data, error } = await supa.from("pois").select(POI_SELECT).eq(column, id).maybeSingle();
  if (error) return fail(c, "DATABASE_ERROR", publicDbError(error), 500);
  if (!data) return fail(c, "NOT_FOUND", "POI not found", 404);
  return ok(c, toCamel(data));
});

export default app;
