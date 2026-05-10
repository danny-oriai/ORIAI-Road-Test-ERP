import type { DailyTask } from "../types";

export const TODAY = "2026-05-07"; // Pinned for reproducible demo

export const DAILY_TASKS: DailyTask[] = [
  { id: "DT-2461", date: "2026-05-07", project: "PRJ-2025-014", vehicle: "V-001", driver: "U006", engineer: "U004", route: "R-001", start: "Cambridge HQ",    end: "London Stansted", plannedHours: 6, status: "In Progress", dataReq: "Full ADAS log",   notes: "Calibration target panel in boot." },
  { id: "DT-2462", date: "2026-05-07", project: "PRJ-2025-015", vehicle: "V-002", driver: "U007", engineer: "U005", route: "R-003", start: "Edinburgh Depot", end: "Aviemore",        plannedHours: 7, status: "In Progress", dataReq: "Energy + thermal", notes: "Pre-conditioning at 4°C." },
  { id: "DT-2463", date: "2026-05-07", project: "PRJ-2025-015", vehicle: "V-003", driver: "U008", engineer: "U005", route: "R-003", start: "Edinburgh Depot", end: "Aviemore",        plannedHours: 7, status: "Planned",     dataReq: "Backup logger",    notes: "Convoy with V-002." },
  { id: "DT-2464", date: "2026-05-07", project: "PRJ-2025-013", vehicle: "V-007", driver: "U008", engineer: "U005", route: "R-005", start: "Edinburgh Depot", end: "Brake test bay",  plannedHours: 4, status: "Issue",       dataReq: "Brake telemetry",  notes: "Temp plate expiring — renew." },
  { id: "DT-2465", date: "2026-05-07", project: "PRJ-2025-014", vehicle: "V-008", driver: "U009", engineer: "U004", route: "R-001", start: "London HQ",       end: "Cambridge HQ",    plannedHours: 5, status: "Completed",   dataReq: "ADAS regression",  notes: "" },
  { id: "DT-2466", date: "2026-05-08", project: "PRJ-2025-016", vehicle: "V-004", driver: "U009", engineer: "U004", route: "R-002", start: "London HQ",       end: "London HQ",       plannedHours: 8, status: "Planned",     dataReq: "Lidar + 8-cam",    notes: "First ULEZ sweep." },
  { id: "DT-2467", date: "2026-05-08", project: "PRJ-2025-014", vehicle: "V-001", driver: "U006", engineer: "U004", route: "R-001", start: "Cambridge HQ",    end: "London Stansted", plannedHours: 6, status: "Planned",     dataReq: "Full ADAS log",    notes: "" },
];
