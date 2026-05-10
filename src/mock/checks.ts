import type { VehicleCheck } from "../types";

export const VEHICLE_CHECKS: VehicleCheck[] = [
  { id: "VC-3301", vehicle: "V-001", driver: "U006", date: "2026-05-07 07:30", type: "Pre-Drive",  status: "OK",       mileage: 38421, fuel: 78, hddFree: 412, issues: 0, photos: 6 },
  { id: "VC-3302", vehicle: "V-002", driver: "U007", date: "2026-05-07 06:00", type: "Pre-Drive",  status: "OK",       mileage: 21984, fuel: 92, hddFree: 380, issues: 0, photos: 6 },
  { id: "VC-3303", vehicle: "V-007", driver: "U008", date: "2026-05-07 08:10", type: "Pre-Drive",  status: "Warning",  mileage: 19877, fuel: 64, hddFree: 88,  issues: 1, photos: 6 },
  { id: "VC-3304", vehicle: "V-008", driver: "U009", date: "2026-05-06 18:30", type: "Post-Drive", status: "OK",       mileage: 5430,  fuel: 71, hddFree: 488, issues: 0, photos: 4 },
  { id: "VC-3305", vehicle: "V-006", driver: null,   date: "2026-05-05 11:00", type: "Check-In",   status: "Critical", mileage: 71204, fuel: 22, hddFree: 0,   issues: 3, photos: 8 },
];
