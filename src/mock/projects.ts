import type { Project } from "../types";

export const PROJECTS: Project[] = [
  {
    id: "PRJ-2025-014", name: "ADAS Highway Validation — M11 Corridor", client: "Aurora Mobility Ltd",
    type: "ADAS Testing", manager: "U002", pmoOwner: "U001", region: "Cambridge → London",
    startDate: "2026-04-22", endDate: "2026-06-30", status: "In Progress", priority: "High",
    vehiclesNeeded: 3, staffNeeded: 5, plateNeeded: true, dataReq: "Full CAN + camera + radar logs",
    progress: 64, notes: "Daily 6h test windows, must avoid peak traffic 07:30–09:30.",
  },
  {
    id: "PRJ-2025-015", name: "EV Range Verification — Scotland Loop", client: "Voltaic Drive",
    type: "Vehicle Verification", manager: "U003", pmoOwner: "U001", region: "Edinburgh / UK-wide",
    startDate: "2026-05-04", endDate: "2026-05-25", status: "In Progress", priority: "Medium",
    vehiclesNeeded: 2, staffNeeded: 3, plateNeeded: true, dataReq: "Energy consumption + thermal logs",
    progress: 38, notes: "Cold-soak tests scheduled for week 2 in Aviemore.",
  },
  {
    id: "PRJ-2025-016", name: "Urban Data Collection — London ULEZ", client: "Internal R&D",
    type: "Data Collection", manager: "U002", pmoOwner: "U001", region: "London",
    startDate: "2026-05-12", endDate: "2026-07-11", status: "Scheduling", priority: "High",
    vehiclesNeeded: 4, staffNeeded: 6, plateNeeded: false, dataReq: "8 cameras, lidar, GNSS",
    progress: 8, notes: "Awaiting plate confirmation for V-004.",
  },
  {
    id: "PRJ-2025-017", name: "Competitor Benchmark — Compact SUV", client: "Aurora Mobility Ltd",
    type: "Competitor Evaluation", manager: "U003", pmoOwner: "U001", region: "Cambridge",
    startDate: "2026-05-20", endDate: "2026-06-05", status: "Approved", priority: "Medium",
    vehiclesNeeded: 1, staffNeeded: 2, plateNeeded: false, dataReq: "Subjective evaluation + GPS",
    progress: 0, notes: "Pending vehicle delivery from Cambridge depot.",
  },
  {
    id: "PRJ-2025-013", name: "Winter Tyre Performance Study", client: "NorthGrip Tyres",
    type: "Vehicle Verification", manager: "U002", pmoOwner: "U001", region: "Edinburgh",
    startDate: "2026-02-10", endDate: "2026-04-15", status: "Data Uploading", priority: "Medium",
    vehiclesNeeded: 2, staffNeeded: 4, plateNeeded: true, dataReq: "Brake test + grip logs",
    progress: 92, notes: "Final HDD shipment expected this week.",
  },
  {
    id: "PRJ-2025-012", name: "Camera Calibration — Pilot Batch", client: "Internal R&D",
    type: "Data Collection", manager: "U003", pmoOwner: "U001", region: "London",
    startDate: "2026-01-15", endDate: "2026-03-01", status: "Completed", priority: "Low",
    vehiclesNeeded: 1, staffNeeded: 2, plateNeeded: false, dataReq: "Camera frames",
    progress: 100, notes: "Archived March 8.",
  },
  {
    id: "PRJ-2025-018", name: "Motorway Sign Recognition Audit", client: "Aurora Mobility Ltd",
    type: "ADAS Testing", manager: "U002", pmoOwner: "U001", region: "UK-wide",
    startDate: "2026-06-01", endDate: "2026-08-15", status: "Pending Review", priority: "High",
    vehiclesNeeded: 2, staffNeeded: 3, plateNeeded: true, dataReq: "Camera + GNSS + map data",
    progress: 0, notes: "Awaiting client sign-off on test matrix.",
  },
  {
    id: "PRJ-2025-011", name: "Lane Departure Issue Investigation", client: "Aurora Mobility Ltd",
    type: "ADAS Testing", manager: "U003", pmoOwner: "U001", region: "Cambridge",
    startDate: "2026-04-10", endDate: "2026-05-10", status: "Issue Handling", priority: "High",
    vehiclesNeeded: 1, staffNeeded: 2, plateNeeded: false, dataReq: "Targeted re-runs",
    progress: 71, notes: "Software regression confirmed — rerun planned May 12.",
  },
];
