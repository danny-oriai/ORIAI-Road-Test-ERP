import type {
  BadgeStyle,
  ProjectStatus,
  VehicleStatus,
  PlateStatus,
  TaskStatus,
  IssueSeverity,
  IssueStatus,
  ExpenseStatus,
} from "../types";

export const PROJECT_STATUS_STYLE: Record<ProjectStatus, BadgeStyle> = {
  "Draft":          { bg: "bg-slate-100",  text: "text-slate-700",   dot: "bg-slate-400" },
  "Pending Review": { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  "Approved":       { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500" },
  "Scheduling":     { bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500" },
  "In Progress":    { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Paused":         { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400" },
  "Issue Handling": { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500" },
  "Data Uploading": { bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500" },
  "Completed":      { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Archived":       { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400" },
  "Cancelled":      { bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-500" },
};

export const VEHICLE_STATUS_STYLE: Record<VehicleStatus, BadgeStyle> = {
  "Available":   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Reserved":    { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500" },
  "In Use":      { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  "Maintenance": { bg: "bg-slate-100",  text: "text-slate-700",   dot: "bg-slate-500" },
  "Accident":    { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500" },
};

export const PLATE_STATUS_STYLE: Record<PlateStatus, BadgeStyle> = {
  "Available": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Reserved":  { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500" },
  "In Use":    { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  "Expired":   { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500" },
};

export const TASK_STATUS_STYLE: Record<TaskStatus, BadgeStyle> = {
  "Planned":     { bg: "bg-slate-100",  text: "text-slate-700",   dot: "bg-slate-400" },
  "In Progress": { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  "Completed":   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Issue":       { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500" },
  "Cancelled":   { bg: "bg-slate-100",  text: "text-slate-500",   dot: "bg-slate-400" },
};

export const ISSUE_SEVERITY_STYLE: Record<IssueSeverity, BadgeStyle> = {
  "Low":      { bg: "bg-slate-100",  text: "text-slate-700",  dot: "bg-slate-400" },
  "Medium":   { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-500" },
  "High":     { bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-500" },
  "Critical": { bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-500" },
};

export const ISSUE_STATUS_STYLE: Record<IssueStatus, BadgeStyle> = {
  "Open":        { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500" },
  "In Progress": { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  "Resolved":    { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500" },
  "Closed":      { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

export const EXPENSE_STATUS_STYLE: Record<ExpenseStatus, BadgeStyle> = {
  "Draft":     { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400" },
  "Submitted": { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  "Approved":  { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500" },
  "Rejected":  { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500" },
  "Paid":      { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};
