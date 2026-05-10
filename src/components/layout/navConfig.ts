import {
  LayoutDashboard, FolderKanban, Car, BadgeCheck, Calendar, MapPin, Route,
  Users, Clock, Receipt, AlertTriangle, FileText, Settings,
  FileCheck2, Shield, ListChecks,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PageKey } from "../../types";

export interface NavItem {
  id: PageKey;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { id: "projects",   label: "Projects",         icon: FolderKanban },
      { id: "tasks",      label: "Daily Tasks",      icon: ListChecks },
      { id: "staff",      label: "Staff Assignment", icon: Users },
      { id: "attendance", label: "Attendance",       icon: Clock },
    ],
  },
  {
    label: "Resources",
    items: [
      { id: "vehicles",       label: "Vehicles",       icon: Car },
      { id: "vehicle-check",  label: "Vehicle Check",  icon: FileCheck2 },
      { id: "plates",         label: "Trade Plates",   icon: BadgeCheck },
      { id: "plate-timeline", label: "Plate Timeline", icon: Calendar },
      { id: "routes",         label: "Routes",         icon: Route },
      { id: "pois",           label: "POIs",           icon: MapPin },
    ],
  },
  {
    label: "Finance & Risk",
    items: [
      { id: "expenses", label: "Expenses", icon: Receipt },
      { id: "issues",   label: "Issues",   icon: AlertTriangle },
    ],
  },
  {
    label: "System",
    items: [
      { id: "files",    label: "Files",         icon: FileText },
      { id: "users",    label: "Users & Roles", icon: Shield },
      { id: "settings", label: "Settings",      icon: Settings },
    ],
  },
];

export const PAGE_TITLES: Record<PageKey, string> = {
  "dashboard":       "Dashboard",
  "projects":        "Projects",
  "project-detail":  "Project Detail",
  "vehicles":        "Vehicles",
  "vehicle-detail":  "Vehicle Detail",
  "vehicle-check":   "Vehicle Check",
  "plates":          "Trade Plates",
  "plate-timeline":  "Plate Allocation Timeline",
  "routes":          "Routes",
  "pois":            "POIs",
  "tasks":           "Daily Tasks",
  "staff":           "Staff Assignment",
  "attendance":      "Attendance",
  "issues":          "Issues & Risks",
  "expenses":        "Expenses",
  "files":           "Files",
  "users":           "Users & Roles",
  "settings":        "Settings",
};

/* For the sidebar's active highlight, detail pages map back to
 * their parent list page so the parent stays highlighted. */
export const SIDEBAR_ACTIVE_KEY: Record<PageKey, PageKey> = {
  "dashboard":       "dashboard",
  "projects":        "projects",
  "project-detail":  "projects",
  "vehicles":        "vehicles",
  "vehicle-detail":  "vehicles",
  "vehicle-check":   "vehicle-check",
  "plates":          "plates",
  "plate-timeline":  "plate-timeline",
  "routes":          "routes",
  "pois":            "pois",
  "tasks":           "tasks",
  "staff":           "staff",
  "attendance":      "attendance",
  "issues":          "issues",
  "expenses":        "expenses",
  "files":           "files",
  "users":           "users",
  "settings":        "settings",
};
