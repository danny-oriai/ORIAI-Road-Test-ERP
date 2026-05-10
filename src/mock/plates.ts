import type { Plate, PlateAllocation } from "../types";

export const PLATES: Plate[] = [
  { id: "TP-001", number: "TX 1245", type: "Trade Plate",     validFrom: "2026-01-01", validTo: "2026-12-31", status: "In Use",    project: "PRJ-2025-014", vehicle: "V-001", responsible: "U002", notes: "Annual trade plate, primary." },
  { id: "TP-002", number: "TX 1246", type: "Trade Plate",     validFrom: "2026-01-01", validTo: "2026-12-31", status: "In Use",    project: "PRJ-2025-015", vehicle: "V-002", responsible: "U003", notes: "" },
  { id: "TP-003", number: "TX 1247", type: "Trade Plate",     validFrom: "2026-01-01", validTo: "2026-12-31", status: "In Use",    project: "PRJ-2025-015", vehicle: "V-003", responsible: "U003", notes: "Edinburgh ops." },
  { id: "TP-004", number: "TP 8821", type: "Temporary Plate", validFrom: "2026-04-15", validTo: "2026-05-15", status: "In Use",    project: "PRJ-2025-013", vehicle: "V-007", responsible: "U002", notes: "Expiring soon — renew before May 14." },
  { id: "TP-005", number: "TP 8822", type: "Temporary Plate", validFrom: "2026-05-01", validTo: "2026-07-01", status: "Reserved",  project: "PRJ-2025-016", vehicle: "V-004", responsible: "U002", notes: "Pending project kick-off." },
  { id: "TP-006", number: "TX 1248", type: "Trade Plate",     validFrom: "2026-01-01", validTo: "2026-12-31", status: "Available", project: null,            vehicle: null,    responsible: "U001", notes: "Spare." },
  { id: "TP-007", number: "TP 8780", type: "Temporary Plate", validFrom: "2026-02-01", validTo: "2026-04-30", status: "Expired",   project: "PRJ-2025-013", vehicle: "V-007", responsible: "U002", notes: "Expired April 30 — must not reuse." },
];

// Plate allocations across May 2026 — used by the Gantt-style timeline
export const PLATE_ALLOCATIONS: PlateAllocation[] = [
  { id: "PA-1", plate: "TP-001", project: "PRJ-2025-014", vehicle: "V-001", from: "2026-04-22", to: "2026-06-30" },
  { id: "PA-2", plate: "TP-002", project: "PRJ-2025-015", vehicle: "V-002", from: "2026-05-04", to: "2026-05-25" },
  { id: "PA-3", plate: "TP-003", project: "PRJ-2025-015", vehicle: "V-003", from: "2026-05-04", to: "2026-05-25" },
  { id: "PA-4", plate: "TP-004", project: "PRJ-2025-013", vehicle: "V-007", from: "2026-04-15", to: "2026-05-15" },
  { id: "PA-5", plate: "TP-005", project: "PRJ-2025-016", vehicle: "V-004", from: "2026-05-12", to: "2026-07-11" },
  // Conflict! TP-001 also reserved in late May for another phase
  { id: "PA-6", plate: "TP-001", project: "PRJ-2025-018", vehicle: "V-008", from: "2026-05-22", to: "2026-06-04", conflict: true },
];
