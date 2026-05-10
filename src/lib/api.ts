/* ============================================================
 * Data access layer.
 *
 * Pages and components import data from this file ONLY.
 * Today: returns mock data synchronously (wrapped as Promise
 * so the call site is already async-shaped).
 * Step 5+: replace each function body with `fetch(API_BASE + ...)`
 *          calls against Cloudflare Workers — page code does not
 *          need to change.
 *
 * Env contract (later):
 *   VITE_API_BASE_URL = https://road-test-erp-api.<sub>.workers.dev
 *   The Worker will hold the Supabase service role key and Lark
 *   App Secret. The browser must NEVER see those.
 * ========================================================== */

import { USERS } from "../mock/users";
import { PROJECTS } from "../mock/projects";
import { VEHICLES } from "../mock/vehicles";
import { PLATES, PLATE_ALLOCATIONS } from "../mock/plates";
import { ROUTES, POIS } from "../mock/routes";
import { DAILY_TASKS, TODAY } from "../mock/tasks";
import { ATTENDANCE } from "../mock/attendance";
import { VEHICLE_CHECKS } from "../mock/checks";
import { ISSUES } from "../mock/issues";
import { EXPENSES } from "../mock/expenses";
import { FILES } from "../mock/files";

// Re-export TODAY so the rest of the app has one source of truth.
export { TODAY };

const ok = <T>(data: T): Promise<T> => Promise.resolve(data);

export const api = {
  users:           () => ok(USERS),
  projects:        () => ok(PROJECTS),
  vehicles:        () => ok(VEHICLES),
  plates:          () => ok(PLATES),
  plateAllocations:() => ok(PLATE_ALLOCATIONS),
  routes:          () => ok(ROUTES),
  pois:            () => ok(POIS),
  dailyTasks:      () => ok(DAILY_TASKS),
  attendance:      () => ok(ATTENDANCE),
  vehicleChecks:   () => ok(VEHICLE_CHECKS),
  issues:          () => ok(ISSUES),
  expenses:        () => ok(EXPENSES),
  files:           () => ok(FILES),
};

/* Synchronous accessors — used by render-time code that does not
 * want to deal with async/Suspense in the prototype phase.
 * These will be replaced with hooks (useProjects, useVehicles, ...)
 * backed by SWR or React Query in Step 5. */
export const sync = {
  users:           () => USERS,
  projects:        () => PROJECTS,
  vehicles:        () => VEHICLES,
  plates:          () => PLATES,
  plateAllocations:() => PLATE_ALLOCATIONS,
  routes:          () => ROUTES,
  pois:            () => POIS,
  dailyTasks:      () => DAILY_TASKS,
  attendance:      () => ATTENDANCE,
  vehicleChecks:   () => VEHICLE_CHECKS,
  issues:          () => ISSUES,
  expenses:        () => EXPENSES,
  files:           () => FILES,
};
