/* ============================================================
 * Domain types — Road Test ERP
 * Aligned with PRD v0.3 lifecycle states.
 * Same shapes will be reused as Supabase row types in Step 4.
 * ========================================================== */

export type Role =
  | "Admin"
  | "PMO"
  | "Project Manager"
  | "Test Engineer"
  | "Driver"
  | "Finance";

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  phone: string;
  city: string;
  avatar: string;          // initials
  color: string;           // tailwind classes for the avatar pill
}

export type ProjectStatus =
  | "Draft"
  | "Pending Review"
  | "Approved"
  | "Scheduling"
  | "In Progress"
  | "Paused"
  | "Issue Handling"
  | "Data Uploading"
  | "Completed"
  | "Archived"
  | "Cancelled";

export type Priority = "Low" | "Medium" | "High";

export interface Project {
  id: string;
  name: string;
  client: string;
  type: string;
  manager: string;          // User.id
  pmoOwner: string;         // User.id
  region: string;
  startDate: string;        // ISO date
  endDate: string;
  status: ProjectStatus;
  priority: Priority;
  vehiclesNeeded: number;
  staffNeeded: number;
  plateNeeded: boolean;
  dataReq: string;
  progress: number;         // 0..100
  notes: string;
}

export type VehicleStatus =
  | "Available"
  | "Reserved"
  | "In Use"
  | "Maintenance"
  | "Accident";

export interface Vehicle {
  id: string;
  plate: string;            // road-legal registration
  vin: string;
  brand: string;
  model: string;
  year: number;
  power: "Petrol" | "Diesel" | "Hybrid" | "EV";
  ownership: "Owned" | "Leased";
  city: string;
  project: string | null;
  driver: string | null;    // User.id
  status: VehicleStatus;
  insurance: "Covered" | "Pending" | "Expired";
  motExpiry: string;
  mileage: number;
  equipment: string[];
}

export type PlateStatus = "Available" | "Reserved" | "In Use" | "Expired";

export interface Plate {
  id: string;
  number: string;
  type: "Trade Plate" | "Temporary Plate";
  validFrom: string;
  validTo: string;
  status: PlateStatus;
  project: string | null;
  vehicle: string | null;
  responsible: string;
  notes: string;
}

export interface PlateAllocation {
  id: string;
  plate: string;            // Plate.id
  project: string;
  vehicle: string;
  from: string;
  to: string;
  conflict?: boolean;
}

export interface Route {
  id: string;
  name: string;
  distance: number;
  city: string;
  project: string | null;
  duration: string;
  type: "Highway" | "Urban" | "Rural" | "Mixed";
  pois: number;
}

export interface POI {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  city: string;
  route: string;
  project: string;
}

export type TaskStatus =
  | "Planned"
  | "In Progress"
  | "Completed"
  | "Issue"
  | "Cancelled";

export interface DailyTask {
  id: string;
  date: string;
  project: string;
  vehicle: string;
  driver: string;
  engineer: string;
  route: string;
  start: string;
  end: string;
  plannedHours: number;
  status: TaskStatus;
  dataReq: string;
  notes: string;
}

export interface AttendanceRecord {
  id: string;
  user: string;
  project: string;
  task: string;
  time: string;
  location: string;
  vehicle: string;
  type:
    | "Clock In"
    | "Clock Out"
    | "Arrived Test Area"
    | "Break Start"
    | "Break End";
  status: "Normal" | "Late" | "Manual Correction";
  photo: boolean;
}

export interface VehicleCheck {
  id: string;
  vehicle: string;
  driver: string | null;
  date: string;
  type: "Pre-Drive" | "Post-Drive" | "Check-In" | "Weekly";
  status: "OK" | "Warning" | "Critical";
  mileage: number;
  fuel: number;             // % or kWh%
  hddFree: number;          // GB
  issues: number;
  photos: number;
}

export type IssueSeverity = "Low" | "Medium" | "High" | "Critical";
export type IssueStatus = "Open" | "In Progress" | "Resolved" | "Closed";
export type IssueType =
  | "Vehicle"
  | "Device"
  | "Data"
  | "Staff"
  | "Route"
  | "Plate"
  | "Safety"
  | "Weather"
  | "Client Change"
  | "Finance"
  | "File"
  | "Delivery";

export interface Issue {
  id: string;
  title: string;
  project: string | null;
  type: IssueType;
  severity: IssueSeverity;
  reportedBy: string;
  reportedTime: string;
  vehicle: string | null;
  task: string | null;
  owner: string;
  status: IssueStatus;
  description: string;
  attachments: number;
}

export type ExpenseCategory =
  | "Hotel"
  | "Meal"
  | "Public Transport"
  | "Parking"
  | "Charging"
  | "Fuel"
  | "Vehicle Cleaning"
  | "Vehicle Repair"
  | "HDD Postage"
  | "Equipment Purchase"
  | "Other";

export type ExpenseStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Paid";

export interface Expense {
  id: string;
  applicant: string;
  project: string;
  category: ExpenseCategory;
  amount: number;
  currency: "GBP" | "EUR" | "USD";
  date: string;
  vehicle: string | null;
  description: string;
  status: ExpenseStatus;
  approver: string;
}

export interface FileRecord {
  id: string;
  name: string;
  category: string;
  project: string;
  related: string;
  link: string;
  uploadedBy: string;
  uploadedTime: string;
  version: string;
}

/* ---------- Status badge styling type ---------- */
export interface BadgeStyle {
  dot: string;       // e.g. "bg-emerald-500"
  text: string;      // e.g. "text-emerald-700"
  bg: string;        // e.g. "bg-emerald-50"
  ring?: string;
}

/* ---------- Page identifiers (router-free) ---------- */
export type PageKey =
  | "dashboard"
  | "projects"
  | "project-detail"
  | "vehicles"
  | "vehicle-detail"
  | "vehicle-check"
  | "plates"
  | "plate-timeline"
  | "routes"
  | "pois"
  | "tasks"
  | "staff"
  | "attendance"
  | "issues"
  | "expenses"
  | "files"
  | "users"
  | "settings";
