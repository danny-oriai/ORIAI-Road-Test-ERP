import type { AttendanceRecord } from "../types";

export const ATTENDANCE: AttendanceRecord[] = [
  { id: "AT-9001", user: "U006", project: "PRJ-2025-014", task: "DT-2461", time: "2026-05-07 07:42", location: "Cambridge HQ Car Park", vehicle: "V-001", type: "Clock In",          status: "Normal",            photo: true  },
  { id: "AT-9002", user: "U006", project: "PRJ-2025-014", task: "DT-2461", time: "2026-05-07 09:18", location: "M11 J8 Lay-by",         vehicle: "V-001", type: "Arrived Test Area", status: "Normal",            photo: false },
  { id: "AT-9003", user: "U007", project: "PRJ-2025-015", task: "DT-2462", time: "2026-05-07 06:15", location: "Edinburgh Depot",       vehicle: "V-002", type: "Clock In",          status: "Normal",            photo: true  },
  { id: "AT-9004", user: "U008", project: "PRJ-2025-013", task: "DT-2464", time: "2026-05-07 08:25", location: "Edinburgh Depot",       vehicle: "V-007", type: "Clock In",          status: "Late",              photo: true  },
  { id: "AT-9005", user: "U004", project: "PRJ-2025-014", task: "DT-2461", time: "2026-05-07 07:55", location: "Cambridge HQ",          vehicle: "V-001", type: "Clock In",          status: "Normal",            photo: false },
  { id: "AT-9006", user: "U009", project: "PRJ-2025-014", task: "DT-2465", time: "2026-05-07 18:02", location: "Cambridge HQ Car Park", vehicle: "V-008", type: "Clock Out",         status: "Normal",            photo: true  },
  { id: "AT-9007", user: "U005", project: "PRJ-2025-015", task: "DT-2462", time: "2026-05-07 05:48", location: "Edinburgh Depot",       vehicle: "V-002", type: "Clock In",          status: "Manual Correction", photo: false },
];
