import type { Expense } from "../types";

export const EXPENSES: Expense[] = [
  { id: "EXP-7701", applicant: "U006", project: "PRJ-2025-014", category: "Parking",          amount: 18.50, currency: "GBP", date: "2026-05-06", vehicle: "V-001", description: "Stansted long-stay 6h",         status: "Submitted", approver: "U002" },
  { id: "EXP-7702", applicant: "U007", project: "PRJ-2025-015", category: "Charging",         amount: 42.30, currency: "GBP", date: "2026-05-06", vehicle: "V-002", description: "Ionity Perth, 47 kWh",           status: "Approved",  approver: "U003" },
  { id: "EXP-7703", applicant: "U008", project: "PRJ-2025-013", category: "Hotel",            amount: 96.00, currency: "GBP", date: "2026-05-05", vehicle: null,    description: "Premier Inn Aviemore, 1 night",  status: "Submitted", approver: "U002" },
  { id: "EXP-7704", applicant: "U004", project: "PRJ-2025-014", category: "Meal",             amount: 14.20, currency: "GBP", date: "2026-05-05", vehicle: null,    description: "Lunch on test day",               status: "Approved",  approver: "U002" },
  { id: "EXP-7705", applicant: "U002", project: "PRJ-2025-014", category: "HDD Postage",      amount: 22.40, currency: "GBP", date: "2026-05-04", vehicle: null,    description: "Royal Mail Special Delivery x2", status: "Approved",  approver: "U010" },
  { id: "EXP-7706", applicant: "U009", project: "PRJ-2025-016", category: "Fuel",             amount: 68.00, currency: "GBP", date: "2026-05-03", vehicle: "V-004", description: "Top-up before ULEZ sweep",       status: "Rejected",  approver: "U002" },
  { id: "EXP-7707", applicant: "U005", project: "PRJ-2025-015", category: "Public Transport", amount: 31.50, currency: "GBP", date: "2026-05-02", vehicle: null,    description: "Train Edinburgh ↔ Glasgow",      status: "Paid",      approver: "U010" },
  { id: "EXP-7708", applicant: "U006", project: "PRJ-2025-014", category: "Vehicle Cleaning", amount: 12.00, currency: "GBP", date: "2026-05-01", vehicle: "V-001", description: "Hand-wash before client demo",   status: "Submitted", approver: "U002" },
];
