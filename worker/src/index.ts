import { Hono } from "hono";
import type { HonoEnv } from "./types/env";
import { buildCors } from "./lib/cors";
import { demoAuth } from "./lib/auth";
import { fail } from "./lib/response";

import healthRouter from "./routes/health";
import projectsRouter from "./routes/projects";
import vehiclesRouter, { vehicleChecksRouter } from "./routes/vehicles";
import { platesRouter, allocationsRouter, conflictsRouter } from "./routes/plates";
import routesRouter from "./routes/routes";
import poisRouter from "./routes/pois";
import tasksRouter from "./routes/tasks";
import attendanceRouter from "./routes/attendance";
import issuesRouter from "./routes/issues";
import expensesRouter from "./routes/expenses";
import filesRouter from "./routes/files";
import usersRouter from "./routes/users";

const app = new Hono<HonoEnv>();

/* ---------- Global middleware ---------- */
app.use("*", buildCors());
app.use("/api/*", demoAuth);

/* ---------- Routes ---------- */
app.route("/api/health", healthRouter);

app.route("/api/projects", projectsRouter);
app.route("/api/vehicles", vehiclesRouter);
app.route("/api/vehicle-checks", vehicleChecksRouter);

app.route("/api/plates", platesRouter);
app.route("/api/plate-allocations", allocationsRouter);
app.route("/api/plate-conflicts", conflictsRouter);

app.route("/api/routes", routesRouter);
app.route("/api/pois", poisRouter);

app.route("/api/tasks", tasksRouter);
app.route("/api/attendance", attendanceRouter);
app.route("/api/issues", issuesRouter);
app.route("/api/expenses", expensesRouter);
app.route("/api/files", filesRouter);
app.route("/api/users", usersRouter);

/* ---------- Root + 404 + error handler ---------- */
app.get("/", (c) =>
  c.json({
    success: true,
    data: {
      service: "road-test-erp-api",
      message: "RTM ERP backend. See /api/health for liveness, /api/* for resources.",
    },
  }),
);

app.notFound((c) => fail(c, "NOT_FOUND", `Route not found: ${c.req.method} ${c.req.path}`, 404));

app.onError((err, c) => {
  // Never leak stack traces or PG details to the client.
  // Log to console (Cloudflare captures these in `wrangler tail`).
  console.error("Unhandled error:", err);
  return fail(c, "INTERNAL", "Internal server error", 500);
});

export default app;
